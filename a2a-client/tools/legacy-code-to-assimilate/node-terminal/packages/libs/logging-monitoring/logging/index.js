/**
 * Browser-compatible logging module
 * Мок для браузерного окружения
 */

class BrowserLogger {
  constructor() {
    this.level = 'info';
  }

  info(...args) {
    console.log('[INFO]', ...args);
  }

  warn(...args) {
    console.warn('[WARN]', ...args);
  }

  error(...args) {
    console.error('[ERROR]', ...args);
  }

  debug(...args) {
    console.debug('[DEBUG]', ...args);
  }

  trace(...args) {
    console.trace('[TRACE]', ...args);
  }
}

export const defaultLogger = new BrowserLogger();
export const logger = defaultLogger;
export { BrowserLogger };