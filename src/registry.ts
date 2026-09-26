import {
  CAPABILITIES,
  CONTRACT_VERSION,
  type Capability,
  type Connector,
  type WatchpointKind,
} from "./contract.ts";

/**
 * Core-side Connector registry (ADR-0001 §1). Connectors are compiled in (no
 * dynamic loading in v0) and validated at registration: closed capability
 * enums, matching contract version, unique ids. Nothing here knows about
 * specific sites — branching happens on declared kinds/capabilities only.
 */

const CONNECTOR_ID_PATTERN = /^[a-z][a-z0-9_-]*$/;

export interface ConnectorRegistry {
  /** Validates and registers a connector; throws on any contract violation. */
  register(connector: Connector): void;
  get(connectorId: string): Connector | undefined;
  /** Like get, but throws a descriptive error when the connector is missing. */
  require(connectorId: string): Connector;
  list(): readonly Connector[];
  /** The connector's declared kind descriptor, or undefined when unknown. */
  kindOf(connectorId: string, kind: string): WatchpointKind | undefined;
}

function assertCapability(value: Capability, field: string): void {
  if (!CAPABILITIES.includes(value)) {
    throw new TypeError(
      `${field} "${value}" is not in the closed capability set (ADR-0001 §1); ` +
        `allowed: ${CAPABILITIES.join(", ")}`,
    );
  }
}

function assertConnectorShape(connector: Connector): void {
  const { metadata } = connector;
  if (typeof connector.poll !== "function") {
    throw new TypeError("connector must implement poll()");
  }
  if (metadata.contractVersion !== CONTRACT_VERSION) {
    throw new TypeError(
      `connector "${metadata.id}" declares contract version ${metadata.contractVersion}, ` +
        `but Core speaks version ${CONTRACT_VERSION}`,
    );
  }
  if (!CONNECTOR_ID_PATTERN.test(metadata.id)) {
    throw new TypeError(
      `connector id ${JSON.stringify(metadata.id)} must be a lowercase identifier ` +
        `(letters, digits, "-", "_")`,
    );
  }
  if (typeof metadata.displayName !== "string" || metadata.displayName.trim().length === 0) {
    throw new TypeError(`connector "${metadata.id}" must declare a display name`);
  }
  try {
    const home = new URL(metadata.homeUrl);
    if (home.protocol !== "https:" && home.protocol !== "http:") throw new Error("protocol");
  } catch {
    throw new TypeError(
      `connector "${metadata.id}" homeUrl must be an absolute http(s) URL, got: ${JSON.stringify(metadata.homeUrl)}`,
    );
  }
}

function assertKinds(connectorId: string, kinds: readonly WatchpointKind[]): void {
  const seen = new Set<string>();
  for (const kind of kinds) {
    if (typeof kind.kind !== "string" || kind.kind.trim().length === 0) {
      throw new TypeError(`connector "${connectorId}" has a kind without a name`);
    }
    if (seen.has(kind.kind)) {
      throw new TypeError(`connector "${connectorId}" declares kind "${kind.kind}" twice`);
    }
    seen.add(kind.kind);
    assertCapability(kind.exercises, `connector "${connectorId}" kind "${kind.kind}"`);
    if (!Number.isInteger(kind.defaultIntervalSeconds) || kind.defaultIntervalSeconds <= 0) {
      throw new TypeError(
        `connector "${connectorId}" kind "${kind.kind}" defaultIntervalSeconds must be a positive integer`,
      );
    }
  }
}

export function createConnectorRegistry(): ConnectorRegistry {
  const byId = new Map<string, Connector>();

  return {
    register(connector: Connector): void {
      assertConnectorShape(connector);
      assertKinds(connector.metadata.id, connector.watchpointKinds());
      for (const capability of connector.capabilities()) {
        assertCapability(capability, `connector "${connector.metadata.id}" capability`);
      }
      if (byId.has(connector.metadata.id)) {
        throw new TypeError(`connector "${connector.metadata.id}" is already registered`);
      }
      byId.set(connector.metadata.id, connector);
    },

    get(connectorId: string): Connector | undefined {
      return byId.get(connectorId);
    },

    require(connectorId: string): Connector {
      const connector = byId.get(connectorId);
      if (!connector) {
        throw new Error(`no connector registered for "${connectorId}"`);
      }
      return connector;
    },

    list(): readonly Connector[] {
      return [...byId.values()];
    },

    kindOf(connectorId: string, kind: string): WatchpointKind | undefined {
      return byId.get(connectorId)?.watchpointKinds().find((k) => k.kind === kind);
    },
  };
}
