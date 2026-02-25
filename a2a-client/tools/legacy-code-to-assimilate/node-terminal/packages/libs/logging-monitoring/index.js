/**
 * Logging-Monitoring библиотеки - логирование и мониторинг
 */

const logger = require('./logging/index.js');
const monitoring = require('./monitoring/index.js');
const mcpMonitoring = require('./mcp-monitoring/index.js');

// Экспортируем существующие модули
const LoggingMonitoring = {
  // Логгер
  ...logger,

  // Мониторинг
  ...monitoring,

  // MCP Мониторинг
  ...mcpMonitoring
};

module.exports = LoggingMonitoring;
