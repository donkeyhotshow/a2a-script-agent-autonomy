/**
 * LoggingUtils - Система логирования для core модулей
 */

class LoggingUtils {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.enabled = options.enabled !== false;
    this.prefix = options.prefix || '[CORE]';
  }

  log(level, message, data = null) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `${this.prefix} [${level.toUpperCase()}] ${timestamp}: ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  debug(message, data = null) {
    if (this.level === 'debug') {
      this.log('debug', message, data);
    }
  }

  setLevel(level) {
    this.level = level;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setPrefix(prefix) {
    this.prefix = prefix;
  }
}

// ES Module экспорт для совместимости
export { LoggingUtils };

