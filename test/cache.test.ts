import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "../src/persistence/store.ts";

function withStore(run: (store: ReturnType<typeof openStore>) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "watchtower-cache-"));
  const store = openStore(join(dir, "watchtower.sqlite3"));
  try {
    run(store);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

test("set/get round-trip structured values", () => {
  withStore((store) => {
    store.cache.set("nga:boards", [{ fid: "650", label: "舰col" }]);
    const entry = store.cache.get<{ fid: string; label: string }[]>("nga:boards");
    assert.deepEqual(entry?.value, [{ fid: "650", label: "舰col" }]);
    assert.match(entry?.updatedAt ?? "", /^\d{4}-\d{2}-\d{2}T/);
  });
});

test("get returns undefined for unknown keys", () => {
  withStore((store) => {
    assert.equal(store.cache.get("nope"), undefined);
  });
});

test("set overwrites and refreshes updatedAt", () => {
  withStore((store) => {
    store.cache.set("key", { v: 1 }, { at: "2026-09-26T01:00:00.000Z" });
    store.cache.set("key", { v: 2 }, { at: "2026-09-26T02:00:00.000Z" });
    const entry = store.cache.get<{ v: number }>("key");
    assert.deepEqual(entry?.value, { v: 2 });
    assert.equal(entry?.updatedAt, "2026-09-26T02:00:00.000Z");
  });
});

test("expired entries read as undefined", () => {
  withStore((store) => {
    store.cache.set("temp", "x", { ttlSeconds: 60, at: "2026-09-26T01:00:00.000Z" });
    assert.ok(store.cache.get("temp", new Date("2026-09-26T01:00:30.000Z")), "within ttl");
    assert.equal(
      store.cache.get("temp", new Date("2026-09-26T01:02:00.000Z")),
      undefined,
      "past ttl",
    );
  });
});

test("entries without ttl never expire", () => {
  withStore((store) => {
    store.cache.set("keep", "x", { at: "2020-01-01T00:00:00.000Z" });
    assert.ok(store.cache.get("keep", new Date("2030-01-01T00:00:00.000Z")));
  });
});

test("expired entries are deleted on read, not just hidden", () => {
  withStore((store) => {
    store.cache.set("temp", "x", { ttlSeconds: 60, at: "2026-09-26T01:00:00.000Z" });
    store.cache.get("temp", new Date("2026-09-26T02:00:00.000Z"));
    assert.ok(
      store.cache.get("temp", new Date("2026-09-26T00:00:00.000Z")) === undefined,
      "row must be gone, not merely expired (a past-time read must not resurrect it)",
    );
  });
});

test("delete removes an entry and reports unknown keys", () => {
  withStore((store) => {
    store.cache.set("k", 1);
    assert.equal(store.cache.delete("k"), true);
    assert.equal(store.cache.get("k"), undefined);
    assert.equal(store.cache.delete("k"), false);
  });
});

test("invalid ttl or timestamp is rejected", () => {
  withStore((store) => {
    assert.throws(() => store.cache.set("k", 1, { ttlSeconds: 0 }));
    assert.throws(() => store.cache.set("k", 1, { ttlSeconds: -5 }));
    assert.throws(() => store.cache.set("k", 1, { at: "now-ish" }));
  });
});
