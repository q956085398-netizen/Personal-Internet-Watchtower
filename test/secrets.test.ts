import assert from "node:assert/strict";
import { test } from "node:test";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CONTRACT_VERSION, type Connector } from "../src/contract.ts";
import {
  createSecretsStore,
  describeCredentials,
  envVarName,
  orphanedCredentialScopes,
  type SecretsStore,
} from "../src/secrets/index.ts";

/**
 * v0 secrets handling (issue #3), exercised at the public seam:
 *
 * - Connector-scoped credential store backed by a local secret file,
 *   with read-only environment overrides (SPEC §9: env/secret files).
 * - Watchpoints never hold credentials; scopes are shared per Connector.
 * - The status view exposes presence, never values (SPEC §9: the
 *   front-end never receives unnecessary raw credentials).
 */

const connector = (id: string, fields: string[] = ["cookie"]): Connector => ({
  metadata: {
    id,
    displayName: id,
    homeUrl: `https://${id}.example.com`,
    contractVersion: CONTRACT_VERSION,
    credentials: { kind: "cookie", fields: fields.map((name) => ({ name, label: name })) },
  },
  capabilities: () => ["latest"],
  watchpointKinds: () => [
    {
      kind: "board",
      displayName: "板块新帖",
      exercises: "latest",
      defaultIntervalSeconds: 600,
      requiresCredentials: false,
      params: [],
    },
  ],
  poll: async () => ({ ok: true, events: [] }),
});

function makeDir(name: string): string {
  return mkdtempSync(join(tmpdir(), `watchtower-${name}-`));
}

test("get returns null when nothing is configured (no file, no env)", () => {
  const dir = makeDir("empty");
  try {
    const store = createSecretsStore({ filePath: join(dir, "secrets.json") });
    assert.equal(store.get("nga"), null);
    assert.deepEqual(store.listScopes(), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("set/get roundtrip is connector-scoped and persists to the file", () => {
  const dir = makeDir("roundtrip");
  try {
    const filePath = join(dir, "secrets.json");
    const store = createSecretsStore({ filePath });

    store.set("nga", { cookie: "NGA_COOKIE=1" });
    store.set("bilibili", { sessdata: "SESSDATA=2" });

    assert.deepEqual(store.get("nga"), { cookie: "NGA_COOKIE=1" });
    assert.deepEqual(store.get("bilibili"), { sessdata: "SESSDATA=2" });
    assert.equal(store.get("lkong"), null);
    assert.deepEqual(store.listScopes(), ["bilibili", "nga"]);

    // A second store instance over the same file sees the same scopes:
    // credentials are shared per Connector, not per Watchpoint.
    const reopened = createSecretsStore({ filePath });
    assert.deepEqual(reopened.get("nga"), { cookie: "NGA_COOKIE=1" });

    const raw = JSON.parse(readFileSync(filePath, "utf8"));
    assert.deepEqual(raw, { nga: { cookie: "NGA_COOKIE=1" }, bilibili: { sessdata: "SESSDATA=2" } });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("set merges fields instead of replacing the whole scope", () => {
  const dir = makeDir("merge");
  try {
    const store = createSecretsStore({ filePath: join(dir, "secrets.json") });
    store.set("nga", { cookie: "a", extra: "keep-me" });
    store.set("nga", { cookie: "b" });
    assert.deepEqual(store.get("nga"), { cookie: "b", extra: "keep-me" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("set and get drop empty values so they never read as configured", () => {
  const dir = makeDir("empty-values");
  try {
    const store = createSecretsStore({ filePath: join(dir, "secrets.json") });
    store.set("nga", { cookie: "", extra: "real" });
    assert.deepEqual(store.get("nga"), { extra: "real" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("remove deletes only the target scope", () => {
  const dir = makeDir("remove");
  try {
    const store = createSecretsStore({ filePath: join(dir, "secrets.json") });
    store.set("nga", { cookie: "a" });
    store.set("bilibili", { sessdata: "b" });

    store.remove("nga");

    assert.equal(store.get("nga"), null);
    assert.deepEqual(store.get("bilibili"), { sessdata: "b" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("set creates missing parent directories and rewrites atomically", () => {
  const dir = makeDir("mkdir");
  try {
    const filePath = join(dir, "nested", "data", "secrets.json");
    const store = createSecretsStore({ filePath });
    store.set("nga", { cookie: "a" });
    assert.equal(existsSync(filePath), true);
    assert.deepEqual(store.get("nga"), { cookie: "a" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a failed set leaves the previous file intact", () => {
  const dir = makeDir("atomic");
  try {
    const store = createSecretsStore({ filePath: join(dir, "secrets.json") });
    store.set("nga", { cookie: "good" });
    assert.throws(() => store.set("Bad Scope", { cookie: "x" }), /connector id/i);
    assert.deepEqual(store.get("nga"), { cookie: "good" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scope keys must be connector ids", () => {
  const dir = makeDir("scope-keys");
  try {
    const store = createSecretsStore({ filePath: join(dir, "secrets.json") });
    assert.throws(() => store.set("NGA", { cookie: "x" }), /connector id/i);
    assert.throws(() => store.set("", { cookie: "x" }), /connector id/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loading a malformed secrets file fails loudly with the file path", () => {
  const dir = makeDir("malformed");
  try {
    const filePath = join(dir, "secrets.json");
    writeFileSync(filePath, "{ not json", "utf8");
    assert.throws(() => createSecretsStore({ filePath }), /secrets\.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loading a secrets file with non-string values fails loudly", () => {
  const dir = makeDir("nonstring");
  try {
    const filePath = join(dir, "secrets.json");
    writeFileSync(filePath, JSON.stringify({ nga: { cookie: 42 } }), "utf8");
    assert.throws(() => createSecretsStore({ filePath }), /string/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("env overrides win over the file and work without any file", () => {
  const dir = makeDir("env-override");
  try {
    const filePath = join(dir, "secrets.json");
    writeFileSync(filePath, JSON.stringify({ nga: { cookie: "from-file" } }), "utf8");

    const store = createSecretsStore({
      filePath,
      env: {
        [envVarName("nga", "cookie")]: "from-env",
        [envVarName("bilibili", "sessdata")]: "env-only",
        // Other connectors' env vars must not leak into nga's scope.
        [envVarName("lkong", "cookie")]: "other",
        WATCHTOWER_SECRET_NGA_UNRELATED: "prefix-only",
      },
    });

    assert.deepEqual(store.get("nga"), { cookie: "from-env" });
    assert.deepEqual(store.get("bilibili"), { sessdata: "env-only" });
    assert.equal(store.get("unknownsite"), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("env overrides with empty values are ignored", () => {
  const dir = makeDir("env-empty");
  try {
    const store = createSecretsStore({
      filePath: join(dir, "secrets.json"),
      env: { [envVarName("nga", "cookie")]: "" },
    });
    assert.equal(store.get("nga"), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("envVarName maps connector ids and field names deterministically", () => {
  assert.equal(envVarName("nga", "cookie"), "WATCHTOWER_SECRET_NGA__COOKIE");
  assert.equal(envVarName("bilibili", "sessdata"), "WATCHTOWER_SECRET_BILIBILI__SESSDATA");
  assert.equal(envVarName("my-site", "api_token"), "WATCHTOWER_SECRET_MY_SITE__API_TOKEN");
});

test("the secrets file is written with owner-only permissions on POSIX", { skip: process.platform === "win32" }, () => {
  const dir = makeDir("perms");
  try {
    const filePath = join(dir, "secrets.json");
    const store = createSecretsStore({ filePath });
    store.set("nga", { cookie: "a" });
    chmodSync(filePath, 0o644);
    store.set("nga", { cookie: "b" });
    const mode = statSync(filePath).mode & 0o777;
    assert.equal(mode, 0o600, `expected 0600, got ${mode.toString(8)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// —— Status view (value-free, safe for the browser) ——

test("describeCredentials reports field presence without values", () => {
  const dir = makeDir("status");
  try {
    const store = createSecretsStore({ filePath: join(dir, "secrets.json") });
    store.set("nga", { cookie: "secret" });

    const configured = describeCredentials(connector("nga"), store);
    assert.deepEqual(configured, {
      connectorId: "nga",
      required: true,
      configured: true,
      fields: [{ name: "cookie", label: "cookie", present: true }],
    });

    const missing = describeCredentials(connector("bilibili", ["sessdata"]), store);
    assert.deepEqual(missing, {
      connectorId: "bilibili",
      required: true,
      configured: false,
      fields: [{ name: "sessdata", label: "sessdata", present: false }],
    });
    assert.equal(JSON.stringify(missing).includes("secret"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("describeCredentials marks connectors without a credentials spec as not required", () => {
  const dir = makeDir("status-nospec");
  try {
    const store = createSecretsStore({ filePath: join(dir, "secrets.json") });
    const noCreds = connector("lkong");
    delete noCreds.metadata.credentials;
    assert.deepEqual(describeCredentials(noCreds, store), {
      connectorId: "lkong",
      required: false,
      configured: true,
      fields: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// —— Optional cleanup when the last watchpoint of a connector is removed ——

test("orphanedCredentialScopes lists configured scopes with no remaining watchpoints", () => {
  const dir = makeDir("orphans");
  try {
    const store: SecretsStore = createSecretsStore({ filePath: join(dir, "secrets.json") });
    store.set("nga", { cookie: "a" });
    store.set("bilibili", { sessdata: "b" });
    store.set("lkong", { cookie: "c" });

    const watchpoints = [
      { connectorId: "nga" },
      { connectorId: "nga" },
      { connectorId: "bilibili" },
    ];

    assert.deepEqual(orphanedCredentialScopes(store, watchpoints), ["lkong"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("orphanedCredentialScopes ignores env-only scopes (not deletable here)", () => {
  const dir = makeDir("orphans-env");
  try {
    const store = createSecretsStore({
      filePath: join(dir, "secrets.json"),
      env: { [envVarName("nga", "cookie")]: "env-only" },
    });
    assert.deepEqual(orphanedCredentialScopes(store, []), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
