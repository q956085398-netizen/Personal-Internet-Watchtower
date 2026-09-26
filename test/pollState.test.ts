import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "../src/persistence/store.ts";

function withStore(run: (store: ReturnType<typeof openStore>) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "watchtower-state-"));
  const store = openStore(join(dir, "watchtower.sqlite3"));
  try {
    run(store);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

function makeWatchpoint(store: ReturnType<typeof openStore>): string {
  return store.watchpoints.create({
    connectorId: "nga",
    kind: "board",
    displayName: "测试板块",
    params: { fid: "650" },
    intervalSeconds: 600,
  }).id;
}

test("state is undefined before the first poll", () => {
  withStore((store) => {
    const id = makeWatchpoint(store);
    assert.equal(store.pollState.get(id), undefined);
  });
});

test("recordPollSuccess stores watermark and last success", () => {
  withStore((store) => {
    const id = makeWatchpoint(store);
    const watermark = JSON.stringify({ lastTid: 12345 });
    store.pollState.recordSuccess(id, { state: watermark, at: "2026-09-26T01:00:00.000Z" });

    const state = store.pollState.get(id);
    assert.ok(state);
    assert.equal(state.watermark, watermark);
    assert.equal(state.lastSuccessAt, "2026-09-26T01:00:00.000Z");
    assert.equal(state.consecutiveFailures, 0);
    assert.equal(state.lastErrorAt, null);
  });
});

test("watermark round-trips as an opaque string", () => {
  withStore((store) => {
    const id = makeWatchpoint(store);
    const opaque = "gASVopaque==base64/中文 + spaces";
    store.pollState.recordSuccess(id, { state: opaque, at: "2026-09-26T01:00:00.000Z" });
    store.pollState.recordSuccess(id, { state: "next", at: "2026-09-26T01:10:00.000Z" });
    assert.equal(store.pollState.get(id)?.watermark, "next");
  });
});

test("recordPollFailure increments consecutive failures and keeps last success", () => {
  withStore((store) => {
    const id = makeWatchpoint(store);
    store.pollState.recordSuccess(id, { state: "w1", at: "2026-09-26T01:00:00.000Z" });
    store.pollState.recordFailure(id, {
      reason: "rate_limited",
      message: "触发反爬，稍后重试",
      at: "2026-09-26T01:05:00.000Z",
    });
    store.pollState.recordFailure(id, {
      reason: "temporary_failure",
      message: "网络错误",
      at: "2026-09-26T01:10:00.000Z",
    });

    const state = store.pollState.get(id);
    assert.ok(state);
    assert.equal(state.lastSuccessAt, "2026-09-26T01:00:00.000Z");
    assert.equal(state.watermark, "w1", "watermark must only change on success");
    assert.equal(state.lastErrorAt, "2026-09-26T01:10:00.000Z");
    assert.equal(state.lastErrorReason, "temporary_failure");
    assert.equal(state.lastErrorMessage, "网络错误");
    assert.equal(state.consecutiveFailures, 2);
  });
});

test("success after failures resets the consecutive counter but keeps last error visible", () => {
  withStore((store) => {
    const id = makeWatchpoint(store);
    store.pollState.recordFailure(id, {
      reason: "auth_error",
      message: "Cookie 过期",
      at: "2026-09-26T01:00:00.000Z",
    });
    store.pollState.recordSuccess(id, { state: "w2", at: "2026-09-26T01:30:00.000Z" });

    const state = store.pollState.get(id);
    assert.ok(state);
    assert.equal(state.consecutiveFailures, 0);
    assert.equal(state.lastSuccessAt, "2026-09-26T01:30:00.000Z");
    assert.equal(state.lastErrorReason, "auth_error", "last error stays queryable for status UI");
    assert.equal(state.lastErrorMessage, "Cookie 过期");
    assert.equal(state.lastErrorAt, "2026-09-26T01:00:00.000Z");
    assert.equal(state.watermark, "w2");
  });
});

test("failure reasons are a closed enum", () => {
  withStore((store) => {
    const id = makeWatchpoint(store);
    assert.throws(() =>
      store.pollState.recordFailure(id, {
        reason: "site_broken" as never,
        message: "x",
        at: "2026-09-26T01:00:00.000Z",
      }),
    );
  });
});

test("recording state for an unknown watchpoint is rejected", () => {
  withStore((store) => {
    assert.throws(() =>
      store.pollState.recordSuccess("missing", { state: null, at: "2026-09-26T01:00:00.000Z" }),
    );
  });
});

test("deleting the watchpoint cascades its runtime state", () => {
  withStore((store) => {
    const id = makeWatchpoint(store);
    store.pollState.recordSuccess(id, { state: "w", at: "2026-09-26T01:00:00.000Z" });
    store.watchpoints.remove(id);
    assert.equal(store.pollState.get(id), undefined);
  });
});
