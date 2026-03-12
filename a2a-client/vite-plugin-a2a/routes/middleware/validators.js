/**
 * Step Routes Validators
 * Extracted from stepRoutes.js
 */

import { getStorageMode } from '../../utils/server.js';

/**
 * Check if session ID is valid format
 * @param sessionId - session identifier to validate
 * @returns true if valid
 */
export function isValidSessionId(sessionId) {
  // Original implementation from stepRoutes.js
  // Add regex/pattern validation here if needed
  return typeof sessionId === 'string' && sessionId.length > 0 && !sessionId.includes('..');
}

/**
 * Get storage mode from request
 * @param req - Express request
 * @returns storage mode string
 */
export function getStorageMode(req) {
  // Delegate to server utils (existing import)
  return getStorageMode(req);
}

/**
 * Validate POST steps body structure
 * @param body - parsed request body
 * @returns validation errors or null
 */
export function validateStepPostBody(body) {
  if (typeof body !== 'object' || body === null) {
    return ['Body must be object'];
  }
  
  const requiredKeys = ['result', 'execute', 'messages', 'context'];
  const missing = requiredKeys.filter(key => body[key] === undefined);
  
  if (missing.length > 0) {
    return [`Missing required fields: ${missing.join(', ')}`];
  }
  
  return null;
}

/**
 * Validate session exists for ID
 * @param cwd - current working directory
 * @param sessionId - session ID
 * @returns true if session directory exists
 */
export function sessionExists(cwd, sessionId) {
  // Implementation: check if session dir exists
  // Uses loadNewSession logic from storage
  return true; // Stub - implement based on storage
}

