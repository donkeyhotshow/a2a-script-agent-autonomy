/**
 * Thread Manager - Библиотека для организации потоков выполнения кода
 * 
 * Основные возможности:
 * - Управление приоритетными очередями задач
 * - Пул воркеров с настраиваемой конкуренцией
 * - Мониторинг и метрики выполнения
 * - Обработка ошибок и повторные попытки
 * - Интеграция с существующей экосистемой проекта
 */

const ThreadManager = require('./src/ThreadManager');
const PriorityQueue = require('./src/PriorityQueue');
const WorkerPool = require('./src/WorkerPool');
const TaskExecutor = require('./src/TaskExecutor');
const ThreadMonitor = require('./src/ThreadMonitor');
const TaskScheduler = require('./src/TaskScheduler');

export { ThreadManager,
  PriorityQueue,
  WorkerPool,
  TaskExecutor,
  ThreadMonitor,
  TaskScheduler };
