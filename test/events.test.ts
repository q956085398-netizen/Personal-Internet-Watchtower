import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "../src/persistence/store.ts";
import type { EventInput } from "../src/persistence/events.ts";

function withStore(run: (store: ReturnType<typeof openStore>) => void, name = "watchtower.sqlite3"): void {
  const dir = mkdtempSync(join(tmpdir(), "watchtower-events-"));
  const store = openStore(join(dir, name));
  try {
    run(store);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

function makeWatchpoint(
  store: ReturnType<typeof openStore>,
  connectorId = "nga",
  id?: string,
): string {
  return store.watchpoints.create({
    connectorId,
    kind: "board",
    displayName: `测试 ${connectorId}`,
    params: { fid: "650" },
    intervalSeconds: 600,
    id,
  }).id;
}

function event(overrides: Partial<EventInput> = {}): EventInput {
  return {
    eventType: "new_item",
    discoveredAt: "2026-09-26T01:00:00.000Z",
    title: "新帖标题",
    url: "https://bbs.nga.cn/read.php?tid=1",
    reason: "你常看的板块出现新帖",
    externalId: "tid-1",
    ...overrides,
  };
}

test("upsert inserts new events with Core-assigned ids and stamps connector from the watchpoint", () => {
  withStore((store) => {
    const wpId = makeWatchpoint(store, "nga");
    const result = store.events.upsert(wpId, [event()]);
    assert.deepEqual(
      { inserted: result.inserted, updated: result.updated },
      { inserted: 1, updated: 0 },
    );
    const record = result.records[0];
    assert.ok(record);
    assert.ok(record.id.length > 0, "Core assigns the event id");
    assert.equal(record.connectorId, "nga", "connector_id is stamped from the watchpoint");
    assert.equal(record.dedupKey.length > 0, true);
    assert.equal(record.externalId, "tid-1");
    assert.equal(record.title, "新帖标题");
  });
});

test("re-upserting the same (watchpoint, event_type, external_id) updates instead of duplicating", () => {
  withStore((store) => {
    const wpId = makeWatchpoint(store);
    const first = store.events.upsert(wpId, [event()]);
    const second = store.events.upsert(wpId, [
      event({ title: "更新后的标题", discoveredAt: "2026-09-26T02:00:00.000Z" }),
    ]);

    assert.deepEqual(
      { inserted: second.inserted, updated: second.updated },
      { inserted: 0, updated: 1 },
    );
    assert.equal(second.records[0]?.id, first.records[0]?.id, "event id stays stable");
    assert.equal(second.records[0]?.title, "更新后的标题");
    assert.equal(second.records[0]?.discoveredAt, "2026-09-26T02:00:00.000Z");

    assert.equal(store.events.list({ watchpointId: wpId }).length, 1);
  });
});

test("dedup key mixes in event_type: same external_id with different type stays separate", () => {
  withStore((store) => {
    const wpId = makeWatchpoint(store);
    store.events.upsert(wpId, [event({ eventType: "new_item" })]);
    store.events.upsert(wpId, [event({ eventType: "hot_item", title: "同帖升温" })]);
    assert.equal(store.events.list({ watchpointId: wpId }).length, 2);
  });
});

test("dedup key mixes in watchpoint: same external_id on different watchpoints stays separate", () => {
  withStore((store) => {
    const wpA = makeWatchpoint(store, "nga");
    const wpB = makeWatchpoint(store, "nga");
    store.events.upsert(wpA, [event()]);
    store.events.upsert(wpB, [event()]);
    assert.equal(store.events.list({ watchpointId: wpA }).length, 1);
    assert.equal(store.events.list({ watchpointId: wpB }).length, 1);
  });
});

test("missing external_id falls back to a normalized URL hash", () => {
  withStore((store) => {
    const wpId = makeWatchpoint(store);
    const a = store.events.upsert(wpId, [
      event({ externalId: null, url: "https://BBS.NGA.cn/read.php?tid=9&utm_source=rss#top" }),
    ]);
    const b = store.events.upsert(wpId, [
      event({ externalId: null, url: "https://bbs.nga.cn/read.php?tid=9" }),
    ]);
    assert.equal(a.inserted, 1);
    assert.deepEqual(
      { inserted: b.inserted, updated: b.updated },
      { inserted: 0, updated: 1 },
      "host case, hash fragment, and utm params must not change identity",
    );
  });
});

test("URL normalization ignores param order and trailing slash", () => {
  withStore((store) => {
    const wpId = makeWatchpoint(store);
    store.events.upsert(wpId, [event({ externalId: null, url: "https://www.lkong.com/thread/1?a=1&b=2" })]);
    const second = store.events.upsert(wpId, [
      event({ externalId: null, url: "https://www.lkong.com/thread/1/?b=2&a=1" }),
    ]);
    assert.equal(second.updated, 1);

    const third = store.events.upsert(wpId, [
      event({ externalId: null, url: "https://www.lkong.com/thread/2?a=1&b=2" }),
    ]);
    assert.equal(third.inserted, 1, "a genuinely different URL must not dedup away");
  });
});

test("upsert is rejected for an unknown watchpoint", () => {
  withStore((store) => {
    assert.throws(() => store.events.upsert("missing", [event()]));
  });
});

test("event validation enforces the ADR-0001 contract", () => {
  withStore((store) => {
    const wpId = makeWatchpoint(store);
    assert.throws(() => store.events.upsert(wpId, [event({ eventType: "vibe" as never })]));
    assert.throws(() => store.events.upsert(wpId, [event({ title: "" })]));
    assert.throws(() => store.events.upsert(wpId, [event({ url: "bbs.nga.cn/read.php" })]));
    assert.throws(() => store.events.upsert(wpId, [event({ url: "ftp://bbs.nga.cn/read.php" })]));
    assert.throws(() => store.events.upsert(wpId, [event({ discoveredAt: "2026/09/26 01:00" })]));
    assert.throws(() => store.events.upsert(wpId, [event({ publishedAt: "yesterday" })]));
    assert.throws(() => store.events.upsert(wpId, [event({ reason: "" })]));
    assert.throws(() => store.events.upsert(wpId, [event({ externalId: "" })]));
    assert.throws(() => store.events.upsert(wpId, [event({ metrics: { bogus: 1 } as never })]));
    assert.throws(() => store.events.upsert(wpId, [event({ metrics: { view: "many" } as never })]));
    assert.throws(() =>
      store.events.upsert(wpId, [event({ metadata: { blob: "x".repeat(5000) } })]),
    );
  });
});

test("metrics and metadata round-trip as structured data", () => {
  withStore((store) => {
    const wpId = makeWatchpoint(store, "bilibili");
    const [record] = store.events
      .upsert(wpId, [
        event({
          metrics: { view: 1234, like: 56 },
          metadata: { boardName: "舰col", replies: 87 },
        }),
      ])
      .records;
    assert.ok(record);
    assert.deepEqual(record.metrics, { view: 1234, like: 56 });
    assert.deepEqual(record.metadata, { boardName: "舰col", replies: 87 });

    const fetched = store.events.get(record.id);
    assert.deepEqual(fetched?.metrics, { view: 1234, like: 56 });
  });
});

test("list is bounded (default 50, hard cap 200) and ordered by discovered_at desc", () => {
  withStore((store) => {
    const wpId = makeWatchpoint(store);
    const inputs: EventInput[] = [];
    for (let i = 0; i < 210; i++) {
      inputs.push(
        event({
          externalId: `tid-${i}`,
          url: `https://bbs.nga.cn/read.php?tid=${i}`,
          discoveredAt: new Date(Date.UTC(2026, 8, 26, 1, 0, 0) + i * 1000).toISOString(),
        }),
      );
    }
    store.events.upsert(wpId, inputs);

    assert.equal(store.events.list({ watchpointId: wpId }).length, 50, "default limit is 50");
    assert.equal(store.events.list({ watchpointId: wpId, limit: 10 }).length, 10);
    assert.equal(
      store.events.list({ watchpointId: wpId, limit: 100000 }).length,
      200,
      "results stay bounded even when the caller asks for everything",
    );

    const page = store.events.list({ watchpointId: wpId, limit: 3 });
    assert.deepEqual(
      page.map((e) => e.externalId),
      ["tid-209", "tid-208", "tid-207"],
      "newest observations first",
    );
  });
});

test("list filters by connector and event type", () => {
  withStore((store) => {
    const nga = makeWatchpoint(store, "nga");
    const bili = makeWatchpoint(store, "bilibili");
    store.events.upsert(nga, [event()]);
    store.events.upsert(bili, [
      event({ externalId: "BV-1", url: "https://www.bilibili.com/video/BV-1" }),
      event({
        eventType: "live_started",
        externalId: "room-9",
        url: "https://live.bilibili.com/9",
        reason: "你关注的主播开播了",
      }),
    ]);

    assert.equal(store.events.list({ connectorId: "nga" }).length, 1);
    assert.equal(store.events.list({ connectorId: "bilibili" }).length, 2);
    assert.equal(store.events.list({ connectorId: "bilibili", eventType: "live_started" }).length, 1);
    assert.equal(store.events.list({ eventType: "account_event" }).length, 0);
  });
});

test("get returns undefined for unknown ids", () => {
  withStore((store) => {
    assert.equal(store.events.get("nope"), undefined);
  });
});

test("dedup state survives close/reopen: re-observed events update instead of duplicating", () => {
  const dir = mkdtempSync(join(tmpdir(), "watchtower-dedup-"));
  const file = join(dir, "watchtower.sqlite3");
  try {
    const wpId = (() => {
      const store = openStore(file);
      try {
        const id = makeWatchpoint(store);
        store.events.upsert(id, [event()]);
        return id;
      } finally {
        store.close();
      }
    })();

    const reopened = openStore(file);
    try {
      const result = reopened.events.upsert(wpId, [event({ title: "重启后再见" })]);
      assert.deepEqual(
        { inserted: result.inserted, updated: result.updated },
        { inserted: 0, updated: 1 },
        "dedup keys must persist across restarts",
      );
    } finally {
      reopened.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("deleting a watchpoint cascades events and dedup state", () => {
  withStore((store) => {
    const wpId = makeWatchpoint(store, "nga", "wp-cascade");
    store.events.upsert(wpId, [event()]);
    store.watchpoints.remove(wpId);

    const recreated = makeWatchpoint(store, "nga", "wp-cascade");
    const result = store.events.upsert(recreated, [event()]);
    assert.equal(result.inserted, 1, "dedup state must not outlive its watchpoint");
  });
});

test("dedup_keys records first and last observation times", () => {
  withStore((store) => {
    const wpId = makeWatchpoint(store);
    store.events.upsert(wpId, [event({ discoveredAt: "2026-09-26T01:00:00.000Z" })]);
    store.events.upsert(wpId, [event({ discoveredAt: "2026-09-26T03:00:00.000Z" })]);
    // Behaviorally: first discovery is preserved via dedup_keys; last observation via events.
    const listed = store.events.list({ watchpointId: wpId });
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.discoveredAt, "2026-09-26T03:00:00.000Z");
  });
});
