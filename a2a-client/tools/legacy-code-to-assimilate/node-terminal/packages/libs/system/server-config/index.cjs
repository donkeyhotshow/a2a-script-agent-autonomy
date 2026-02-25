/**
 * Модуль конфигурации для MCP сервера
 * Вынесен из mcp-server.cjs для улучшения структуры
 */

/**
 * Читает список отключенных инструментов из конфигурации
 * @param {Object} fileUtils - утилиты для работы с файлами
 * @param {Object} pathUtils - утилиты для работы с путями
 * @returns {Array} массив отключенных инструментов
 */
function readDisabledFromConfig(fileUtils, pathUtils) {
  // По умолчанию все инструменты включены
  return [];
}

module.exports = { readDisabledFromConfig };
