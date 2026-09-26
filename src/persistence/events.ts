import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { buildDedupKey } from "./dedup.ts";
import type { EventRecord, EventType, MetricKey } from "./types.ts";
import { requireWatchpointRow } from "./watchpoints.ts";
import { withTransaction } from "./tx.ts";
import {
  assertBoundedLimit,
  assertEnum,
  assertHttpUrl,
  assertIsoDatetime,
  assertMetadataSize,
  assertNonEmptyString,
  EVENT_TYPES,
  METADATA_MAX_BYTES,
  normalizeMetrics,
} from "./validation.ts";

/**
 * Normalized event storage (ADR-0001 §4).
 *
 * Identity: Core assigns `id` and derives `connector_id` from the Watchpoint,
 * so a caller-supplied connector mismatch is structurally impossible — the
 * stricter form of ADR-0001's "Connector 填 metadata.id，Core 校验一致".
 *
 * Upsert semantics (deliberate, revisit with #11): the dedup key collapses
 * re-observations of the same item onto one row. On a dedup hit the row's
 * content and `discovered_at` are refreshed to the latest observation, so a
 * still-hot thread stays near the top of the bounded feed instead of sinking
 * by its first-discovery time. The original discovery moment survives in
 * `dedup_keys.first_seen_at`. Long-lived dedup state lives in `dedup_keys`,
 * so event retention can later prune `events` without losing dedup history.
 */

/** Connector-supplied event before Core assigns identity. */
export interface EventInput {
  eventType: EventType;
  discoveredAt: string;
  title: string;
  url: string;
  reason: string;
  externalId: string | null;
  summary?: string;
  author?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  metrics?: Partial<Record<MetricKey, number>>;
  metadata?: Record<string, unknown>;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
  /** Records in input order; ids are stable for updated rows. */
  records: EventRecord[];
}

export interface ListEventsFilter {
  watchpointId?: string;
  connectorId?: string;
  eventType?: EventType;
  /** Default 50. Results are bounded per the product's finite-result principle. */
  limit?: number;
}

export const DEFAULT_EVENT_LIMIT = 50;
export const MAX_EVENT_LIMIT = 200;

interface EventRow {
  id: string;
  dedup_key: string;
  connector_id: string;
  watchpoint_id: string;
  event_type: string;
  discovered_at: string;
  title: string;
  url: string;
  reason: string;
  external_id: string | null;
  summary: string | null;
  author: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
  metrics: string | null;
  metadata: string | null;
}

function parseJsonOrNull<T>(json: string | null): T | null {
  return json === null ? null : (JSON.parse(json) as T);
}

/** Shared with the feed view (feed.ts), which selects the same columns. */
export function rowToEvent(row: EventRow): EventRecord {
  return {
    id: row.id,
    dedupKey: row.dedup_key,
    connectorId: row.connector_id,
    watchpointId: row.watchpoint_id,
    eventType: assertEnum(row.event_type, EVENT_TYPES, "event_type"),
    discoveredAt: row.discovered_at,
    title: row.title,
    url: row.url,
    reason: row.reason,
    externalId: row.external_id,
    summary: row.summary,
    author: row.author,
    publishedAt: row.published_at,
    thumbnailUrl: row.thumbnail_url,
    metrics: parseJsonOrNull(row.metrics),
    metadata: parseJsonOrNull(row.metadata),
  };
}

function assertEventInput(input: EventInput): void {
  assertEnum(input.eventType, EVENT_TYPES, "eventType");
  assertIsoDatetime(input.discoveredAt, "discoveredAt");
  assertNonEmptyString(input.title, "title");
  assertHttpUrl(input.url, "url");
  assertNonEmptyString(input.reason, "reason");
  if (input.externalId !== null && input.externalId !== undefined) {
    assertNonEmptyString(input.externalId, "externalId");
  }
  if (input.publishedAt !== undefined) assertIsoDatetime(input.publishedAt, "publishedAt");
  if (input.thumbnailUrl !== undefined) assertHttpUrl(input.thumbnailUrl, "thumbnailUrl");
  if (input.metadata !== undefined) {
    assertMetadataSize(input.metadata, "metadata");
  }
}

export function createEventsRepo(db: DatabaseSync) {
  const selectEventIdByDedupKey = db.prepare("SELECT id FROM events WHERE dedup_key = ?");
  const insertEvent = db.prepare(
    `INSERT INTO events (
       id, dedup_key, connector_id, watchpoint_id, event_type, discovered_at,
       title, url, reason, external_id, summary, author, published_at,
       thumbnail_url, metrics, metadata
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const updateEvent = db.prepare(
    `UPDATE events SET
       discovered_at = ?, title = ?, url = ?, reason = ?, summary = ?,
       author = ?, published_at = ?, thumbnail_url = ?, metrics = ?, metadata = ?
     WHERE id = ?`,
  );
  const insertDedupKey = db.prepare(
    `INSERT INTO dedup_keys (dedup_key, watchpoint_id, event_type, external_id, fallback, first_seen_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(dedup_key) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
  );
  const selectById = db.prepare("SELECT * FROM events WHERE id = ?");

  function get(id: string): EventRecord | undefined {
    const row = selectById.get(id) as EventRow | undefined;
    return row ? rowToEvent(row) : undefined;
  }

  return {
    get,

    list(filter: ListEventsFilter = {}): EventRecord[] {
      const conditions: string[] = [];
      const args: (string | number)[] = [];
      if (filter.watchpointId !== undefined) {
        conditions.push("watchpoint_id = ?");
        args.push(filter.watchpointId);
      }
      if (filter.connectorId !== undefined) {
        conditions.push("connector_id = ?");
        args.push(filter.connectorId);
      }
      if (filter.eventType !== undefined) {
        assertEnum(filter.eventType, EVENT_TYPES, "eventType");
        conditions.push("event_type = ?");
        args.push(filter.eventType);
      }
      let limit = DEFAULT_EVENT_LIMIT;
      if (filter.limit !== undefined) {
        limit = assertBoundedLimit(filter.limit, MAX_EVENT_LIMIT);
      }
      const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
      const rows = db
        .prepare(
          `SELECT * FROM events${where} ORDER BY discovered_at DESC, rowid DESC LIMIT ${limit}`,
        )
        .all(...args) as unknown as EventRow[];
      return rows.map(rowToEvent);
    },

    /**
     * Upserts a poll batch atomically. Returns per-event records with stable
     * ids (updated rows keep their id) so callers can attach metric
     * snapshots or feed the dashboard.
     */
    upsert(watchpointId: string, inputs: readonly EventInput[]): UpsertResult {
      const watchpoint = requireWatchpointRow(db, watchpointId);

      let inserted = 0;
      let updated = 0;
      const records: EventRecord[] = [];

      const run = (): void => {
        for (const input of inputs) {
          assertEventInput(input);
          const externalId = input.externalId ?? null;
          const { key, fallback } = buildDedupKey({
            watchpointId,
            eventType: input.eventType,
            externalId,
            url: input.url,
          });
          const metrics = normalizeMetrics(input.metrics ?? {});
          const metadata = input.metadata === undefined ? null : JSON.stringify(input.metadata);
          const summary = input.summary ?? null;
          const author = input.author ?? null;
          const publishedAt = input.publishedAt ?? null;
          const thumbnailUrl = input.thumbnailUrl ?? null;

          const existing = selectEventIdByDedupKey.get(key) as { id: string } | undefined;
          let eventId: string;
          if (existing) {
            eventId = existing.id;
            updateEvent.run(
              input.discoveredAt,
              input.title,
              input.url,
              input.reason,
              summary,
              author,
              publishedAt,
              thumbnailUrl,
              metrics,
              metadata,
              eventId,
            );
            updated += 1;
          } else {
            eventId = randomUUID();
            insertEvent.run(
              eventId,
              key,
              watchpoint.connector_id,
              watchpointId,
              input.eventType,
              input.discoveredAt,
              input.title,
              input.url,
              input.reason,
              externalId,
              summary,
              author,
              publishedAt,
              thumbnailUrl,
              metrics,
              metadata,
            );
            inserted += 1;
          }
          insertDedupKey.run(
            key,
            watchpointId,
            input.eventType,
            externalId,
            fallback,
            input.discoveredAt,
            input.discoveredAt,
          );

          const stored = selectById.get(eventId) as unknown as EventRow;
          records.push(rowToEvent(stored));
        }
      };
      withTransaction(db, run);

      return { inserted, updated, records };
    },
  };
}

export type EventsRepo = ReturnType<typeof createEventsRepo>;
