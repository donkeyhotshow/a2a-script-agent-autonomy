/**
 * Unified Error Handling Library - CommonJS version
 * Объединенная библиотека обработки ошибок
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ErrorHandlingUtils {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.maxRetries = options.maxRetries || 3;
    this.retryDelays = options.retryDelays || [1000, 2000, 4000];
    
    // Если логгер не предоставлен, выбрасываем ошибку, так как логгер является обязательным
    if (!options.logger) {
      throw new Error('[ErrorHandlingUtils] Logger instance must be provided.');
    }
    this.logger = options.logger;

    this.errorLogPath = options.errorLogPath || path.join(this.projectRoot, 'logs', 'errors.log');
    this.reportDir = options.reportDir || path.join(this.projectRoot, 'error_reports');
    
    this.errorCounts = new Map();
    this.retryCounts = new Map();
    this.errorHistory = [];
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.md5Cache = new Set();
    
    this.ensureErrorLogFile();
  }

  /**
   * Создание файла логов ошибок
   */
  async ensureErrorLogFile() {
    try {
      const logDir = path.dirname(this.errorLogPath);
      await fs.mkdir(logDir, { recursive: true });
      
      try {
        await fs.access(this.errorLogPath);
      } catch {
        await fs.writeFile(this.errorLogPath, '', 'utf8');
      }
    } catch (error) {
      this.logger.error('Ошибка создания файла логов ошибок:', error.message);
    }
  }

  /**
   * Генерация MD5 хеша для параметров
   */
  generateParametersHash(parameters) {
    const stringified = JSON.stringify(parameters);
    return crypto.createHash('md5').update(stringified).digest('hex');
  }

  /**
   * Логирование ошибки
   */
  async logError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message || error,
      stack: error.stack,
      context,
      type: error.constructor.name || 'Error'
    };

    // Добавляем в историю
    this.errorHistory.push(errorEntry);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // Увеличиваем счетчик ошибок
    const errorKey = `${errorEntry.type}:${errorEntry.message}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

    // Записываем в файл
    try {
      const logLine = JSON.stringify(errorEntry) + '\n';
      await fs.appendFile(this.errorLogPath, logLine, 'utf8');
    } catch (writeError) {
      this.logger.error('Ошибка записи в лог:', writeError.message);
    }

    if (this.logger.error) {
      this.logger.error(`[ErrorHandler] ${errorEntry.message}`, context);
    }
    return errorEntry;
  }

  /**
   * Создание отчета об ошибке в Markdown формате
   */
  async createErrorReport(options) {
    const { error, type, context, additionalData = {} } = options;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const errorHash = this.generateParametersHash({ type, context, message: error.message });
      const reportFileName = `error-report-${type}-${timestamp}-${errorHash.substring(0, 8)}.md`;
      const reportFilePath = path.join(this.reportDir, reportFileName);

      const reportContent = `
# Отчет об ошибке

- **Timestamp:** ${timestamp}
- **Type:** ${type}
- **Context:** ${context}
- **Message:** ${error.message}
- **Stack Trace:**
\`\`\`
${error.stack}
\`\`\`

## Дополнительные данные:
\`\`\`json
${JSON.stringify(additionalData, null, 2)}
\`\`\`
`;

      await fs.mkdir(this.reportDir, { recursive: true });
      await fs.writeFile(reportFilePath, reportContent);
      
      if (this.logger.info) {
        this.logger.info(`[Error Report] Создан отчет: ${reportFilePath}`);
      }
      return reportFilePath;
    } catch (reportError) {
      if (this.logger.error) {
        this.logger.error(`[Error Report] Ошибка при создании отчета: ${reportError.message}`);
      }
      throw reportError;
    }
  }

  /**
   * Проверка существующих ошибок по MD5 хешу
   */
  async checkExistingError(md5Hash, workDir = './work') {
    try {
      await fs.mkdir(workDir, { recursive: true });
      const files = await fs.readdir(workDir);
      
      for (const file of files) {
        if (file.includes(md5Hash) && file.endsWith('.md')) {
          const content = await fs.readFile(path.join(workDir, file), 'utf8');
          if (content.includes('**Статус:** Открыта')) {
            if (this.logger.info) {
              this.logger.info(`[ErrorReporting] Найден существующий отчет: ${file}`);
            }
            return {
              exists: true,
              file: file,
              content: content
            };
          }
        }
      }
    } catch (error) {
      if (this.logger.warn) {
        this.logger.warn(`[ErrorReporting] Ошибка при проверке существующих отчетов: ${error.message}`);
      }
    }
    
    return { exists: false };
  }

  /**
   * Обработка ошибки сервиса
   */
  async handleServiceError(serviceId, error, context = {}) {
    const errorEntry = await this.logError(error, { serviceId, ...context });
    
    // Проверяем количество попыток
    const retryCount = this.retryCounts.get(serviceId) || 0;
    
    if (retryCount < this.maxRetries) {
      const delay = this.retryDelays[retryCount] || this.retryDelays[this.retryDelays.length - 1];
      
      if (this.logger.warn) {
        this.logger.warn(`[ErrorHandler] Retrying service ${serviceId} in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
      }
      
      this.retryCounts.set(serviceId, retryCount + 1);
      
      return {
        shouldRetry: true,
        delay,
        attempt: retryCount + 1,
        maxAttempts: this.maxRetries,
        error: errorEntry
      };
    } else {
      if (this.logger.error) {
        this.logger.error(`[ErrorHandler] Service ${serviceId} failed after ${this.maxRetries} attempts`);
      }
      
      this.retryCounts.delete(serviceId);
      
      return {
        shouldRetry: false,
        error: errorEntry,
        final: true
      };
    }
  }

  /**
   * Обработка критической ошибки
   */
  async handleCriticalError(error, context = {}) {
    const errorEntry = await this.logError(error, { critical: true, ...context });
    
    // Создаем отчет о критической ошибке
    await this.createErrorReport({
      error,
      type: 'critical',
      context: JSON.stringify(context),
      additionalData: { critical: true }
    });
    
    // Отправляем уведомление о критической ошибке
    await this.sendCriticalNotification(errorEntry);
    
    return errorEntry;
  }

  /**
   * Отправка уведомления о критической ошибке
   */
  async sendCriticalNotification(errorEntry) {
    try {
      if (this.logger.error) {
        this.logger.error(`[ErrorHandler] CRITICAL ERROR: ${errorEntry.message}`);
      }
    } catch (notificationError) {
      if (this.logger.error) {
        this.logger.error('[ErrorHandler] Failed to send critical notification:', notificationError.message);
      }
    }
  }

  /**
   * Обработка ошибки с fallback
   */
  async handleWithFallback(operation, fallbackOperation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      await this.logError(error, { operation: 'main', ...context });
      
      try {
        if (this.logger.warn) {
          this.logger.warn('[ErrorHandler] Executing fallback operation');
        }
        return await fallbackOperation();
      } catch (fallbackError) {
        await this.logError(fallbackError, { operation: 'fallback', ...context });
        throw fallbackError;
      }
    }
  }

  /**
   * Обработка ошибки с retry
   */
  async handleWithRetry(operation, maxRetries = null, context = {}) {
    const retries = maxRetries || this.maxRetries;
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < retries) {
          const delay = this.retryDelays[attempt] || this.retryDelays[this.retryDelays.length - 1];
          if (this.logger.warn) {
            this.logger.warn(`[ErrorHandler] Retry attempt ${attempt + 1}/${retries} in ${delay}ms`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    await this.logError(lastError, { operation: 'retry', attempts: retries, ...context });
    throw lastError;
  }

  /**
   * Batch обработчик ошибок
   */
  async addErrorToBatch(error, parameters) {
    const md5Hash = this.generateParametersHash(parameters);
    
    if (this.md5Cache.has(md5Hash)) {
      if (this.logger.debug) {
        this.logger.debug(`[ErrorBatchProcessor] Дубликат ошибки обнаружен, пропускаем: ${md5Hash}`);
      }
      return false;
    }
    
    this.md5Cache.add(md5Hash);
    this.errorHistory.push({ error, parameters, md5Hash });
    
    if (this.logger.debug) {
      this.logger.debug(`[ErrorBatchProcessor] Ошибка добавлена в пакет: ${md5Hash}`);
    }
    return true;
  }

  /**
   * Получение статистики ошибок
   */
  getErrorStats() {
    const stats = {
      totalErrors: this.errorHistory.length,
      errorCounts: Object.fromEntries(this.errorCounts),
      retryCounts: Object.fromEntries(this.retryCounts),
      recentErrors: this.errorHistory.slice(-10),
      timestamp: new Date().toISOString()
    };

    return stats;
  }

  /**
   * Очистка истории ошибок
   */
  clearErrorHistory() {
    this.errorHistory = [];
    this.errorCounts.clear();
    this.retryCounts.clear();
    this.md5Cache.clear();
    
    if (this.logger.info) {
      this.logger.info('[ErrorHandler] Error history cleared');
    }
  }

  /**
   * Получение ошибок по типу
   */
  getErrorsByType(type) {
    return this.errorHistory.filter(error => error.type === type);
  }

  /**
   * Получение ошибок по сервису
   */
  getErrorsByService(serviceId) {
    return this.errorHistory.filter(error => 
      error.context && error.context.serviceId === serviceId
    );
  }

  /**
   * Проверка частоты ошибок
   */
  checkErrorFrequency(threshold = 10, timeWindow = 60000) {
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(error => 
      now - new Date(error.timestamp).getTime() < timeWindow
    );

    return {
      count: recentErrors.length,
      threshold,
      exceeded: recentErrors.length > threshold,
      timeWindow
    };
  }
}

// Классы ошибок приложения
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field;
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Ошибка аутентификации') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Ошибка авторизации') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Ресурс') {
    super(`${resource} не найден`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Конфликт данных') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Превышен лимит запросов') {
    super(message, 429, 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

/**
 * Валидация входных данных
 */
function validateInput(data, schema, logger) {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(new ValidationError(`Поле ${field} обязательно`, field));
      continue;
    }
    
    if (value !== undefined && value !== null) {
      if (rules.type && typeof value !== rules.type) {
        errors.push(new ValidationError(`Поле ${field} должно быть типа ${rules.type}`, field));
      }
      
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(new ValidationError(`Поле ${field} должно содержать минимум ${rules.minLength} символов`, field));
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(new ValidationError(`Поле ${field} должно содержать максимум ${rules.maxLength} символов`, field));
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(new ValidationError(`Поле ${field} имеет некорректный формат`, field));
      }
      
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(new ValidationError(`Поле ${field} должно быть одним из: ${rules.enum.join(', ')}`, field));
      }
    }
  }
  
  if (errors.length > 0) {
    if (logger && logger.error) {
      logger.error('Ошибки валидации', errors);
    }
    throw new ValidationError('Ошибки валидации', null, errors);
  }
  
  return true;
}

// CommonJS экспорт
module.exports = {
  ErrorHandlingUtils,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  validateInput
};
