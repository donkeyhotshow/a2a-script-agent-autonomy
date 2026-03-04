/**
 * File action handlers for API Client
 */

import type { HandleActionOptions, HandleActionResult } from '../action-handler.js';

/**
 * Handle read-file action
 */
export async function handleReadFileAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const filePayload = payload as { path?: string; startLine?: number; endLine?: number };
    
    if (!filePayload?.path) {
        return { handled: false, error: 'No path in read-file action' };
    }
    
    if (!options.readFile) {
        return { handled: false, error: 'readFile handler not provided' };
    }
    
    try {
        const result = await options.readFile(filePayload.path, {
            startLine: filePayload.startLine,
            endLine: filePayload.endLine
        });
        
        return {
            handled: true,
            actionType: 'read-file',
            result: {
                'read-file': {
                    path: filePayload.path,
                    content: result.success ? result.content : undefined,
                    error: result.error
                }
            }
        };
    } catch (err) {
        return {
            handled: true,
            actionType: 'read-file',
            result: {
                'read-file': {
                    path: filePayload.path,
                    error: err instanceof Error ? err.message : String(err)
                }
            }
        };
    }
}

/**
 * Handle write-file action
 */
export async function handleWriteFileAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const filePayload = payload as { path?: string; content?: string; createDirs?: boolean };
    
    if (!filePayload?.path || filePayload.content === undefined) {
        return { handled: false, error: 'No path or content in write-file action' };
    }
    
    if (!options.writeFile) {
        return { handled: false, error: 'writeFile handler not provided' };
    }
    
    try {
        const result = await options.writeFile(filePayload.path, filePayload.content, {
            createDirs: filePayload.createDirs
        });
        
        return {
            handled: true,
            actionType: 'write-file',
            result: {
                'write-file': {
                    path: filePayload.path,
                    success: result.success,
                    error: result.error
                }
            }
        };
    } catch (err) {
        return {
            handled: true,
            actionType: 'write-file',
            result: {
                'write-file': {
                    path: filePayload.path,
                    success: false,
                    error: err instanceof Error ? err.message : String(err)
                }
            }
        };
    }
}