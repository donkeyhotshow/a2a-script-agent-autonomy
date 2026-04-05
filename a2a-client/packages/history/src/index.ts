/**
 * History Package - Session Management and Message Storage
 * 
 * Provides comprehensive session management with exchangeLog[] and messages[] storage.
 * Supports reconstructing messages from log entries for complete session history.
 * 
 * Features:
 * - Session lifecycle management (create, update, archive, delete)
 * - Exchange log storage for all client-server interactions
 * - Message reconstruction from log entries
 * - Plan and task management within sessions
 * - Context preservation across session states
 */

export { default as SessionStorage } from './session-storage.js';
export { default as HistoryManager } from './history-manager.js';
export type {
  SessionMetadata,
  SessionData,
  PlanEntry,
  TaskEntry,
  ExecutionLogEntry,
  ExchangeLogEntry,
  MessageEntry,
  SessionContext
} from './session-storage.js';

// Re-export commonly used types
export type {
  SessionMetadata as HistorySessionMetadata,
  SessionData as HistorySessionData,
  PlanEntry as HistoryPlanEntry,
  TaskEntry as HistoryTaskEntry,
  ExecutionLogEntry as HistoryExecutionLogEntry,
  ExchangeLogEntry as HistoryExchangeLogEntry,
  MessageEntry as HistoryMessageEntry,
  SessionContext as HistorySessionContext
};

// Export session model classes for direct use
export { Session, SESSION_STATUS, SESSION_ACTIONS, MESSAGE_ROLES, EXCHANGE_LOG_TYPES, createSession, validateSessionData, sanitizeSessionForHistory } from './types.js';
