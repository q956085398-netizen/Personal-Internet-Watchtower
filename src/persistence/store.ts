import { DatabaseSync } from "node:sqlite";
import { createCacheRepo, type CacheRepo } from "./cache.ts";
import { createEventsRepo, type EventsRepo } from "./events.ts";
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
  close(): void;
}

export function openStore(path: string): Store {
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
    close(): void {
      db.close();
    },
  };
}
