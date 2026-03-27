/**
 * Script action handler for API Client
 */

import type { HandleActionOptions, HandleActionResult } from '../action-handler.js';

/**
 * Handle script execution
 */
export async function handleScriptAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const scriptPayload = payload as { code?: string; input?: Record<string, unknown>; output?: string };
    
    if (!scriptPayload?.code) {
        return { handled: false, error: 'No code in script action' };
    }
    
    if (!options.executeScript) {
        return { handled: false, error: 'executeScript handler not provided' };
    }
    
    try {
        const execResult = await options.executeScript(
            scriptPayload.code,
            scriptPayload.input ?? {},
            {
                workingDir: options.projectPath,
                sessionId: options.sessionId,
                stepId: 'current'
            }
        );
        
        if (!execResult.success && execResult.error) {
            return {
                handled: true,
                actionType: 'script',
                result: {
                    script: {
                        exitCode: 1,
                        error: execResult.error
                    }
                }
            };
        }

        return {
            handled: true,
            actionType: 'script',
            result: {
                script: {
                    output: execResult.data,
                    exitCode: 0
                }
            }
        };
    } catch (err) {
        return {
            handled: true,
            actionType: 'script',
            result: {
                script: {
                    exitCode: 1,
                    error: err instanceof Error ? err.message : String(err)
                }
            }
        };
    }
}