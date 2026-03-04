/**
 * Session Storage
 * 
 * This file re-exports from the modular session-storage package for backward compatibility.
 * The actual implementation has been split into:
 * - session-storage/types.ts - Type definitions
 * - session-storage/storage-interface.ts - Storage backend interface
 * - session-storage/storage-backends.ts - Storage backend implementations
 * - session-storage/session-manager.ts - Session management logic
 * - session-storage/index.ts - Main module
 */

// Re-export from modular structure for backward compatibility
export * from './session-storage/index.js';
export { SessionStorage } from './session-storage/index.js';
export default from './session-storage/index.js';
