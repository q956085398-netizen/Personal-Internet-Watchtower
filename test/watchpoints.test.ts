import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "../src/persistence/store.ts";

function withStore(run: (store: ReturnType<typeof openStore>) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "watchtower-wp-"));
  const store = openStore(join(dir, "watchtower.sqlite3"));
  try {
    run(store);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

test("create assigns id and created_at, defaults status to active", () => {
  withStore((store) => {
    const wp = store.watchpoints.create({
      connectorId: "nga",
      kind: "board",
      displayName: "NGA · 舰col板块",
      params: { fid: "650" },
      intervalSeconds: 600,
    });
    assert.ok(wp.id.length > 0, "Core must assign a watchpoint id");
    assert.match(wp.createdAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(wp.status, "active");
    assert.deepEqual(wp.params, { fid: "650" });
  });
});

test("create accepts explicit status and timestamps round-trip", () => {
  withStore((store) => {
    const wp = store.watchpoints.create({
      connectorId: "bilibili",
      kind: "live_status",
      displayName: "关注主播直播",
      params: {},
      intervalSeconds: 120,
      status: "paused",
      id: "wp-fixed-id",
      createdAt: "2026-09-26T00:00:00.000Z",
    });
    assert.equal(wp.id, "wp-fixed-id");
    assert.equal(wp.createdAt, "2026-09-26T00:00:00.000Z");
    assert.equal(wp.status, "paused");
  });
});

test("params keep string / number / boolean values without interpretation", () => {
  withStore((store) => {
    const wp = store.watchpoints.create({
      connectorId: "generic",
      kind: "custom",
      displayName: "mixed params",
      params: { fid: "650", page: 2, digest: true },
      intervalSeconds: 300,
    });
    const fetched = store.watchpoints.get(wp.id);
    assert.deepEqual(fetched?.params, { fid: "650", page: 2, digest: true });
  });
});

test("get returns undefined for unknown id", () => {
  withStore((store) => {
    assert.equal(store.watchpoints.get("nope"), undefined);
  });
});

test("list filters by status and connector", () => {
  withStore((store) => {
    const active = store.watchpoints.create({
      connectorId: "nga",
      kind: "board",
      displayName: "a",
      params: {},
      intervalSeconds: 600,
    });
    store.watchpoints.create({
      connectorId: "nga",
      kind: "board",
      displayName: "b",
      params: {},
      intervalSeconds: 600,
      status: "paused",
    });
    store.watchpoints.create({
      connectorId: "lkong",
      kind: "forum",
      displayName: "c",
      params: {},
      intervalSeconds: 600,
    });

    assert.deepEqual(
      store.watchpoints.list({ status: "active" }).map((w) => w.displayName),
      ["a", "c"],
    );
    assert.deepEqual(
      store.watchpoints.list({ connectorId: "lkong" }).map((w) => w.displayName),
      ["c"],
    );
    assert.equal(store.watchpoints.list().length, 3);
    assert.ok(store.watchpoints.list().some((w) => w.id === active.id));
  });
});

test("update patches mutable fields and rejects unknown ids", () => {
  withStore((store) => {
    const wp = store.watchpoints.create({
      connectorId: "nga",
      kind: "board",
      displayName: "before",
      params: { fid: "1" },
      intervalSeconds: 600,
    });

    const updated = store.watchpoints.update(wp.id, {
      displayName: "after",
      params: { fid: "2" },
      status: "paused",
      intervalSeconds: 900,
    });
    assert.equal(updated.displayName, "after");
    assert.deepEqual(updated.params, { fid: "2" });
    assert.equal(updated.status, "paused");
    assert.equal(updated.intervalSeconds, 900);
    assert.equal(updated.connectorId, "nga", "connector binding is immutable");
    assert.equal(updated.kind, "board", "kind is immutable");
    assert.equal(updated.createdAt, wp.createdAt, "created_at is immutable");

    assert.throws(() => store.watchpoints.update("missing", { displayName: "x" }));
  });
});

test("update to invalid status or interval is rejected", () => {
  withStore((store) => {
    const wp = store.watchpoints.create({
      connectorId: "nga",
      kind: "board",
      displayName: "x",
      params: {},
      intervalSeconds: 600,
    });
    assert.throws(() =>
      store.watchpoints.update(wp.id, { status: "archived" as never }),
    );
    assert.throws(() => store.watchpoints.update(wp.id, { intervalSeconds: 0 }));
  });
});

test("pause and resume transition status", () => {
  withStore((store) => {
    const wp = store.watchpoints.create({
      connectorId: "nga",
      kind: "board",
      displayName: "x",
      params: {},
      intervalSeconds: 600,
    });
    assert.equal(store.watchpoints.pause(wp.id).status, "paused");
    assert.equal(store.watchpoints.resume(wp.id).status, "active");
  });
});

test("delete removes the watchpoint and reports unknown ids", () => {
  withStore((store) => {
    const wp = store.watchpoints.create({
      connectorId: "nga",
      kind: "board",
      displayName: "x",
      params: {},
      intervalSeconds: 600,
    });
    assert.equal(store.watchpoints.remove(wp.id), true);
    assert.equal(store.watchpoints.get(wp.id), undefined);
    assert.equal(store.watchpoints.remove(wp.id), false);
  });
});

test("create validates required fields", () => {
  withStore((store) => {
    assert.throws(() =>
      store.watchpoints.create({
        connectorId: "nga",
        kind: "board",
        displayName: "",
        params: {},
        intervalSeconds: 600,
      }),
    );
    assert.throws(() =>
      store.watchpoints.create({
        connectorId: "nga",
        kind: "board",
        displayName: "x",
        params: {},
        intervalSeconds: -5,
      }),
    );
  });
});
