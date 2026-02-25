/**
 * Валидация команд для MCP сервера
 * Вынесен из mcp-server.cjs для улучшения структуры
 */

const path = require('path');

/**
 * Валидация и разрешение рабочей директории
 */
async function validateAndResolveCwd(cwd, pathUtils, fileUtils, expandPath) {
  try {
    if (!cwd || typeof cwd !== 'string') {
      return { ok: true, path: process.cwd() };
    }

    const trimmed = cwd.trim();
    if (!trimmed) {
      return { ok: true, path: process.cwd() };
    }

    const notice = 'Используйте абсолютные пути (например, "C:\\apps\\project" или "C:/apps/project")';
    
    // Проверка на Windows
    if (process.platform === 'win32') {
      if (/^[a-zA-Z]%3A/i.test(trimmed)) {
        throw new Error(`недопустимый формат диска ("%3A"). ${notice}`);
      }
      if (/^\/[a-zA-Z]\//.test(trimmed)) {
        throw new Error(`формат "/c/..." не поддерживается. ${notice}`);
      }
      if (/^\/[a-zA-Z]:/.test(trimmed)) {
        throw new Error(`путь не должен начинаться со "/" перед буквой диска. ${notice}`);
      }
      
      // Нормализация URL-кодирования и форматов
      try {
        const decoded = decodeURIComponent(trimmed);
        if (/^\/[a-zA-Z]:/.test(decoded)) {
          const normalized = decoded.replace(/^\//, '');
          const expanded = expandPath ? expandPath(normalized) : normalized;
          const resolved = pathUtils ? pathUtils.resolve(expanded) : path.resolve(expanded);
          return { ok: true, path: resolved };
        }
        if (/^\/[a-zA-Z]\//.test(decoded)) {
          const normalized = decoded.replace(/^\/(.)\//, function(match, drive) {
            return String(drive).toUpperCase() + ':\\';
          });
          const expanded = expandPath ? expandPath(normalized) : normalized;
          const resolved = pathUtils ? pathUtils.resolve(expanded) : path.resolve(expanded);
          return { ok: true, path: resolved };
        }
      } catch (error) {
        // Игнорируем ошибки декодирования
      }
      
      // Проверка недостающего двоеточия после буквы диска
      if (/^[a-zA-Z][\\\/:]/.test(trimmed) && !/^[a-zA-Z]:[\\\/]/.test(trimmed) && !/^\\\\/.test(trimmed)) {
        throw new Error(`отсутствует двоеточие после буквы диска. ${notice}`);
      }
    }
    
    const expanded = expandPath ? expandPath(trimmed) : trimmed;
    const resolved = pathUtils ? pathUtils.resolve(expanded) : path.resolve(expanded);
    
    if (fileUtils && fileUtils.getFileStats) {
      const stats = await fileUtils.getFileStats(resolved);
      if (!stats.isDirectory) {
        throw new Error(process.platform === 'win32' ? 'cwd is not a directory. Windows путь должен быть абсолютным (например, "C\\apps\project" или "C:/apps/project").' : 'cwd is not a directory');
      }
    }
    
    return { ok: true, path: resolved };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Валидация параметров для core.exec.run
 */
function validateExecRunParams(args) {
  const errors = [];
  const validated = {};

  // command: обязательная строка, не пустая
  if (typeof args.command !== 'string') {
    errors.push('command: must be a string');
  } else {
    const trimmed = args.command.trim();
    if (!trimmed) {
      errors.push('command: cannot be empty');
    } else {
      validated.command = trimmed;
    }
  }

  // timeout: число, положительное, в разумных пределах
  if (args.timeout !== undefined) {
    const timeout = Number(args.timeout);
    if (!Number.isFinite(timeout)) {
      errors.push('timeout: must be a valid number');
    } else if (timeout <= 0) {
      errors.push('timeout: must be positive');
    } else if (timeout > 3600) { // максимум 1 час
      errors.push('timeout: cannot exceed 3600 seconds (1 hour)');
    } else {
      validated.timeout = Math.floor(timeout);
    }
  } else {
    validated.timeout = 120; // дефолт 2 минуты
  }

  // is_background: булево значение
  if (args.is_background !== undefined) {
    if (typeof args.is_background !== 'boolean') {
      errors.push('is_background: must be a boolean');
    } else {
      validated.is_background = args.is_background;
    }
  } else {
    validated.is_background = false;
  }

  // cwd: строка или null
  if (args.cwd !== undefined) {
    if (typeof args.cwd !== 'string' && args.cwd !== null) {
      errors.push('cwd: must be a string or null');
    } else {
      validated.cwd = args.cwd;
    }
  } else {
    validated.cwd = null;
  }

  return { errors, validated };
}

module.exports = {
  validateAndResolveCwd,
  validateExecRunParams
};
