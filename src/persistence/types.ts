/**
 * Shared domain types for the persistence layer.
 *
 * ADR-0001 §0: contract fields are snake_case; the TypeScript binding uses
 * camelCase. SQLite columns stay snake_case (see migrations).
 */

export type WatchpointStatus = "active" | "paused";

export type EventType =
  | "new_item"
  | "hot_item"
  | "item_update"
  | "live_started"
  | "live_ended"
  | "account_event";

export type PollFailureReason =
  | "auth_error"
  | "rate_limited"
  | "temporary_failure"
  | "permanent_failure";

export type MetricKey =
  | "view"
  | "like"
  | "favorite"
  | "coin"
  | "reply"
  | "share"
  | "danmaku";

export type WatchpointParams = Record<string, string | number | boolean>;

/** Watchpoint configuration, mirroring ADR-0001 §2. Runtime state lives in WatchpointState. */
export interface Watchpoint {
  id: string;
  connectorId: string;
  kind: string;
  displayName: string;
  params: WatchpointParams;
  status: WatchpointStatus;
  intervalSeconds: number;
  createdAt: string;
}

/**
 * Per-watchpoint runtime state (ADR-0001 §2/§3): the opaque poll watermark
 * returned by the last successful poll, plus last success / last error and
 * the scheduler's next-due decision.
 */
export interface WatchpointState {
  watchpointId: string;
  /** Opaque watermark (column poll_state); passed back to the Connector verbatim. */
  watermark: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorReason: PollFailureReason | null;
  lastErrorMessage: string | null;
  consecutiveFailures: number;
  /**
   * When the scheduler will next attempt this watchpoint (issue #10).
   * Null means no scheduling decision is recorded — never attempted, a
   * legacy row, or cleared by a terminal failure; automatic scheduling
   * reads it as due immediately, with the terminal-failure gate deciding.
   */
  nextDueAt: string | null;
}

/** Normalized event, mirroring ADR-0001 §4. */
export interface EventRecord {
  id: string;
  dedupKey: string;
  connectorId: string;
  watchpointId: string;
  eventType: EventType;
  discoveredAt: string;
  title: string;
  url: string;
  reason: string;
  externalId: string | null;
  summary: string | null;
  author: string | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  metrics: Partial<Record<MetricKey, number>> | null;
  metadata: Record<string, unknown> | null;
}

/** One bounded observation of an item's metrics at a point in time. */
export interface MetricSnapshot {
  id: number;
  eventId: string;
  capturedAt: string;
  metrics: Partial<Record<MetricKey, number>>;
}
