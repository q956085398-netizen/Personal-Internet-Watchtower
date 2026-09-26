import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ConnectorCredentials } from "../contract.ts";
import { CONNECTOR_ID_PATTERN } from "../registry.ts";

/**
 * v0 local secrets handling (issue #3), per SPEC §9: single-user, self-hosted,
 * so the simplest complete option is a local secret file plus read-only
 * environment overrides. Everything is scoped to a Connector (ADR-0001 §1) —
 * Watchpoints never hold credentials and share their Connector's scope.
 *
 * Precedence: environment overrides win over file values, so container
 * deployments can inject credentials without mounting the secret file, while
 * interactive use (pasting a long Cookie) goes through `set()`.
 *
 * This module is Core/server-side only. Nothing here is ever serialized to
 * the browser: the Dashboard reads `describeCredentials` (status.ts), which
 * exposes field presence, never values.
 */

/** Environment overrides use WATCHTOWER_SECRET_<CONNECTOR>__<FIELD>. */
export const ENV_PREFIX = "WATCHTOWER_SECRET_";

/**
 * Connector ids may contain "-" and "_", so the env encoding maps "-" to "_"
 * and separates the scope from the field name with a double underscore. Two
 * connector ids that differ only by "-" vs "_" would collide — none of the
 * v0 connectors do (ADR-0001 §5), and the encoding is at least deterministic.
 */
function encodeScope(connectorId: string): string {
  return connectorId.toUpperCase().replaceAll("-", "_");
}

export function envVarName(connectorId: string, field: string): string {
  return `${ENV_PREFIX}${encodeScope(connectorId)}__${field.toUpperCase()}`;
}

export interface SecretsStoreOptions {
  /** Path of the JSON secret file, e.g. `data/secrets.json`. Must be gitignored. */
  filePath: string;
  /** Environment to read overrides from; defaults to `process.env`. */
  env?: Record<string, string | undefined>;
}

export interface SecretsStore {
  /**
   * The Connector's effective credentials (file scope merged with environment
   * overrides), or null when nothing is configured. Empty values are treated
   * as absent so a half-filled form never reads as configured.
   */
  get(connectorId: string): ConnectorCredentials | null;
  /**
   * Merges fields into the Connector's file scope and persists atomically
   * (write to a temp file, then rename). Empty and non-string values are
   * dropped, never stored. Environment overrides are read-only and unaffected.
   */
  set(connectorId: string, creds: ConnectorCredentials): void;
  /** Removes the Connector's file scope; env overrides live outside this store. */
  remove(connectorId: string): void;
  /** Connector ids that have a file scope. Env-only scopes are not listed. */
  listScopes(): readonly string[];
}

type ScopeFields = Record<string, string>;

function assertScopeKey(key: string, filePath: string): void {
  if (!CONNECTOR_ID_PATTERN.test(key)) {
    throw new Error(
      `${filePath}: scope key ${JSON.stringify(key)} is not a valid connector id ` +
        `(lowercase letters, digits, "-", "_")`,
    );
  }
}

function loadFile(filePath: string): Map<string, ScopeFields> {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return new Map(); // A missing file means "no credentials configured yet".
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${filePath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a JSON object mapping connector ids to credential fields`);
  }

  const scopes = new Map<string, ScopeFields>();
  for (const [scope, value] of Object.entries(parsed as Record<string, unknown>)) {
    assertScopeKey(scope, filePath);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`${filePath}: scope "${scope}" must map field names to string values`);
    }
    const fields: ScopeFields = {};
    for (const [field, fieldValue] of Object.entries(value as Record<string, unknown>)) {
      if (typeof fieldValue !== "string") {
        throw new Error(`${filePath}: scope "${scope}" field "${field}" must be a string`);
      }
      if (fieldValue.length > 0) fields[field] = fieldValue;
    }
    scopes.set(scope, fields);
  }
  return scopes;
}

function writeFileAtomic(filePath: string, contents: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  try {
    // 0600 at creation so the credential never touches disk world-readable;
    // rename then replaces any wider-permission file wholesale.
    writeFileSync(tmp, contents, { encoding: "utf8", mode: 0o600 });
    renameSync(tmp, filePath);
  } catch (error) {
    rmSync(tmp, { force: true });
    throw error;
  }
}

function keepValue(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function createSecretsStore(options: SecretsStoreOptions): SecretsStore {
  const { filePath } = options;
  const env = options.env ?? process.env;
  const scopes = loadFile(filePath);

  function envOverrides(connectorId: string): ScopeFields {
    const prefix = `${ENV_PREFIX}${encodeScope(connectorId)}__`;
    const overrides: ScopeFields = {};
    for (const [key, value] of Object.entries(env)) {
      if (!key.startsWith(prefix) || !keepValue(value)) continue;
      overrides[key.slice(prefix.length).toLowerCase()] = value;
    }
    return overrides;
  }

  function persist(): void {
    const plain = Object.fromEntries(scopes);
    writeFileAtomic(filePath, `${JSON.stringify(plain, null, 2)}\n`);
  }

  return {
    get(connectorId: string): ConnectorCredentials | null {
      const merged = { ...(scopes.get(connectorId) ?? {}), ...envOverrides(connectorId) };
      return Object.keys(merged).length > 0 ? merged : null;
    },

    set(connectorId: string, creds: ConnectorCredentials): void {
      assertScopeKey(connectorId, filePath);
      const fields = scopes.get(connectorId) ?? {};
      for (const [field, value] of Object.entries(creds)) {
        if (keepValue(value)) fields[field] = value;
      }
      if (Object.keys(fields).length > 0) {
        scopes.set(connectorId, fields);
      } else {
        scopes.delete(connectorId);
      }
      persist();
    },

    remove(connectorId: string): void {
      if (!scopes.delete(connectorId)) return;
      persist();
    },

    listScopes(): readonly string[] {
      return [...scopes.keys()].sort();
    },
  };
}
