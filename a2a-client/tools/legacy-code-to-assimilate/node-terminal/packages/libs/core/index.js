/**
 * Core библиотеки - основные утилиты и функции
 */

// Импортируем все core модули
const logging = require('./logging');
const cache = require('./cache');
const jsonUtils = require('./json-utils');
const shared = require('./shared');
const templates = require('./templates');
const time = require('./time');
const configuration = require('./configuration/index.cjs');
const statusMonitor = require('./status-monitor');

// Экспортируем все модули
module.exports = { // Логирование
  ...logging,

  // Кеширование
  ...cache,

  // JSON утилиты
  ...jsonUtils,

  // Общие утилиты
  ...shared,

  // Шаблоны
  ...templates,

  // Временные утилиты
  ...time,

  // Конфигурация
  ...configuration,

  // Мониторинг статуса
  ...statusMonitor };
