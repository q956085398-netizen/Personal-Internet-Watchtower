/**
 * Public surface of the v0 secrets layer (issue #3). Entry point:
 * `createSecretsStore({ filePath })` plus the value-free status helpers.
 * Design decision: docs/adr/0002-v0-secrets-handling.md.
 */
export { createSecretsStore, envVarName, ENV_PREFIX, type SecretsStore, type SecretsStoreOptions } from "./store.ts";
export {
  describeCredentials,
  orphanedCredentialScopes,
  type ConnectorCredentialStatus,
  type CredentialFieldStatus,
} from "./status.ts";
