import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "../src/persistence/store.ts";
import type { EventInput } from "../src/persistence/events.ts";

function withStore(run: (store: ReturnType<typeof openStore>) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "watchtower-metrics-"));
  const store = openStore(join(dir, "watchtower.sqlite3"));
  try {
    run(store);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedEvent(
  store: ReturnType<typeof openStore>,
): { eventId: string; watchpointId: string } {
  const watchpointId = store.watchpoints.create({
    connectorId: "bilibili",
    kind: "video_metrics",
    displayName: "视频采样",
    params: { bvid_list: "BV-1" },
    intervalSeconds: 900,
  }).id;
  const input: EventInput = {
    eventType: "new_item",
    discoveredAt: "2026-09-26T01:00:00.000Z",
    title: "示例视频",
    url: "https://www.bilibili.com/video/BV-1",
    reason: "你关注的 UP 更新了",
    externalId: "BV-1",
  };
  return { eventId: store.events.upsert(watchpointId, [input]).records[0]!.id, watchpointId };
}

test("snapshot round-trips and is queryable by item", () => {
  withStore((store) => {
    const { eventId } = seedEvent(store);
    const snap = store.metrics.add(eventId, { view: 100, like: 10 }, "2026-09-26T01:05:00.000Z");
    assert.equal(snap.eventId, eventId);
    assert.deepEqual(snap.metrics, { view: 100, like: 10 });

    const listed = store.metrics.list(eventId);
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.capturedAt, "2026-09-26T01:05:00.000Z");
    assert.deepEqual(listed[0]?.metrics, { view: 100, like: 10 });
  });
});

test("snapshots form a time series: latest window returned chronologically", () => {
  withStore((store) => {
    const { eventId } = seedEvent(store);
    store.metrics.add(eventId, { view: 100 }, "2026-09-26T01:00:00.000Z");
    store.metrics.add(eventId, { view: 260 }, "2026-09-26T01:15:00.000Z");
    store.metrics.add(eventId, { view: 180 }, "2026-09-26T01:05:00.000Z");

    const listed = store.metrics.list(eventId);
    assert.deepEqual(
      listed.map((s) => s.metrics.view),
      [100, 180, 260],
      "chronological order for trend inspection",
    );

    const lastTwo = store.metrics.list(eventId, { limit: 2 });
    assert.deepEqual(
      lastTwo.map((s) => s.metrics.view),
      [180, 260],
      "limit keeps the most recent observations",
    );
  });
});

test("the Bilibili danmaku extension key is accepted", () => {
  withStore((store) => {
    const { eventId } = seedEvent(store);
    store.metrics.add(eventId, { danmaku: 42 }, "2026-09-26T01:00:00.000Z");
    assert.deepEqual(store.metrics.list(eventId)[0]?.metrics, { danmaku: 42 });
  });
});

test("metric keys are a closed enum and values must be numbers", () => {
  withStore((store) => {
    const { eventId } = seedEvent(store);
    assert.throws(() => store.metrics.add(eventId, { hearts: 1 } as never));
    assert.throws(() => store.metrics.add(eventId, { view: "lots" } as never));
    assert.throws(() => store.metrics.add(eventId, { view: Number.NaN }));
  });
});

test("snapshots require an existing event", () => {
  withStore((store) => {
    assert.throws(() => store.metrics.add("missing", { view: 1 }));
  });
});

test("deleting the watchpoint cascades events and their snapshots", () => {
  withStore((store) => {
    const { eventId, watchpointId } = seedEvent(store);
    store.metrics.add(eventId, { view: 1 }, "2026-09-26T01:00:00.000Z");
    store.metrics.add(eventId, { view: 2 }, "2026-09-26T02:00:00.000Z");
    assert.equal(store.metrics.list(eventId).length, 2);

    store.watchpoints.remove(watchpointId);
    assert.equal(
      store.metrics.list(eventId).length,
      0,
      "orphaned snapshots must not survive watchpoint deletion",
    );
  });
});

test("empty metrics are rejected at the repo boundary", () => {
  withStore((store) => {
    const { eventId } = seedEvent(store);
    assert.throws(() => store.metrics.add(eventId, {}));
  });
});
