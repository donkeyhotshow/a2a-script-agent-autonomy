/**
 * Unified Validation Library
 * Объединенная библиотека валидации данных
 */

class ValidationUtils {
  constructor(options = {}) {
    this.getSchema = options.getSchema || ((schemaName) => Promise.resolve(null));
  }

  // Методы из ValidationEngine
  validate(data, schema) {
    const errors = {};
    let isValid = true;

    // Validate schema structure first
    for (const key in schema) {
      const rule = schema[key];
      
      // Check if min/max parameters have correct types
      if (rule.min !== undefined && typeof rule.min !== 'number') {
        isValid = false;
        errors[key] = errors[key] || [];
        errors[key].push(`Type mismatch: expected number, got ${typeof rule.min}`);
      }
      
      if (rule.max !== undefined && typeof rule.max !== 'number') {
        isValid = false;
        errors[key] = errors[key] || [];
        errors[key].push(`Type mismatch: expected number, got ${typeof rule.max}`);
      }
    }

    for (const key in schema) {
      const rule = schema[key];
      const value = data[key];

      // Handle nested objects
      if (rule.type === 'object' && rule.properties && typeof value === 'object' && value !== null) {
        const nestedValidation = this.validate(value, rule.properties);
        if (!nestedValidation.isValid) {
          isValid = false;
          // Ensure nested errors are associated with the correct parent key
          for (const nestedKey in nestedValidation.errors) {
            errors[`${key}.${nestedKey}`] = errors[`${key}.${nestedKey}`] || [];
            errors[`${key}.${nestedKey}`].push(...nestedValidation.errors[nestedKey]);
          }
        }
        continue; // Skip further validation for this key as it's handled by nested validation
      }

      // Required field validation (newly added)
      if (rule.required && (value === undefined || value === null || value === '')) {
        isValid = false;
        errors[key] = errors[key] || [];
        errors[key].push(`${key} is required`);
        continue; // Skip further validation if the field is missing
      }

      // Type validation
      if (rule.type && value !== undefined && typeof value !== rule.type) { // Added value !== undefined
        isValid = false;
        errors[key] = errors[key] || [];
        errors[key].push(`Type mismatch: expected ${rule.type}, got ${typeof value}`);
      }

      // Min/Max for number/string
      if (rule.min !== undefined) {
        if (typeof value === 'string' && value.length < rule.min) {
          isValid = false;
          errors[key] = errors[key] || [];
          errors[key].push(`String length for ${key} must be at least ${rule.min} characters, got ${value.length}`);
        } else if (typeof value === 'number' && value < rule.min) {
          isValid = false;
          errors[key] = errors[key] || [];
          errors[key].push(`Value for ${key} must be at least ${rule.min}, got ${value}`);
        }
      }
      
      if (rule.max !== undefined) {
        if (typeof value === 'string' && value.length > rule.max) {
          isValid = false;
          errors[key] = errors[key] || [];
          errors[key].push(`String length for ${key} must be at most ${rule.max} characters, got ${value.length}`);
        } else if (typeof value === 'number' && value > rule.max) {
          isValid = false;
          errors[key] = errors[key] || [];
          errors[key].push(`Value for ${key} must be at most ${rule.max}, got ${value}`);
        }
      }

      // Format validation
      if (rule.format === 'email' && typeof value === 'string' && !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) {
        isValid = false;
        errors[key] = errors[key] || [];
        errors[key].push(`${key} must be a valid email format`);
      }

      // Pattern validation (using regex)
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        isValid = false;
        errors[key] = errors[key] || [];
        errors[key].push(`${key} has an invalid format`);
      }

      // Enum validation
      if (rule.enum && Array.isArray(rule.enum) && !rule.enum.includes(value)) {
        isValid = false;
        errors[key] = errors[key] || [];
        errors[key].push(`${key} must be one of ${rule.enum.join(', ')}`);
      }

      // Presence validation
      if (rule.presence && (value === undefined || value === null || value === '')) {
        if (rule.presence.if && !rule.presence.if(data)) {
          // Do nothing if conditional check fails
        } else if (!rule.presence.allowEmpty && (value === undefined || value === null || value === '')) {
          isValid = false;
          errors[key] = errors[key] || [];
          errors[key].push(`${key} is required`);
        }
      }

      // Custom validation
      if (rule.custom) {
        const customError = rule.custom(value);
        if (customError) {
          isValid = false;
          errors[key] = errors[key] || [];
          errors[key].push(customError);
        }
      }
    }

    return { isValid, errors };
  }

  // Методы из JsonValidator
  checkRequiredFields(obj, requiredFields) {
    return requiredFields.filter(field => !(field in obj));
  }

  isInRange(value, min, max) {
    return value >= min && value <= max;
  }

  isNonEmptyArray(arr) {
    return Array.isArray(arr) && arr.length > 0;
  }

  // Методы из data-validation
  validateBaseline(data) {
    const errors = [];
    
    if (!data) {
      errors.push('Данные отсутствуют');
      return { isValid: false, errors };
    }
    
    if (typeof data !== 'object') {
      errors.push('Данные должны быть объектом');
      return { isValid: false, errors };
    }
    
    return { isValid: true, errors: [] };
  }

  validateScanResultItem(item, index) {
    const errors = [];
    
    if (!item) {
      errors.push(`Элемент ${index}: отсутствует`);
      return { isValid: false, errors };
    }
    
    if (!item.id) {
      errors.push(`Элемент ${index}: отсутствует ID`);
    }
    
    if (!item.type) {
      errors.push(`Элемент ${index}: отсутствует тип`);
    }
    
    if (!item.coordinates || !item.coordinates.x || !item.coordinates.y) {
      errors.push(`Элемент ${index}: некорректные координаты`);
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateConfig(config, schema) {
    const errors = [];
    
    if (!config) {
      errors.push('Конфигурация отсутствует');
      return { isValid: false, errors };
    }
    
    if (typeof config !== 'object') {
      errors.push('Конфигурация должна быть объектом');
      return { isValid: false, errors };
    }
    
    // Проверяем обязательные поля
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in config)) {
          errors.push(`Отсутствует обязательное поле: ${field}`);
        }
      }
    }
    
    // Проверяем типы полей
    if (schema.types) {
      for (const [field, expectedType] of Object.entries(schema.types)) {
        if (field in config) {
          const actualType = typeof config[field];
          if (actualType !== expectedType) {
            errors.push(`Поле ${field}: ожидается ${expectedType}, получено ${actualType}`);
          }
        }
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateCoordinates(x, y, width, height) {
    const errors = [];
    
    if (typeof x !== 'number' || isNaN(x)) {
      errors.push('X координата должна быть числом');
    }
    
    if (typeof y !== 'number' || isNaN(y)) {
      errors.push('Y координата должна быть числом');
    }
    
    if (width !== undefined && (typeof width !== 'number' || isNaN(width) || width <= 0)) {
      errors.push('Ширина должна быть положительным числом');
    }
    
    if (height !== undefined && (typeof height !== 'number' || isNaN(height) || height <= 0)) {
      errors.push('Высота должна быть положительным числом');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateDataSize(data, maxSize = 1000) {
    const errors = [];
    
    let dataSize = 0;
    try {
      dataSize = JSON.stringify(data).length;
    } catch (e) {
      // Handle circular structures safely
      const seen = new WeakSet();
      const safeString = JSON.stringify(data, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        return value;
      });
      dataSize = safeString.length;
    }
    
    if (dataSize > maxSize) {
      errors.push(`Размер данных (${dataSize} байт) превышает максимальный (${maxSize} байт)`);
    }
    
    return { isValid: errors.length === 0, errors, size: dataSize };
  }

  validateOutputFormat(format) {
    const validFormats = ['json', 'xml', 'csv', 'yaml', 'markdown'];
    
    if (!validFormats.includes(format)) {
      return { 
        isValid: false, 
        errors: [`Неподдерживаемый формат: ${format}. Поддерживаемые: ${validFormats.join(', ')}`] 
      };
    }
    
    return { isValid: true, errors: [] };
  }

  validateId(id) {
    const errors = [];
    
    if (id === null || id === undefined) {
      errors.push('ID отсутствует');
      return { isValid: false, errors };
    }
    
    if (typeof id !== 'string') {
      errors.push('ID должен быть строкой');
      return { isValid: false, errors };
    }
    
    if (id.trim().length === 0) {
      errors.push('ID не может быть пустой строкой');
      return { isValid: false, errors };
    }
    
    // Проверяем на допустимые символы
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      errors.push('ID содержит недопустимые символы. Разрешены: буквы, цифры, дефис, подчеркивание');
    }
    
    return { isValid: errors.length === 0, errors };
  }
}

module.exports = { ValidationUtils };
