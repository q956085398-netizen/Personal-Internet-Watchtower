import assert from "node:assert/strict";
import { test } from "node:test";
import { openStore, type Store } from "../src/persistence/index.ts";
import { deriveSection } from "../src/persistence/feed.ts";
import type { EventInput } from "../src/persistence/events.ts";
import type { Capability } from "../src/contract.ts";
import { createConnectorRegistry } from "../src/registry.ts";
import { CONTRACT_VERSION, type Connector } from "../src/contract.ts";

/**
 * Dashboard feed acceptance (issue #11), exercised at the store seam:
 *
 * - 固定语义分区：和我有关 / 关注更新 / 值得看看（ADR-0001 §4 推导规则）
 * - 合并 feed 相关性优先，分区内按 freshness
 * - Dashboard 查询有硬性 limit
 * - 空状态自然产生
 * - registry 的 exercises 是唯一分区输入，未注册连接器降级到值得看看
 */

/** Stand-in for the registry wiring: (connector, kind) → exercised capability. */
const EXERCISES: Record<string, Capability> = {
  "nga/board": "latest",
  "nga/account_events": "account_events",
  "bilibili/following_updates": "following_updates",
  "bilibili/live_status": "live_status",
  "lkong/forum": "latest",
};

function exercisesOf(connectorId: string, kind: string): Capability | undefined {
  return EXERCISES[`${connectorId}/${kind}`];
}

function withStore(
  run: (store: Store) => void,
  options: { resolveExercises?: (connectorId: string, kind: string) => Capability | undefined } = {},
): void {
  const store = openStore(":memory:", { resolveExercises: options.resolveExercises ?? exercisesOf });
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

test("deriveSection: account_event is about_me regardless of the kind's capability", () => {
  for (const exercises of ["latest", "hot", "following_updates", "account_events", undefined] as const) {
    assert.equal(deriveSection("account_event", exercises), "about_me");
  }
});

test("deriveSection: kinds exercising following_updates / live_status are following", () => {
  assert.equal(deriveSection("new_item", "following_updates"), "following");
  assert.equal(deriveSection("item_update", "following_updates"), "following");
  assert.equal(deriveSection("live_started", "live_status"), "following");
  assert.equal(deriveSection("live_ended", "live_status"), "following");
});

test("deriveSection: source-level latest/hot kinds are worth (值得看看)", () => {
  assert.equal(deriveSection("new_item", "latest"), "worth");
  assert.equal(deriveSection("hot_item", "hot"), "worth");
  assert.equal(deriveSection("item_update", "metrics"), "worth");
});

test("deriveSection: an unknown kind degrades to worth, never to about_me/following", () => {
  assert.equal(deriveSection("new_item", undefined), "worth");
  assert.equal(deriveSection("hot_item", undefined), "worth");
});

test("an empty store yields an empty feed in the merged view and every section", () => {
  withStore((store) => {
    assert.deepEqual(store.feed.listFeed(), []);
    for (const section of ["about_me", "following", "worth"] as const) {
      assert.deepEqual(store.feed.listFeed({ section }), [], `${section} starts empty`);
    }
  });
});

test("the merged feed is relevance-first (about_me → following → worth), freshness within a section", () => {
  withStore((store) => {
    const board = addWatchpoint(store, "nga", "board");
    const up = addWatchpoint(store, "bilibili", "following_updates");
    const live = addWatchpoint(store, "bilibili", "live_status");
    const account = addWatchpoint(store, "nga", "account_events");

    store.events.upsert(board, [event({
      discoveredAt: "2026-09-26T03:00:00.000Z",
      title: "板块新帖（最新）",
    })]);
    store.events.upsert(up, [event({
      discoveredAt: "2026-09-26T02:00:00.000Z",
      title: "UP 投稿",
    })]);
    store.events.upsert(live, [event({
      eventType: "live_started",
      discoveredAt: "2026-09-26T01:00:00.000Z",
      title: "主播开播",
      externalId: "room-1",
    })]);
    store.events.upsert(account, [event({
      eventType: "account_event",
      discoveredAt: "2026-09-26T00:00:00.000Z",
      title: "有人回复了我",
      externalId: "reply-1",
    })]);

    const feed = store.feed.listFeed();
    assert.deepEqual(
      feed.map((item) => [item.section, item.title]),
      [
        ["about_me", "有人回复了我"],
        ["following", "UP 投稿"],
        ["following", "主播开播"],
        ["worth", "板块新帖（最新）"],
      ],
      "relevance outranks freshness across sections; within following, 02:00 precedes 01:00",
    );
  });
});

test("section filters return only that section, newest first", () => {
  withStore((store) => {
    const board = addWatchpoint(store, "nga", "board");
    const up = addWatchpoint(store, "bilibili", "following_updates");
    const account = addWatchpoint(store, "nga", "account_events");

    store.events.upsert(board, [
      event({ discoveredAt: "2026-09-26T03:00:00.000Z", externalId: "t-1" }),
      event({ discoveredAt: "2026-09-26T04:00:00.000Z", externalId: "t-2" }),
    ]);
    store.events.upsert(up, [event({ discoveredAt: "2026-09-26T02:00:00.000Z", externalId: "bv-1" })]);
    store.events.upsert(account, [event({ eventType: "account_event", externalId: "mention-1" })]);

    const worth = store.feed.listFeed({ section: "worth" });
    assert.deepEqual(worth.map((item) => item.externalId), ["t-2", "t-1"]);
    const following = store.feed.listFeed({ section: "following" });
    assert.deepEqual(following.map((item) => item.externalId), ["bv-1"]);
    const aboutMe = store.feed.listFeed({ section: "about_me" });
    assert.deepEqual(aboutMe.map((item) => item.externalId), ["mention-1"]);
  });
});

test("a watchpoint whose connector is unknown to the resolver degrades to worth", () => {
  withStore(
    (store) => {
      const ghost = addWatchpoint(store, "ghostsite", "board");
      store.events.upsert(ghost, [event({ externalId: "g-1" })]);
      assert.deepEqual(
        store.feed.listFeed({ section: "worth" }).map((item) => item.externalId),
        ["g-1"],
      );
      assert.deepEqual(store.feed.listFeed({ section: "following" }), []);
    },
    { resolveExercises: () => undefined },
  );
});

test("exercises flow from a real ConnectorRegistry through to section derivation", () => {
  const connector: Connector = {
    metadata: {
      id: "testsite",
      displayName: "Test Site",
      homeUrl: "https://example.com",
      contractVersion: CONTRACT_VERSION,
    },
    capabilities: () => ["following_updates"],
    watchpointKinds: () => [
      {
        kind: "followed_uploads",
        displayName: "关注 UP 更新",
        exercises: "following_updates",
        defaultIntervalSeconds: 300,
        requiresCredentials: false,
        params: [],
      },
    ],
    poll: async () => ({ ok: true, events: [] }),
  };
  const registry = createConnectorRegistry();
  registry.register(connector);

  withStore(
    (store) => {
      const wp = addWatchpoint(store, "testsite", "followed_uploads");
      store.events.upsert(wp, [event({ externalId: "bv-9" })]);
      assert.deepEqual(
        store.feed.listFeed({ section: "following" }).map((item) => item.externalId),
        ["bv-9"],
      );
    },
    { resolveExercises: (connectorId, kind) => registry.kindOf(connectorId, kind)?.exercises },
  );
});

test("the default feed limit is 50 and queries are hard-capped at 200", () => {
  withStore((store) => {
    const board = addWatchpoint(store, "nga", "board");
    const batch: EventInput[] = [];
    for (let i = 0; i < 250; i++) {
      batch.push(event({
        discoveredAt: new Date(Date.parse("2026-09-26T00:00:00.000Z") + i * 1000).toISOString(),
        url: `https://bbs.nga.cn/read.php?tid=${i}`,
        externalId: `tid-${i}`,
      }));
    }
    store.events.upsert(board, batch);

    assert.equal(store.feed.listFeed().length, 50, "default limit is 50");
    assert.equal(store.feed.listFeed({ limit: 300 }).length, 200, "hard cap is 200");
    assert.equal(store.feed.listFeed({ section: "worth", limit: 1 }).length, 1);

    for (const bad of [0, -1, 2.5]) {
      assert.throws(
        () => store.feed.listFeed({ limit: bad }),
        TypeError,
        `limit ${bad} must be rejected`,
      );
    }
  });
});

test("the merged feed trims across sections to the limit", () => {
  withStore((store) => {
    const board = addWatchpoint(store, "nga", "board");
    const up = addWatchpoint(store, "bilibili", "following_updates");
    const account = addWatchpoint(store, "nga", "account_events");

    store.events.upsert(board, [
      event({ discoveredAt: "2026-09-26T03:00:00.000Z", externalId: "t-1" }),
      event({ discoveredAt: "2026-09-26T03:30:00.000Z", externalId: "t-2" }),
    ]);
    store.events.upsert(up, [
      event({ discoveredAt: "2026-09-26T02:00:00.000Z", externalId: "bv-1" }),
      event({ discoveredAt: "2026-09-26T02:30:00.000Z", externalId: "bv-2" }),
    ]);
    store.events.upsert(account, [event({ eventType: "account_event", externalId: "mention-1" })]);

    const feed = store.feed.listFeed({ limit: 2 });
    assert.deepEqual(
      feed.map((item) => item.externalId),
      ["mention-1", "bv-2"],
      "about_me first, then the freshest following item; worth is cut off",
    );
  });
});
