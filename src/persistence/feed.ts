import type { DatabaseSync } from "node:sqlite";
import type { Capability } from "../contract.ts";
import { DEFAULT_EVENT_LIMIT, MAX_EVENT_LIMIT, rowToEvent } from "./events.ts";
import type { EventRecord, EventType } from "./types.ts";
import { assertBoundedLimit, assertEnum } from "./validation.ts";

/**
 * Dashboard feed view (issue #11).
 *
 * Sections are the closed, product-facing classification (AGENTS.md UI
 * baseline; derivation is a Core rule per ADR-0001 §4 — no section column is
 * ever stored):
 *
 * - "about_me"  和我有关: replies / likes / @mentions — event_type
 *   `account_event` only.
 * - "following" 关注更新: updates from explicit watchpoints whose kind
 *   exercises following_updates / live_status (followed uploads, followed
 *   live streams; followed forum threads once a thread-level kind exists).
 * - "worth"     值得看看: bounded, explainable surfacing inside
 *   already-added sources — every other observation (board/forum latest &
 *   hot).
 *
 * Derivation runs at read time from (event_type, kind exercises), so a
 * connector declaring different exercises re-classifies existing rows
 * immediately. Ordering is relevance-first, then freshness (ADR-0001 §4:
 * 相关事件优先，其次 freshness); source-specific signals stay in the
 * connectors' event_type/metadata and may layer on in #16's rendering.
 */

export const SECTIONS = ["about_me", "following", "worth"] as const;
export type Section = (typeof SECTIONS)[number];

/** The capabilities whose watchpoint kinds count as 关注更新 (ADR-0001 §4 rule 2). */
const FOLLOWING_EXERCISES: readonly Capability[] = ["following_updates", "live_status"];

export function deriveSection(eventType: EventType, exercises: Capability | undefined): Section {
  if (eventType === "account_event") return "about_me";
  if (exercises !== undefined && FOLLOWING_EXERCISES.includes(exercises)) return "following";
  return "worth";
}

export type ExercisesResolver = (connectorId: string, kind: string) => Capability | undefined;

export interface FeedFilter {
  /** Omit for the merged feed, relevance-first across all three sections. */
  section?: Section;
  /**
   * Hard-bounded page size: default 50, capped at 200. The product's
   * "页面必须有尽头" is enforced here, at the query, not in the renderer.
   */
  limit?: number;
}

export type FeedItem = EventRecord & { section: Section };

interface WatchpointKindRow {
  id: string;
  connector_id: string;
  kind: string;
}

type EventRow = Parameters<typeof rowToEvent>[0];

export function createFeedRepo(db: DatabaseSync, resolveExercises: ExercisesResolver) {
  const selectWatchpointKinds = db.prepare("SELECT id, connector_id, kind FROM watchpoints");

  /** Watchpoint ids whose kind exercises a following capability (ADR-0001 §4 rule 2). */
  function followingWatchpointIds(): string[] {
    const rows = selectWatchpointKinds.all() as unknown as WatchpointKindRow[];
    const following: string[] = [];
    for (const row of rows) {
      const exercises = resolveExercises(row.connector_id, row.kind);
      if (exercises !== undefined && FOLLOWING_EXERCISES.includes(exercises)) {
        following.push(row.id);
      }
    }
    return following;
  }

  function listSection(section: Section, limit: number): FeedItem[] {
    let where: string;
    let args: (string | number)[];
    if (section === "about_me") {
      where = "event_type = 'account_event'";
      args = [];
    } else {
      const ids = followingWatchpointIds();
      if (section === "following" && ids.length === 0) return [];
      where = ids.length > 0
        ? `event_type != 'account_event' AND watchpoint_id ${section === "following" ? "IN" : "NOT IN"} (${ids.map(() => "?").join(", ")})`
        : "event_type != 'account_event'";
      args = ids;
    }
    const rows = db
      .prepare(
        `SELECT * FROM events WHERE ${where} ORDER BY discovered_at DESC, rowid DESC LIMIT ${limit}`,
      )
      .all(...args) as unknown as EventRow[];
    return rows.map((row) => ({ ...rowToEvent(row), section }));
  }

  return {
    /**
     * Bounded, section-aware Dashboard query. Without `section`, the merged
     * feed is relevance-first: about_me, then following, then worth, each
     * freshest-first (ADR-0001 §4).
     */
    listFeed(filter: FeedFilter = {}): FeedItem[] {
      const limit = filter.limit === undefined
        ? DEFAULT_EVENT_LIMIT
        : assertBoundedLimit(filter.limit, MAX_EVENT_LIMIT);
      if (filter.section !== undefined) {
        assertEnum(filter.section, SECTIONS, "section");
        return listSection(filter.section, limit);
      }
      const merged: FeedItem[] = [];
      for (const section of SECTIONS) {
        merged.push(...listSection(section, limit - merged.length));
        if (merged.length >= limit) break;
      }
      return merged.slice(0, limit);
    },
  };
}

export type FeedRepo = ReturnType<typeof createFeedRepo>;
