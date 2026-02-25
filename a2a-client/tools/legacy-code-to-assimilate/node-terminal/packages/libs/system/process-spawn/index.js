/**
 * Process Spawn Library - Универсальная библиотека для запуска процессов
 * Ключевые особенности:
 * - Универсальный spawn/exec без PowerShell
 * - Job ID система для отслеживания
 * - Мониторинг ресурсов с лимитами
 * - Graceful shutdown с таймаутом
 * - JSON логирование
 */

const { ProcessSpawner } = require('./ProcessSpawner');
const { ProcessMonitor } = require('./ProcessMonitor');
const { ProcessKiller } = require('./ProcessKiller');
const { SpawnConfig } = require('./SpawnConfig');
const { JobManager } = require('./JobManager');
const { SPAWN_TYPES, RESOURCE_LIMITS } = require('./types/SpawnTypes');
// const pathUtils = require('./path-utils'); // Removed - not used

// Экспортируем все модули
module.exports = {
  ProcessSpawner,
  ProcessMonitor,
  ProcessKiller,
  SpawnConfig,
  JobManager,
  SPAWN_TYPES,
  RESOURCE_LIMITS
  // pathUtils removed - not used
};

