/**
 * Session Storage
 *
 * This file re-exports from the modular session-management package for backward compatibility.
 * The actual implementation has been split into:
 * - session-management/types.ts - Type definitions
 * - session-management/storage-interface.ts - Storage backend interface
 * - session-management/storage-backends.ts - Storage backend implementations
 * - session-management/session-manager.ts - Session management logic
 * - session-management/index.ts - Main module
 */

// Re-export from modular structure for backward compatibility
export * from './session-management/index.js';
export { SessionStorage, default } from './session-management/index.js';
