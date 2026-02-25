/**
 * Script Runner - execute TypeScript/JavaScript from MD action files
 */

import { VM } from 'vm2';

export interface ScriptResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration_ms: number;
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
): Promise<ScriptResult> {
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
        ...(context.aliases && { aliases: context.aliases }),
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

    const vm = new VM({
      timeout: 30000,
      sandbox,
    });

    const result = await vm.run(wrappedCode);
    const duration = Date.now() - startTime;
    return { success: true, data: result, duration_ms: duration };
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
  ): Promise<ScriptResult> {
    const code = this.scriptCache.get(scriptId);
    if (!code) {
      return { success: false, error: `Script '${scriptId}' not found`, duration_ms: 0 };
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
