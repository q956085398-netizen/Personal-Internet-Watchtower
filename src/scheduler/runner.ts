import type { Connector, ConnectorCredentials, PollContext, PollFailure, PollResult, PollSuccess } from "../contract.ts";
import type { Store } from "../persistence/index.ts";
import type { PollFailureReason, Watchpoint } from "../persistence/types.ts";
import type { ConnectorRegistry } from "../registry.ts";
import {
  DEFAULT_POLL_TIMEOUT_MS,
  MAX_EVENTS_PER_POLL,
  computeNextDelaySeconds,
  isTerminalFailure,
} from "./policy.ts";

/**
 * The Connector runner (issue #10): one process, one SQLite store, N
 * connectors. A tick scans every active Watchpoint, launches the due ones and
 * records each outcome through the persistence layer — so scheduling state
 * (watermark, failures, next due time) survives restarts. Per ADR-0001 §3 the
 * runner's only frequency inputs are the Watchpoint interval and the
 * Connector's per-result hints, all clamped by the policy module.
 */

export type SkipReason = "unknown_watchpoint" | "no_connector" | "paused" | "in_flight";

export type AttemptOutcome =
  | { status: "success"; insertedEvents: number; updatedEvents: number; nextDueAt: string }
  | { status: "failure"; reason: PollFailureReason; message: string; nextDueAt: string | null }
  | { status: "skipped"; reason: SkipReason };

export interface SchedulerOptions {
  store: Store;
  registry: ConnectorRegistry;
  /** Resolves Connector-scoped credentials; wired to the secrets store (#3). */
  resolveCredentials?: (connectorId: string) => ConnectorCredentials | null;
  /** Injected clock; defaults to the system time. */
  now?: () => Date;
  /** Per-poll timeout; a hung poll is demoted to a temporary failure. */
  pollTimeoutMs?: number;
  /** How often the runner scans for due Watchpoints. */
  tickMs?: number;
  /** Hook for unexpected runner-internal errors (never for poll failures). */
  onError?: (error: unknown) => void;
}

export interface Scheduler {
  /**
   * Scans every active Watchpoint and launches the due ones; resolves when
   * all launched attempts have settled. Safe to call concurrently — the
   * in-flight guard prevents re-entry.
   */
  tick(): Promise<void>;
  /**
   * Manual trigger (#15's "retry" path): bypasses due times and terminal
   * errors, but not the paused or in-flight guards. The operator's explicit
   * attempt is the recovery signal for a terminally-errored Watchpoint: any
   * settled manual attempt — success, or a transient/rate-limited failure —
   * reopens automatic scheduling (pause instead to keep it closed).
   */
  runNow(watchpointId: string): Promise<AttemptOutcome>;
  start(): void;
  /** Stops the timer and waits for in-flight attempts to settle. */
  stop(): Promise<void>;
  readonly isRunning: boolean;
}

const TIMEOUT: unique symbol = Symbol("poll-timeout");

function addSeconds(at: Date, seconds: number): string {
  return new Date(at.getTime() + seconds * 1000).toISOString();
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Core-side gate for the "credentials missing" error (issue #3): a kind that
 * requires credentials is never polled with a null context the Connector
 * cannot use. Recorded as auth_error (ADR-0001 §3), which stops automatic
 * scheduling until credentials are configured and the user re-runs manually.
 */
function missingCredentialsMessage(connectorId: string, connector: Connector): string {
  const fields = connector.metadata.credentials?.fields.map((field) => field.name) ?? [];
  const expected = fields.length > 0 ? ` (expected fields: ${fields.join(", ")})` : "";
  return (
    `missing credentials for connector "${connectorId}"${expected}: configure them in the ` +
    `secrets file or via WATCHTOWER_SECRET_* environment variables (docs/SECRETS.md)`
  );
}

function assertPositiveOption(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive integer, got ${value}`);
  }
}

export function createScheduler(options: SchedulerOptions): Scheduler {
  const { store, registry } = options;
  const now = options.now ?? (() => new Date());
  const resolveCredentials = options.resolveCredentials ?? (() => null);
  const onError = options.onError ?? ((error: unknown) => {
    console.error("[scheduler] unexpected error:", error);
  });
  const pollTimeoutMs = options.pollTimeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
  const tickMs = options.tickMs ?? 15_000;
  assertPositiveOption(pollTimeoutMs, "pollTimeoutMs");
  assertPositiveOption(tickMs, "tickMs");

  /**
   * Tracks the *underlying* poll promise per watchpoint, not the attempt
   * outcome: after a timeout the abandoned poll may still be running, and a
   * new attempt must not re-enter the Connector until it has drained
   * (ADR-0001 §3's at-least-once tolerance does not mean concurrent polls).
   */
  const inFlight = new Map<string, Promise<unknown>>();
  let timer: ReturnType<typeof setInterval> | undefined;

  function recordFailure(
    watchpoint: Watchpoint,
    before: ReturnType<Store["pollState"]["get"]>,
    reason: PollFailureReason,
    message: string,
    retryAfterSeconds?: number,
  ): AttemptOutcome {
    const at = now();
    const delay = computeNextDelaySeconds({
      intervalSeconds: watchpoint.intervalSeconds,
      consecutiveFailures: (before?.consecutiveFailures ?? 0) + 1,
      outcome: { kind: "failure", reason, retryAfterSeconds },
    });
    const nextDueAt = delay === null ? null : addSeconds(at, delay);
    store.pollState.recordFailure(watchpoint.id, {
      reason,
      message,
      at: at.toISOString(),
      nextDueAt,
    });
    return { status: "failure", reason, message, nextDueAt };
  }

  function recordSuccess(
    watchpoint: Watchpoint,
    result: PollSuccess,
    before: ReturnType<Store["pollState"]["get"]>,
  ): AttemptOutcome {
    const at = now();
    const events = result.events.slice(0, MAX_EVENTS_PER_POLL);
    const inputs = events.map((event, index) => {
      if (event.connectorId !== watchpoint.connectorId) {
        throw new TypeError(
          `event ${index} connectorId ${JSON.stringify(event.connectorId)} does not match ` +
            `watchpoint connector ${JSON.stringify(watchpoint.connectorId)}`,
        );
      }
      // EventInput is ConnectorEvent minus connectorId; the persistence layer
      // normalizes omitted optional fields, so the rest passes through as-is.
      const { connectorId: _validated, ...input } = event;
      return input;
    });
    const upsert = store.events.upsert(watchpoint.id, inputs);
    const delay = computeNextDelaySeconds({
      intervalSeconds: watchpoint.intervalSeconds,
      consecutiveFailures: 0,
      outcome: { kind: "success", nextPollHintSeconds: result.nextPollHintSeconds },
    });
    // Success never yields a terminal delay, so the hint is always a number.
    const nextDueAt = addSeconds(at, delay as number);
    // An omitted watermark means "nothing new": keep the previous one verbatim.
    store.pollState.recordSuccess(watchpoint.id, {
      state: result.state ?? before?.watermark ?? null,
      at: at.toISOString(),
      nextDueAt,
    });
    return { status: "success", insertedEvents: upsert.inserted, updatedEvents: upsert.updated, nextDueAt };
  }

  async function attempt(watchpoint: Watchpoint): Promise<AttemptOutcome> {
    const connector = registry.get(watchpoint.connectorId);
    if (!connector) {
      return { status: "skipped", reason: "no_connector" };
    }
    if (inFlight.has(watchpoint.id)) {
      return { status: "skipped", reason: "in_flight" };
    }

    const kind = registry.kindOf(watchpoint.connectorId, watchpoint.kind);
    const before = store.pollState.get(watchpoint.id);
    const requiresCredentials = kind?.requiresCredentials === true;
    const credentials = requiresCredentials ? (resolveCredentials(watchpoint.connectorId) ?? null) : null;
    if (requiresCredentials && (credentials === null || Object.keys(credentials).length === 0)) {
      return recordFailure(
        watchpoint,
        before,
        "auth_error",
        missingCredentialsMessage(watchpoint.connectorId, connector),
      );
    }
    const ctx: PollContext = {
      now: now(),
      credentials,
      state: before?.watermark ?? null,
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<typeof TIMEOUT>((resolve) => {
      timer = setTimeout(() => resolve(TIMEOUT), pollTimeoutMs);
    });

    let result: PollResult | typeof TIMEOUT;
    try {
      const pollPromise = connector.poll(watchpoint, ctx);
      const tracked = pollPromise.catch(() => {});
      inFlight.set(watchpoint.id, tracked);
      void tracked.then(() => {
        if (inFlight.get(watchpoint.id) === tracked) inFlight.delete(watchpoint.id);
      });
      result = await Promise.race([pollPromise, timeoutPromise]);
    } catch (error) {
      // Uncaught Connector exceptions — a rejected poll promise or one thrown
      // synchronously — are temporary failures (ADR-0001 §3), so runNow()
      // callers get a failure outcome instead of a rejected promise.
      return recordFailure(watchpoint, before, "temporary_failure", `poll threw: ${describeError(error)}`);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }

    if (result === TIMEOUT) {
      return recordFailure(watchpoint, before, "temporary_failure", `poll timed out after ${pollTimeoutMs}ms`);
    }
    if (typeof result !== "object" || result === null) {
      return recordFailure(watchpoint, before, "temporary_failure", "connector poll returned a non-object result");
    }
    const ok = (result as { ok?: unknown }).ok;
    if (ok !== true && ok !== false) {
      return recordFailure(
        watchpoint,
        before,
        "temporary_failure",
        "connector poll returned a malformed result (missing boolean ok)",
      );
    }
    if (ok === false) {
      const failure = result as PollFailure;
      return recordFailure(watchpoint, before, failure.reason, failure.message, failure.retryAfterSeconds);
    }
    const success = result as PollSuccess;
    if (!Array.isArray(success.events)) {
      return recordFailure(
        watchpoint,
        before,
        "temporary_failure",
        "connector poll result with ok=true is missing an events array",
      );
    }
    try {
      return recordSuccess(watchpoint, success, before);
    } catch (error) {
      // Invalid event batches (contract violations) fail the whole attempt.
      return recordFailure(watchpoint, before, "temporary_failure", describeError(error));
    }
  }

  async function tick(): Promise<void> {
    const watchpoints = store.watchpoints.list({ status: "active" });
    const launches: Promise<void>[] = [];
    for (const watchpoint of watchpoints) {
      if (inFlight.has(watchpoint.id)) continue;
      const state = store.pollState.get(watchpoint.id);
      if (isTerminalFailure(state)) continue;
      const nextDueAt = state?.nextDueAt;
      if (nextDueAt !== null && nextDueAt !== undefined && now().getTime() < Date.parse(nextDueAt)) continue;
      launches.push(
        attempt(watchpoint).then(
          () => {},
          (error: unknown) => onError(error),
        ),
      );
    }
    await Promise.all(launches);
  }

  return {
    tick,

    async runNow(watchpointId: string): Promise<AttemptOutcome> {
      const watchpoint = store.watchpoints.get(watchpointId);
      if (!watchpoint) {
        return { status: "skipped", reason: "unknown_watchpoint" };
      }
      if (watchpoint.status !== "active") {
        return { status: "skipped", reason: "paused" };
      }
      return attempt(watchpoint);
    },

    start(): void {
      if (timer !== undefined) return;
      timer = setInterval(() => {
        void tick().catch(onError);
      }, tickMs);
    },

    async stop(): Promise<void> {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
      await Promise.allSettled([...inFlight.values()]);
    },

    get isRunning(): boolean {
      return timer !== undefined;
    },
  };
}
