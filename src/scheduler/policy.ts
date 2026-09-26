import type { PollFailureReason } from "../persistence/types.ts";

/**
 * Scheduling policy for the Connector runner (issue #10), as pure functions.
 *
 * Inputs are exactly the two frequency hints the contract provides
 * (ADR-0001 §3): the Watchpoint's configured `interval_seconds` — the kind's
 * `defaultIntervalSeconds` is what a Watchpoint is created with, resolved by
 * the add-watchpoint flow (#15) — and, per outcome, the Connector's
 * `next_poll_hint_seconds` / `retry_after_seconds`. Everything clamps to the
 * same safe bounds; terminal failures are excluded from automatic scheduling.
 */

/** ADR-0001 §3: scheduler clamps to [MIN_INTERVAL, MAX_INTERVAL]. */
export const MIN_INTERVAL_SECONDS = 60;
export const MAX_INTERVAL_SECONDS = 86400;

/** ADR-0001 §3/§4: Core truncates a poll batch to 50; Connectors should send ≤ 30. */
export const MAX_EVENTS_PER_POLL = 50;

/** Default per-poll timeout; a hung Connector must not stall the runner. */
export const DEFAULT_POLL_TIMEOUT_MS = 30_000;

export function clampIntervalSeconds(seconds: number): number {
  return Math.min(Math.max(seconds, MIN_INTERVAL_SECONDS), MAX_INTERVAL_SECONDS);
}

export type SchedulingOutcome =
  | { kind: "success"; nextPollHintSeconds?: number }
  | { kind: "failure"; reason: PollFailureReason; retryAfterSeconds?: number };

export interface NextDelayInput {
  /** Watchpoint's configured interval, before clamping. */
  intervalSeconds: number;
  /** Consecutive-failure count *after* recording the outcome being scheduled. */
  consecutiveFailures: number;
  outcome: SchedulingOutcome;
}

/**
 * Seconds until the next automatic attempt, or null for a terminal failure
 * (auth_error / permanent_failure): those are excluded from automatic
 * scheduling until a manual re-run succeeds (ADR-0001 §3).
 */
export function computeNextDelaySeconds(input: NextDelayInput): number | null {
  const { intervalSeconds, consecutiveFailures, outcome } = input;
  if (outcome.kind === "success") {
    return clampIntervalSeconds(outcome.nextPollHintSeconds ?? intervalSeconds);
  }
  switch (outcome.reason) {
    case "rate_limited": {
      // "Not earlier than retry_after_seconds" (ADR-0001 §3). The [MIN, MAX]
      // clamp is ADR-sanctioned for the interval and next_poll_hint only —
      // never for retry_after, so this is floored, not clamped: honoring a
      // retry_after above the ceiling must not poll any sooner.
      return Math.max(MIN_INTERVAL_SECONDS, outcome.retryAfterSeconds ?? intervalSeconds);
    }
    case "temporary_failure": {
      const failures = Math.max(consecutiveFailures, 1);
      return Math.min(clampIntervalSeconds(intervalSeconds) * 2 ** (failures - 1), MAX_INTERVAL_SECONDS);
    }
    case "auth_error":
    case "permanent_failure":
      return null;
  }
}

export interface TerminalFailureProbe {
  consecutiveFailures: number;
  lastErrorReason: PollFailureReason | null;
}

/**
 * True when the recorded state represents an unrecovered terminal failure.
 * A later success resets `consecutiveFailures` to 0 while keeping the
 * historical error visible, so the counter is what separates "still broken"
 * from "recovered at T, last failure was X".
 */
export function isTerminalFailure(state: TerminalFailureProbe | undefined): boolean {
  if (!state || state.consecutiveFailures <= 0) return false;
  return state.lastErrorReason === "auth_error" || state.lastErrorReason === "permanent_failure";
}
