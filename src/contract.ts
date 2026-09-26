/**
 * TypeScript binding of ADR-0001 (Connector / Watchpoint / Event contract).
 *
 * Contract fields are snake_case in the ADR and SQLite; the TS binding uses
 * camelCase (ADR-0001 §0). The closed enums here are load-bearing: the
 * Dashboard and the scheduler branch on these values only — site ids must
 * never appear in Core (ADR-0001 后果).
 */
import type { EventType, MetricKey, PollFailureReason, Watchpoint } from "./persistence/types.ts";

export const CONTRACT_VERSION = 1;

/**
 * Closed capability set (ADR-0001 §1). Connectors declare what they can do;
 * Core rejects self-invented strings at registration time.
 */
export const CAPABILITIES = [
  "latest",
  "hot",
  "following_updates",
  "live_status",
  "account_events",
  "search",
  "metrics",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export type CredentialsKind = "cookie" | "token";

export interface CredentialsSpec {
  kind: CredentialsKind;
  fields: { name: string; label: string }[];
}

export interface ConnectorMetadata {
  /** Globally unique, lowercase; e.g. "nga" / "bilibili" / "lkong". */
  id: string;
  displayName: string;
  homeUrl: string;
  contractVersion: number;
  /** Omitted for connectors that need no login. */
  credentials?: CredentialsSpec;
}

export type ParamFieldType = "text" | "number" | "select" | "boolean";

export interface ParamField {
  name: string;
  label: string;
  type: ParamFieldType;
  required: boolean;
  /** Required when type is "select". */
  options?: { value: string; label: string }[];
}

export interface WatchpointKind {
  /** Unique within the connector, snake_case; e.g. "board". */
  kind: string;
  displayName: string;
  exercises: Capability;
  defaultIntervalSeconds: number;
  requiresCredentials: boolean;
  /** Empty array = no user parameters. */
  params: ParamField[];
}

export interface WatchpointOption {
  value: string;
  label: string;
}

/** Connector-scoped credentials (SPEC §9): keys are CredentialsSpec field names. */
export type ConnectorCredentials = Record<string, string>;

export interface PollContext {
  /** Core-injected clock, for testability. */
  now: Date;
  /** Resolved by Core when the kind requires credentials; null otherwise. */
  credentials: ConnectorCredentials | null;
  /** Opaque watermark from the last successful poll; passed back verbatim. */
  state: string | null;
}

export interface PollSuccess {
  ok: true;
  /** Core truncates to MAX_EVENTS_PER_POLL; connectors should send ≤ 30. */
  events: ConnectorEvent[];
  /** Opaque watermark: Core persists it verbatim and returns it next poll. */
  state?: string;
  /** Scheduler clamps to [MIN_INTERVAL_SECONDS, MAX_INTERVAL_SECONDS]. */
  nextPollHintSeconds?: number;
}

/** Single source of truth for the failure enum: the persistence layer's binding. */
export type { PollFailureReason } from "./persistence/types.ts";

export interface PollFailure {
  ok: false;
  reason: PollFailureReason;
  /** User-facing status message. */
  message: string;
  /** Expected for rate_limited; the scheduler will not poll earlier than this. */
  retryAfterSeconds?: number;
}

export type PollResult = PollSuccess | PollFailure;

export type CredentialStatus =
  | { ok: true }
  | { ok: false; reason: "auth_error" | "temporary_failure"; message: string };

/**
 * ADR-0001 §4 Event, Connector-supplied fields. Core assigns `id`, derives
 * `watchpoint_id`, and validates `connectorId` against the Watchpoint's
 * connector. Field names match the persistence layer's EventInput so the
 * runner can hand batches over without reshaping.
 */
export interface ConnectorEvent {
  connectorId: string;
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

export interface Connector {
  metadata: ConnectorMetadata;
  capabilities(): readonly Capability[];
  watchpointKinds(): readonly WatchpointKind[];
  validateCredentials?(creds: ConnectorCredentials): Promise<CredentialStatus>;
  listWatchpointOptions?(
    kind: string,
    creds: ConnectorCredentials | null,
  ): Promise<WatchpointOption[]>;
  poll(watchpoint: Watchpoint, ctx: PollContext): Promise<PollResult>;
}
