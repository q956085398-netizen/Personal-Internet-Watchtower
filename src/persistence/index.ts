/**
 * Public surface of the v0 persistence layer (issue #9).
 *
 * Entry point: `openStore(path)` — opens (and migrates) one SQLite database
 * and returns the namespaced repos. Schema and contract semantics follow
 * ADR-0001: Connector / Watchpoint / Event contract.
 */
export { openStore, type Store } from "./store.ts";
export { migrate, migrations, type Migration } from "./migrate.ts";
export { buildDedupKey, normalizeUrl, type DedupKey } from "./dedup.ts";
export type { EventInput, ListEventsFilter, UpsertResult } from "./events.ts";
export { DEFAULT_EVENT_LIMIT, MAX_EVENT_LIMIT } from "./events.ts";
export type { SetCacheOptions, CacheEntry } from "./cache.ts";
export type {
  EventRecord,
  EventType,
  MetricKey,
  MetricSnapshot,
  PollFailureReason,
  Watchpoint,
  WatchpointParams,
  WatchpointState,
  WatchpointStatus,
} from "./types.ts";
