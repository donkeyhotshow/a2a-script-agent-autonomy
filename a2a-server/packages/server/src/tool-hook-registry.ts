/**
 * Tool Hook Registry — PreToolUse / PostToolUse lifecycle hooks.
 * Портировано из паттерна OpenHarness hooks/executor.py.
 *
 * Позволяет регистрировать хуки, которые запускаются до и после
 * каждого выполнения инструмента агентом.
 *
 * Пример регистрации:
 *   globalToolHookRegistry.register({
 *     phase: 'pre',
 *     toolNamePattern: 'write-file',
 *     handler: async (toolName, input) => { ... }
 *   });
 */

import {logger} from '@a2a/server-utils/logger';

export type HookPhase = 'pre' | 'post';

export interface ToolHookResult {
    blocked: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
}

export interface ToolHook {
    phase: HookPhase;
    /** Glob-style pattern for tool names. Use '*' to match all. */
    toolNamePattern: string;
    /** Optional human-readable hook name for logging. */
    name?: string;
    handler: (
        toolName: string,
        input: unknown,
        output?: unknown,
    ) => Promise<ToolHookResult>;
}

/** Simple glob matcher (supports * and prefix matching). */
function matchesPattern(subject: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === subject) return true;
    if (pattern.endsWith('*')) {
        return subject.startsWith(pattern.slice(0, -1));
    }
    if (pattern.startsWith('*')) {
        return subject.endsWith(pattern.slice(1));
    }
    return false;
}

export class ToolHookRegistry {
    private hooks: ToolHook[] = [];

    /** Register a new hook. */
    register(hook: ToolHook): void {
        this.hooks.push(hook);
        logger.debug('[ToolHookRegistry] Hook registered', {
            phase: hook.phase,
            pattern: hook.toolNamePattern,
            name: hook.name ?? 'anonymous',
        });
    }

    /**
     * Run all pre-execution hooks for the given tool.
     * Returns the first blocking result, or non-blocked if all pass.
     */
    async runPre(toolName: string, input: unknown): Promise<ToolHookResult> {
        const matching = this.hooks.filter(
            h => h.phase === 'pre' && matchesPattern(toolName, h.toolNamePattern),
        );

        for (const hook of matching) {
            try {
                const result = await hook.handler(toolName, input, undefined);
                if (result.blocked) {
                    logger.warn('[ToolHookRegistry] Pre-hook BLOCKED tool execution', {
                        hookName: hook.name ?? hook.toolNamePattern,
                        toolName,
                        reason: result.reason,
                    });
                    return result;
                }
            } catch (err) {
                logger.warn('[ToolHookRegistry] Pre-hook error (non-fatal)', {
                    hookName: hook.name ?? hook.toolNamePattern,
                    toolName,
                    error: String(err),
                });
            }
        }

        return {blocked: false};
    }

    /**
     * Run all post-execution hooks for the given tool.
     * Post-hooks never block (they observe only).
     */
    async runPost(toolName: string, input: unknown, output: unknown): Promise<void> {
        const matching = this.hooks.filter(
            h => h.phase === 'post' && matchesPattern(toolName, h.toolNamePattern),
        );

        for (const hook of matching) {
            try {
                await hook.handler(toolName, input, output);
            } catch (err) {
                logger.warn('[ToolHookRegistry] Post-hook error (non-fatal)', {
                    hookName: hook.name ?? hook.toolNamePattern,
                    toolName,
                    error: String(err),
                });
            }
        }
    }

    /** Return the number of registered hooks. */
    get count(): number {
        return this.hooks.length;
    }

    /** Clear all hooks (useful for testing). */
    clear(): void {
        this.hooks = [];
    }
}

/** Singleton hook registry instance. */
export const globalToolHookRegistry = new ToolHookRegistry();
