/**
 * Unified Shared Utilities Library
 * Объединенная библиотека общих утилит
 */

const crypto = require('crypto');

class SharedUtils {
  /**
   * Генерация уникального ID
   */
  generateId(prefix = 'ID', length = 8) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 2 + length);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Генерация MD5 хеша
   */
  generateHash(data, algorithm = 'md5') {
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash(algorithm).update(jsonString).digest('hex');
  }

  /**
   * Генерация UUID v4
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // String utilities
  /**
   * Преобразует строку в camelCase
   */
  toCamelCase(str) {
    return str.replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '').replace(/^./, (match) => match.toLowerCase());
  }

  /**
   * Преобразует строку в kebab-case
   */
  toKebabCase(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Преобразование в PascalCase
   */
  toPascalCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Обрезает строку до указанной длины, добавляя '...'
   */
  truncateString(str, maxLength) {
    if (str.length <= maxLength) {
      return str;
    }
    return str.slice(0, maxLength - 3) + '...';
  }

  /**
   * Очистка строки от специальных символов
   */
  sanitizeString(str, options = {}) {
    let result = str;
    
    if (options.lowercase) {
      result = result.toLowerCase();
    }
    
    if (options.removeSpecialChars) {
      result = result.replace(/[^a-zA-Z0-9\s]/g, '');
    }
    
    if (options.replaceSpaces) {
      result = result.replace(/\s+/g, options.replaceSpaces);
    }
    
    if (options.trim) {
      result = result.trim();
    }
    
    return result;
  }

  // Validation utilities
  /**
   * Валидация email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Валидация URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Проверяет, является ли строка корректным номером версии
   */
  isValidVersion(version) {
    const versionRegex = /^\d+(\.\d+){0,2}$/;
    return typeof version === 'string' && versionRegex.test(version);
  }

  // Random utilities
  /**
   * Генерация случайного числа в диапазоне
   */
  randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Генерация случайной строки
   */
  randomString(length = 8, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  // Environment utilities
  /**
   * Проверка переменной окружения на true
   */
  isTrueEnv(value) {
    const v = String(value || '').toLowerCase();
    return v === '1' || v === 'true';
  }

  // Collection utilities
  /**
   * Глубокое слияние объектов
   */
  deepMerge(target, source) {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null &&
            !Array.isArray(source[key]) && typeof target[key] === 'object' &&
            target[key] !== null && !Array.isArray(target[key])) {
          target[key] = this.deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    return target;
  }

  /**
   * Удаление дубликатов из массива
   */
  uniqueArray(arr) {
    return Array.from(new Set(arr));
  }

  /**
   * Получает вложенное значение из объекта по строковому пути
   */
  getNestedValue(obj, path, defaultValue = undefined) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length; i++) {
      if (current === null || typeof current !== 'object' || !current.hasOwnProperty(parts[i])) {
        return defaultValue;
      }
      current = current[parts[i]];
    }
    return current;
  }

  // System utilities
  /**
   * Получение информации о системе
   */
  getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cwd: process.cwd(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      pid: process.pid
    };
  }

  /**
   * Форматирование размера в байтах
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

const sharedUtils = new SharedUtils();

module.exports = {
  SharedUtils,
  sharedUtils
};

// Для совместимости с ES6 импортами

