import type { EventType, MetricKey, PollFailureReason, WatchpointStatus } from "./types.ts";

/**
 * Shared input validation. The persistence layer is the last line of defense
 * for ADR-0001 invariants: closed enums, ISO-8601 timestamps, absolute URLs,
 * and the 4KB metadata ceiling.
 */

export const EVENT_TYPES: readonly EventType[] = [
  "new_item",
  "hot_item",
  "item_update",
  "live_started",
  "live_ended",
  "account_event",
];

export const METRIC_KEYS: readonly MetricKey[] = [
  "view",
  "like",
  "favorite",
  "coin",
  "reply",
  "share",
  "danmaku",
];

export const POLL_FAILURE_REASONS: readonly PollFailureReason[] = [
  "auth_error",
  "rate_limited",
  "temporary_failure",
  "permanent_failure",
];

export const WATCHPOINT_STATUSES: readonly WatchpointStatus[] = ["active", "paused"];

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function assertIsoDatetime(value: string, field: string): void {
  if (!ISO_DATETIME.test(value) || Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${field} must be an ISO 8601 datetime, got: ${JSON.stringify(value)}`);
  }
}

export function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

export function assertHttpUrl(value: string, field: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError(`${field} must be an absolute URL, got: ${JSON.stringify(value)}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError(`${field} must be an http(s) URL, got: ${JSON.stringify(value)}`);
  }
}

/** ADR-0001 §4: site-specific metadata must stay within 4KB. */
export const METADATA_MAX_BYTES = 4096;

export function assertMetadataSize(metadata: Record<string, unknown>, field: string): void {
  const bytes = Buffer.byteLength(JSON.stringify(metadata), "utf8");
  if (bytes > METADATA_MAX_BYTES) {
    throw new RangeError(
      `${field} is ${bytes} bytes of JSON; the contract caps it at ${METADATA_MAX_BYTES}`,
    );
  }
}

export function assertEnum<T extends string>(value: string, allowed: readonly T[], field: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new TypeError(`${field} must be one of ${allowed.join(", ")}, got: ${JSON.stringify(value)}`);
  }
  return value as T;
}

export function assertPositiveInt(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive integer, got: ${JSON.stringify(value)}`);
  }
}

/** Bounded-query discipline (PRODUCT_PRINCIPLES: results must be finite). */
export function assertBoundedLimit(limit: number, max: number, field = "limit"): number {
  assertPositiveInt(limit, field);
  return Math.min(limit, max);
}

/**
 * Validates a metrics object against the closed MetricKey enum and
 * canonicalizes it to the JSON stored in SQLite (empty object → null).
 */
export function normalizeMetrics(
  metrics: Partial<Record<MetricKey, number>>,
): string | null {
  const cleaned: Partial<Record<MetricKey, number>> = {};
  for (const [key, value] of Object.entries(metrics)) {
    assertEnum(key, METRIC_KEYS, `metrics key "${key}"`);
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`metrics.${key} must be a finite number`);
    }
    cleaned[key as MetricKey] = value;
  }
  return Object.keys(cleaned).length === 0 ? null : JSON.stringify(cleaned);
}
