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