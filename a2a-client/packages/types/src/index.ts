/**
 * @a2a/types - Shared TypeScript types for A2A packages
 * Shared between @a2a/client, @a2a/server, and other packages.
 *
 * Protocol types for new-request-flow: https://github.com/org-carrier/a2a-script-agent/tree/main/docs/new-request-flow
 *
 * This file re-exports from modular sub-packages for backward compatibility.
 * The actual types have been split into:
 * - protocol/ - Protocol types (new-request-flow)
 * - state/ - Task and session state types
 * - search/ - Search functionality types
 * - rag/ - RAG (Retrieval-Augmented Generation) types
 * - api/ - API response types
 * - websocket/ - WebSocket event types
 * - arch/ - Architectural feature types
 * - file/ - File operation types
 * - message/ - Client/server message types
 * - factory/ - Factory functions
 */

// Re-export action types from action-types.ts
export {
  // Execute types
  FormAction,
  FormInput,
  FormChoice,
  ScriptAction,
  RagSearchAction,
  RagSearchFilters,
  RagSearchOptions,
  ReadFileAction,
  WriteFileAction,
  ExecuteCommandAction,
  MessageAction,
  ExecutePayload,
  ExecuteActionType,
  // Execute types with new naming convention
  ExecuteScript,
  ExecuteReadFile,
  ExecuteWriteFile,
  ExecuteRagSearch,
  ExecuteCommand,
  ExecuteForm,
  ExecuteMessage,
  // Result types
  ScriptResult,
  RagSearchResult,
  RagSearchResultPayload,
  ReadFileResult,
  WriteFileResult,
  FormResult,
  ActionResult,
  // Result types with new naming convention
  ScriptActionResult,
  ReadFileActionResult,
  WriteFileActionResult,
  RagSearchActionResult,
  CommandActionResult,
  FormActionResult,
} from './action-types.js';

// Re-export from modular packages
export * from './protocol/index.js';
export * from './state/index.js';
export * from './search/index.js';
export * from './rag/index.js';
export * from './api/index.js';
export * from './websocket/index.js';
export * from './arch/index.js';
export * from './file/index.js';
export * from './message/index.js';
export * from './factory/index.js';

// Re-export Session types from types.js
export {
  Session,
  SESSION_STATUS,
  LEGACY_SESSION_STATUS,
  SESSION_ACTIONS,
  MESSAGE_ROLES,
  EXCHANGE_LOG_TYPES,
  createSession,
  validateSessionData,
  sanitizeSessionForClient,
} from './types.js';

// Re-export factory functions for convenience
export {
  createContextBlock,
  createTask,
  createFileBlock,
  createSearchQuery,
} from './factory/index.js';
