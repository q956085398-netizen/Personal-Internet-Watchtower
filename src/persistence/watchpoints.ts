import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Watchpoint, WatchpointParams, WatchpointStatus } from "./types.ts";
import {
  assertEnum,
  assertIsoDatetime,
  assertNonEmptyString,
  assertPositiveInt,
  WATCHPOINT_STATUSES,
} from "./validation.ts";

export interface CreateWatchpointInput {
  connectorId: string;
  kind: string;
  displayName: string;
  params: WatchpointParams;
  intervalSeconds: number;
  status?: WatchpointStatus;
  /** Overrides Core-assigned id; intended for tests and imports. */
  id?: string;
  /** Overrides the current time; intended for tests. */
  createdAt?: string;
}

export interface UpdateWatchpointPatch {
  displayName?: string;
  params?: WatchpointParams;
  status?: WatchpointStatus;
  intervalSeconds?: number;
}

export interface ListWatchpointsFilter {
  status?: WatchpointStatus;
  connectorId?: string;
}

interface WatchpointRow {
  id: string;
  connector_id: string;
  kind: string;
  display_name: string;
  params: string;
  status: string;
  interval_seconds: number;
  created_at: string;
}

function parseParams(json: string, id: string): WatchpointParams {
  const value: unknown = JSON.parse(json);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`watchpoint ${id} has non-object params in storage`);
  }
  const params: WatchpointParams = {};
  for (const [key, v] of Object.entries(value)) {
    if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") {
      throw new TypeError(`watchpoint ${id} params.${key} is not a string/number/boolean`);
    }
    params[key] = v;
  }
  return params;
}

function rowToWatchpoint(row: WatchpointRow): Watchpoint {
  return {
    id: row.id,
    connectorId: row.connector_id,
    kind: row.kind,
    displayName: row.display_name,
    params: parseParams(row.params, row.id),
    status: assertEnum(row.status, WATCHPOINT_STATUSES, "status"),
    intervalSeconds: row.interval_seconds,
    createdAt: row.created_at,
  };
}

function assertParams(params: WatchpointParams): void {
  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      throw new TypeError(`params.${key} must be a string, number, or boolean`);
    }
  }
}

export interface WatchpointRef {
  id: string;
  connector_id: string;
}

/**
 * existence check + connector binding shared by the events and pollState
 * repos, which stamp or scope rows by the watchpoint's connector.
 */
export function requireWatchpointRow(db: DatabaseSync, watchpointId: string): WatchpointRef {
  const row = db
    .prepare("SELECT id, connector_id FROM watchpoints WHERE id = ?")
    .get(watchpointId) as WatchpointRef | undefined;
  if (!row) {
    throw new Error(`watchpoint not found: ${watchpointId}`);
  }
  return row;
}

/**
 * Watchpoint configuration CRUD. Per ADR-0001 §2 the Core never interprets
 * `params` — it stores and passes them through to the Connector. Runtime
 * polling state lives in the separate watchpoint_state table.
 */
export function createWatchpointRepo(db: DatabaseSync) {
  const insert = db.prepare(
    `INSERT INTO watchpoints (id, connector_id, kind, display_name, params, status, interval_seconds, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const selectById = db.prepare("SELECT * FROM watchpoints WHERE id = ?");
  const updateRow = db.prepare(
    `UPDATE watchpoints
     SET display_name = ?, params = ?, status = ?, interval_seconds = ?
     WHERE id = ?`,
  );
  const deleteRow = db.prepare("DELETE FROM watchpoints WHERE id = ?");

  function get(id: string): Watchpoint | undefined {
    const row = selectById.get(id) as WatchpointRow | undefined;
    return row ? rowToWatchpoint(row) : undefined;
  }

  function list(filter: ListWatchpointsFilter = {}): Watchpoint[] {
    const conditions: string[] = [];
    const args: (string | number)[] = [];
    if (filter.status !== undefined) {
      assertEnum(filter.status, WATCHPOINT_STATUSES, "status");
      conditions.push("status = ?");
      args.push(filter.status);
    }
    if (filter.connectorId !== undefined) {
      conditions.push("connector_id = ?");
      args.push(filter.connectorId);
    }
    const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    const rows = db
      .prepare(`SELECT * FROM watchpoints${where} ORDER BY created_at, id`)
      .all(...args) as unknown as WatchpointRow[];
    return rows.map(rowToWatchpoint);
  }

  return {
    create(input: CreateWatchpointInput): Watchpoint {
      assertNonEmptyString(input.connectorId, "connectorId");
      assertNonEmptyString(input.kind, "kind");
      assertNonEmptyString(input.displayName, "displayName");
      assertPositiveInt(input.intervalSeconds, "intervalSeconds");
      assertParams(input.params);
      const status = assertEnum(input.status ?? "active", WATCHPOINT_STATUSES, "status");
      const id = input.id ?? randomUUID();
      const createdAt = input.createdAt ?? new Date().toISOString();
      assertIsoDatetime(createdAt, "createdAt");
      insert.run(
        id,
        input.connectorId,
        input.kind,
        input.displayName,
        JSON.stringify(input.params),
        status,
        input.intervalSeconds,
        createdAt,
      );
      return {
        id,
        connectorId: input.connectorId,
        kind: input.kind,
        displayName: input.displayName,
        params: input.params,
        status,
        intervalSeconds: input.intervalSeconds,
        createdAt,
      };
    },

    get,

    list,

    update(id: string, patch: UpdateWatchpointPatch): Watchpoint {
      const existing = get(id);
      if (!existing) {
        throw new Error(`watchpoint not found: ${id}`);
      }
      const displayName = patch.displayName ?? existing.displayName;
      assertNonEmptyString(displayName, "displayName");
      const params = patch.params ?? existing.params;
      assertParams(params);
      const status = assertEnum(patch.status ?? existing.status, WATCHPOINT_STATUSES, "status");
      const intervalSeconds = patch.intervalSeconds ?? existing.intervalSeconds;
      assertPositiveInt(intervalSeconds, "intervalSeconds");
      updateRow.run(displayName, JSON.stringify(params), status, intervalSeconds, id);
      return {
        ...existing,
        displayName,
        params,
        status,
        intervalSeconds,
      };
    },

    pause(id: string): Watchpoint {
      return this.update(id, { status: "paused" });
    },

    resume(id: string): Watchpoint {
      return this.update(id, { status: "active" });
    },

    /** Returns true when a row was deleted. Cascades state, events, dedup keys, and snapshots. */
    remove(id: string): boolean {
      return deleteRow.run(id).changes > 0;
    },
  };
}

export type WatchpointRepo = ReturnType<typeof createWatchpointRepo>;
