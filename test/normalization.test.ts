import assert from "node:assert/strict";
import { test } from "node:test";
import { openStore, type Store } from "../src/persistence/index.ts";
import type { EventInput } from "../src/persistence/events.ts";
import { createConnectorRegistry } from "../src/registry.ts";
import {
  CONTRACT_VERSION,
  type Connector,
  type Capability,
  type WatchpointKind,
} from "../src/contract.ts";
import { createScheduler } from "../src/scheduler/runner.ts";

/**
 * Normalization / dedup acceptance (issue #11):
 *
 * - 三种 Connector 输出可进入同一 schema
 * - 重复 poll 不产生重复卡片（at-least-once 容忍）
 * - 更新中的 live / metric 状态更新原 item，不新增卡片
 * - 一条内容一个 Event，不产出聚合摘要
 * - 每条 item 有可解释 reason
 */

/** Stand-in for the registry wiring: (connector, kind) → exercised capability. */
const EXERCISES: Record<string, Capability> = {
  "nga/board": "latest",
  "bilibili/following_updates": "following_updates",
  "bilibili/live_status": "live_status",
  "lkong/forum": "latest",
};

function exercisesOf(connectorId: string, kind: string) {
  return EXERCISES[`${connectorId}/${kind}`];
}

function withStore(run: (store: Store) => void): void {
  const store = openStore(":memory:", { resolveExercises: exercisesOf });
  try {
    run(store);
  } finally {
    store.close();
  }
}

function addWatchpoint(store: Store, connectorId: string, kind: string): string {
  return store.watchpoints.create({
    connectorId,
    kind,
    displayName: `${connectorId} · ${kind}`,
    params: {},
    intervalSeconds: 600,
  }).id;
}

test("three connector output shapes normalize into one schema and derive the right sections", () => {
  withStore((store) => {
    const board = addWatchpoint(store, "nga", "board");
    const up = addWatchpoint(store, "bilibili", "following_updates");
    const live = addWatchpoint(store, "bilibili", "live_status");
    const forum = addWatchpoint(store, "lkong", "forum");

    store.events.upsert(board, [{
      eventType: "hot_item",
      discoveredAt: "2026-09-26T03:00:00.000Z",
      title: "版面出现热帖",
      url: "https://bbs.nga.cn/read.php?tid=77",
      reason: "你常看的板块出现新热帖",
      externalId: "tid-77",
      metadata: { board_name: "舰col", replies: 87 },
    }]);
    store.events.upsert(up, [{
      eventType: "new_item",
      discoveredAt: "2026-09-26T02:00:00.000Z",
      title: "新视频：av12345",
      url: "https://www.bilibili.com/video/BV1xx411c7mD",
      reason: "你关注的 UP 更新了",
      externalId: "BV1xx411c7mD",
      author: "某UP主",
      publishedAt: "2026-09-26T01:30:00.000Z",
      metrics: { view: 1234, like: 56, danmaku: 7 },
    }]);
    store.events.upsert(live, [{
      eventType: "live_started",
      discoveredAt: "2026-09-26T01:00:00.000Z",
      title: "开播了：联合唱歌回",
      url: "https://live.bilibili.com/6",
      reason: "你关注的主播开播了",
      externalId: "room-6",
    }]);
    store.events.upsert(forum, [{
      eventType: "new_item",
      discoveredAt: "2026-09-26T00:30:00.000Z",
      title: "版块新帖",
      url: "https://www.lkong.com/thread/9",
      reason: "你常看的版块出现新帖",
      externalId: "thread-9",
      metadata: { forum_name: "闲话", is_digest: false },
    }]);

    const feed = store.feed.listFeed();
    assert.equal(feed.length, 4, "one content item = one event, not an aggregated summary");
    for (const item of feed) {
      for (const field of [
        "id", "dedupKey", "connectorId", "watchpointId", "eventType",
        "discoveredAt", "title", "url", "reason", "externalId",
      ] as const) {
        assert.ok(item[field], `unified schema field ${field} is present`);
      }
    }
    assert.deepEqual(
      feed.map((item) => [item.connectorId, item.eventType, item.section]),
      [
        ["bilibili", "new_item", "following"],
        ["bilibili", "live_started", "following"],
        ["nga", "hot_item", "worth"],
        ["lkong", "new_item", "worth"],
      ],
    );
  });
});

test("repeat polls collapse onto the same cards (at-least-once re-poll tolerance)", () => {
  withStore((store) => {
    const board = addWatchpoint(store, "nga", "board");
    const batch = (discoveredAt: string, suffix: string): EventInput[] =>
      ["帖 A", "帖 B", "帖 C"].map((title, i) => ({
        eventType: "new_item" as const,
        discoveredAt,
        title: `${title}${suffix}`,
        url: `https://bbs.nga.cn/read.php?tid=${i + 1}`,
        reason: "你常看的板块出现新帖",
        externalId: `tid-${i + 1}`,
      }));

    const first = store.events.upsert(board, batch("2026-09-26T01:00:00.000Z", ""));
    assert.equal(first.inserted, 3);
    const second = store.events.upsert(board, batch("2026-09-26T01:10:00.000Z", "（编辑）"));
    const third = store.events.upsert(board, batch("2026-09-26T01:20:00.000Z", "（编辑）"));
    assert.deepEqual(
      { second: [second.inserted, second.updated], third: [third.inserted, third.updated] },
      { second: [0, 3], third: [0, 3] },
    );
    assert.equal(store.events.list({ watchpointId: board }).length, 3, "no duplicate cards");

    const feed = store.feed.listFeed({ section: "worth" });
    assert.equal(feed.length, 3);
    assert.equal(feed.find((item) => item.externalId === "tid-1")?.title, "帖 A（编辑）");
    assert.equal(
      feed.find((item) => item.externalId === "tid-1")?.discoveredAt,
      "2026-09-26T01:20:00.000Z",
      "discovered_at reflects the latest observation",
    );
  });
});

test("metric growth updates the original item instead of adding a card", () => {
  withStore((store) => {
    const up = addWatchpoint(store, "bilibili", "following_updates");
    const base = {
      eventType: "new_item" as const,
      discoveredAt: "2026-09-26T02:00:00.000Z",
      title: "新视频",
      url: "https://www.bilibili.com/video/BV1xx411c7mD",
      reason: "你关注的 UP 更新了",
      externalId: "BV1xx411c7mD",
    };
    const first = store.events.upsert(up, [{ ...base, metrics: { view: 100, like: 10 } }]);
    const second = store.events.upsert(up, [{ ...base, metrics: { view: 900, like: 88 } }]);

    assert.deepEqual({ inserted: second.inserted, updated: second.updated }, { inserted: 0, updated: 1 });
    assert.equal(second.records[0]?.id, first.records[0]?.id, "the original item is updated in place");
    assert.deepEqual(second.records[0]?.metrics, { view: 900, like: 88 });
    assert.equal(store.feed.listFeed({ section: "following" }).length, 1);
  });
});

test("a partial re-observation preserves the optional fields it does not supply", () => {
  withStore((store) => {
    const up = addWatchpoint(store, "bilibili", "following_updates");
    const base = {
      eventType: "new_item" as const,
      discoveredAt: "2026-09-26T02:00:00.000Z",
      title: "新视频",
      url: "https://www.bilibili.com/video/BV1xx411c7mD",
      reason: "你关注的 UP 更新了",
      externalId: "BV1xx411c7mD",
    };
    store.events.upsert(up, [{
      ...base,
      author: "某UP主",
      publishedAt: "2026-09-26T01:30:00.000Z",
      summary: "视频简介",
      metrics: { view: 100 },
      metadata: { duration: 300 },
    }]);
    const [refreshed] = store.events.upsert(up, [{ ...base, metrics: { view: 900 } }]).records;

    assert.equal(refreshed?.author, "某UP主");
    assert.equal(refreshed?.publishedAt, "2026-09-26T01:30:00.000Z", "omitted optional fields survive the update");
    assert.equal(refreshed?.summary, "视频简介");
    assert.deepEqual(refreshed?.metadata, { duration: 300 });
    assert.deepEqual(refreshed?.metrics, { view: 900 }, "observed fields still update");
  });
});

test("a still-live re-observation updates the original card; live_ended opens a new one", () => {
  withStore((store) => {
    const live = addWatchpoint(store, "bilibili", "live_status");
    const base = {
      discoveredAt: "2026-09-26T01:00:00.000Z",
      title: "开播了：联合唱歌回",
      url: "https://live.bilibili.com/6",
      reason: "你关注的主播开播了",
      externalId: "room-6",
    };
    const started = store.events.upsert(live, [
      { ...base, eventType: "live_started" as const, metrics: { view: 500 } },
    ]);
    const stillLive = store.events.upsert(live, [
      { ...base, eventType: "live_started" as const, discoveredAt: "2026-09-26T01:10:00.000Z", metrics: { view: 620 } },
    ]);
    assert.equal(
      stillLive.records[0]?.id,
      started.records[0]?.id,
      "still-live re-observation updates the card",
    );
    assert.deepEqual(stillLive.records[0]?.metrics, { view: 620 });

    const ended = store.events.upsert(live, [{
      ...base,
      eventType: "live_ended" as const,
      discoveredAt: "2026-09-26T02:00:00.000Z",
      title: "直播结束",
      reason: "你关注的主播下播了",
    }]);
    assert.equal(ended.inserted, 1, "event_type is part of the dedup key: ended is a new card");
    assert.deepEqual(
      store.feed.listFeed({ section: "following" }).map((item) => item.eventType),
      ["live_ended", "live_started"],
    );
  });
});

test("runner → feed: poll results surface with derived sections", async () => {
  function makeConnector(id: string, kinds: WatchpointKind[], events: Connector["poll"]): Connector {
    return {
      metadata: {
        id,
        displayName: id,
        homeUrl: `https://${id}.example.com`,
        contractVersion: CONTRACT_VERSION,
      },
      capabilities: () => kinds.map((k) => k.exercises),
      watchpointKinds: () => kinds,
      poll: events,
    };
  }

  const registry = createConnectorRegistry();
  registry.register(makeConnector("nga", [{
    kind: "board",
    displayName: "板块新帖",
    exercises: "latest",
    defaultIntervalSeconds: 600,
    requiresCredentials: false,
    params: [],
  }], async () => ({
    ok: true,
    events: [{
      connectorId: "nga",
      eventType: "hot_item",
      discoveredAt: "2026-09-26T00:00:00.000Z",
      title: "版面出现热帖",
      url: "https://bbs.nga.cn/read.php?tid=77",
      reason: "你常看的板块出现新热帖",
      externalId: "tid-77",
    }],
  })));
  registry.register(makeConnector("bilibili", [{
    kind: "following_updates",
    displayName: "关注 UP 更新",
    exercises: "following_updates",
    defaultIntervalSeconds: 300,
    requiresCredentials: true,
    params: [],
  }], async () => ({
    ok: true,
    events: [{
      connectorId: "bilibili",
      eventType: "new_item",
      discoveredAt: "2026-09-26T00:00:00.000Z",
      title: "新视频",
      url: "https://www.bilibili.com/video/BV1xx411c7mD",
      reason: "你关注的 UP 更新了",
      externalId: "BV1xx411c7mD",
    }],
  })));

  const store = openStore(":memory:", {
    resolveExercises: (connectorId, kind) => registry.kindOf(connectorId, kind)?.exercises,
  });
  try {
    const scheduler = createScheduler({ store, registry, now: () => new Date(0) });
    const board = store.watchpoints.create({
      connectorId: "nga",
      kind: "board",
      displayName: "板块",
      params: { fid: "650" },
      intervalSeconds: 600,
    }).id;
    const up = store.watchpoints.create({
      connectorId: "bilibili",
      kind: "following_updates",
      displayName: "关注 UP",
      params: {},
      intervalSeconds: 300,
    }).id;

    const boardOutcome = await scheduler.runNow(board);
    const upOutcome = await scheduler.runNow(up);
    assert.equal(boardOutcome.status, "success");
    assert.equal(upOutcome.status, "success");

    assert.deepEqual(
      store.feed.listFeed().map((item) => [item.connectorId, item.section]),
      [["bilibili", "following"], ["nga", "worth"]],
    );
  } finally {
    store.close();
  }
});
