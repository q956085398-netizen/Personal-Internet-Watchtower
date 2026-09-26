import assert from "node:assert/strict";
import { test } from "node:test";
import { createConnectorRegistry } from "../src/registry.ts";
import { CONTRACT_VERSION, type Connector } from "../src/contract.ts";

function makeConnector(overrides: Partial<Connector> = {}): Connector {
  const base: Connector = {
    metadata: {
      id: "testsite",
      displayName: "Test Site",
      homeUrl: "https://example.com",
      contractVersion: CONTRACT_VERSION,
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
  };
  return { ...base, ...overrides };
}

test("register accepts a well-formed connector; get/require/list expose it", () => {
  const registry = createConnectorRegistry();
  const connector = makeConnector();
  registry.register(connector);
  assert.equal(registry.get("testsite"), connector);
  assert.equal(registry.require("testsite"), connector);
  assert.deepEqual(registry.list(), [connector]);
});

test("require throws a clear error for an unregistered id", () => {
  const registry = createConnectorRegistry();
  assert.throws(() => registry.require("nope"), /no connector registered/);
});

test("get returns undefined for an unregistered id", () => {
  const registry = createConnectorRegistry();
  assert.equal(registry.get("nope"), undefined);
});

test("register rejects a connector whose contract version does not match", () => {
  const registry = createConnectorRegistry();
  assert.throws(
    () => registry.register(makeConnector({
      metadata: { id: "testsite", displayName: "T", homeUrl: "https://e.com", contractVersion: 2 },
    })),
    /contract version/,
  );
});

test("register rejects a duplicate connector id", () => {
  const registry = createConnectorRegistry();
  registry.register(makeConnector());
  assert.throws(() => registry.register(makeConnector()), /already registered/);
});

test("register rejects ids that are not lowercase site identifiers", () => {
  const registry = createConnectorRegistry();
  for (const bad of ["", "NGA", "has space", "has/slash"]) {
    assert.throws(
      () => registry.register(makeConnector({
        metadata: { id: bad, displayName: "T", homeUrl: "https://e.com", contractVersion: CONTRACT_VERSION },
      })),
      /id/,
      `expected rejection for id ${JSON.stringify(bad)}`,
    );
  }
});

test("register rejects self-invented capability strings", () => {
  const registry = createConnectorRegistry();
  assert.throws(
    () => registry.register(makeConnector({
      capabilities: () => ["latest", "telepathy" as never],
    })),
    /capability/,
  );
});

test("register rejects a watchpoint kind exercising an unknown capability", () => {
  const registry = createConnectorRegistry();
  assert.throws(
    () => registry.register(makeConnector({
      watchpointKinds: () => [
        { kind: "board", displayName: "b", exercises: "psychic" as never, defaultIntervalSeconds: 600, requiresCredentials: false, params: [] },
      ],
    })),
    /capability/,
  );
});

test("register rejects a kind with a non-positive default interval", () => {
  const registry = createConnectorRegistry();
  assert.throws(
    () => registry.register(makeConnector({
      watchpointKinds: () => [
        { kind: "board", displayName: "b", exercises: "latest", defaultIntervalSeconds: 0, requiresCredentials: false, params: [] },
      ],
    })),
    /defaultIntervalSeconds/,
  );
});

test("register rejects duplicate kinds within one connector", () => {
  const registry = createConnectorRegistry();
  const kind = {
    kind: "board", displayName: "b", exercises: "latest" as const,
    defaultIntervalSeconds: 600, requiresCredentials: false, params: [],
  };
  assert.throws(
    () => registry.register(makeConnector({ watchpointKinds: () => [kind, { ...kind }] })),
    /kind "board"/,
  );
});

test("kindOf returns the declared kind and undefined for unknown kinds", () => {
  const registry = createConnectorRegistry();
  registry.register(makeConnector());
  assert.equal(registry.kindOf("testsite", "board")?.defaultIntervalSeconds, 600);
  assert.equal(registry.kindOf("testsite", "nope"), undefined);
  assert.equal(registry.kindOf("nope", "board"), undefined);
});
