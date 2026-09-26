import { DatabaseSync } from "node:sqlite";
import type { Capability } from "../contract.ts";
import { createCacheRepo, type CacheRepo } from "./cache.ts";
import { createEventsRepo, type EventsRepo } from "./events.ts";
import { createFeedRepo, type FeedRepo } from "./feed.ts";
import { migrate } from "./migrate.ts";
import { createMetricsRepo, type MetricsRepo } from "./metrics.ts";
import { createPollStateRepo, type PollStateRepo } from "./pollState.ts";
import { createWatchpointRepo, type WatchpointRepo } from "./watchpoints.ts";

/**
 * The persistence facade for v0 Core. One SQLite file, one store instance.
 * Modules are exposed as namespaced repos so callers (scheduler, dedup
 * pipeline, dashboard API) never touch raw SQL.
 */
export interface Store {
  watchpoints: WatchpointRepo;
  pollState: PollStateRepo;
  events: EventsRepo;
  metrics: MetricsRepo;
  cache: CacheRepo;
  feed: FeedRepo;
  close(): void;
}

export interface StoreOptions {
  /**
   * Resolves the capability a (connector, kind) pair exercises, used to
   * derive Dashboard sections at read time (ADR-0001 §4). Wire it to
   * `registry.kindOf(connectorId, kind)?.exercises`. Unknown pairs degrade
   * to "worth" (ADR-0001 §4 rule 3), so an unregistered connector's events
   * stay visible in the least-specific section instead of vanishing.
   */
  resolveExercises?: (connectorId: string, kind: string) => Capability | undefined;
}

export function openStore(path: string, options: StoreOptions = {}): Store {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  if (path !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL");
  }
  migrate(db);

  return {
    watchpoints: createWatchpointRepo(db),
    pollState: createPollStateRepo(db),
    events: createEventsRepo(db),
    metrics: createMetricsRepo(db),
    cache: createCacheRepo(db),
    feed: createFeedRepo(db, options.resolveExercises ?? (() => undefined)),
    close(): void {
      db.close();
    },
  };
}
