/**
 * TODO(Task-05): exchangeLog[] / messages[] storage; reconstruct messages from log – tasks/client/05-history-and-types-packages-integration.md
 */
export { default as SessionStorage } from './session-storage';
export { default as HistoryManager } from './history-manager';
export type {
  SessionMetadata,
  SessionData,
  PlanEntry,
  TaskEntry,
  ExecutionLogEntry
} from './session-storage';

// Re-export commonly used types
export type {
  SessionMetadata as HistorySessionMetadata,
  SessionData as HistorySessionData,
  PlanEntry as HistoryPlanEntry,
  TaskEntry as HistoryTaskEntry,
  ExecutionLogEntry as HistoryExecutionLogEntry
};