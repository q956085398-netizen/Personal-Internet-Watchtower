/**
 * Public surface of the v0 scheduler (issue #10): the Connector runner plus
 * its pure scheduling policy. Entry point: `createScheduler({ store,
 * registry })`.
 */
export {
  createScheduler,
  type AttemptOutcome,
  type Scheduler,
  type SchedulerOptions,
  type SkipReason,
} from "./runner.ts";
export {
  DEFAULT_POLL_TIMEOUT_MS,
  MAX_EVENTS_PER_POLL,
  MAX_INTERVAL_SECONDS,
  MIN_INTERVAL_SECONDS,
  clampIntervalSeconds,
  computeNextDelaySeconds,
  isTerminalFailure,
  type NextDelayInput,
  type SchedulingOutcome,
  type TerminalFailureProbe,
} from "./policy.ts";
