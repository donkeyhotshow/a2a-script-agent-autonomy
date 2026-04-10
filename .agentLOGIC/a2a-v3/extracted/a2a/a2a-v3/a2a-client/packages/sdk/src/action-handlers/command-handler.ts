/**
 * Command action handler for API Client
 * @see docs/new-request-flow/PROTOCOL.md#action-key-shape-обязательно
 */

import type { HandleActionOptions, HandleActionResult } from '../action-handler.js';

/**
 * Handle execute-command action
 */
export async function handleExecuteCommandAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const cmdPayload = payload as { command?: string; cwd?: string; env?: Record<string, string>; timeout?: number };
    
    if (!cmdPayload?.command) {
        return { handled: false, error: 'No command in execute-command action' };
    }
    
    if (!options.executeCommand) {
        return { handled: false, error: 'executeCommand handler not provided' };
    }
    
    try {
        const result = await options.executeCommand(cmdPayload.command, {
            cwd: cmdPayload.cwd,
            env: cmdPayload.env,
            timeout: cmdPayload.timeout
        });
        
        return {
            handled: true,
            actionType: 'execute-command',
            result: {
                'execute-command': {
                    command: cmdPayload.command,
                    exitCode: result.exitCode ?? (result.success ? 0 : 1),
                    stdout: result.stdout ?? '',
                    stderr: result.stderr ?? ''
                }
            }
        };
    } catch (err) {
        return {
            handled: true,
            actionType: 'execute-command',
            result: {
                'execute-command': {
                    command: cmdPayload.command,
                    exitCode: 1,
                    stdout: '',
                    stderr: err instanceof Error ? err.message : String(err)
                }
            }
        };
    }
}