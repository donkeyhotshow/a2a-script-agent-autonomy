/**
 * @a2a/sdk - Unified SDK package
 * 
 * This package provides unified exports for both client and server components.
 * 
 * @example
 * // Client (browser or Node.js)
 * import { ApiClient } from '@a2a/sdk/client';
 * 
 * @example
 * // Server (Node.js)
 * import expressApp from '@a2a/sdk/server';
 */

// Re-export client exports
export * from './index.js';

// Re-export server exports
// Users can also import directly from '@a2a/sdk/server'
export { default as createApp } from './server/index.js';
