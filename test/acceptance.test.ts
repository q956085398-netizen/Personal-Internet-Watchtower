import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "../src/persistence/index.ts";

/**
 * End-to-end walk-through of issue #9's acceptance checklist, simulating one
 * full poll cycle on a file-backed store, then a crash-free "restart".
 */

test("issue #9 acceptance: one full poll cycle across a restart", () => {
  const dir = mkdtempSync(join(tmpdir(), "watchtower-acceptance-"));
  const file = join(dir, "watchtower.sqlite3");

  const watchpointId = "wp-nga-board-650";
  let insertedEventId: string;

  try {
    // —— schema 和 migration 可重复执行 ——
    const first = openStore(file);
    first.close();
    const store = openStore(file);

    // —— Watchpoint CRUD 可落库 ——
    const watchpoint = store.watchpoints.create({
      connectorId: "nga",
      kind: "board",
      displayName: "NGA · 舰col板块",
      params: { fid: "650" },
      intervalSeconds: 600,
      id: watchpointId,
      createdAt: "2026-09-26T00:00:00.000Z",
    });
    assert.equal(watchpoint.status, "active");
    assert.deepEqual(store.watchpoints.get(watchpointId)?.params, { fid: "650" });

    // —— last success / last error 可查询（watermark 透传）——
    store.pollState.recordFailure(watchpointId, {
      reason: "rate_limited",
      message: "触发反爬",
      at: "2026-09-26T00:05:00.000Z",
    });
    assert.equal(store.pollState.get(watchpointId)?.consecutiveFailures, 1);

    const watermark = JSON.stringify({ lastTid: 4242 });
    store.pollState.recordSuccess(watchpointId, {
      state: watermark,
      at: "2026-09-26T00:10:00.000Z",
    });
    const state = store.pollState.get(watchpointId);
    assert.equal(state?.pollState, watermark, "watermark round-trips verbatim");
    assert.equal(state?.lastSuccessAt, "2026-09-26T00:10:00.000Z");
    assert.equal(state?.lastErrorReason, "rate_limited", "last error stays queryable");

    // —— Event upsert / query 可用 ——
    const poll = store.events.upsert(watchpointId, [
      {
        eventType: "hot_item",
        discoveredAt: "2026-09-26T00:10:00.000Z",
        title: "版本讨论热帖",
        url: "https://bbs.nga.cn/read.php?tid=4242",
        reason: "你常看的板块出现新热帖",
        externalId: "tid-4242",
        metadata: { boardName: "舰col", replies: 87 },
      },
      {
        eventType: "new_item",
        discoveredAt: "2026-09-26T00:10:00.000Z",
        title: "普通新帖",
        url: "https://bbs.nga.cn/read.php?tid=4243",
        reason: "你常看的板块出现新帖",
        externalId: "tid-4243",
      },
    ]);
    assert.equal(poll.inserted, 2);
    insertedEventId = poll.records[0]!.id;

    // —— 去重状态可持久化（重启后同键更新而非重复）——
    store.close();
    const reopened = openStore(file);
    const repoll = reopened.events.upsert(watchpointId, [
      {
        eventType: "hot_item",
        discoveredAt: "2026-09-26T00:20:00.000Z",
        title: "版本讨论热帖（87回复）",
        url: "https://bbs.nga.cn/read.php?tid=4242",
        reason: "你常看的板块出现新热帖",
        externalId: "tid-4242",
        metadata: { boardName: "舰col", replies: 88 },
      },
    ]);
    assert.deepEqual(
      { inserted: repoll.inserted, updated: repoll.updated },
      { inserted: 0, updated: 1 },
    );
    assert.equal(reopened.events.list({ watchpointId }).length, 2);

    // —— metric snapshot 可按 item/time 查询 ——
    reopened.metrics.add(insertedEventId, { reply: 87 }, "2026-09-26T00:10:00.000Z");
    reopened.metrics.add(insertedEventId, { reply: 88 }, "2026-09-26T00:20:00.000Z");
    assert.deepEqual(
      reopened.metrics.list(insertedEventId).map((s) => s.metrics.reply),
      [87, 88],
      "snapshots queryable by item, chronological by time",
    );

    // 轻量缓存元数据
    reopened.cache.set("nga:boards", [{ fid: "650", label: "舰col" }], {
      ttlSeconds: 3600,
      at: "2026-09-26T00:10:00.000Z",
    });
    assert.ok(reopened.cache.get("nga:boards", new Date("2026-09-26T00:30:00.000Z")));

    reopened.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
