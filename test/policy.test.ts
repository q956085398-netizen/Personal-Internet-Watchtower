import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_INTERVAL_SECONDS,
  MIN_INTERVAL_SECONDS,
  clampIntervalSeconds,
  computeNextDelaySeconds,
  isTerminalFailure,
} from "../src/scheduler/policy.ts";

/**
 * Scheduling policy (issue #10 / ADR-0001 §3): pure input → delay functions.
 * The interval's safety floor is MIN_INTERVAL_SECONDS, the ceiling is
 * MAX_INTERVAL_SECONDS; auth_error and permanent_failure are terminal (no
 * automatic retry); temporary_failure backs off exponentially per consecutive
 * failure; rate_limited never polls earlier than retry_after_seconds.
 */

test("interval constants match the contract (ADR-0001 §3)", () => {
  assert.equal(MIN_INTERVAL_SECONDS, 60);
  assert.equal(MAX_INTERVAL_SECONDS, 86400);
});

test("clampIntervalSeconds enforces the safety floor and ceiling", () => {
  assert.equal(clampIntervalSeconds(5), 60, "config below the floor is raised");
  assert.equal(clampIntervalSeconds(600), 600, "in-range config passes through");
  assert.equal(clampIntervalSeconds(100_000), 86_400, "config above the ceiling is capped");
});

test("success schedules the next poll at the watchpoint interval", () => {
  assert.equal(
    computeNextDelaySeconds({ intervalSeconds: 600, consecutiveFailures: 0, outcome: { kind: "success" } }),
    600,
  );
});

test("success with a next-poll hint uses it, clamped to the safe bounds", () => {
  const outcome = { kind: "success" as const, nextPollHintSeconds: 3600 };
  assert.equal(computeNextDelaySeconds({ intervalSeconds: 600, consecutiveFailures: 0, outcome }), 3600);
  assert.equal(
    computeNextDelaySeconds({
      intervalSeconds: 600,
      consecutiveFailures: 0,
      outcome: { kind: "success", nextPollHintSeconds: 10 },
    }),
    60,
    "hint below the floor is raised",
  );
  assert.equal(
    computeNextDelaySeconds({
      intervalSeconds: 600,
      consecutiveFailures: 0,
      outcome: { kind: "success", nextPollHintSeconds: 500_000 },
    }),
    86_400,
    "hint above the ceiling is capped",
  );
});

test("rate_limited never polls earlier than retry_after_seconds — uncapped (ADR-0001 §3)", () => {
  assert.equal(
    computeNextDelaySeconds({
      intervalSeconds: 600,
      consecutiveFailures: 1,
      outcome: { kind: "failure", reason: "rate_limited", retryAfterSeconds: 3600 },
    }),
    3600,
    "retry_after within bounds is honored exactly",
  );
  assert.equal(
    computeNextDelaySeconds({
      intervalSeconds: 600,
      consecutiveFailures: 1,
      outcome: { kind: "failure", reason: "rate_limited", retryAfterSeconds: 20 },
    }),
    60,
    "a sub-floor retry_after still means 'not earlier than' the floor",
  );
  assert.equal(
    computeNextDelaySeconds({
      intervalSeconds: 600,
      consecutiveFailures: 1,
      outcome: { kind: "failure", reason: "rate_limited", retryAfterSeconds: 200_000 },
    }),
    200_000,
    "the ceiling clamp is ADR-sanctioned for next_poll_hint only, never for retry_after",
  );
});

test("rate_limited without retry_after falls back to the interval", () => {
  assert.equal(
    computeNextDelaySeconds({
      intervalSeconds: 600,
      consecutiveFailures: 1,
      outcome: { kind: "failure", reason: "rate_limited" },
    }),
    600,
  );
});

test("temporary_failure backs off exponentially per consecutive failure", () => {
  const outcome = { kind: "failure" as const, reason: "temporary_failure" as const };
  assert.equal(computeNextDelaySeconds({ intervalSeconds: 600, consecutiveFailures: 1, outcome }), 600);
  assert.equal(computeNextDelaySeconds({ intervalSeconds: 600, consecutiveFailures: 2, outcome }), 1200);
  assert.equal(computeNextDelaySeconds({ intervalSeconds: 600, consecutiveFailures: 3, outcome }), 2400);
});

test("temporary_failure backoff is capped at the ceiling", () => {
  assert.equal(
    computeNextDelaySeconds({
      intervalSeconds: 3600,
      consecutiveFailures: 10,
      outcome: { kind: "failure", reason: "temporary_failure" },
    }),
    86_400,
  );
});

test("auth_error and permanent_failure are terminal: no automatic retry", () => {
  assert.equal(
    computeNextDelaySeconds({
      intervalSeconds: 600,
      consecutiveFailures: 1,
      outcome: { kind: "failure", reason: "auth_error" },
    }),
    null,
  );
  assert.equal(
    computeNextDelaySeconds({
      intervalSeconds: 600,
      consecutiveFailures: 1,
      outcome: { kind: "failure", reason: "permanent_failure" },
    }),
    null,
  );
});

test("isTerminalFailure gates only on an unrecovered auth/permanent error", () => {
  assert.equal(isTerminalFailure(undefined), false, "never-attempted watchpoints are not terminal");
  assert.equal(
    isTerminalFailure({ consecutiveFailures: 3, lastErrorReason: "rate_limited" }),
    false,
  );
  assert.equal(
    isTerminalFailure({ consecutiveFailures: 0, lastErrorReason: "auth_error" }),
    false,
    "a success resets the counter, so the historical auth error is not terminal",
  );
  assert.equal(isTerminalFailure({ consecutiveFailures: 1, lastErrorReason: "auth_error" }), true);
  assert.equal(
    isTerminalFailure({ consecutiveFailures: 4, lastErrorReason: "permanent_failure" }),
    true,
  );
});
