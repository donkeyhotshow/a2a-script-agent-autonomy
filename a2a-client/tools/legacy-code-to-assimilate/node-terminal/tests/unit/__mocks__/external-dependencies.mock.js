
/**
 * Мок для внешних зависимостей
 * Заменяет абсолютные пути на локальные моки
 */

// Мок для error-utils
export const errorUtils = {
  safeExecute: async (fn, errorType = 'error') => {
    try {
      return await fn();
    } catch (error) {
      return {
        success: false,
        error: error.message,
        type: errorType
      };
    }
  },
  
  handleError: (error, context = '') => {
    return {
      success: false,
      error: error.message,
      context,
      timestamp: Date.now()
    };
  },
  
  createError: (message, code = 'UNKNOWN_ERROR') => {
    const error = new Error(message);
    error.code = code;
    return error;
  }
};

// Мок для console-utils
export const consoleUtils = {
  log: (message) => {
    // В тестах просто возвращаем сообщение
    return `[LOG] ${message}`;
  },
  
  error: (message) => {
    return `[ERROR] ${message}`;
  },
  
  warning: (message) => {
    return `[WARNING] ${message}`;
  },
  
  success: (message) => {
    return `[SUCCESS] ${message}`;
  },
  
  info: (message) => {
    return `[INFO] ${message}`;
  }
};

// Мок для validation-utils
export const validationUtils = {
  isFunction: (value) => {
    return typeof value === 'function';
  },
  
  isArray: (value) => {
    return Array.isArray(value);
  },
  
  isObject: (value) => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  },
  
  isString: (value) => {
    return typeof value === 'string';
  },
  
  isNumber: (value) => {
    return typeof value === 'number' && !isNaN(value);
  },
  
  isBoolean: (value) => {
    return typeof value === 'boolean';
  },
  
  isEmpty: (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },
  
  validateCommand: (command) => {
    if (!command || typeof command !== 'string') {
      return { valid: false, error: 'Command must be a non-empty string' };
    }
    
    // Проверяем на опасные команды
    const dangerousCommands = ['rm -rf', 'del /s', 'format', 'shutdown'];
    if (dangerousCommands.some(cmd => command.includes(cmd))) {
      return { valid: false, error: 'Dangerous command detected' };
    }
    
    return { valid: true };
  },
  
  validateTimeout: (timeout) => {
    if (!validationUtils.isNumber(timeout) || timeout < 0) {
      return { valid: false, error: 'Timeout must be a positive number' };
    }
    
    if (timeout > 300000) { // 5 минут максимум
      return { valid: false, error: 'Timeout too long' };
    }
    
    return { valid: true };
  },
  
  validateProcessId: (pid) => {
    if (!validationUtils.isNumber(pid) || pid <= 0) {
      return { valid: false, error: 'Process ID must be a positive number' };
    }
    
    return { valid: true };
  }
};

// Мок для CommandExecutor
export class CommandExecutor {
  static async runCommand(command, options = {}) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          output: `Executed: ${command}`,
          pid: Math.floor(Math.random() * 10000) + 1000,
          duration: Math.random() * 1000
        });
      }, 50);
    });
  }
  
  static async runBackgroundCommand(command, options = {}) {
    return {
      success: true,
      mode: 'background',
      pid: Math.floor(Math.random() * 10000) + 1000,
      log_file: `/tmp/background-${Date.now()}.log`,
      timeout: options.timeout || 600
    };
  }
}

// Мок для DaemonManager
export class DaemonManager {
  constructor() {
    this.processes = new Map();
  }

  async start(command, options = {}) {
    const pid = Math.floor(Math.random() * 10000) + 1000;
    this.processes.set(pid, {
      pid,
      command,
      status: 'running',
      startTime: Date.now()
    });

    // Небольшая задержка для симуляции запуска
    await new Promise(resolve => setTimeout(resolve, 10));

    return {
      success: true,
      pid,
      status: 'started'
    };
  }

  async stop(processId) {
    const pid = typeof processId === 'string' ? parseInt(processId) : processId;

    if (!this.processes.has(pid)) {
      return {
        status: 'error',
        message: 'Process not found',
        pid: processId
      };
    }

    const processInfo = this.processes.get(pid);
    const duration = Date.now() - processInfo.startTime;
    this.processes.delete(pid);

    return {
      status: 'success',
      message: 'Process stopped successfully',
      pid,
      duration
    };
  }

  async list() {
    return Array.from(this.processes.values());
  }
}

// Мок для MigrationManager
export class MigrationManager {
  constructor() {
    this.migrations = [];
    this.currentVersion = '1.0.0';
  }

  async migrateData(source, target) {
    const migration = {
      id: Date.now(),
      source,
      target,
      version: this.currentVersion,
      timestamp: new Date().toISOString()
    };
    this.migrations.push(migration);
    return { success: true, migration };
  }

  validateMigration(data) {
    return data && typeof data === 'object';
  }

  async rollbackMigration(version) {
    const migration = this.migrations.find(m => m.version === version);
    if (migration) {
      this.migrations = this.migrations.filter(m => m.version !== version);
      return { success: true, rolledBack: migration };
    }
    return { success: false, error: 'Migration not found' };
  }

  getMigrationStatus() {
    return {
      totalMigrations: this.migrations.length,
      currentVersion: this.currentVersion,
      lastMigration: this.migrations[this.migrations.length - 1]
    };
  }

  backupBeforeMigration() {
    return { success: true, backup: 'mock-backup-' + Date.now() };
  }
}

// Мок для fileSystemUtils
export const fileSystemUtils = {
  join: (...args) => args.join('/'),
  resolve: (...args) => args.join('/'),
  dirname: (p) => p.split('/').slice(0, -1).join('/') || '.',
  basename: (p) => p.split('/').pop() || '',
  extname: (p) => {
    const parts = p.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  },
  existsSync: (path) => true, // В тестах всегда возвращаем true
  readFileSync: (path, encoding = 'utf8') => 'mock file content',
  writeFileSync: (path, content) => undefined,
  mkdirSync: (path, options) => undefined,
  statSync: (path) => ({
    size: 1024,
    mtime: new Date(),
    isDirectory: () => false,
    isFile: () => true
  }),
  readdirSync: (path) => ['file1.txt', 'file2.js'],
  unlinkSync: (path) => undefined,
  rmSync: (path, options) => undefined
};