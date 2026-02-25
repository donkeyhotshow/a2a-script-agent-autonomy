/**
 * Browser-compatible stub for logging-monitoring/logging/index.cjs
 * Exports a browser-compatible mock logger for browser environment.
 */

const defaultLogger = {
  info: (...args) => console.log('[Logger]', ...args),
  warn: (...args) => console.warn('[Logger]', ...args),
  error: (...args) => console.error('[Logger]', ...args),
  debug: (...args) => console.debug('[Logger]', ...args)
};

export { defaultLogger };
