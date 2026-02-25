/**
 * Управление категоризацией и отчетностью ошибок различных типов.
 */

const { LoggingUtils } = require('../../../logging-monitoring/logging');

export class ErrorCategorizationManager {
  constructor(errorReporting, logger) {
    this.errorReporting = errorReporting;
    this.logger = logger || new LoggingUtils();
  }

  _generateParametersHash(parameters) {
    return this.errorReporting._generateMd5Hash(parameters);
  }

  async _checkExistingError(md5Hash) {
    return await this.errorReporting.checkExistingReport(md5Hash);
  }

  async _createErrorReport(reportData) {
    return await this.errorReporting.createErrorReport(reportData);
  }

  /**
   * Обработка ошибок процессов (child_process)
   */
  async processOperation(operation, parameters = {}) {
    const md5Hash = this._generateParametersHash(parameters);
    
    try {
      const result = await operation(parameters);
      return result;
    } catch (error) {
      // Определяем тип ошибки процесса
      let errorType = 'PROCESS_ERROR';
      let errorDetails = error.message;
      
      if (error.code === 'ENOENT') {
        errorType = 'COMMAND_NOT_FOUND';
        errorDetails = `Команда не найдена: ${error.cmd || 'unknown'}. Убедитесь что команда установлена и доступна в PATH.`;
      } else if (error.code === 'EACCES') {
        errorType = 'PERMISSION_DENIED';
        errorDetails = `Отказано в доступе. Проверьте права доступа к файлу.`;
      } else if (error.code === 'ENOTDIR') {
        errorType = 'INVALID_DIRECTORY';
        errorDetails = `Неверная директория. Проверьте что путь существует и является директорией.`;
      } else if (error.code === 'ENOSPC') {
        errorType = 'NO_SPACE_LEFT';
        errorDetails = `Недостаточно места на диске.`;
      } else if (error.signal === 'SIGKILL') {
        errorType = 'PROCESS_KILLED';
        errorDetails = `Процесс был принудительно завершен.`;
      } else if (error.signal === 'SIGTERM') {
        errorType = 'PROCESS_TERMINATED';
        errorDetails = `Процесс был завершен.`;
      }
      
      // Проверяем существующую ошибку
      const existingError = await this._checkExistingError(md5Hash);
      if (!existingError.exists) {
        await this._createErrorReport({
          code: errorType,
          title: `Ошибка процесса: ${errorType}`,
          description: errorDetails,
          parameters: { ...parameters, errorCode: error.code, errorSignal: error.signal },
          priority: 'high',
          scriptName: 'processOperation'
        });
      }
      
      throw error;
    }
  }

  /**
   * Обработка ошибок файловой системы
   */
  async fileSystemOperation(operation, parameters = {}) {
    const md5Hash = this._generateParametersHash(parameters);
    
    try {
      const result = await operation(parameters);
      return result;
    } catch (error) {
      // Определяем тип ошибки файловой системы
      let errorType = 'FILE_SYSTEM_ERROR';
      let errorDetails = error.message;
      
      if (error.code === 'ENOENT') {
        errorType = 'FILE_NOT_FOUND';
        errorDetails = `Файл или директория не найдены: ${error.path || 'unknown'}`;
      } else if (error.code === 'EACCES') {
        errorType = 'PERMISSION_DENIED';
        errorDetails = `Отказано в доступе к файлу: ${error.path || 'unknown'}`;
      } else if (error.code === 'EEXIST') {
        errorType = 'FILE_EXISTS';
        errorDetails = `Файл уже существует: ${error.path || 'unknown'}`;
      } else if (error.code === 'ENOSPC') {
        errorType = 'NO_SPACE_LEFT';
        errorDetails = `Недостаточно места на диске`;
      } else if (error.code === 'ENOTDIR') {
        errorType = 'NOT_DIRECTORY';
        errorDetails = `Путь не является директорией: ${error.path || 'unknown'}`;
      } else if (error.code === 'EISDIR') {
        errorType = 'IS_DIRECTORY';
        errorDetails = `Путь является директорией, а не файлом: ${error.path || 'unknown'}`;
      }
      
      // Проверяем существующую ошибку
      const existingError = await this._checkExistingError(md5Hash);
      if (!existingError.exists) {
        await this._createErrorReport({
          code: errorType,
          title: `Ошибка файловой системы: ${errorType}`,
          description: errorDetails,
          parameters: { ...parameters, errorCode: error.code, errorPath: error.path },
          priority: 'medium',
          scriptName: 'fileSystemOperation'
        });
      }
      
      throw error;
    }
  }

  /**
   * Обработка ошибок сети и HTTP
   */
  async networkOperation(operation, parameters = {}) {
    const md5Hash = this._generateParametersHash(parameters);
    
    try {
      const result = await operation(parameters);
      return result;
    } catch (error) {
      // Определяем тип сетевой ошибки
      let errorType = 'NETWORK_ERROR';
      let errorDetails = error.message;
      
      if (error.code === 'ECONNREFUSED') {
        errorType = 'CONNECTION_REFUSED';
        errorDetails = `Соединение отклонено. Сервер недоступен или порт закрыт.`;
      } else if (error.code === 'ETIMEDOUT') {
        errorType = 'CONNECTION_TIMEOUT';
        errorDetails = `Таймаут соединения. Сервер не отвечает в течение заданного времени.`;
      } else if (error.code === 'ENOTFOUND') {
        errorType = 'DNS_ERROR';
        errorDetails = `Ошибка DNS. Хост не найден.`;
      } else if (error.code === 'ECONNRESET') {
        errorType = 'CONNECTION_RESET';
        errorDetails = `Соединение сброшено сервером.`;
      } else if (error.code === 'EHOSTUNREACH') {
        errorType = 'HOST_UNREACHABLE';
        errorDetails = `Хост недоступен.`;
      } else if (error.statusCode) {
        errorType = `HTTP_${error.statusCode}`;
        errorDetails = `HTTP ошибка ${error.statusCode}: ${error.statusMessage || 'Unknown'}`;
      }
      
      // Проверяем существующую ошибку
      const existingError = await this._checkExistingError(md5Hash);
      if (!existingError.exists) {
        await this._createErrorReport({
          code: errorType,
          title: `Сетевая ошибка: ${errorType}`,
          description: errorDetails,
          parameters: { ...parameters, errorCode: error.code, errorStatus: error.statusCode },
          priority: 'medium',
          scriptName: 'networkOperation'
        });
      }
      
      throw error;
    }
  }

  /**
   * Обработка ошибок таймаутов
   */
  async timeoutOperation(operation, timeoutMs = 30000, parameters = {}) {
    const md5Hash = this._generateParametersHash(parameters);
    
    try {
      const result = await Promise.race([
        operation(parameters),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
      return result;
    } catch (error) {
      // Проверяем существующую ошибку
      const existingError = await this._checkExistingError(md5Hash);
      if (!existingError.exists) {
        await this._createErrorReport({
          code: 'TIMEOUT_ERROR',
          title: 'Ошибка таймаута',
          description: error.message,
          parameters: { ...parameters, timeoutMs },
          priority: 'medium',
          scriptName: 'timeoutOperation'
        });
      }
      
      throw error;
    }
  }

  /**
   * Обработка ошибок памяти
   */
  async memoryOperation(operation, parameters = {}) {
    const md5Hash = this._generateParametersHash(parameters);
    
    try {
      const result = await operation(parameters);
      return result;
    } catch (error) {
      // Определяем тип ошибки памяти
      let errorType = 'MEMORY_ERROR';
      let errorDetails = error.message;
      
      if (error.message.includes('JavaScript heap out of memory')) {
        errorType = 'HEAP_OUT_OF_MEMORY';
        errorDetails = 'Недостаточно памяти в куче JavaScript. Попробуйте увеличить лимит памяти или оптимизировать код.';
      } else if (error.message.includes('Cannot allocate memory')) {
        errorType = 'CANNOT_ALLOCATE_MEMORY';
        errorDetails = 'Невозможно выделить память. Система исчерпала доступную память.';
      } else if (error.message.includes('Maximum call stack size exceeded')) {
        errorType = 'STACK_OVERFLOW';
        errorDetails = 'Переполнение стека. Возможно, бесконечная рекурсия или слишком глубокая вложенность вызовов.';
      }
      
      // Проверяем существующую ошибку
      const existingError = await this._checkExistingError(md5Hash);
      if (!existingError.exists) {
        await this._createErrorReport({
          code: errorType,
          title: `Ошибка памяти: ${errorType}`,
          description: errorDetails,
          parameters: { ...parameters, memoryUsage: process.memoryUsage() },
          priority: 'high',
          scriptName: 'memoryOperation'
        });
      }
      
      throw error;
    }
  }

  /**
   * Обработка ошибок портов
   */
  async portOperation(operation, parameters = {}) {
    const md5Hash = this._generateParametersHash(parameters);
    
    try {
      const result = await operation(parameters);
      return result;
    } catch (error) {
      // Определяем тип ошибки порта
      let errorType = 'PORT_ERROR';
      let errorDetails = error.message;
      
      if (error.code === 'EADDRINUSE') {
        errorType = 'PORT_ALREADY_IN_USE';
        errorDetails = `Порт ${error.port || 'unknown'} уже используется другим процессом.`;
      } else if (error.code === 'EACCES') {
        errorType = 'PORT_PERMISSION_DENIED';
        errorDetails = `Отказано в доступе к порту ${error.port || 'unknown'}. Требуются права администратора.`;
      } else if (error.code === 'EINVAL') {
        errorType = 'INVALID_PORT';
        errorDetails = `Неверный номер порта: ${error.port || 'unknown'}`;
      }
      
      // Проверяем существующую ошибку
      const existingError = await this._checkExistingError(md5Hash);
      if (!existingError.exists) {
        await this._createErrorReport({
          code: errorType,
          title: `Ошибка порта: ${errorType}`,
          description: errorDetails,
          parameters: { ...parameters, errorCode: error.code, errorPort: error.port },
          priority: 'medium',
          scriptName: 'portOperation'
        });
      }
      
      throw error;
    }
  }

  /**
   * Обработка ошибок конфигурации
   */
  async configOperation(operation, parameters = {}) {
    const md5Hash = this._generateParametersHash(parameters);
    
    try {
      const result = await operation(parameters);
      return result;
    } catch (error) {
      // Определяем тип ошибки конфигурации
      let errorType = 'CONFIG_ERROR';
      let errorDetails = error.message;
      
      if (error.message.includes('Unexpected token')) {
        errorType = 'INVALID_JSON';
        errorDetails = 'Неверный формат JSON в конфигурационном файле.';
      } else if (error.message.includes('Cannot find module')) {
        errorType = 'MISSING_MODULE';
        errorDetails = 'Отсутствует необходимый модуль.';
      } else if (error.message.includes('Invalid configuration')) {
        errorType = 'INVALID_CONFIG';
        errorDetails = 'Неверная конфигурация. Проверьте параметры.';
      } else if (error.message.includes('Required field missing')) {
        errorType = 'MISSING_REQUIRED_FIELD';
        errorDetails = 'Отсутствует обязательное поле в конфигурации.';
      }
      
      // Проверяем существующую ошибку
      const existingError = await this._checkExistingError(md5Hash);
      if (!existingError.exists) {
        await this._createErrorReport({
          code: errorType,
          title: `Ошибка конфигурации: ${errorType}`,
          description: errorDetails,
          parameters: { ...parameters, errorMessage: error.message },
          priority: 'high',
          scriptName: 'configOperation'
        });
      }
      
      throw error;
    }
  }

  /**
   * Обработка ошибок базы данных
   */
  async databaseOperation(operation, parameters = {}) {
    const md5Hash = this._generateParametersHash(parameters);
    
    try {
      const result = await operation(parameters);
      return result;
    } catch (error) {
      // Определяем тип ошибки базы данных
      let errorType = 'DATABASE_ERROR';
      let errorDetails = error.message;
      
      if (error.code === 'SQLITE_CANTOPEN') {
        errorType = 'DATABASE_CANNOT_OPEN';
        errorDetails = 'Невозможно открыть базу данных. Проверьте права доступа и путь.';
      } else if (error.code === 'SQLITE_READONLY') {
        errorType = 'DATABASE_READONLY';
        errorDetails = 'База данных доступна только для чтения.';
      } else if (error.code === 'SQLITE_LOCKED') {
        errorType = 'DATABASE_LOCKED';
        errorDetails = 'База данных заблокирована другим процессом.';
      } else if (error.code === 'SQLITE_CORRUPT') {
        errorType = 'DATABASE_CORRUPT';
        errorDetails = 'База данных повреждена. Требуется восстановление.';
      } else if (error.message.includes('duplicate key')) {
        errorType = 'DUPLICATE_KEY';
        errorDetails = 'Нарушение уникальности ключа.';
      } else if (error.message.includes('foreign key constraint')) {
        errorType = 'FOREIGN_KEY_VIOLATION';
        errorDetails = 'Нарушение внешнего ключа.';
      }
      
      // Проверяем существующую ошибку
      const existingError = await this._checkExistingError(md5Hash);
      if (!existingError.exists) {
        await this._createErrorReport({
          code: errorType,
          title: `Ошибка базы данных: ${errorType}`,
          description: errorDetails,
          parameters: { ...parameters, errorCode: error.code },
          priority: 'high',
          scriptName: 'databaseOperation'
        });
      }
      
      throw error;
    }
  }

  /**
   * Обработка ошибок аутентификации
   */
  async authOperation(operation, parameters = {}) {
    const md5Hash = this._generateParametersHash(parameters);
    
    try {
      const result = await operation(parameters);
      return result;
    } catch (error) {
      // Определяем тип ошибки аутентификации
      let errorType = 'AUTH_ERROR';
      let errorDetails = error.message;
      
      if (error.statusCode === 401) {
        errorType = 'UNAUTHORIZED';
        errorDetails = 'Неавторизованный доступ. Проверьте учетные данные.';
      } else if (error.statusCode === 403) {
        errorType = 'FORBIDDEN';
        errorDetails = 'Доступ запрещен. Недостаточно прав.';
      } else if (error.message.includes('Invalid token')) {
        errorType = 'INVALID_TOKEN';
        errorDetails = 'Неверный токен аутентификации.';
      } else if (error.message.includes('Token expired')) {
        errorType = 'TOKEN_EXPIRED';
        errorDetails = 'Токен аутентификации истек.';
      } else if (error.message.includes('Invalid credentials')) {
        errorType = 'INVALID_CREDENTIALS';
        errorDetails = 'Неверные учетные данные.';
      }
      
      // Проверяем существующую ошибку
      const existingError = await this._checkExistingError(md5Hash);
      if (!existingError.exists) {
        await this._createErrorReport({
          code: errorType,
          title: `Ошибка аутентификации: ${errorType}`,
          description: errorDetails,
          parameters: { ...parameters, errorStatus: error.statusCode },
          priority: 'medium',
          scriptName: 'authOperation'
        });
      }
      
      throw error;
    }
  }
}
