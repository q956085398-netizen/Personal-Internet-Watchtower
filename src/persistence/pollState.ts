import type { DatabaseSync } from "node:sqlite";
import type { PollFailureReason, WatchpointState } from "./types.ts";
import { requireWatchpointRow } from "./watchpoints.ts";
import { assertEnum, assertIsoDatetime, POLL_FAILURE_REASONS } from "./validation.ts";

export interface RecordSuccessInput {
  /** Opaque watermark from the Connector; stored verbatim, returned verbatim (ADR-0001 §3). */
  state: string | null;
  at: string;
  /**
   * The caller's scheduling decision for the next attempt (issue #10). Omitted
   * preserves whatever was scheduled before — callers that do not decide
   * scheduling must not clobber it. Explicit null clears it (a terminal
   * failure: automatic scheduling is off until a manual re-run succeeds).
   */
  nextDueAt?: string | null;
}

export interface RecordFailureInput {
  reason: PollFailureReason;
  message: string;
  at: string;
  /** Same semantics as RecordSuccessInput.nextDueAt: omit to preserve, null to clear. */
  nextDueAt?: string | null;
}

interface StateRow {
  watchpoint_id: string;
  poll_state: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_reason: string | null;
  last_error_message: string | null;
  consecutive_failures: number;
  next_due_at: string | null;
}

function rowToState(row: StateRow): WatchpointState {
  return {
    watchpointId: row.watchpoint_id,
    watermark: row.poll_state,
    lastSuccessAt: row.last_success_at,
    lastErrorAt: row.last_error_at,
    lastErrorReason: row.last_error_reason as PollFailureReason | null,
    lastErrorMessage: row.last_error_message,
    consecutiveFailures: row.consecutive_failures,
    nextDueAt: row.next_due_at,
  };
}

/**
 * Per-watchpoint runtime poll state. Deliberately separate from the
 * watchpoints config table (ADR-0001 §2). One row per watchpoint, created
 * lazily on the first recorded poll outcome.
 *
 * Last-error fields are historical: a later success resets
 * `consecutiveFailures` (the recovery signal for the scheduler) but keeps the
 * error visible, so the status UI can show "recovered at T, last failure was
 * X". The poll watermark only ever changes on success. `next_due_at` is the
 * scheduler's decision (issue #10): recording an outcome without one leaves
 * the previous decision standing, while an explicit null clears it — that is
 * how a terminal failure un-schedules the watchpoint (automatic scheduling is
 * then gated off by the terminal-failure check, not by a due time).
 */
export function createPollStateRepo(db: DatabaseSync) {
  const selectByWatchpoint = db.prepare("SELECT * FROM watchpoint_state WHERE watchpoint_id = ?");
  const upsertSuccess = db.prepare(
    `INSERT INTO watchpoint_state (watchpoint_id, poll_state, last_success_at, consecutive_failures, next_due_at)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(watchpoint_id) DO UPDATE SET
       poll_state = excluded.poll_state,
       last_success_at = excluded.last_success_at,
       consecutive_failures = 0,
       next_due_at = CASE WHEN ? THEN excluded.next_due_at ELSE next_due_at END`,
  );
  const upsertFailure = db.prepare(
    `INSERT INTO watchpoint_state (watchpoint_id, last_error_at, last_error_reason, last_error_message, consecutive_failures, next_due_at)
     VALUES (?, ?, ?, ?, 1, ?)
     ON CONFLICT(watchpoint_id) DO UPDATE SET
       last_error_at = excluded.last_error_at,
       last_error_reason = excluded.last_error_reason,
       last_error_message = excluded.last_error_message,
       consecutive_failures = consecutive_failures + 1,
       next_due_at = CASE WHEN ? THEN excluded.next_due_at ELSE next_due_at END`,
  );

  function get(watchpointId: string): WatchpointState | undefined {
    const row = selectByWatchpoint.get(watchpointId) as StateRow | undefined;
    return row ? rowToState(row) : undefined;
  }

  /**
   * Binds the optional scheduling decision as (value, explicit): omitted
   * preserves the previous decision, an explicit value or null overwrites it.
   */
  function nextDueAtBinding(nextDueAt: string | null | undefined): [string | null, number] {
    if (nextDueAt === undefined) return [null, 0];
    if (nextDueAt !== null) assertIsoDatetime(nextDueAt, "nextDueAt");
    return [nextDueAt, 1];
  }

  return {
    get,

    /** Records a successful poll: stores the new watermark, stamps last success, resets failures. */
    recordSuccess(watchpointId: string, input: RecordSuccessInput): WatchpointState {
      requireWatchpointRow(db, watchpointId);
      assertIsoDatetime(input.at, "at");
      if (input.state !== null && typeof input.state !== "string") {
        throw new TypeError("state must be a string or null");
      }
      upsertSuccess.run(watchpointId, input.state, input.at, ...nextDueAtBinding(input.nextDueAt));
      return get(watchpointId) as WatchpointState;
    },

    /** Records a failed poll: stamps last error, bumps consecutive failures. Watermark untouched. */
    recordFailure(watchpointId: string, input: RecordFailureInput): WatchpointState {
      requireWatchpointRow(db, watchpointId);
      assertEnum(input.reason, POLL_FAILURE_REASONS, "reason");
      assertIsoDatetime(input.at, "at");
      if (typeof input.message !== "string") {
        throw new TypeError("message must be a string");
      }
      upsertFailure.run(
        watchpointId,
        input.at,
        input.reason,
        input.message,
        ...nextDueAtBinding(input.nextDueAt),
      );
      return get(watchpointId) as WatchpointState;
    },
  };
}

export type PollStateRepo = ReturnType<typeof createPollStateRepo>;
