/**
 * Logging-Monitoring библиотеки - логирование и мониторинг
 * CommonJS version for Jest compatibility
 */

const logger = require('./logging/index.js');
const monitoring = require('./monitoring/index.cjs');
const mcpMonitoring = require('./mcp-monitoring/index.js');

// Экспортируем существующие модули
const LoggingMonitoring = {
  // Логгер
  ...logger,

  // Мониторинг
  ...monitoring,

  // MCP Мониторинг
  ...mcpMonitoring,

  // Добавляем CurrentLoggingUtils для совместимости с тестами
  CurrentLoggingUtils: {
    defaultLogger: logger.defaultLogger || console,
    info: logger.defaultLogger?.info || console.info,
    debug: logger.defaultLogger?.debug || console.debug,
    warn: logger.defaultLogger?.warn || console.warn,
    error: logger.defaultLogger?.error || console.error
  }
};

module.exports = LoggingMonitoring;
