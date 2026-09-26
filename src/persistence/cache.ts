import type { DatabaseSync } from "node:sqlite";
import { assertIsoDatetime, assertPositiveInt } from "./validation.ts";

/**
 * Lightweight key/value cache for whatever Core or a Connector wants to
 * memoize between polls (e.g. parsed board lists). Values are JSON, optional
 * TTL; expired entries are removed lazily on read.
 */

export interface SetCacheOptions {
  /** Time-to-live in seconds. Omit for entries that never expire. */
  ttlSeconds?: number;
  /** Overrides the current time; intended for tests. */
  at?: string;
}

export interface CacheEntry<T> {
  value: T;
  updatedAt: string;
  expiresAt: string | null;
}

interface CacheRow {
  key: string;
  value: string;
  expires_at: string | null;
  updated_at: string;
}

export function createCacheRepo(db: DatabaseSync) {
  const upsert = db.prepare(
    `INSERT INTO cache_entries (key, value, expires_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       expires_at = excluded.expires_at,
       updated_at = excluded.updated_at`,
  );
  const select = db.prepare("SELECT * FROM cache_entries WHERE key = ?");
  const deleteByKey = db.prepare("DELETE FROM cache_entries WHERE key = ?");

  return {
    set<T>(key: string, value: T, options: SetCacheOptions = {}): void {
      if (typeof key !== "string" || key.length === 0) {
        throw new TypeError("key must be a non-empty string");
      }
      const updatedAt = options.at ?? new Date().toISOString();
      assertIsoDatetime(updatedAt, "at");
      let expiresAt: string | null = null;
      if (options.ttlSeconds !== undefined) {
        assertPositiveInt(options.ttlSeconds, "ttlSeconds");
        expiresAt = new Date(Date.parse(updatedAt) + options.ttlSeconds * 1000).toISOString();
      }
      upsert.run(key, JSON.stringify(value), expiresAt, updatedAt);
    },

    get<T>(key: string, now: Date = new Date()): CacheEntry<T> | undefined {
      const row = select.get(key) as CacheRow | undefined;
      if (!row) return undefined;
      if (row.expires_at !== null && Date.parse(row.expires_at) <= now.getTime()) {
        deleteByKey.run(key);
        return undefined;
      }
      return { value: JSON.parse(row.value) as T, updatedAt: row.updated_at, expiresAt: row.expires_at };
    },

    /** Returns true when an entry existed and was removed. */
    delete(key: string): boolean {
      return deleteByKey.run(key).changes > 0;
    },
  };
}

export type CacheRepo = ReturnType<typeof createCacheRepo>;
