import assert from "node:assert/strict";
import { test } from "node:test";
import { openStore, type Store } from "../src/persistence/index.ts";
import { createConnectorRegistry } from "../src/registry.ts";
import { CONTRACT_VERSION, type Connector, type PollContext, type PollResult } from "../src/contract.ts";
import { createScheduler, type Scheduler } from "../src/scheduler/runner.ts";

/**
 * Scheduler / Connector runner acceptance (issue #10), exercised at the
 * public seam with fake connectors and an injected clock:
 *
 * - 可注册并周期执行多个 Watchpoint
 * - pause 后停止执行，resume 后恢复
 * - 同一 Watchpoint 不重入
 * - 一个任务抛错不影响其他任务
 * - 成功/失败状态持久化
 * - polling interval 可配置且有安全下限
 */

const T0 = Date.parse("2026-09-26T00:00:00.000Z");

function makeClock() {
  let current = T0;
  return {
    now: () => new Date(current),
    advance(seconds: number): void {
      current += seconds * 1000;
    },
    get iso(): string {
      return new Date(current).toISOString();
    },
  };
}

function makePollConnector(poll: Connector["poll"], overrides: Partial<Connector> = {}): Connector {
  const base: Connector = {
    metadata: {
      id: "testsite",
      displayName: "Test Site",
      homeUrl: "https://example.com",
      contractVersion: CONTRACT_VERSION,
    },
    capabilities: () => ["latest"],
    watchpointKinds: () => [
      {
        kind: "board",
        displayName: "板块新帖",
        exercises: "latest",
        defaultIntervalSeconds: 600,
        requiresCredentials: false,
        params: [],
      },
      {
        kind: "account_events",
        displayName: "与我有关",
        exercises: "account_events",
        defaultIntervalSeconds: 300,
        requiresCredentials: true,
        params: [],
      },
    ],
    poll,
  };
  return { ...base, ...overrides };
}

function otherConnector(id: string): Connector {
  return makePollConnector(async () => ({ ok: true, events: [newEvent(`ok-${id}`, id)] }), {
    metadata: { id, displayName: id, homeUrl: `https://${id}.example.com`, contractVersion: CONTRACT_VERSION },
  });
}

function newEvent(externalId: string, connectorId = "testsite") {
  return {
    connectorId,
    eventType: "new_item" as const,
    discoveredAt: new Date(T0).toISOString(),
    title: `事件 ${externalId}`,
    url: `https://example.com/item/${externalId}`,
    reason: "板块出现新帖",
    externalId,
  };
}

interface Harness {
  store: Store;
  scheduler: Scheduler;
  clock: ReturnType<typeof makeClock>;
}

function withHarness(
  connectors: Connector[],
  options: {
    resolveCredentials?: (connectorId: string) => Record<string, string> | null;
    pollTimeoutMs?: number;
    tickMs?: number;
  } = {},
  run: (h: Harness) => Promise<void>,
): Promise<void> {
  const store = openStore(":memory:");
  const registry = createConnectorRegistry();
  for (const connector of connectors) registry.register(connector);
  const clock = makeClock();
  const scheduler = createScheduler({
    store,
    registry,
    now: clock.now,
    resolveCredentials: options.resolveCredentials,
    ...(options.pollTimeoutMs !== undefined ? { pollTimeoutMs: options.pollTimeoutMs } : {}),
    ...(options.tickMs !== undefined ? { tickMs: options.tickMs } : {}),
  });
  return run({ store, scheduler, clock }).finally(() => store.close());
}

function addWatchpoint(
  store: Store,
  overrides: Partial<Parameters<Store["watchpoints"]["create"]>[0]> = {},
): string {
  return store.watchpoints.create({
    connectorId: "testsite",
    kind: "board",
    displayName: "测试板块",
    params: { fid: "650" },
    intervalSeconds: 600,
    ...overrides,
  }).id;
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function waitFor(predicate: () => boolean, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const check = (): void => {
      if (predicate()) return resolve();
      if (Date.now() - started > timeoutMs) return reject(new Error("waitFor timed out"));
      setTimeout(check, 5);
    };
    check();
  });
}

test("one tick polls every active watchpoint and persists success state", async () => {
  await withHarness(
    [makePollConnector(async () => ({ ok: true, events: [newEvent("e1")], state: "w1" })), otherConnector("othersite")],
    {},
    async ({ store, scheduler, clock }) => {
      const wpA = addWatchpoint(store);
      const wpB = addWatchpoint(store, { connectorId: "othersite" });

      await scheduler.tick();

      assert.equal(store.events.list({ watchpointId: wpA }).length, 1);
      const stateA = store.pollState.get(wpA);
      assert.equal(stateA?.watermark, "w1");
      assert.equal(stateA?.lastSuccessAt, clock.iso);
      assert.equal(stateA?.consecutiveFailures, 0);
      assert.equal(stateA?.nextDueAt, new Date(T0 + 600_000).toISOString());
      assert.ok(store.pollState.get(wpB)?.lastSuccessAt, "both watchpoints were polled");
    },
  );
});

test("paused watchpoints are not executed; resume restores execution", async () => {
  await withHarness(
    [makePollConnector(async () => ({ ok: true, events: [] }))],
    {},
    async ({ store, scheduler }) => {
      const id = addWatchpoint(store);

      store.watchpoints.pause(id);
      await scheduler.tick();
      assert.equal(store.pollState.get(id), undefined, "paused watchpoint must not be polled");

      store.watchpoints.resume(id);
      await scheduler.tick();
      assert.ok(store.pollState.get(id)?.lastSuccessAt, "resumed watchpoint is polled again");
    },
  );
});

test("re-entrancy: a second tick during an in-flight poll launches no second poll", async () => {
  const gate = deferred<PollResult>();
  let calls = 0;
  await withHarness(
    [
      makePollConnector(() => {
        calls += 1;
        return gate.promise;
      }),
    ],
    {},
    async ({ store, scheduler }) => {
      addWatchpoint(store);

      const first = scheduler.tick();
      await scheduler.tick();
      gate.resolve({ ok: true, events: [] });
      await first;
      await scheduler.tick();

      assert.equal(calls, 1, "second tick must skip the in-flight watchpoint");
      assert.ok(store.pollState.get(store.watchpoints.list()[0]!.id)?.lastSuccessAt);
    },
  );
});

test("one watchpoint throwing does not affect the others", async () => {
  await withHarness(
    [
      makePollConnector(async () => {
        throw new Error("site exploded");
      }),
      otherConnector("healthy"),
    ],
    {},
    async ({ store, scheduler }) => {
      const broken = addWatchpoint(store);
      const healthy = addWatchpoint(store, { connectorId: "healthy" });

      await scheduler.tick();

      assert.equal(store.pollState.get(broken)?.lastErrorReason, "temporary_failure");
      assert.match(store.pollState.get(broken)?.lastErrorMessage ?? "", /site exploded/);
      assert.equal(store.pollState.get(broken)?.consecutiveFailures, 1);
      assert.equal(store.events.list({ watchpointId: healthy }).length, 1);
      assert.ok(store.pollState.get(healthy)?.lastSuccessAt);
    },
  );
});

test("success persists watermark, last success and the next due time", async () => {
  await withHarness(
    [makePollConnector(async () => ({ ok: true, events: [], state: "w1" }))],
    {},
    async ({ store, scheduler, clock }) => {
      const id = addWatchpoint(store, { intervalSeconds: 300 });

      await scheduler.tick();
      assert.equal(store.pollState.get(id)?.watermark, "w1");
      assert.equal(store.pollState.get(id)?.nextDueAt, new Date(T0 + 300_000).toISOString());

      clock.advance(300);
      await scheduler.tick();
      assert.equal(store.pollState.get(id)?.lastSuccessAt, clock.iso);
    },
  );
});

test("a poll interval below the safety floor is raised to it", async () => {
  await withHarness(
    [makePollConnector(async () => ({ ok: true, events: [] }))],
    {},
    async ({ store, scheduler }) => {
      const id = addWatchpoint(store, { intervalSeconds: 5 });

      await scheduler.tick();
      assert.equal(
        store.pollState.get(id)?.nextDueAt,
        new Date(T0 + 60_000).toISOString(),
        "the [60, 86400] clamp is the scheduler's duty (ADR-0001 §3)",
      );
    },
  );
});

test("a next-poll hint above the ceiling is capped at 86400s", async () => {
  await withHarness(
    [makePollConnector(async () => ({ ok: true, events: [], nextPollHintSeconds: 500_000 }))],
    {},
    async ({ store, scheduler }) => {
      const id = addWatchpoint(store);

      await scheduler.tick();
      assert.equal(store.pollState.get(id)?.nextDueAt, new Date(T0 + 86_400_000).toISOString());
    },
  );
});

test("rate_limited honors retry_after_seconds when scheduling the retry", async () => {
  await withHarness(
    [
      makePollConnector(async () => ({
        ok: false,
        reason: "rate_limited",
        message: "触发反爬",
        retryAfterSeconds: 3600,
      })),
    ],
    {},
    async ({ store, scheduler }) => {
      const id = addWatchpoint(store);

      await scheduler.tick();
      const state = store.pollState.get(id);
      assert.equal(state?.lastErrorReason, "rate_limited");
      assert.equal(state?.consecutiveFailures, 1);
      assert.equal(state?.nextDueAt, new Date(T0 + 3_600_000).toISOString());
    },
  );
});

test("a thrown poll error is demoted to a temporary failure (ADR-0001 §3)", async () => {
  await withHarness(
    [
      makePollConnector(async () => {
        throw new Error("socket hang up");
      }),
    ],
    {},
    async ({ store, scheduler }) => {
      const id = addWatchpoint(store);

      await scheduler.tick();
      const state = store.pollState.get(id);
      assert.equal(state?.lastErrorReason, "temporary_failure");
      assert.match(state?.lastErrorMessage ?? "", /socket hang up/);
      assert.equal(state?.nextDueAt, new Date(T0 + 600_000).toISOString());
    },
  );
});

test("a poll that exceeds the timeout is recorded as a temporary failure and retried later", async () => {
  const gate = deferred<PollResult>();
  await withHarness(
    [makePollConnector(() => gate.promise)],
    { pollTimeoutMs: 20 },
    async ({ store, scheduler, clock }) => {
      const id = addWatchpoint(store);

      await scheduler.tick();
      const state = store.pollState.get(id);
      assert.equal(state?.lastErrorReason, "temporary_failure", "timeout demotes to temporary");
      assert.match(state?.lastErrorMessage ?? "", /timed out/);

      // The abandoned poll settling late must not overwrite the recorded outcome.
      gate.resolve({ ok: true, events: [newEvent("late")], state: "w-late" });
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(store.pollState.get(id)?.watermark, null);
      assert.equal(store.pollState.get(id)?.consecutiveFailures, 1);

      // Once the stale attempt has drained, scheduling resumes.
      clock.advance(600);
      await scheduler.tick();
      assert.equal(store.events.list({ watchpointId: id }).length, 1, "a fresh poll runs");
    },
  );
});

test("a watchpoint that is not yet due is skipped until its next due time", async () => {
  let calls = 0;
  await withHarness(
    [
      makePollConnector(() => {
        calls += 1;
        return Promise.resolve({ ok: true, events: [] });
      }),
    ],
    {},
    async ({ store, scheduler, clock }) => {
      addWatchpoint(store);

      await scheduler.tick();
      await scheduler.tick();
      assert.equal(calls, 1, "immediately after a success the watchpoint is not due");

      clock.advance(600);
      await scheduler.tick();
      assert.equal(calls, 2);
    },
  );
});

test("terminal failures stop automatic scheduling until a manual re-run recovers", async () => {
  let authValid = false;
  let calls = 0;
  await withHarness(
    [
      makePollConnector(() => {
        calls += 1;
        if (!authValid) {
          return Promise.resolve({ ok: false, reason: "auth_error", message: "Cookie 过期" });
        }
        return Promise.resolve({ ok: true, events: [], state: "w-ok" });
      }),
    ],
    {},
    async ({ store, scheduler, clock }) => {
      const id = addWatchpoint(store);

      await scheduler.tick();
      assert.equal(store.pollState.get(id)?.lastErrorReason, "auth_error");

      await scheduler.tick();
      assert.equal(calls, 1, "auth_error stops automatic retries");

      // Manual re-run still fails while the credentials are broken…
      const failed = await scheduler.runNow(id);
      assert.equal(failed.status, "failure");
      assert.equal(
        failed.status === "failure" ? failed.nextDueAt : "wrong branch",
        null,
        "a terminal failure reports no next due time",
      );
      assert.equal(calls, 2);

      // …and recovers scheduling once they are fixed.
      authValid = true;
      const recovered = await scheduler.runNow(id);
      assert.equal(recovered.status, "success");
      assert.equal(store.pollState.get(id)?.consecutiveFailures, 0);

      clock.advance(600);
      await scheduler.tick();
      assert.equal(calls, 4, "automatic scheduling resumed after recovery");
    },
  );
});

test("a terminal failure clears the persisted next due time", async () => {
  let firstPoll = true;
  await withHarness(
    [
      makePollConnector(async () => {
        if (firstPoll) {
          firstPoll = false;
          return { ok: true, events: [], state: "w1" };
        }
        return { ok: false, reason: "auth_error", message: "Cookie 过期" };
      }),
    ],
    {},
    async ({ store, scheduler, clock }) => {
      const id = addWatchpoint(store);

      await scheduler.tick();
      assert.ok(store.pollState.get(id)?.nextDueAt, "success schedules a due time");

      clock.advance(600);
      await scheduler.tick();
      const state = store.pollState.get(id);
      assert.equal(state?.lastErrorReason, "auth_error");
      assert.equal(
        state?.nextDueAt,
        null,
        "the stale due time must not survive a terminal failure",
      );
    },
  );
});

test("permanent_failure is terminal like auth_error", async () => {
  let calls = 0;
  await withHarness(
    [
      makePollConnector(() => {
        calls += 1;
        return Promise.resolve({ ok: false, reason: "permanent_failure", message: "板块已被删除" });
      }),
    ],
    {},
    async ({ store, scheduler }) => {
      addWatchpoint(store);
      await scheduler.tick();
      await scheduler.tick();
      assert.equal(calls, 1);
    },
  );
});

test("runNow bypasses the schedule but not the guards", async () => {
  await withHarness(
    [makePollConnector(async () => ({ ok: true, events: [newEvent("manual")] }))],
    {},
    async ({ store, scheduler }) => {
      const id = addWatchpoint(store);

      const unknown = await scheduler.runNow("missing-wp");
      assert.deepEqual(unknown, { status: "skipped", reason: "unknown_watchpoint" });

      store.watchpoints.pause(id);
      const paused = await scheduler.runNow(id);
      assert.deepEqual(paused, { status: "skipped", reason: "paused" });

      store.watchpoints.resume(id);
      const manual = await scheduler.runNow(id);
      assert.equal(manual.status, "success");
      assert.equal(manual.status === "success" ? manual.insertedEvents : -1, 1);
      assert.equal(store.events.list({ watchpointId: id }).length, 1);
    },
  );
});

test("runNow reports a missing connector instead of throwing", async () => {
  await withHarness([], {}, async ({ store, scheduler }) => {
    const id = addWatchpoint(store, { connectorId: "ghost" });
    const outcome = await scheduler.runNow(id);
    assert.deepEqual(outcome, { status: "skipped", reason: "no_connector" });
    await scheduler.tick();
    assert.equal(store.pollState.get(id), undefined, "ticks skip it without recording anything");
  });
});

test("runNow normalizes a synchronously throwing poll into a failure outcome", async () => {
  await withHarness(
    [
      makePollConnector(() => {
        throw new Error("sync boom");
      }),
    ],
    {},
    async ({ store, scheduler }) => {
      const id = addWatchpoint(store);

      const outcome = await scheduler.runNow(id);
      assert.equal(outcome.status, "failure");
      assert.equal(outcome.status === "failure" ? outcome.reason : "wrong branch", "temporary_failure");
      assert.match(outcome.status === "failure" ? outcome.message : "", /sync boom/);
      assert.equal(store.pollState.get(id)?.lastErrorReason, "temporary_failure");
    },
  );
});

test("a success without a new watermark preserves the previous one", async () => {
  let firstPoll = true;
  await withHarness(
    [
      makePollConnector(async () => {
        if (firstPoll) {
          firstPoll = false;
          return { ok: true, events: [], state: "w1" };
        }
        return { ok: true, events: [] };
      }),
    ],
    {},
    async ({ store, scheduler, clock }) => {
      addWatchpoint(store);
      await scheduler.tick();
      assert.equal(store.pollState.get(store.watchpoints.list()[0]!.id)?.watermark, "w1");

      clock.advance(600);
      await scheduler.tick();
      assert.equal(
        store.pollState.get(store.watchpoints.list()[0]!.id)?.watermark,
        "w1",
        "omitted state must not clobber the stored watermark",
      );
    },
  );
});

test("the connector receives the watchpoint's stored watermark as ctx.state", async () => {
  const seen: (string | null)[] = [];
  await withHarness(
    [
      makePollConnector(async (_watchpoint, ctx) => {
        seen.push(ctx.state);
        return seen.length === 1 ? { ok: true, events: [], state: "w1" } : { ok: true, events: [] };
      }),
    ],
    {},
    async ({ store, scheduler, clock }) => {
      addWatchpoint(store);
      await scheduler.tick();
      clock.advance(600);
      await scheduler.tick();
      assert.deepEqual(seen, [null, "w1"]);
    },
  );
});

test("required credentials are injected into the poll context", async () => {
  const seenCredentials: (Record<string, string> | null)[] = [];
  await withHarness(
    [
      makePollConnector(async (_watchpoint, ctx) => {
        seenCredentials.push(ctx.credentials);
        return { ok: true, events: [] };
      }),
    ],
    { resolveCredentials: () => ({ cookie: "SESSDATA=abc" }) },
    async ({ store, scheduler }) => {
      addWatchpoint(store, { kind: "account_events" });
      await scheduler.tick();
      assert.deepEqual(seenCredentials, [{ cookie: "SESSDATA=abc" }]);
    },
  );
});

test("kinds that do not require credentials get a null credential context", async () => {
  const seenCredentials: (Record<string, string> | null)[] = [];
  await withHarness(
    [
      makePollConnector(async (_watchpoint, ctx) => {
        seenCredentials.push(ctx.credentials);
        return { ok: true, events: [] };
      }),
    ],
    { resolveCredentials: () => ({ cookie: "SESSDATA=abc" }) },
    async ({ store, scheduler }) => {
      addWatchpoint(store);
      await scheduler.tick();
      assert.deepEqual(seenCredentials, [null]);
    },
  );
});

test("a poll batch is truncated to the contract maximum of 50 events", async () => {
  await withHarness(
    [
      makePollConnector(async () => ({
        ok: true,
        events: Array.from({ length: 55 }, (_, i) => newEvent(`bulk-${i}`)),
      })),
    ],
    {},
    async ({ store, scheduler }) => {
      const id = addWatchpoint(store);

      await scheduler.tick();
      assert.equal(store.events.list({ watchpointId: id, limit: 200 }).length, 50);
    },
  );
});

test("events stamped with a foreign connector id fail the attempt", async () => {
  await withHarness(
    [makePollConnector(async () => ({ ok: true, events: [newEvent("e1", "someone-else")] }))],
    {},
    async ({ store, scheduler }) => {
      const id = addWatchpoint(store);

      await scheduler.tick();
      const state = store.pollState.get(id);
      assert.equal(state?.lastErrorReason, "temporary_failure");
      assert.match(state?.lastErrorMessage ?? "", /connectorId/);
      assert.equal(store.events.list({ watchpointId: id }).length, 0);
    },
  );
});

test("a malformed poll result is demoted to a temporary failure", async () => {
  await withHarness(
    [makePollConnector(async () => ({}) as unknown as PollResult)],
    {},
    async ({ store, scheduler }) => {
      const id = addWatchpoint(store);

      await scheduler.tick();
      assert.equal(store.pollState.get(id)?.lastErrorReason, "temporary_failure");
      assert.match(store.pollState.get(id)?.lastErrorMessage ?? "", /ok/);
    },
  );
});

test("start polls periodically and stop drains in-flight work", async () => {
  let calls = 0;
  await withHarness(
    [
      makePollConnector(() => {
        calls += 1;
        return Promise.resolve({ ok: true, events: [] });
      }),
    ],
    { tickMs: 10 },
    async ({ store, scheduler }) => {
      addWatchpoint(store, { intervalSeconds: 60 });
      scheduler.start();
      assert.ok(scheduler.isRunning);
      await waitFor(() => calls >= 1, 1_000);
      await scheduler.stop();
      assert.equal(scheduler.isRunning, false);
      const after = calls;
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.equal(calls, after, "no further ticks after stop");
      assert.ok(store.pollState.get(store.watchpoints.list()[0]!.id)?.lastSuccessAt);
    },
  );
});
