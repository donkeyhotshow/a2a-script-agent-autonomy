/**
 * Types for FS Utils
 * 
 * Re-exports shared session types from @a2a/types
 * @see docs/new-request-flow/PROTOCOL.md
 */

// Re-export all Session types from @a2a/types
export {
    Session,
    SESSION_STATUS,
    SESSION_ACTIONS,
    MESSAGE_ROLES,
    EXCHANGE_LOG_TYPES,
    createSession,
    validateSessionData,
    sanitizeSessionForClient,
} from '@a2a-client/types';
