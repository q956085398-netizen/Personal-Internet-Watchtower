import type { DatabaseSync } from "node:sqlite";
import type { PollFailureReason, WatchpointState } from "./types.ts";
import { assertEnum, assertIsoDatetime, POLL_FAILURE_REASONS } from "./validation.ts";

export interface RecordSuccessInput {
  /** Opaque watermark from the Connector; stored verbatim, returned verbatim (ADR-0001 §3). */
  state: string | null;
  at: string;
}

export interface RecordFailureInput {
  reason: PollFailureReason;
  message: string;
  at: string;
}

interface StateRow {
  watchpoint_id: string;
  poll_state: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_reason: string | null;
  last_error_message: string | null;
  consecutive_failures: number;
}

function rowToState(row: StateRow): WatchpointState {
  return {
    watchpointId: row.watchpoint_id,
    pollState: row.poll_state,
    lastSuccessAt: row.last_success_at,
    lastErrorAt: row.last_error_at,
    lastErrorReason: row.last_error_reason as PollFailureReason | null,
    lastErrorMessage: row.last_error_message,
    consecutiveFailures: row.consecutive_failures,
  };
}

/**
 * Per-watchpoint runtime poll state. Deliberately separate from the
 * watchpoints config table (ADR-0001 §2). One row per watchpoint, created
 * lazily on the first recorded poll outcome.
 */
export function createPollStateRepo(db: DatabaseSync) {
  const selectByWatchpoint = db.prepare("SELECT * FROM watchpoint_state WHERE watchpoint_id = ?");
  const upsertSuccess = db.prepare(
    `INSERT INTO watchpoint_state (watchpoint_id, poll_state, last_success_at, consecutive_failures)
     VALUES (?, ?, ?, 0)
     ON CONFLICT(watchpoint_id) DO UPDATE SET
       poll_state = excluded.poll_state,
       last_success_at = excluded.last_success_at,
       consecutive_failures = 0`,
  );
  const upsertFailure = db.prepare(
    `INSERT INTO watchpoint_state (watchpoint_id, last_error_at, last_error_reason, last_error_message, consecutive_failures)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(watchpoint_id) DO UPDATE SET
       last_error_at = excluded.last_error_at,
       last_error_reason = excluded.last_error_reason,
       last_error_message = excluded.last_error_message,
       consecutive_failures = consecutive_failures + 1`,
  );
  const watchpointExists = db.prepare("SELECT 1 FROM watchpoints WHERE id = ?");

  function requireWatchpoint(watchpointId: string): void {
    if (watchpointExists.get(watchpointId) === undefined) {
      throw new Error(`watchpoint not found: ${watchpointId}`);
    }
  }

  function get(watchpointId: string): WatchpointState | undefined {
    const row = selectByWatchpoint.get(watchpointId) as StateRow | undefined;
    return row ? rowToState(row) : undefined;
  }

  return {
    get,

    /** Records a successful poll: stores the new watermark, stamps last success, resets failures. */
    recordSuccess(watchpointId: string, input: RecordSuccessInput): WatchpointState {
      requireWatchpoint(watchpointId);
      assertIsoDatetime(input.at, "at");
      if (input.state !== null && typeof input.state !== "string") {
        throw new TypeError("state must be a string or null");
      }
      upsertSuccess.run(watchpointId, input.state, input.at);
      return get(watchpointId) as WatchpointState;
    },

    /** Records a failed poll: stamps last error, bumps consecutive failures. Watermark untouched. */
    recordFailure(watchpointId: string, input: RecordFailureInput): WatchpointState {
      requireWatchpoint(watchpointId);
      assertEnum(input.reason, POLL_FAILURE_REASONS, "reason");
      assertIsoDatetime(input.at, "at");
      if (typeof input.message !== "string") {
        throw new TypeError("message must be a string");
      }
      upsertFailure.run(watchpointId, input.at, input.reason, input.message);
      return get(watchpointId) as WatchpointState;
    },
  };
}

export type PollStateRepo = ReturnType<typeof createPollStateRepo>;
