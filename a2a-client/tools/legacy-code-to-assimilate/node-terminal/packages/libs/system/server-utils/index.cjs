const fs = require('fs');
const path = require('path');

// Категории разрешенных путей
const ALLOWED_PATH_CATEGORIES = {
  'current-dir': {
    description: 'Текущая рабочая директория и её поддиректории',
    patterns: [
      /^\.\/.*/,              // Относительные пути от текущей директории
      /^[^\/\\]*$/,           // Файлы в текущей директории
      /^[^\/\\]*\/.*/         // Поддиректории текущей директории
    ]
  },
  'user-home': {
    description: 'Домашняя директория пользователя',
    patterns: [
      /^~\/.*/,               // Unix домашняя директория
      /^%USERPROFILE%\/.*/i,  // Windows домашняя директория
      /^%HOME%\/.*/i          // Альтернативная домашняя директория
    ]
  },
  'temp-dirs': {
    description: 'Временные директории',
    patterns: [
      /^\/tmp\/.*/,           // Unix временная директория
      /^%TEMP%\/.*/i,         // Windows временная директория
      /^%TMP%\/.*/i           // Альтернативная временная директория
    ]
  },
  'project-dirs': {
    description: 'Директории проектов',
    patterns: [
      /^.*\/projects\/.*/,    // Директории с проектами
      /^.*\/workspace\/.*/,   // Рабочие пространства
      /^.*\/dev\/.*/          // Директории разработки
    ]
  },
  'apps-dir': {
    description: 'Директория apps и её поддиректории',
    patterns: [
      /^[A-Za-z]:\\apps\\.*/,  // Windows абсолютный путь C:\apps\...
      /^[A-Za-z]:\\apps$/,     // Windows абсолютный путь C:\apps
      /^\/apps\/.*/,           // Unix абсолютный путь /apps/...
      /^\/apps$/               // Unix абсолютный путь /apps
    ]
  },
  'absolute-paths': {
    description: 'Абсолютные пути (осторожно использовать)',
    patterns: [
      /^[A-Za-z]:\\.*/,        // Windows абсолютные пути (C:\...)
      /^\/.*/                  // Unix абсолютные пути (/)
    ]
  }
};

// Запрещенные паттерны путей
const FORBIDDEN_PATH_PATTERNS = [
  // Системные директории Unix
  /^\/bin\/?$/,
  /^\/sbin\/?$/,
  /^\/usr\/?$/,
  /^\/etc\/?$/,
  /^\/var\/?$/,
  /^\/boot\/?$/,
  /^\/proc\/?$/,
  /^\/sys\/?$/,
  /^\/dev\/?$/,
  
  // Windows системные директории
  /^[a-zA-Z]:\\Windows\\?$/i,
  /^[a-zA-Z]:\\System32\\?$/i,
  /^[a-zA-Z]:\\Program Files\\?$/i,
  /^[a-zA-Z]:\\Program Files \(x86\)\\?$/i,
  /^[a-zA-Z]:\\Users\\?$/i,
  /^[a-zA-Z]:\\ProgramData\\?$/i,
  
  // Подозрительные паттерны
  /\.\.\./,                  // Множественные переходы вверх
  /^\.\.\/\.\.\/\.\./,       // Три и более уровня вверх
  /\/\.\.\//,                // Скрытые переходы вверх
  /\\\.\.\\/,                // Windows скрытые переходы
  /\/\/+/,                   // Множественные слеши
  /\\\\+/,                   // Множественные обратные слеши
  /[<>:"|?*]/,               // Запрещенные символы Windows
  /[\x00-\x1f\x7f]/,         // Управляющие символы
  // Убрали подозрительные паттерны - они слишком агрессивные
  // /^[a-zA-Z]:\\[^\\]*\.\.\./, // Подозрительные пути Windows - УБРАН
  // /^\/[^\/]*\.\.\./          // Подозрительные пути Unix - УБРАН
];

// LoggerCore класс
class LoggerCore {
  constructor(config = {}) {
    this.level = config.level || 'info';
    this.console = config.console !== false;
    this.file = config.file || false;
    this.filePath = config.filePath;
    this.maxSize = config.maxSize || '10m';
    this.maxFiles = config.maxFiles || '5';
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);

    if (this.console) {
      const colors = {
        error: '\x1b[31m', // red
        warn: '\x1b[33m',  // yellow
        info: '\x1b[36m',  // cyan
        debug: '\x1b[35m'  // magenta
      };
      const reset = '\x1b[0m';
      console.log(`${colors[level] || ''}${formattedMessage}${reset}`);
    }

    if (this.file && this.filePath) {
      try {
        fs.appendFileSync(this.filePath, formattedMessage + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error.message);
      }
    }
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }
}

// Функция для чтения отключенных инструментов из конфигурации
async function readDisabledFromConfig() {
  try {
    const disabled = [];
    const envVar = String(process.env.MCP_DISABLED_TOOLS || '').trim();
    if (envVar) {
      return envVar.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return disabled;
  } catch (error) {
    return [];
  }
}

module.exports = {
  LoggerCore,
  ALLOWED_PATH_CATEGORIES,
  FORBIDDEN_PATH_PATTERNS,
  readDisabledFromConfig
};
