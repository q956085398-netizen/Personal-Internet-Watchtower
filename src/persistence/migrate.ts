import type { DatabaseSync } from "node:sqlite";
import { withTransaction } from "./tx.ts";

/**
 * Ordered, append-only migration list. Each migration runs inside a single
 * transaction and is recorded in `schema_migrations`; re-running `migrate`
 * skips already-applied versions, so applying is repeatable.
 */
export interface Migration {
  version: number;
  name: string;
  up: readonly string[];
}

/**
 * v1 schema for the v0 persistence layer (issue #9), following ADR-0001:
 *
 * - Column names mirror the contract's snake_case field names.
 * - Watchpoint *configuration* (`watchpoints`) and *runtime state*
 *   (`watchpoint_state`) are separate tables (ADR-0001 §2: runtime state is
 *   not part of Watchpoint config).
 * - Dedup state (`dedup_keys`) is stored apart from `events` so event
 *   retention can later prune items without losing dedup history.
 * - No site-specific columns: everything is driven by the Connector
 *   registry's declared kinds/capabilities, never by site ids.
 */
const V1: Migration = {
  version: 1,
  name: "v0-persistence",
  up: [
    `CREATE TABLE watchpoints (
      id TEXT PRIMARY KEY,
      connector_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      display_name TEXT NOT NULL,
      params TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(params)),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
      interval_seconds INTEGER NOT NULL CHECK (interval_seconds > 0),
      created_at TEXT NOT NULL
    )`,

    `CREATE TABLE watchpoint_state (
      watchpoint_id TEXT PRIMARY KEY REFERENCES watchpoints(id) ON DELETE CASCADE,
      poll_state TEXT,
      last_success_at TEXT,
      last_error_at TEXT,
      last_error_reason TEXT CHECK (last_error_reason IS NULL OR last_error_reason IN
        ('auth_error', 'rate_limited', 'temporary_failure', 'permanent_failure')),
      last_error_message TEXT,
      consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0)
    )`,

    `CREATE TABLE dedup_keys (
      dedup_key TEXT PRIMARY KEY,
      watchpoint_id TEXT NOT NULL REFERENCES watchpoints(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      external_id TEXT,
      fallback TEXT,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_dedup_keys_watchpoint ON dedup_keys(watchpoint_id)`,

    `CREATE TABLE events (
      id TEXT PRIMARY KEY,
      dedup_key TEXT NOT NULL UNIQUE,
      connector_id TEXT NOT NULL,
      watchpoint_id TEXT NOT NULL REFERENCES watchpoints(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL CHECK (event_type IN
        ('new_item', 'hot_item', 'item_update', 'live_started', 'live_ended', 'account_event')),
      discovered_at TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      reason TEXT NOT NULL,
      external_id TEXT,
      summary TEXT,
      author TEXT,
      published_at TEXT,
      thumbnail_url TEXT,
      metrics TEXT CHECK (metrics IS NULL OR json_valid(metrics)),
      metadata TEXT CHECK (metadata IS NULL OR json_valid(metadata))
    )`,
    `CREATE INDEX idx_events_watchpoint_time ON events(watchpoint_id, discovered_at DESC)`,
    `CREATE INDEX idx_events_connector_time ON events(connector_id, discovered_at DESC)`,
    `CREATE INDEX idx_events_discovered ON events(discovered_at DESC)`,

    `CREATE TABLE metric_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      captured_at TEXT NOT NULL,
      view INTEGER,
      "like" INTEGER,
      favorite INTEGER,
      coin INTEGER,
      reply INTEGER,
      share INTEGER,
      danmaku INTEGER
    )`,
    `CREATE INDEX idx_metric_snapshots_event_time ON metric_snapshots(event_id, captured_at)`,

    `CREATE TABLE cache_entries (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL CHECK (json_valid(value)),
      expires_at TEXT,
      updated_at TEXT NOT NULL
    )`,
  ],
};

/**
 * V2 (issue #10): the scheduler's next-due timestamp is runtime state, so it
 * lives in watchpoint_state (ADR-0001 §2), not in the watchpoint config.
 * NULL means "no scheduling decision recorded" (never attempted, a legacy
 * row, a caller that did not decide scheduling, or cleared by a terminal
 * failure) and reads as due immediately — the terminal-failure gate is what
 * keeps such watchpoints from polling.
 */
const V2: Migration = {
  version: 2,
  name: "scheduler-next-due",
  up: ["ALTER TABLE watchpoint_state ADD COLUMN next_due_at TEXT"],
};

export const migrations: readonly Migration[] = [V1, V2];

export function migrate(db: DatabaseSync): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`);

  const applied = new Set(
    (
      db.prepare("SELECT version FROM schema_migrations").all() as { version: number }[]
    ).map((row) => row.version),
  );

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    withTransaction(db, () => {
      for (const statement of migration.up) {
        db.exec(statement);
      }
      db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)").run(
        migration.version,
        migration.name,
        new Date().toISOString(),
      );
    });
  }
}
