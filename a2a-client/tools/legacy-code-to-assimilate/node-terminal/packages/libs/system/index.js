/**
 * System библиотеки - системные утилиты и управление процессами
 */

// Импортируем все system модули
const processSpawn = require('./process-spawn');
const unifiedDaemon = require('./unified-daemon');
const cluster = require('./cluster');
const taskManagement = require('./task-management');
const fileOperations = require('./file-operations');
const leaderElection = require('./leader-election');
const serviceManagement = require('./service-management');
const daemon = require('./daemon');
const processManagement = require('./process-management');
const pathUtils = require('./path-utils');

// Экспортируем все модули
module.exports = { // Управление процессами
  ...processSpawn,
  ...processManagement,
  
  // Демоны
  ...unifiedDaemon,
  ...daemon,
  
  // Кластеризация
  ...cluster,
  
  // Управление задачами
  ...taskManagement,
  
  // Файловые операции
  ...fileOperations,
  
  // Выбор лидера
  ...leaderElection,
  
  // Управление сервисами
  ...serviceManagement,
  
  // Утилиты путей
  ...pathUtils };
