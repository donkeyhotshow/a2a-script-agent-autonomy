/**
 * Script Runner for executing TypeScript/JavaScript code from MD action files
 * Runs in a2a-client (browser or Node.js environment)
 */

import { VM } from 'vm2';

/**
 * @typedef {Object} ScriptResult
 * @property {boolean} success - Whether execution succeeded
 * @property {*} [data] - Result data if successful
 * @property {string} [error] - Error message if failed
 * @property {number} duration_ms - Execution duration in milliseconds
 */

/**
 * @typedef {Object} ScriptContext
 * @property {string} sessionId - Session identifier
 * @property {string} workingDir - Working directory (for Node.js)
 * @property {Object.<string, string>} [aliases] - Path aliases
 * @property {*} [previousOutput] - Output from previous step
 */

/**
 * Execute JavaScript/TypeScript code string
 * @param {string} code - Code to execute
 * @param {Object} input - Input parameters
 * @param {ScriptContext} context - Execution context
 * @returns {Promise<ScriptResult>}
 */
export async function executeScript(code, input, context) {
  const startTime = Date.now();
  
  try {
    // Remove TypeScript type annotations (basic transpilation)
    const jsCode = code
      .replace(/: \w+(\[\])?/g, '') // Remove type annotations
      .replace(/interface \w+ \{[\s\S]*?\}/g, '') // Remove interfaces
      .replace(/import \{[^}]+\} from ['"][^'"]+['"];?/g, '') // Remove imports
      .replace(/export (default )?/g, ''); // Remove exports
    
    // Wrap code in async function
    const wrappedCode = `
      (async () => {
        ${jsCode}
        
        // Execute the run function if defined
        if (typeof run === 'function') {
          return run(input);
        }
        return null;
      })()
    `;
    
    // Create sandbox with safe built-ins
    const sandbox = {
      input: {
        ...input,
        ...context.aliases && { aliases: context.aliases },
        rootDir: context.workingDir,
      },
      console: {
        log: (...args) => console.log('[Script]', ...args),
        error: (...args) => console.error('[Script]', ...args),
        warn: (...args) => console.warn('[Script]', ...args),
      },
      // Node.js built-ins (when available)
      ...(typeof require === 'function' && {
        require: (moduleName) => {
          const safeModules = ['fs', 'path', 'util', 'crypto', 'buffer', 'stream', 'events'];
          const baseModule = moduleName.split('/')[0];
          if (safeModules.includes(baseModule)) {
            return require(moduleName);
          }
          throw new Error(`Module '${moduleName}' is not allowed in sandbox`);
        },
      }),
    };
    
    // Create VM and run code
    const vm = new VM({
      timeout: 30000, // 30 seconds
      sandbox,
    });
    
    const result = await vm.run(wrappedCode);
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      data: result,
      duration_ms: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration_ms: duration,
    };
  }
}

/**
 * Script Runner class for managing script execution
 */
export class ScriptRunner {
  constructor() {
    /** @type {Map<string, string>} */
    this.scriptCache = new Map();
  }
  
  /**
   * Register a script by ID
   * @param {string} scriptId - Script identifier
   * @param {string} code - Script code
   */
  registerScript(scriptId, code) {
    this.scriptCache.set(scriptId, code);
  }
  
  /**
   * Execute a registered script by ID
   * @param {string} scriptId - Script identifier
   * @param {Object} input - Input parameters
   * @param {ScriptContext} context - Execution context
   * @returns {Promise<ScriptResult>}
   */
  async run(scriptId, input, context) {
    const code = this.scriptCache.get(scriptId);
    
    if (!code) {
      return {
        success: false,
        error: `Script '${scriptId}' not found`,
        duration_ms: 0,
      };
    }
    
    return executeScript(code, input, context);
  }
  
  /**
   * Check if a script is registered
   * @param {string} scriptId - Script identifier
   * @returns {boolean}
   */
  hasScript(scriptId) {
    return this.scriptCache.has(scriptId);
  }
  
  /**
   * Clear all cached scripts
   */
  clear() {
    this.scriptCache.clear();
  }
}

// Singleton instance
export const scriptRunner = new ScriptRunner();

export default scriptRunner;
