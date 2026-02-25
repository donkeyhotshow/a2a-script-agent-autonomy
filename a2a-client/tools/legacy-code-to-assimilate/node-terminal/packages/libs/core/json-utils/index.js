/**
 * Unified JSON Utilities Library
 * Объединенная библиотека JSON утилит
 */

class JsonUtils {
  /**
   * Безопасно парсит JSON строку
   */
  safeParse(jsonString, defaultValue = undefined) {
    try {
      if (!jsonString || typeof jsonString !== 'string') {
        return { success: false, data: defaultValue, error: new Error('Input is not a valid string') };
      }
      
      const data = JSON.parse(jsonString);
      return { success: true, data, error: undefined };
    } catch (error) {
      return { success: false, data: defaultValue, error: error };
    }
  }

  /**
   * Безопасно парсит JSON файл
   */
  async safeParseFile(filePath, defaultValue = undefined) {
    try {
      const fs = require('fs').promises;
      const content = await fs.readFile(filePath, 'utf8');
      return this.safeParse(content, defaultValue);
    } catch (error) {
      return { success: false, data: defaultValue, error: error };
    }
  }

  /**
   * Безопасно парсит JSON с валидацией схемы
   */
  safeParseWithValidation(jsonString, schema, defaultValue = undefined) {
    const parseResult = this.safeParse(jsonString, defaultValue);
    
    if (!parseResult.success) {
      return parseResult;
    }
    
    // Простая валидация схемы
    const validationErrors = [];
    
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in parseResult.data)) {
          validationErrors.push(`Missing required field: ${field}`);
        }
      }
    }
    
    if (schema.types) {
      for (const [field, expectedType] of Object.entries(schema.types)) {
        if (field in parseResult.data) {
          const actualType = typeof parseResult.data[field];
          if (actualType !== expectedType) {
            validationErrors.push(`Field ${field}: expected ${expectedType}, got ${actualType}`);
          }
        }
      }
    }
    
    if (validationErrors.length > 0) {
      return { 
        success: false, 
        data: defaultValue, 
        error: new Error(`Validation failed: ${validationErrors.join(', ')}`) 
      };
    }
    
    return parseResult;
  }

  /**
   * Безопасно парсит JSON с обработкой ошибок
   */
  safeParseWithErrorHandler(jsonString, errorHandler, defaultValue = undefined) {
    const result = this.safeParse(jsonString, defaultValue);
    
    if (!result.success && errorHandler) {
      errorHandler(result.error, jsonString);
    }
    
    return result;
  }

  /**
   * Парсит JSON с автоматическим восстановлением
   */
  parseWithRecovery(jsonString, options = {}) {
    const { 
      removeComments = true, 
      fixTrailingCommas = true, 
      defaultValue = undefined 
    } = options;
    
    try {
      // Удаляем комментарии если нужно
      let cleanedString = jsonString;
      if (removeComments) {
        cleanedString = cleanedString.replace(/\/\*[\s\S]*?\*\//g, ''); // Удаляем /* */ комментарии
        cleanedString = cleanedString.replace(/\/\/.*$/gm, ''); // Удаляем // комментарии
      }
      
      // Исправляем trailing commas если нужно
      if (fixTrailingCommas) {
        cleanedString = cleanedString.replace(/,(\s*[}\]])/g, '$1');
      }
      
      const data = JSON.parse(cleanedString);
      return { success: true, data, error: undefined };
    } catch (error) {
      return { success: false, data: defaultValue, error: error };
    }
  }

  /**
   * Создает JSON строку с безопасной обработкой ошибок
   */
  safeStringify(data, space = 2) {
    try {
      const jsonString = JSON.stringify(data, null, space);
      return { success: true, data: jsonString, error: undefined };
    } catch (error) {
      return { success: false, data: null, error: error };
    }
  }

  /**
   * Создает JSON строку с кастомным replacer
   */
  safeStringifyWithReplacer(data, replacer, space = 2) {
    try {
      const jsonString = JSON.stringify(data, replacer, space);
      return { success: true, data: jsonString, error: undefined };
    } catch (error) {
      return { success: false, data: null, error: error };
    }
  }

  /**
   * Проверяет, является ли строка валидным JSON
   */
  isValidJson(str) {
    if (typeof str !== 'string' || str.trim() === '') {
      return false;
    }
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Минифицирует JSON строку
   */
  minify(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      return { success: true, data: JSON.stringify(parsed), error: undefined };
    } catch (error) {
      return { success: false, data: null, error: error };
    }
  }

  /**
   * Форматирует JSON строку с отступами
   */
  format(jsonString, space = 2) {
    try {
      const parsed = JSON.parse(jsonString);
      return { success: true, data: JSON.stringify(parsed, null, space), error: undefined };
    } catch (error) {
      return { success: false, data: null, error: error };
    }
  }
}

export { JsonUtils };
