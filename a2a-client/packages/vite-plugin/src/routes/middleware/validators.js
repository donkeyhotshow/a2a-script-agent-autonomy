/**
 * Step Routes Validators
 * Extracted from stepRoutes.ts
 */
import { loadNewSession } from '@a2a-client/storage/newSessions.js';
export { getStorageMode, isValidSessionId } from '../../utils/server.js';
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
    const session = loadNewSession(cwd, sessionId);
    return session !== null;
}
