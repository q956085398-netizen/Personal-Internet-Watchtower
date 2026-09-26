import { createHash } from "node:crypto";
import type { EventType } from "./types.ts";

/**
 * Dedup key construction (ADR-0001 §4): the pipeline keys on
 * `(watchpoint_id, event_type, external_id)`. When a Connector cannot supply
 * an `external_id`, Core falls back to a normalized-URL hash.
 */

export function normalizeUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  }
  const kept = [...url.searchParams.entries()].filter(([key]) => {
    const lower = key.toLowerCase();
    return !lower.startsWith("utm_") && lower !== "spm";
  });
  kept.sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1));
  url.search = "";
  for (const [key, value] of kept) {
    url.searchParams.append(key, value);
  }
  return url.toString();
}

export interface DedupKeyParts {
  watchpointId: string;
  eventType: EventType;
  externalId: string | null;
  url: string;
}

export interface DedupKey {
  /** Unambiguous composite key persisted in dedup_keys and events. */
  key: string;
  /** Which fallback produced the key, or null when external_id was used. */
  fallback: string | null;
}

export function buildDedupKey(parts: DedupKeyParts): DedupKey {
  if (parts.externalId !== null) {
    return { key: JSON.stringify([parts.watchpointId, parts.eventType, parts.externalId]), fallback: null };
  }
  const hash = createHash("sha256").update(normalizeUrl(parts.url)).digest("hex");
  return {
    key: JSON.stringify([parts.watchpointId, parts.eventType, null, "url_hash", hash]),
    fallback: `url_hash:${hash}`,
  };
}
