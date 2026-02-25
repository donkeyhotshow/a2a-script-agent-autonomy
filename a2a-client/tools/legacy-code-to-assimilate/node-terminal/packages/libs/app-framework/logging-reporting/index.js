/**
 * Unified Logging Library
 * Объединенная библиотека логирования
 */

const path = require('path');
const fs = require('fs').promises;

class LoggingUtils {
  constructor(options = {}) {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };

    this.currentLevel = this.levels.info;
    this.options = {
      level: 'info',
      format: 'text',
      output: 'console',
      filePath: null,
      maxFileSize: 10 * 1024 * 1024,
      maxFiles: 5,
      logDirectory: 'logs',
      fileName: 'app.log',
      ...options
    };

    // Устанавливаем уровень логирования из опций
    if (this.options.level && this.levels[this.options.level] !== undefined) {
      this.currentLevel = this.levels[this.options.level];
    }
  }

  /**
   * Форматирование временной метки
   */
  formatTimestamp(date = new Date()) {
    return date.toISOString().replace('T', ' ').substring(0, 23);
  }

  /**
   * Проверка уровня логирования
   */
  shouldLog(level) {
    return this.levels[level] <= this.currentLevel;
  }

  /**
   * Форматирование сообщения
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = this.formatTimestamp();
    const baseMessage = {
      timestamp,
      level: level.toUpperCase(),
      message,
      pid: process.pid,
      ...meta
    };

    if (this.options.format === 'json') {
      return JSON.stringify(baseMessage);
    }

    // Текстовый формат
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
  }

  /**
   * Запись в файл
   */
  async writeToFile(message) {
    if (!this.options.filePath) {
      return;
    }
    
    try {
      await fs.appendFile(this.options.filePath, message + '\n');
    } catch (error) {
      console.error(`Ошибка записи в лог файл: ${error.message}`);
    }
  }

  /**
   * Проверка и ротация файлов логов
   */
  async checkFileRotation() {
    if (!this.options.filePath) {
      return;
    }
    
    try {
      const stats = await fs.stat(this.options.filePath);
      
      if (stats.size > this.options.maxFileSize) {
        await this.rotateLogFile();
      }
    } catch (error) {
      // Файл может не существовать
    }
  }

  /**
   * Ротация лог файла
   */
  async rotateLogFile() {
    if (!this.options.filePath) {
      return;
    }
    
    const dir = path.dirname(this.options.filePath);
    const ext = path.extname(this.options.filePath);
    const base = path.basename(this.options.filePath, ext);

    // Удаляем старые файлы
    for (let i = this.options.maxFiles - 1; i >= 0; i--) {
      const oldFile = path.join(dir, `${base}.${i}${ext}`);
      const newFile = path.join(dir, `${base}.${i + 1}${ext}`);
      
      if (i === this.options.maxFiles - 1) {
        // Удаляем самый старый файл
        try {
          await fs.unlink(oldFile);
        } catch (error) {
          // Файл может не существовать
        }
      } else {
        // Переименовываем файлы
        try {
          await fs.rename(oldFile, newFile);
        } catch (error) {
          // Файл может не существовать
        }
      }
    }

    // Переименовываем текущий файл
    const currentFile = this.options.filePath;
    const newFile = path.join(dir, `${base}.1${ext}`);
    
    try {
      await fs.rename(currentFile, newFile);
    } catch (error) {
      // Файл может не существовать
    }
  }

  /**
   * Логирование ошибки
   */
  async error(message, meta = {}) {
    if (!this.shouldLog('error')) return;

    const formattedMessage = this.formatMessage('error', message, meta);
    
    if (this.options.output === 'console' || this.options.output === 'both') {
      console.error(formattedMessage);
    }
    
    if (this.options.output === 'file' || this.options.output === 'both') {
      await this.writeToFile(formattedMessage);
    }
  }

  /**
   * Логирование предупреждения
   */
  async warn(message, meta = {}) {
    if (!this.shouldLog('warn')) return;

    const formattedMessage = this.formatMessage('warn', message, meta);
    
    if (this.options.output === 'console' || this.options.output === 'both') {
      console.warn(formattedMessage);
    }
    
    if (this.options.output === 'file' || this.options.output === 'both') {
      await this.writeToFile(formattedMessage);
    }
  }

  /**
   * Логирование информации
   */
  async info(message, meta = {}) {
    if (!this.shouldLog('info')) return;

    const formattedMessage = this.formatMessage('info', message, meta);
    
    if (this.options.output === 'console' || this.options.output === 'both') {
      console.info(formattedMessage);
    }
    
    if (this.options.output === 'file' || this.options.output === 'both') {
      await this.writeToFile(formattedMessage);
    }
  }

  /**
   * Логирование отладки
   */
  async debug(message, meta = {}) {
    if (!this.shouldLog('debug')) return;

    const formattedMessage = this.formatMessage('debug', message, meta);
    
    if (this.options.output === 'console' || this.options.output === 'both') {
      console.debug(formattedMessage);
    }
    
    if (this.options.output === 'file' || this.options.output === 'both') {
      await this.writeToFile(formattedMessage);
    }
  }

  /**
   * Логирование трассировки
   */
  async trace(message, meta = {}) {
    if (!this.shouldLog('trace')) return;

    const formattedMessage = this.formatMessage('trace', message, meta);
    
    if (this.options.output === 'console' || this.options.output === 'both') {
      console.trace(formattedMessage);
    }
    
    if (this.options.output === 'file' || this.options.output === 'both') {
      await this.writeToFile(formattedMessage);
    }
  }

  /**
   * Установка уровня логирования
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = this.levels[level];
      this.info(`Уровень логирования изменен на: ${level}`);
    } else {
      this.warn(`Неизвестный уровень логирования: ${level}`);
    }
  }

  /**
   * Получение текущего уровня логирования
   */
  getLevel() {
    return Object.keys(this.levels).find(key => this.levels[key] === this.currentLevel) || 'info';
  }

  /**
   * Получение статистики логгера
   */
  getStats() {
    return {
      level: this.getLevel(),
      output: this.options.output,
      filePath: this.options.filePath,
      maxFileSize: this.options.maxFileSize,
      maxFiles: this.options.maxFiles
    };
  }

  /**
   * Создание дочернего логгера с дополнительными метаданными
   */
  child(meta) {
    const childLogger = new LoggingUtils(this.options);
    childLogger.parentMeta = { ...this.parentMeta, ...meta };
    return childLogger;
  }

  /**
   * Структурированное логирование команд
   */
  logCommand(data) {
    const meta = {
      commandId: data.id,
      command: data.command,
      state: data.state,
      duration: data.duration,
      exitCode: data.exitCode,
      ...(data.error && { error: data.error }),
    };

    if (data.error) {
      this.error('Command execution failed', meta);
    } else {
      this.info('Command executed', meta);
    }
  }

  /**
   * Логирование событий безопасности
   */
  logSecurity(data) {
    const meta = {
      securityEvent: data.event,
      command: data.command,
      severity: data.severity,
      blocked: data.blocked,
      reason: data.reason,
    };

    if (data.severity === 'critical' || data.severity === 'high') {
      this.error('Security event', meta);
    } else {
      this.warn('Security event', meta);
    }
  }

  /**
   * Логирование метрик производительности
   */
  logMetrics(data) {
    this.info('Performance metric', {
      metric: data.metric,
      value: data.value,
      unit: data.unit,
      tags: data.tags,
    });
  }

  /**
   * Логирование ошибок приложения
   */
  logError(error, context = {}) {
    this.error('Application error', {
      error: error.message || error,
      stack: error.stack,
      context,
    });
  }

  /**
   * Логирование HTTP запросов
   */
  logHttpRequest(req, res, duration) {
    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    };

    if (res.statusCode >= 400) {
      this.warn('HTTP Request', meta);
    } else {
      this.info('HTTP Request', meta);
    }
  }

  /**
   * Логирование событий базы данных
   */
  logDatabase(data) {
    const meta = {
      operation: data.operation,
      table: data.table,
      duration: data.duration,
      rowsAffected: data.rowsAffected,
      ...(data.error && { error: data.error }),
    };

    if (data.error) {
      this.error('Database operation failed', meta);
    } else {
      this.debug('Database operation', meta);
    }
  }
}

module.exports = { LoggingUtils };
