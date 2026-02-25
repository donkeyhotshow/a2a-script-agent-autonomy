/**
 * @fileoverview Управление режимами работы MCP Terminal
 * @author MCP Terminal Team
 * @version 1.0.0
 */
const { validationUtils } = require('@libs/validation/validation/validation-utils.cjs');
const { errorUtils } = require('@libs/error-management/error-handler/error-utils.cjs');
const { debugSystem, DEBUG_CATEGORIES } = require('C:/apps/root/mcp/node-terminal/mcp/DebugSystem.cjs');

/**
 * Доступные режимы работы
 */
const RUNTIME_MODES = {
  NORMAL: 'normal',
  SAFE: 'safe',
  READONLY: 'readonly',
  TEST: 'test',
  DEBUG: 'debug'
};

/**
 * Флаги режимов
 */
const MODE_FLAGS = {
  ALLOW_DANGEROUS_COMMANDS: 'allow_dangerous_commands',
  ALLOW_FILE_MODIFICATIONS: 'allow_file_modifications',
  ALLOW_NETWORK_ACCESS: 'allow_network_access',
  ALLOW_SYSTEM_COMMANDS: 'allow_system_commands',
  ENABLE_DEBUGGING: 'enable_debugging',
  ENABLE_LOGGING: 'enable_logging'
};

/**
 * Конфигурация режимов
 */
const MODE_CONFIGS = {
  [RUNTIME_MODES.NORMAL]: {
    name: 'Normal Mode',
    description: 'Стандартный режим работы',
    flags: [
      MODE_FLAGS.ALLOW_DANGEROUS_COMMANDS,
      MODE_FLAGS.ALLOW_FILE_MODIFICATIONS,
      MODE_FLAGS.ALLOW_NETWORK_ACCESS,
      MODE_FLAGS.ALLOW_SYSTEM_COMMANDS,
      MODE_FLAGS.ENABLE_LOGGING
    ]
  },
  [RUNTIME_MODES.SAFE]: {
    name: 'Safe Mode',
    description: 'Безопасный режим с ограничениями',
    flags: [
      MODE_FLAGS.ALLOW_FILE_MODIFICATIONS,
      MODE_FLAGS.ENABLE_LOGGING
    ]
  },
  [RUNTIME_MODES.READONLY]: {
    name: 'Read-Only Mode',
    description: 'Режим только для чтения',
    flags: [
      MODE_FLAGS.ENABLE_LOGGING
    ]
  },
  [RUNTIME_MODES.TEST]: {
    name: 'Test Mode',
    description: 'Режим тестирования',
    flags: [
      MODE_FLAGS.ALLOW_FILE_MODIFICATIONS,
      MODE_FLAGS.ENABLE_DEBUGGING,
      MODE_FLAGS.ENABLE_LOGGING
    ]
  },
  [RUNTIME_MODES.DEBUG]: {
    name: 'Debug Mode',
    description: 'Режим отладки',
    flags: [
      MODE_FLAGS.ALLOW_DANGEROUS_COMMANDS,
      MODE_FLAGS.ALLOW_FILE_MODIFICATIONS,
      MODE_FLAGS.ALLOW_NETWORK_ACCESS,
      MODE_FLAGS.ALLOW_SYSTEM_COMMANDS,
      MODE_FLAGS.ENABLE_DEBUGGING,
      MODE_FLAGS.ENABLE_LOGGING
    ]
  }
};

class RuntimeModeUtils {
  constructor(logger, errorUtils, validationUtils, debugSystem) {
    this.logger = logger;
    this.errorUtils = errorUtils;
    this.validationUtils = validationUtils;
    this.debugSystem = debugSystem;

    this.currentMode = RUNTIME_MODES.NORMAL;
    this.activeFlags = new Set(MODE_CONFIGS[RUNTIME_MODES.NORMAL].flags);
    this.modeHistory = [];

    // Привязываем методы к экземпляру
    this.listModes = this.listModes.bind(this);
    this.getMode = this.getMode.bind(this);
    this.setMode = this.setMode.bind(this);
    this.setFlags = this.setFlags.bind(this);
    this.isReadonly = this.isReadonly.bind(this);
    this.isReadonlyAllowed = this.isReadonlyAllowed.bind(this);
    this.isDangerousCommandsAllowed = this.isDangerousCommandsAllowed.bind(this);
    this.isFileModificationAllowed = this.isFileModificationAllowed.bind(this);
    this.isNetworkAccessAllowed = this.isNetworkAccessAllowed.bind(this);
    this.isSystemCommandsAllowed = this.isSystemCommandsAllowed.bind(this);
    this.isDebuggingEnabled = this.isDebuggingEnabled.bind(this);
    this.isLoggingEnabled = this.isLoggingEnabled.bind(this);
    this.getModeInfo = this.getModeInfo.bind(this);
    this.resetMode = this.resetMode.bind(this);
    this.getFsSandboxRoot = this.getFsSandboxRoot.bind(this);
    this.isFsReadonly = this.isFsReadonly.bind(this);
  }

  getFsSandboxRoot() {
    if (this.currentMode === RUNTIME_MODES.SAFE) {
      return process.cwd();
    }
    return null;
  }

  isFsReadonly() {
    return !this.activeFlags.has(MODE_FLAGS.ALLOW_FILE_MODIFICATIONS);
  }

  listModes() {
    return Object.entries(MODE_CONFIGS).map(([key, config]) => ({
      key,
      name: config.name,
      description: config.description,
      flags: config.flags,
      isActive: key === this.currentMode
    }));
  }

  getMode() {
    return {
      mode: this.currentMode,
      config: MODE_CONFIGS[this.currentMode],
      flags: Array.from(this.activeFlags),
      history: this.modeHistory.slice(-10)
    };
  }

  setMode(mode, options = {}) {
    if (!MODE_CONFIGS[mode]) {
      throw this.errorUtils.createError(`Неизвестный режим: ${mode}`);
    }

    const previousMode = this.currentMode;
    this.currentMode = mode;
    this.activeFlags = new Set(MODE_CONFIGS[mode].flags);

    this.modeHistory.push({
      timestamp: new Date().toISOString(),
      previousMode,
      newMode: mode,
      reason: options.reason || 'manual_change'
    });

    this.debugSystem.log(DEBUG_CATEGORIES.RUNTIME, `Режим изменен: ${previousMode} → ${mode}`);

    return {
      success: true,
      previousMode,
      newMode: mode,
      flags: Array.from(this.activeFlags)
    };
  }

  setFlags(flags, options = {}) {
    if (!this.validationUtils.isArray(flags)) {
      throw this.errorUtils.createError('Флаги должны быть массивом');
    }

    const previousFlags = Array.from(this.activeFlags);

    for (const flag of flags) {
      if (!Object.values(MODE_FLAGS).includes(flag)) {
        throw this.errorUtils.createError(`Неизвестный флаг: ${flag}`);
      }
    }

    this.activeFlags = new Set(flags);

    this.debugSystem.log(DEBUG_CATEGORIES.RUNTIME, `Флаги изменены: ${previousFlags.join(', ')} → ${flags.join(', ')}`);

    return {
      success: true,
      previousFlags,
      newFlags: flags
    };
  }

  isReadonly() {
    return this.currentMode === RUNTIME_MODES.READONLY;
  }

  isReadonlyAllowed() {
    return this.activeFlags.has(MODE_FLAGS.ALLOW_FILE_MODIFICATIONS) === false;
  }

  isDangerousCommandsAllowed() {
    return this.activeFlags.has(MODE_FLAGS.ALLOW_DANGEROUS_COMMANDS);
  }

  isFileModificationAllowed() {
    return this.activeFlags.has(MODE_FLAGS.ALLOW_FILE_MODIFICATIONS);
  }

  isNetworkAccessAllowed() {
    return this.activeFlags.has(MODE_FLAGS.ALLOW_NETWORK_ACCESS);
  }

  isSystemCommandsAllowed() {
    return this.activeFlags.has(MODE_FLAGS.ALLOW_SYSTEM_COMMANDS);
  }

  isDebuggingEnabled() {
    return this.activeFlags.has(MODE_FLAGS.ENABLE_DEBUGGING);
  }

  isLoggingEnabled() {
    return this.activeFlags.has(MODE_FLAGS.ENABLE_LOGGING);
  }

  getModeInfo() {
    return {
      currentMode: this.currentMode,
      modeConfig: MODE_CONFIGS[this.currentMode],
      activeFlags: Array.from(this.activeFlags),
      readonly: this.isReadonly(),
      readonlyAllowed: this.isReadonlyAllowed(),
      dangerousCommandsAllowed: this.isDangerousCommandsAllowed(),
      fileModificationAllowed: this.isFileModificationAllowed(),
      networkAccessAllowed: this.isNetworkAccessAllowed(),
      systemCommandsAllowed: this.isSystemCommandsAllowed(),
      debuggingEnabled: this.isDebuggingEnabled(),
      loggingEnabled: this.isLoggingEnabled(),
      history: this.modeHistory.slice(-5)
    };
  }

  resetMode() {
    return this.setMode(RUNTIME_MODES.NORMAL, { reason: 'reset' });
  }
}

module.exports = { RuntimeModeUtils, RUNTIME_MODES, MODE_FLAGS, MODE_CONFIGS };


