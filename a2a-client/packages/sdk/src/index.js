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

// Re-export client
export * from '@a2a/api-client';

// Re-export server
// Note: Users can also import directly from '@a2a/api-server'
// The server export is available as the default export from api-server
