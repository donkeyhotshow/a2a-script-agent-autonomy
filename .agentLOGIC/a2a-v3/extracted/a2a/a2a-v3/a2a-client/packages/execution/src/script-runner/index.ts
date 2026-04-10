/**
 * Script Runner - execute TypeScript/JavaScript from MD action files
 */

// NOTE: `vm2` is optional at runtime.
// `client-api` startup should not fail just because `vm2` isn't installed.
// We load it lazily inside `executeScript()` and fall back to Node's `vm`.

/**
 * Canonical form for execute.script
 * Used when receiving script execution requests from the server
 */
export interface ExecuteScript {
    code: string;
    language?: 'javascript' | 'typescript';
    /** Input parameters for the script */
    input?: Record<string, unknown>;
}

/**
 * Canonical form for result["script"]
 * Used when returning script execution results to the server
 */
export interface ScriptResultCanonical {
    output?: unknown;
    exitCode: number;
    error?: string;
}

/**
 * Internal result type with additional metadata
 */
export interface ScriptResultInternal {
    success: boolean;
    data?: unknown;
    error?: string;
    duration_ms: number;
}

/**
 * Convert internal result to canonical form for server response
 */
export function toCanonicalResult(internal: ScriptResultInternal): ScriptResultCanonical {
    return {
        output: internal.data,
        exitCode: internal.success ? 0 : 1,
        error: internal.error,
    };
}

export interface ScriptContext {
    sessionId: string;
    workingDir: string;
    aliases?: Record<string, string>;
    previousOutput?: unknown;
}

export async function executeScript(
    code: string,
    input: Record<string, unknown>,
    context: ScriptContext
): Promise<ScriptResultInternal> {
    const startTime = Date.now();
    try {
        const jsCode = code
            .replace(/: \w+(\[\])?/g, '')
            .replace(/interface \w+ \{[\s\S]*?\}/g, '')
            .replace(/import \{[^}]+\} from ['"][^'"]+['"];?/g, '')
            .replace(/export (default )?/g, '');

        const wrappedCode = `
      (async () => {
        ${jsCode}
        if (typeof run === 'function') {
          return run(input);
        }
        return null;
      })()
    `;

        const sandbox: Record<string, unknown> = {
            input: {
                ...input,
                ...(context.aliases && {aliases: context.aliases}),
                rootDir: context.workingDir,
            },
            console: {
                log: (...args: unknown[]) => console.log('[Script]', ...args),
                error: (...args: unknown[]) => console.error('[Script]', ...args),
                warn: (...args: unknown[]) => console.warn('[Script]', ...args),
            },
        };

        if (typeof require === 'function') {
            sandbox.require = (moduleName: string) => {
                const safeModules = ['fs', 'path', 'util', 'crypto', 'buffer', 'stream', 'events'];
                const baseModule = moduleName.split('/')[0];
                if (baseModule && safeModules.includes(baseModule)) {
                    return require(moduleName);
                }
                throw new Error(`Module '${moduleName}' is not allowed in sandbox`);
            };
        }

        // Try `vm2` first (preferred sandbox). If it's not installed, fall back to `vm`.
        let result: unknown;
        let duration: number;

        const vm2 = (() => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                return require('vm2') as {VM: new (opts: any) => {run: (code: string) => unknown}};
            } catch {
                return null;
            }
        })();

        if (vm2 && vm2.VM) {
            const vm = new vm2.VM({
                timeout: 30000,
                sandbox,
            });
            result = await vm.run(wrappedCode);
        } else {
            // Minimal fallback: Node's `vm` module. This is less safe than `vm2`,
            // but keeps the app booting and script runner usable.
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const nodeVm = require('vm') as typeof import('vm');
            const script = new nodeVm.Script(wrappedCode);
            const ctx = nodeVm.createContext(sandbox);
            result = script.runInContext(ctx, {timeout: 30000});
            // `wrappedCode` returns an async IIFE, so the result is usually a Promise.
            if (result && typeof (result as any).then === 'function') {
                result = await result;
            }
        }

        duration = Date.now() - startTime;
        return {success: true, data: result, duration_ms: duration};
    } catch (error) {
        const duration = Date.now() - startTime;
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration_ms: duration,
        };
    }
}

export class ScriptRunner {
    private scriptCache = new Map<string, string>();

    registerScript(scriptId: string, code: string): void {
        this.scriptCache.set(scriptId, code);
    }

    async run(
        scriptId: string,
        input: Record<string, unknown>,
        context: ScriptContext
    ): Promise<ScriptResultInternal> {
        const code = this.scriptCache.get(scriptId);
        if (!code) {
            return {success: false, error: `Script '${scriptId}' not found`, duration_ms: 0};
        }
        return executeScript(code, input, context);
    }

    hasScript(scriptId: string): boolean {
        return this.scriptCache.has(scriptId);
    }

    clear(): void {
        this.scriptCache.clear();
    }
}

export const scriptRunner = new ScriptRunner();
export default scriptRunner;
