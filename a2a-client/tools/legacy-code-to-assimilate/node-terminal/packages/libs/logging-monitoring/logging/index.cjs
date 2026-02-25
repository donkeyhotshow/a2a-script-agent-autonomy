/**
 * LoggingUtils - Унифицированная библиотека логирования
 * CommonJS version for server-side usage
 */

// Import console-utils for consistent logging
const { consoleUtils, defaultLogger: consoleDefaultLogger } = require('./console-utils.cjs');

const path = require('path');
const fs = require('fs'); // Import all of fs
const fsPromises = fs.promises;

class LoggingUtils {
  constructor(options = {}) {
    this.options = { ...options };
    this.level = options.level || 'info';
    this.filePath = options.filePath;
    this.format = options.format || 'text';
    this.rotation = options.rotation || { maxSize: '10MB', maxFiles: 5 };
    this.isRpcServer = options.isRpcServer || false;
    this.logStream = null;
    this.pathUtils = null;
    this.fileSystemUtils = null;
    this.consoleLogger = options.consoleLogger || consoleDefaultLogger;

    if (this.filePath) {
      // File logger initialization will be done in initialize()
    }
  }

  async initialize() {
    if (!this.pathUtils) {
      // For CommonJS, we'll use built-in path and fs modules
      this.pathUtils = {
        dirname: path.dirname,
        existsSync: fs.existsSync,
        mkdir: fsPromises.mkdir,
        getFileStats: async (filePath) => {
          try {
            const stats = await fsPromises.stat(filePath);
            return { success: true, stats };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        deletePath: fsPromises.unlink,
        movePath: fsPromises.rename
      };
      this.fileSystemUtils = this.pathUtils;
      if (this.filePath) {
        this.initFileLogger();
      }
    }
  }

  async initFileLogger() {
    const logDir = this.fileSystemUtils.dirname(this.filePath);
    try {
      if (!this.fileSystemUtils.existsSync(logDir)) {
        await this.fileSystemUtils.mkdir(logDir, { recursive: true });
      }
    } catch (error) {
      this.error(`Ошибка создания директории логов: ${error.message}`, error);
    }
    this.logStream = fs.createWriteStream(this.filePath, { flags: 'a' });
    this.logStream.on('error', (err) => {
      this.error(`Error in log stream: ${err.message}`, err);
    });
  }

  async checkLogFileSize() {
    if (!this.filePath) {
      return;
    }
    
    try {
      if (!this.fileSystemUtils.existsSync(this.filePath)) {
        return;
      }
    } catch (error) {
      this.error(`Ошибка проверки существования файла логов: ${error.message}`, error);
      return;
    }

    const statsResult = await this.fileSystemUtils.getFileStats(this.filePath);
    if (!statsResult.success) {
        this.error(`Ошибка получения статистики файла логов: ${statsResult.error}`);
        return;
    }
    const stats = statsResult.stats;
    const maxSizeInBytes = this.parseSizeToBytes(this.rotation.maxSize);

    if (stats.size > maxSizeInBytes) {
      await this.rotateLogFile();
    }
  }

  async rotateLogFile() {
    if (!this.filePath) {
      return;
    }

    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }

    for (let i = this.rotation.maxFiles - 1; i >= 1; i--) {
      const oldFilePath = `${this.filePath}.${i}`;
      const newFilePath = `${this.filePath}.${i + 1}`;
      try {
        if (this.fileSystemUtils.existsSync(newFilePath)) {
          await this.fileSystemUtils.deletePath(newFilePath);
        }
      } catch (error) {
        this.warn(`Ошибка удаления старого ротированного лога ${newFilePath}: ${error.message}`);
      }
      try {
        if (this.fileSystemUtils.existsSync(oldFilePath)) {
          await this.fileSystemUtils.movePath(oldFilePath, newFilePath);
        }
      } catch (error) {
        this.warn(`Ошибка перемещения старого ротированного лога ${oldFilePath}: ${error.message}`);
      }
    }

    try {
      if (this.fileSystemUtils.existsSync(this.filePath)) {
        await this.fileSystemUtils.movePath(this.filePath, `${this.filePath}.1`);
      }
    } catch (error) {
      this.warn(`Ошибка перемещения текущего лога ${this.filePath}: ${error.message}`);
    }

    this.initFileLogger();
  }

  parseSizeToBytes(sizeString) {
    const size = parseFloat(sizeString);
    const unit = sizeString.replace(/[0-9.]/g, '').toUpperCase();
    switch (unit) {
      case 'KB': return size * 1024;
      case 'MB': return size * 1024 * 1024;
      case 'GB': return size * 1024 * 1024 * 1024;
      default: return size;
    }
  }

  async logMessage(level, ...args) {
    const timestamp = new Date().toISOString();
    let message;

    if (this.format === 'json') {
      message = JSON.stringify({
        timestamp,
        level,
        message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
        meta: args.length > 1 && typeof args[args.length - 1] === 'object' ? args[args.length - 1] : undefined,
      });
    } else {
      message = `${timestamp} [${level.toUpperCase()}]: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')}`;
    }

    await this.checkLogFileSize();

    if (this.logStream) {
      this.logStream.write(message + '\n');
    }

    // Use console logger for consistent output
    if (this.consoleLogger && typeof this.consoleLogger[level] === 'function') {
      this.consoleLogger[level](message);
    } else {
      // Fallback to console
      console[level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log'](message);
    }
  }

  info(...args) {
    this.logMessage('info', ...args);
  }

  warn(...args) {
    this.logMessage('warn', ...args);
  }

  error(...args) {
    this.logMessage('error', ...args);
  }

  debug(...args) {
    this.logMessage('debug', ...args);
  }

  access(req, res) {
    this.info(`ACCESS: ${req.method} ${req.url} - ${res.statusCode}`);
  }

  audit(action, user, details) {
    this.info(`AUDIT: User ${user} performed ${action} with details: ${JSON.stringify(details)}`);
  }

  event(name, data) {
    this.info(`EVENT: ${name} - ${JSON.stringify(data)}`);
  }

  metric(name, value, tags) {
    this.debug(`METRIC: ${name}=${value} ${JSON.stringify(tags)}`);
  }

  log(...args) {
    this.info(...args);
  }

  exception(error, context) {
    this.error(`EXCEPTION in ${context}:`, error.message, error.stack);
  }

  profile(id, start) {
    if (start) {
      this.info(`PROFILE ${id} started`);
    } else {
      this.info(`PROFILE ${id} finished`);
    }
  }

  async close() {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
      this.info('Log stream closed.');
    }
  }
}

// Create default logger instance
const defaultLogger = new LoggingUtils({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.LOG_FORMAT || 'text',
  filePath: process.env.LOG_FILE || null,
  rotation: {
    maxSize: process.env.LOG_MAX_SIZE || '10MB',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10)
  },
  consoleLogger: consoleDefaultLogger
});

// Initialize the default logger
defaultLogger.initialize().catch(err => {
  console.error('Failed to initialize default logger:', err);
});

module.exports = {
  LoggingUtils,
  defaultLogger,
  // Re-export console utils for compatibility
  consoleUtils,
  consoleDefaultLogger
};
