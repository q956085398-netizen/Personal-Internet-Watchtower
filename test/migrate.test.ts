import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate, migrations } from "../src/persistence/migrate.ts";

test("migrations list is ascending and uniquely versioned", () => {
  const versions = migrations.map((m) => m.version);
  const sorted = [...versions].sort((a, b) => a - b);
  assert.deepEqual(versions, sorted, "migrations must be listed in ascending version order");
  assert.equal(new Set(versions).size, versions.length, "migration versions must be unique");
});

test("migrate applies all migrations to a fresh in-memory database", () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const applied = db
    .prepare("SELECT version, name FROM schema_migrations ORDER BY version")
    .all() as { version: number; name: string }[];
  assert.deepEqual(
    applied.map((r) => r.version),
    migrations.map((m) => m.version),
  );
  assert.equal(applied.length, migrations.length);
  db.close();
});

test("migrate is repeatable: re-running on an already-migrated database is a no-op", () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  migrate(db);
  migrate(db);
  const count = (db.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get() as { n: number }).n;
  assert.equal(count, migrations.length, "each migration must be recorded exactly once");
  db.close();
});

test("migrated database contains the v1 tables and indexes", () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const tables = (
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[]
  ).map((r) => r.name);
  for (const expected of [
    "schema_migrations",
    "watchpoints",
    "watchpoint_state",
    "dedup_keys",
    "events",
    "metric_snapshots",
    "cache_entries",
  ]) {
    assert.ok(tables.includes(expected), `expected table ${expected}`);
  }

  const indexes = (
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all() as { name: string }[]
  ).map((r) => r.name);
  for (const expected of [
    "idx_events_watchpoint_time",
    "idx_events_connector_time",
    "idx_events_discovered",
    "idx_dedup_keys_watchpoint",
    "idx_metric_snapshots_event_time",
  ]) {
    assert.ok(indexes.includes(expected), `expected index ${expected}`);
  }
  db.close();
});

test("migrate works on a fresh file database and repeatable across reconnections", () => {
  const dir = mkdtempSync(join(tmpdir(), "watchtower-persistence-"));
  const file = join(dir, "watchtower.sqlite3");
  try {
    const first = new DatabaseSync(file);
    migrate(first);
    first.close();

    const second = new DatabaseSync(file);
    migrate(second);
    const count = (
      second.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get() as { n: number }
    ).n;
    assert.equal(count, migrations.length, "reconnecting must not duplicate migrations");
    second.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("watchpoint config and runtime state live in separate tables (ADR-0001 §2)", () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const wpCols = (
    db.prepare("PRAGMA table_info(watchpoints)").all() as { name: string }[]
  ).map((c) => c.name);
  const stateCols = (
    db.prepare("PRAGMA table_info(watchpoint_state)").all() as { name: string }[]
  ).map((c) => c.name);
  for (const runtimeCol of [
    "poll_state",
    "last_success_at",
    "last_error_at",
    "last_error_reason",
    "last_error_message",
    "consecutive_failures",
    "next_due_at",
  ]) {
    assert.ok(
      !wpCols.includes(runtimeCol),
      `watchpoints config table must not contain runtime column ${runtimeCol}`,
    );
    assert.ok(stateCols.includes(runtimeCol), `watchpoint_state must contain ${runtimeCol}`);
  }
  db.close();
});
