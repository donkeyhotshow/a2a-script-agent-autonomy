/**
 * Валидация путей для MCP сервера
 * Вынесен из mcp-server.cjs для улучшения структуры
 */

const { ALLOWED_PATH_CATEGORIES, FORBIDDEN_PATH_PATTERNS } = require('./tests/mock-data.cjs');

/**
 * Валидация path с категориями
 */
async function validatePathWithCategories(pathStr, action = 'read') {
  const result = {
    isValid: false,
    category: null,
    error: null,
    details: {
      matchedCategory: null,
      forbiddenPattern: null,
      suggestions: [] // Всегда инициализируем здесь
    }
  };

  if (pathStr === null || pathStr === undefined) {
    result.error = 'Путь не может быть null или undefined';
    result.details.suggestions.push('Предоставьте корректный строковый путь');
    return result;
  }

  try {
    // Нормализация пути
    let normalizedPath = String(pathStr).replace(/\\/g, '/').replace(/\/+/g, '/'); // Преобразуем в строку
    if (normalizedPath.startsWith('./')) {
      normalizedPath = normalizedPath.substring(2);
    }
    if (normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.substring(0, normalizedPath.length - 1);
    }

    // Проверка запрещенных паттернов
    for (const pattern of FORBIDDEN_PATH_PATTERNS) {
      if (pattern.test(normalizedPath)) {
        result.error = `Путь заблокирован: содержит запрещенный паттерн`;
        result.details.forbiddenPattern = pattern.toString();
        return result;
      }
    }

    // Проверка категорий
    for (const [categoryKey, category] of Object.entries(ALLOWED_PATH_CATEGORIES)) {
      for (const pattern of category.patterns) {
        if (pattern.test(normalizedPath)) {
          result.isValid = true;
          result.category = categoryKey;
          result.details.matchedCategory = {
            key: categoryKey,
            name: category.name,
            description: category.description
          };
          
          // Добавляем предложения для улучшения
          if (action === 'write' && categoryKey === 'SOURCE_CODE') {
            result.details.suggestions.push('Рекомендуется использовать .gitignore для защиты исходного кода');
          }
          if (action === 'delete' && categoryKey === 'DOCS_CONFIG') {
            result.details.suggestions.push('Внимание: удаление конфигурационных файлов может нарушить работу проекта');
          }
          
          return result;
        }
      }
    }

    // Если путь не подходит ни под одну категорию
    result.error = `Путь не соответствует ни одной допустимой категории`;
    result.details.suggestions = [
      'Используйте пути в рамках проекта',
      'Допустимые категории: WORKSPACE, DOCS_CONFIG, SOURCE_CODE, TESTS, TEMP_LOGS, WORK_REPORTS, ARCHIVE, BUILD_DIST',
      'Примеры: src/, docs/, tests/, work/reports/, tmp/'
    ];

  } catch (error) {
    result.error = `Ошибка валидации: ${error.message}`;
  }
  
  return result;
}

/**
 * Валидация параметров для core.fs.*
 */
async function validateFsParams(action, args) {
  const errors = [];
  const validated = {};

  switch (action) {
    case 'list':
    case 'read':
    case 'delete':
      if (typeof args.path !== 'string') {
        errors.push('path: must be a string');
      } else {
        const trimmed = args.path.trim();
        if (!trimmed) {
          errors.push('path: cannot be empty');
        } else {
          // Валидация path с категориями
          const pathValidation = await validatePathWithCategories(trimmed, action);
          if (!pathValidation || !pathValidation.isValid) {
            const errorMsg = pathValidation ? pathValidation.error : 'Path validation failed';
            errors.push(`path: ${errorMsg}`);
            if (pathValidation && pathValidation.details && pathValidation.details.suggestions && pathValidation.details.suggestions.length > 0) {
              errors.push(`Подсказки: ${pathValidation.details.suggestions.join(', ')}`);
            }
          } else {
            validated.path = trimmed;
            validated.pathCategory = pathValidation.category;
            validated.pathDetails = pathValidation.details;
          }
        }
      }
      break;

    case 'write':
      if (typeof args.path !== 'string') {
        errors.push('path: must be a string');
      } else {
        const trimmed = args.path.trim();
        if (!trimmed) {
          errors.push('path: cannot be empty');
        } else {
          // Валидация path с категориями
          const pathValidation = await validatePathWithCategories(trimmed, action);
          if (!pathValidation || !pathValidation.isValid) {
            const errorMsg = pathValidation ? pathValidation.error : 'Path validation failed';
            errors.push(`path: ${errorMsg}`);
            if (pathValidation && pathValidation.details && pathValidation.details.suggestions && pathValidation.details.suggestions.length > 0) {
              errors.push(`Подсказки: ${pathValidation.details.suggestions.join(', ')}`);
            }
          } else {
            validated.path = trimmed;
            validated.pathCategory = pathValidation.category;
            validated.pathDetails = pathValidation.details;
          }
        }
      }
      if (typeof args.content !== 'string') {
        errors.push('content: must be a string');
      } else {
        validated.content = args.content;
      }
      if (args.mode !== undefined) {
        if (typeof args.mode !== 'string') {
          errors.push('mode: must be a string');
        } else {
          validated.mode = args.mode;
        }
      }
      break;

    case 'copy':
    case 'move':
      if (typeof args.source !== 'string') {
        errors.push('source: must be a string');
      } else {
        const trimmed = args.source.trim();
        if (!trimmed) {
          errors.push('source: cannot be empty');
        } else {
          // Валидация source path с категориями
          const sourceValidation = validatePathWithCategories(trimmed, action);
          if (!sourceValidation.isValid) {
            errors.push(`source: ${sourceValidation.error}`);
            if (sourceValidation.details.suggestions.length > 0) {
              errors.push(`Подсказки: ${sourceValidation.details.suggestions.join(', ')}`);
            }
          } else {
            validated.source = trimmed;
            validated.sourceCategory = sourceValidation.category;
            validated.sourceDetails = sourceValidation.details;
          }
        }
      }
      if (typeof args.destination !== 'string') {
        errors.push('destination: must be a string');
      } else {
        const trimmed = args.destination.trim();
        if (!trimmed) {
          errors.push('destination: cannot be empty');
        } else {
          // Валидация destination path с категориями
          const destValidation = validatePathWithCategories(trimmed, action);
          if (!destValidation.isValid) {
            errors.push(`destination: ${destValidation.error}`);
            if (destValidation.details.suggestions.length > 0) {
              errors.push(`Подсказки: ${destValidation.details.suggestions.join(', ')}`);
            }
          } else {
            validated.destination = trimmed;
            validated.destinationCategory = destValidation.category;
            validated.destinationDetails = destValidation.details;
          }
        }
      }
      break;
  }

  // Дополнительные параметры
  if (action === 'read') {
    if (args.start !== undefined) {
      const start = Number(args.start);
      if (!Number.isFinite(start) || start < 0) {
        errors.push('start: must be a non-negative number');
      } else {
        validated.start = Math.floor(start);
      }
    }
    if (args.end !== undefined) {
      const end = Number(args.end);
      if (!Number.isFinite(end) || end < 0) {
        errors.push('end: must be a non-negative number');
      } else {
        validated.end = Math.floor(end);
      }
    }
  }

  if (action === 'delete' && args.recursive !== undefined) {
    if (typeof args.recursive !== 'boolean') {
      errors.push('recursive: must be a boolean');
    } else {
      validated.recursive = args.recursive;
    }
  }

  return { errors, validated };
}

module.exports = {
  validatePathWithCategories,
  validateFsParams
};
