import type { Connector } from "../contract.ts";
import type { SecretsStore } from "./store.ts";

/**
 * Value-free credential status views (issue #3). The browser-facing surface
 * reports *whether* a field is configured, never the value itself —
 * SPEC §9: "front-end never receives unnecessary raw credentials".
 */

export interface CredentialFieldStatus {
  name: string;
  label: string;
  present: boolean;
}

export interface ConnectorCredentialStatus {
  connectorId: string;
  /** False for connectors whose metadata has no credentials spec. */
  required: boolean;
  /** True when every declared field has an effective value (file or env). */
  configured: boolean;
  fields: CredentialFieldStatus[];
}

export function describeCredentials(connector: Connector, store: SecretsStore): ConnectorCredentialStatus {
  const spec = connector.metadata.credentials;
  const connectorId = connector.metadata.id;
  if (!spec) {
    return { connectorId, required: false, configured: true, fields: [] };
  }
  const creds = store.get(connectorId);
  const fields = spec.fields.map((field) => ({
    name: field.name,
    label: field.label,
    present: creds?.[field.name] !== undefined,
  }));
  return {
    connectorId,
    required: true,
    configured: fields.every((field) => field.present),
    fields,
  };
}

/**
 * Connector scopes that still hold credentials but have no Watchpoints left —
 * the input for #15's "removing the final use of a Connector may offer
 * credential cleanup" (SPEC §9). Env-only scopes are not listed: this store
 * cannot delete them.
 */
export function orphanedCredentialScopes(
  store: SecretsStore,
  watchpoints: ReadonlyArray<{ connectorId: string }>,
): string[] {
  const inUse = new Set(watchpoints.map((watchpoint) => watchpoint.connectorId));
  return store.listScopes().filter((scope) => !inUse.has(scope));
}
