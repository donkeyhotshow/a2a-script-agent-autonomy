/**
 * SpawnTypes - Типы и константы для Process Spawn Library
 */

// Типы запуска процессов
const SPAWN_TYPES = {
  SPAWN: 'spawn',      // child_process.spawn
  EXEC: 'exec',        // child_process.exec
  EXEC_FILE: 'execFile' // child_process.execFile
};

// Лимиты ресурсов по умолчанию
const RESOURCE_LIMITS = {
  CPU_PERCENT: 75,     // Максимум 75% CPU
  MEMORY_MB: 10240,    // Максимум 10GB памяти
  TIMEOUT_MS: 600000,  // 10 минут таймаут
  GRACEFUL_TIMEOUT_MS: 10000 // 10 секунд на graceful shutdown
};

// Статусы процессов
const PROCESS_STATUSES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  KILLED: 'killed',
  TIMEOUT: 'timeout'
};

// Типы завершения
const KILL_TYPES = {
  GRACEFUL: 'graceful',
  FORCE: 'force',
  IMMEDIATE: 'immediate'
};

// Структура Job ID
const JOB_ID_PREFIX = 'job';
const JOB_ID_FORMAT = `${JOB_ID_PREFIX}-{timestamp}-{random}`;

// Структура конфигурации spawn
const SpawnConfigStructure = {
  command: 'string',           // Команда для выполнения
  args: 'array',               // Аргументы команды
  cwd: 'string',               // Рабочая директория
  env: 'object',               // Переменные окружения
  type: 'string',              // Тип запуска (spawn/exec/execFile)
  options: {
    autoKill: 'boolean',       // Автоматическое завершение при превышении лимитов
    monitorResources: 'boolean', // Мониторинг ресурсов
    logOutput: 'boolean',      // Логирование вывода
    timeout: 'number',         // Таймаут выполнения
    gracefulTimeout: 'number'  // Таймаут graceful shutdown
  },
  limits: {
    cpuPercent: 'number',      // Лимит CPU в процентах
    memoryMB: 'number',        // Лимит памяти в MB
    timeoutMs: 'number'        // Общий таймаут в мс
  }
};

export { SPAWN_TYPES,
  RESOURCE_LIMITS,
  PROCESS_STATUSES,
  KILL_TYPES,
  JOB_ID_PREFIX,
  JOB_ID_FORMAT,
  SpawnConfigStructure };

