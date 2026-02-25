/**
 * Console Utils - Унифицированные утилиты для логирования
 * Заменяет прямые вызовы console.* на централизованные методы
 */

// Create a fallback logger that uses console directly
const fallbackLogger = {
  info: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
  warn: (...args) => console.warn(...args),
  debug: (...args) => console.debug(...args)
};

let defaultLoggerInstance = fallbackLogger; // Initialize with fallback

class ConsoleUtils {
  constructor(options = {}) {
    this.logger = options.logger || fallbackLogger;
    this.enabled = options.enabled !== false;
    this.level = options.level || 'info';
  }

  log(...args) {
    if (!this.enabled) return;
    this.logger.info(...args);
  }

  error(...args) {
    if (!this.enabled) return;
    this.logger.error(...args);
  }

  warn(...args) {
    if (!this.enabled) return;
    this.logger.warn(...args);
  }

  info(...args) {
    if (!this.enabled) return;
    this.logger.info(...args);
  }

  debug(...args) {
    if (!this.enabled) return;
    this.logger.debug(...args);
  }

  group(label) {
    if (!this.enabled) return;
    this.logger.info(`=== ${label} ===`);
  }

  groupEnd() {
    if (!this.enabled) return;
    this.logger.info('=== END ===');
  }

  table(data) {
    if (!this.enabled) return;
    this.logger.info('Table:', JSON.stringify(data, null, 2));
  }

  time(label) {
    if (!this.enabled) return;
    this.timers = this.timers || {};
    this.timers[label] = Date.now();
  }

  timeEnd(label) {
    if (!this.enabled || !this.timers || !this.timers[label]) return;
    const duration = Date.now() - this.timers[label];
    this.logger.info(`${label}: ${duration}ms`);
    delete this.timers[label];
  }

  timeLog(label, ...args) {
    if (!this.enabled) return;
    this.logger.info(`[${label}]`, ...args);
  }

  trace(...args) {
    if (!this.enabled) return;
    this.logger.debug('Trace:', ...args);
    if (args.length > 0) {
      this.logger.debug('Stack:', new Error().stack);
    }
  }

  logWithLevel(level, ...args) {
    if (!this.enabled) return;
    
    switch (level.toLowerCase()) {
      case 'error':
        this.error(...args);
        break;
      case 'warn':
        this.warn(...args);
        break;
      case 'info':
        this.info(...args);
        break;
      case 'debug':
        this.debug(...args);
        break;
      default:
        this.log(...args);
    }
  }

  logObject(obj, label = 'Object') {
    if (!this.enabled) return;
    this.logger.info(`${label}:`, JSON.stringify(obj, null, 2));
  }

  logArray(arr, label = 'Array') {
    if (!this.enabled) return;
    this.logger.info(`${label} (${arr.length} items):`, arr);
  }

  logFunction(fn, label = 'Function') {
    if (!this.enabled) return;
    this.logger.info(`${label}:`, fn.toString());
  }

  logWithContext(context, ...args) {
    if (!this.enabled) return;
    this.logger.info(`[${context}]`, ...args);
  }

  logPerformance(operation, startTime) {
    if (!this.enabled) return;
    const duration = Date.now() - startTime;
    this.logger.info(`Performance: ${operation} took ${duration}ms`);
  }

  logMemory(label = 'Memory Usage') {
    if (!this.enabled) return;
    const memUsage = process.memoryUsage();
    this.logger.info(`${label}:`, {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    });
  }
}

const globalConsoleUtils = new ConsoleUtils();

const log = (...args) => globalConsoleUtils.log(...args);
const error = (...args) => globalConsoleUtils.error(...args);
const warn = (...args) => globalConsoleUtils.warn(...args);
const info = (...args) => globalConsoleUtils.info(...args);
const debug = (...args) => globalConsoleUtils.debug(...args);
const group = (label) => globalConsoleUtils.group(label);
const groupEnd = () => globalConsoleUtils.groupEnd();
const table = (data) => globalConsoleUtils.table(data);
const time = (label) => globalConsoleUtils.time(label);
const timeEnd = (label) => globalConsoleUtils.timeEnd(label);
const timeLog = (label, ...args) => globalConsoleUtils.timeLog(label, ...args);
const trace = (...args) => globalConsoleUtils.trace(...args);
const logWithLevel = (level, ...args) => globalConsoleUtils.logWithLevel(level, ...args);
const logObject = (obj, label) => globalConsoleUtils.logObject(obj, label);
const logArray = (arr, label) => globalConsoleUtils.logArray(arr, label);
const logFunction = (fn, label) => globalConsoleUtils.logFunction(fn, label);
const logWithContext = (context, ...args) => globalConsoleUtils.logWithContext(context, ...args);
const logPerformance = (operation, startTime) => globalConsoleUtils.logPerformance(operation, startTime);
const logMemory = (label) => globalConsoleUtils.logMemory(label);

module.exports = {
  ConsoleUtils,
  consoleUtils: globalConsoleUtils,
  defaultLogger: globalConsoleUtils,
  log,
  error,
  warn,
  info,
  debug,
  group,
  groupEnd,
  table,
  time,
  timeEnd,
  timeLog,
  trace,
  logWithLevel,
  logObject,
  logArray,
  logFunction,
  logWithContext,
  logPerformance,
  logMemory
};
