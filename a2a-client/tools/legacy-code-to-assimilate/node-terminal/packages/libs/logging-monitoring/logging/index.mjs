/**
 * LoggingUtils - Унифицированная библиотека логирования
 */
import path from 'path';
import fs from 'fs'; // Изменен импорт для синхронных методов
// import fileUtilsFactory from '../../system/file-operations/file-operations.mjs'; // Удалено использование фабрики для браузерной совместимости
import { createPathUtils } from '../../system/path-utils/index.mjs'; // Изменен импорт PathUtils на фабрику
// const { ErrorHandlingUtils } = require(path.join(__dirname, '../../error-management/error-handler')); // Удаляем прямой импорт

class LoggingUtils {
  constructor(options = {}) {
    this.options = { ...options };
    this.level = options.level || 'info';
    this.filePath = options.filePath; // Изменил file на filePath для ясности
    this.format = options.format || 'text'; // 'text' or 'json'
    this.rotation = options.rotation || { maxSize: '10MB', maxFiles: 5 };
    this.isRpcServer = options.isRpcServer || false; // Новый флаг для RPC сервера
    this.logStream = null;
    this.pathUtils = null; // Инициализируем pathUtils асинхронно
    this.fileSystemUtils = null; // Используем PathUtils напрямую вместо фабрики
    // Удаляем инициализацию ErrorHandlingUtils здесь, чтобы разорвать циклическую зависимость
    // this.errorHandlingUtils = new ErrorHandlingUtils({ logger: this, pathUtils: this.fileSystemUtils }); // Передаем текущий логгер и FileSystemUtils

    if (this.filePath) {
      // this.initFileLogger(); // Инициализация файлового логгера теперь требует асинхронного pathUtils
    }
  }

  async initialize() {
    if (!this.pathUtils) {
      this.pathUtils = await createPathUtils(); // Асинхронная инициализация
      this.fileSystemUtils = this.pathUtils;
      if (this.filePath) {
        this.initFileLogger();
      }
    }
  }

  async initFileLogger() {
    const logDir = this.fileSystemUtils.dirname(this.filePath); // Используем path.dirname через fileSystemUtils
    // Используем современные методы вместо устаревших
    try {
      if (!this.fileSystemUtils.existsSync(logDir)) { // Используем existsSync через fileSystemUtils
        await this.fileSystemUtils.mkdir(logDir, { recursive: true }); // Используем mkdir через fileSystemUtils
      }
    } catch (error) {
      this.error(`Ошибка создания директории логов: ${error.message}`, error);
    }
    this.logStream = fs.createWriteStream(this.filePath, { flags: 'a' }); // Пока используем fs.createWriteStream
    this.logStream.on('error', (err) => {
      // Логируем внутренние ошибки LoggingUtils через собственный метод error
      this.error(`Error in log stream: ${err.message}`, err);
    });
  }

  // Метод для проверки размера файла и ротации
  async checkLogFileSize() {
    if (!this.filePath) {
      return;
    }
    
    try {
      if (!this.fileSystemUtils.existsSync(this.filePath)) { // Используем existsSync через fileSystemUtils
        return; // Файл не существует
      }
    } catch (error) {
      this.error(`Ошибка проверки существования файла логов: ${error.message}`, error);
      return;
    }

    const statsResult = await this.fileSystemUtils.getFileStats(this.filePath); // Используем getFileStats через fileSystemUtils
    if (!statsResult.success) {
        this.error(`Ошибка получения статистики файла логов: ${statsResult.error}`);
        return;
    }
    const stats = statsResult.stats;
    const maxSizeInBytes = this.parseSizeToBytes(this.rotation.maxSize);

    if (stats.size > maxSizeInBytes) {
      await this.rotateLogFile(); // Добавляем await
    }
  }

  // Метод для ротации лог файлов
  async rotateLogFile() {
    if (!this.filePath) {
      return;
    }

    // Закрываем текущий стрим, если он открыт
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }

    // Удаляем старые ротированные файлы
    for (let i = this.rotation.maxFiles - 1; i >= 1; i--) {
      const oldFilePath = `${this.filePath}.${i}`;
      const newFilePath = `${this.filePath}.${i + 1}`;
      try {
        if (this.fileSystemUtils.existsSync(newFilePath)) { // Используем existsSync через fileSystemUtils
          await this.fileSystemUtils.deletePath(newFilePath); // Используем deletePath через fileSystemUtils
        }
      } catch (error) {
        this.warn(`Ошибка удаления старого ротированного лога ${newFilePath}: ${error.message}`);
      }
      try {
        if (this.fileSystemUtils.existsSync(oldFilePath)) { // Используем existsSync через fileSystemUtils
          await this.fileSystemUtils.movePath(oldFilePath, newFilePath); // Используем movePath через fileSystemUtils
        }
      } catch (error) {
        this.warn(`Ошибка перемещения старого ротированного лога ${oldFilePath}: ${error.message}`);
      }
    }

    // Перемещаем текущий лог файл в первый ротированный
    try {
      if (this.fileSystemUtils.existsSync(this.filePath)) { // Используем existsSync через fileSystemUtils
        await this.fileSystemUtils.movePath(this.filePath, `${this.filePath}.1`); // Используем movePath через fileSystemUtils
      }
    } catch (error) {
      this.warn(`Ошибка перемещения текущего лога ${this.filePath}: ${error.message}`);
    }

    // Создаем новый пустой лог файл
    this.initFileLogger();
  }

  // Вспомогательный метод для парсинга размера из строки (например, '10MB' -> байты)
  parseSizeToBytes(sizeString) {
    const size = parseFloat(sizeString);
    const unit = sizeString.replace(/[0-9.]/g, '').toUpperCase();
    switch (unit) {
      case 'KB': return size * 1024;
      case 'MB': return size * 1024 * 1024;
      case 'GB': return size * 1024 * 1024 * 1024;
      default: return size; // Предполагаем, что по умолчанию это байты
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

    // Проверяем размер файла перед записью
    await this.checkLogFileSize(); // Добавляем await

    if (this.logStream) {
      this.logStream.write(message + '\n');
    }

    // В зависимости от isRpcServer, логируем в stdout или stderr
    if (this.isRpcServer) {
      // Логи ошибок всегда идут в stderr, остальные - только если уровень логирования позволяет
      if (level === 'error' || level === 'warn') {
        process.stderr.write(message + '\n');
      } else if (this.level === 'debug') { // В RPC режиме debug и info логи в stderr только если уровень логгера debug
        process.stderr.write(message + '\n');
      }
    } else {
      // Стандартный вывод в консоль
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

  // Более специализированные методы логирования
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

  // Дополнительные методы для совместимости и удобства
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

const defaultLogger = new LoggingUtils({
  level: process.env.LOG_LEVEL || 'info', // Возвращено на 'info'
  format: process.env.LOG_FORMAT || 'text',
  filePath: process.env.LOG_FILE || null,
  rotation: {
    maxSize: process.env.LOG_MAX_SIZE || '10MB',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10)
  }
});

export { LoggingUtils, defaultLogger };
