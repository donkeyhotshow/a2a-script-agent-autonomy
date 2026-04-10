/**
 * Types for JSON
 * 
 * Re-exports shared session types from @a2a/types to avoid duplication
 */

// Re-export all session-related types and functions from the shared @a2a/types package
export {
  Session,
  SESSION_STATUS,
  SESSION_ACTIONS,
  MESSAGE_ROLES,
  EXCHANGE_LOG_TYPES,
  createSession,
  validateSessionData,
  sanitizeSessionForClient as sanitizeSessionForJSON,
} from '@a2a-client/types';