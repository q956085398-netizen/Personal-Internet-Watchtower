import type { DatabaseSync } from "node:sqlite";
import type { MetricKey, MetricSnapshot } from "./types.ts";
import {
  assertBoundedLimit,
  assertIsoDatetime,
  METRIC_KEYS,
  normalizeMetrics,
} from "./validation.ts";

/**
 * Metric snapshots (SPEC §5.4): short-term observations of an item's metrics
 * at a point in time — for trend judgment, never a reading archive. Snapshots
 * cascade with their event.
 */

export interface ListSnapshotsFilter {
  /** Only snapshots captured at or after this ISO 8601 moment. */
  since?: string;
  /** Only snapshots captured at or before this ISO 8601 moment. */
  until?: string;
  /** Default 100, ordered chronologically (oldest first). */
  limit?: number;
}

const DEFAULT_SNAPSHOT_LIMIT = 100;
const MAX_SNAPSHOT_LIMIT = 1000;

interface SnapshotRow {
  id: number;
  event_id: string;
  captured_at: string;
  view: number | null;
  like: number | null;
  favorite: number | null;
  coin: number | null;
  reply: number | null;
  share: number | null;
  danmaku: number | null;
}

const METRIC_COLUMNS: readonly MetricKey[] = METRIC_KEYS;

function rowToSnapshot(row: SnapshotRow): MetricSnapshot {
  const metrics: Partial<Record<MetricKey, number>> = {};
  for (const key of METRIC_COLUMNS) {
    const value = row[key];
    if (value !== null) {
      metrics[key] = value;
    }
  }
  return { id: row.id, eventId: row.event_id, capturedAt: row.captured_at, metrics };
}

export function createMetricsRepo(db: DatabaseSync) {
  const eventExists = db.prepare("SELECT 1 FROM events WHERE id = ?");
  const insert = db.prepare(
    `INSERT INTO metric_snapshots (event_id, captured_at, view, "like", favorite, coin, reply, share, danmaku)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  return {
    /** Records one observation. `capturedAt` defaults to now. */
    add(
      eventId: string,
      metrics: Partial<Record<MetricKey, number>>,
      capturedAt: string = new Date().toISOString(),
    ): MetricSnapshot {
      if (eventExists.get(eventId) === undefined) {
        throw new Error(`event not found: ${eventId}`);
      }
      assertIsoDatetime(capturedAt, "capturedAt");
      const entries = Object.entries(metrics);
      if (entries.length === 0) {
        throw new TypeError("metrics must contain at least one key");
      }
      // normalizeMetrics enforces the closed key enum and finite numbers.
      normalizeMetrics(metrics);
      const columns: (number | null)[] = METRIC_KEYS.map(() => null);
      for (const [key, value] of entries) {
        columns[METRIC_KEYS.indexOf(key as MetricKey)] = value;
      }
      const result = insert.run(eventId, capturedAt, ...columns);
      return {
        id: Number(result.lastInsertRowid),
        eventId,
        capturedAt,
        metrics: Object.fromEntries(entries) as Partial<Record<MetricKey, number>>,
      };
    },

    /** Time series for one item, chronologically ordered, bounded to the latest window. */
    list(eventId: string, filter: ListSnapshotsFilter = {}): MetricSnapshot[] {
      const conditions: string[] = ["event_id = ?"];
      const args: (string | number)[] = [eventId];
      if (filter.since !== undefined) {
        assertIsoDatetime(filter.since, "since");
        conditions.push("captured_at >= ?");
        args.push(filter.since);
      }
      if (filter.until !== undefined) {
        assertIsoDatetime(filter.until, "until");
        conditions.push("captured_at <= ?");
        args.push(filter.until);
      }
      let limit = DEFAULT_SNAPSHOT_LIMIT;
      if (filter.limit !== undefined) {
        limit = assertBoundedLimit(filter.limit, MAX_SNAPSHOT_LIMIT);
      }
      const rows = db
        .prepare(
          `SELECT * FROM metric_snapshots WHERE ${conditions.join(" AND ")}
           ORDER BY captured_at DESC, id DESC LIMIT ${limit}`,
        )
        .all(...args) as unknown as SnapshotRow[];
      return rows.reverse().map(rowToSnapshot);
    },
  };
}

export type MetricsRepo = ReturnType<typeof createMetricsRepo>;
