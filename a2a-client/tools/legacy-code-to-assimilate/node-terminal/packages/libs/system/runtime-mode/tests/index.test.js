const { RuntimeModeUtils, RUNTIME_MODES, MODE_FLAGS, MODE_CONFIGS } = require('../index.cjs');

// Mock dependencies
jest.mock('C:/apps/libs/validation/validation/validation-utils.js', () => ({
  validationUtils: {
    isArray: jest.fn((val) => Array.isArray(val)),
  }
}));

jest.mock('C:/apps/libs/error-management/error-handler/error-utils.js', () => ({
  errorUtils: {
    createError: jest.fn((message) => new Error(message)),
  }
}));

jest.mock('C:/apps/root/mcp/node-terminal/mcp/DebugSystem.cjs', () => ({
  debugSystem: {
    log: jest.fn(),
  },
  DEBUG_CATEGORIES: {
    RUNTIME: 'runtime',
  }
}));

describe('RuntimeMode', () => {
  let runtimeMode;
  let mockLogger;
  let mockErrorUtils;
  let mockValidationUtils;
  let mockDebugSystem;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    mockErrorUtils = {
      createError: jest.fn((message) => new Error(message))
    };

    mockValidationUtils = {
      isArray: jest.fn((val) => Array.isArray(val))
    };

    mockDebugSystem = {
      log: jest.fn()
    };

    runtimeMode = new RuntimeModeUtils(
      mockLogger,
      mockErrorUtils,
      mockValidationUtils,
      mockDebugSystem
    );
  });

  describe('Constants', () => {
    test('should export RUNTIME_MODES', () => {
      expect(RUNTIME_MODES).toBeDefined();
      expect(RUNTIME_MODES.NORMAL).toBe('normal');
      expect(RUNTIME_MODES.SAFE).toBe('safe');
      expect(RUNTIME_MODES.READONLY).toBe('readonly');
      expect(RUNTIME_MODES.TEST).toBe('test');
      expect(RUNTIME_MODES.DEBUG).toBe('debug');
    });

    test('should export MODE_FLAGS', () => {
      expect(MODE_FLAGS).toBeDefined();
      expect(MODE_FLAGS.ALLOW_DANGEROUS_COMMANDS).toBe('allow_dangerous_commands');
      expect(MODE_FLAGS.ALLOW_FILE_MODIFICATIONS).toBe('allow_file_modifications');
      expect(MODE_FLAGS.ALLOW_NETWORK_ACCESS).toBe('allow_network_access');
      expect(MODE_FLAGS.ALLOW_SYSTEM_COMMANDS).toBe('allow_system_commands');
      expect(MODE_FLAGS.ENABLE_DEBUGGING).toBe('enable_debugging');
      expect(MODE_FLAGS.ENABLE_LOGGING).toBe('enable_logging');
    });

    test('should export MODE_CONFIGS', () => {
      expect(MODE_CONFIGS).toBeDefined();
      expect(MODE_CONFIGS[RUNTIME_MODES.NORMAL]).toBeDefined();
      expect(MODE_CONFIGS[RUNTIME_MODES.SAFE]).toBeDefined();
      expect(MODE_CONFIGS[RUNTIME_MODES.READONLY]).toBeDefined();
      expect(MODE_CONFIGS[RUNTIME_MODES.TEST]).toBeDefined();
      expect(MODE_CONFIGS[RUNTIME_MODES.DEBUG]).toBeDefined();
    });

    test('should have correct mode configurations', () => {
      expect(MODE_CONFIGS[RUNTIME_MODES.NORMAL].name).toBe('Normal Mode');
      expect(MODE_CONFIGS[RUNTIME_MODES.SAFE].name).toBe('Safe Mode');
      expect(MODE_CONFIGS[RUNTIME_MODES.READONLY].name).toBe('Read-Only Mode');
      expect(MODE_CONFIGS[RUNTIME_MODES.TEST].name).toBe('Test Mode');
      expect(MODE_CONFIGS[RUNTIME_MODES.DEBUG].name).toBe('Debug Mode');
    });
  });

  describe('constructor', () => {
    test('should create instance with default values', () => {
      expect(runtimeMode.logger).toBe(mockLogger);
      expect(runtimeMode.errorUtils).toBe(mockErrorUtils);
      expect(runtimeMode.validationUtils).toBe(mockValidationUtils);
      expect(runtimeMode.debugSystem).toBe(mockDebugSystem);
      expect(runtimeMode.currentMode).toBe(RUNTIME_MODES.NORMAL);
      expect(runtimeMode.activeFlags).toBeInstanceOf(Set);
      expect(runtimeMode.modeHistory).toEqual([]);
    });

    test('should initialize with normal mode flags', () => {
      const normalFlags = MODE_CONFIGS[RUNTIME_MODES.NORMAL].flags;
      expect(runtimeMode.activeFlags.size).toBe(normalFlags.length);
      
      for (const flag of normalFlags) {
        expect(runtimeMode.activeFlags.has(flag)).toBe(true);
      }
    });

    test('should bind methods to instance', () => {
      expect(typeof runtimeMode.listModes).toBe('function');
      expect(typeof runtimeMode.getMode).toBe('function');
      expect(typeof runtimeMode.setMode).toBe('function');
      expect(typeof runtimeMode.setFlags).toBe('function');
      expect(typeof runtimeMode.isReadonly).toBe('function');
      expect(typeof runtimeMode.isReadonlyAllowed).toBe('function');
      expect(typeof runtimeMode.isDangerousCommandsAllowed).toBe('function');
      expect(typeof runtimeMode.isFileModificationAllowed).toBe('function');
      expect(typeof runtimeMode.isNetworkAccessAllowed).toBe('function');
      expect(typeof runtimeMode.isSystemCommandsAllowed).toBe('function');
      expect(typeof runtimeMode.isDebuggingEnabled).toBe('function');
      expect(typeof runtimeMode.isLoggingEnabled).toBe('function');
      expect(typeof runtimeMode.getModeInfo).toBe('function');
      expect(typeof runtimeMode.resetMode).toBe('function');
      expect(typeof runtimeMode.getFsSandboxRoot).toBe('function');
      expect(typeof runtimeMode.isFsReadonly).toBe('function');
    });
  });

  describe('getFsSandboxRoot', () => {
    test('should return process.cwd() for safe mode', () => {
      runtimeMode.currentMode = RUNTIME_MODES.SAFE;
      
      const result = runtimeMode.getFsSandboxRoot();
      
      expect(result).toBe(process.cwd());
    });

    test('should return null for non-safe modes', () => {
      const modes = [RUNTIME_MODES.NORMAL, RUNTIME_MODES.READONLY, RUNTIME_MODES.TEST, RUNTIME_MODES.DEBUG];
      
      for (const mode of modes) {
        runtimeMode.currentMode = mode;
        const result = runtimeMode.getFsSandboxRoot();
        expect(result).toBeNull();
      }
    });
  });

  describe('isFsReadonly', () => {
    test('should return true when file modifications not allowed', () => {
      runtimeMode.activeFlags.delete(MODE_FLAGS.ALLOW_FILE_MODIFICATIONS);
      
      expect(runtimeMode.isFsReadonly()).toBe(true);
    });

    test('should return false when file modifications allowed', () => {
      runtimeMode.activeFlags.add(MODE_FLAGS.ALLOW_FILE_MODIFICATIONS);
      
      expect(runtimeMode.isFsReadonly()).toBe(false);
    });
  });

  describe('listModes', () => {
    test('should return all modes with correct structure', () => {
      const modes = runtimeMode.listModes();
      
      expect(Array.isArray(modes)).toBe(true);
      expect(modes.length).toBe(5); // NORMAL, SAFE, READONLY, TEST, DEBUG
      
      for (const mode of modes) {
        expect(mode).toHaveProperty('key');
        expect(mode).toHaveProperty('name');
        expect(mode).toHaveProperty('description');
        expect(mode).toHaveProperty('flags');
        expect(mode).toHaveProperty('isActive');
        expect(Array.isArray(mode.flags)).toBe(true);
        expect(typeof mode.isActive).toBe('boolean');
      }
    });

    test('should mark current mode as active', () => {
      const modes = runtimeMode.listModes();
      
      const normalMode = modes.find(m => m.key === RUNTIME_MODES.NORMAL);
      expect(normalMode.isActive).toBe(true);
      
      const safeMode = modes.find(m => m.key === RUNTIME_MODES.SAFE);
      expect(safeMode.isActive).toBe(false);
    });

    test('should reflect mode changes', () => {
      runtimeMode.setMode(RUNTIME_MODES.SAFE);
      
      const modes = runtimeMode.listModes();
      
      const normalMode = modes.find(m => m.key === RUNTIME_MODES.NORMAL);
      expect(normalMode.isActive).toBe(false);
      
      const safeMode = modes.find(m => m.key === RUNTIME_MODES.SAFE);
      expect(safeMode.isActive).toBe(true);
    });
  });

  describe('getMode', () => {
    test('should return current mode information', () => {
      const modeInfo = runtimeMode.getMode();
      
      expect(modeInfo).toHaveProperty('mode');
      expect(modeInfo).toHaveProperty('config');
      expect(modeInfo).toHaveProperty('flags');
      expect(modeInfo).toHaveProperty('history');
      
      expect(modeInfo.mode).toBe(RUNTIME_MODES.NORMAL);
      expect(modeInfo.config).toBe(MODE_CONFIGS[RUNTIME_MODES.NORMAL]);
      expect(Array.isArray(modeInfo.flags)).toBe(true);
      expect(Array.isArray(modeInfo.history)).toBe(true);
    });

    test('should return flags as array', () => {
      const modeInfo = runtimeMode.getMode();
      
      expect(Array.isArray(modeInfo.flags)).toBe(true);
      expect(modeInfo.flags.length).toBe(MODE_CONFIGS[RUNTIME_MODES.NORMAL].flags.length);
    });

    test('should limit history to last 10 entries', () => {
      // Add more than 10 mode changes
      for (let i = 0; i < 15; i++) {
        runtimeMode.setMode(RUNTIME_MODES.SAFE);
        runtimeMode.setMode(RUNTIME_MODES.NORMAL);
      }
      
      const modeInfo = runtimeMode.getMode();
      expect(modeInfo.history.length).toBeLessThanOrEqual(10);
    });
  });

  describe('setMode', () => {
    test('should change mode successfully', () => {
      const result = runtimeMode.setMode(RUNTIME_MODES.SAFE);
      
      expect(result.success).toBe(true);
      expect(result.previousMode).toBe(RUNTIME_MODES.NORMAL);
      expect(result.newMode).toBe(RUNTIME_MODES.SAFE);
      expect(runtimeMode.currentMode).toBe(RUNTIME_MODES.SAFE);
      expect(Array.isArray(result.flags)).toBe(true);
    });

    test('should update active flags when mode changes', () => {
      const normalFlags = MODE_CONFIGS[RUNTIME_MODES.NORMAL].flags;
      const safeFlags = MODE_CONFIGS[RUNTIME_MODES.SAFE].flags;
      
      runtimeMode.setMode(RUNTIME_MODES.SAFE);
      
      expect(runtimeMode.activeFlags.size).toBe(safeFlags.length);
      for (const flag of safeFlags) {
        expect(runtimeMode.activeFlags.has(flag)).toBe(true);
      }
    });

    test('should add entry to mode history', () => {
      runtimeMode.setMode(RUNTIME_MODES.SAFE, { reason: 'test' });
      
      expect(runtimeMode.modeHistory.length).toBe(1);
      expect(runtimeMode.modeHistory[0].previousMode).toBe(RUNTIME_MODES.NORMAL);
      expect(runtimeMode.modeHistory[0].newMode).toBe(RUNTIME_MODES.SAFE);
      expect(runtimeMode.modeHistory[0].reason).toBe('test');
      expect(runtimeMode.modeHistory[0].timestamp).toBeDefined();
    });

    test('should use default reason when not provided', () => {
      runtimeMode.setMode(RUNTIME_MODES.SAFE);
      
      expect(runtimeMode.modeHistory[0].reason).toBe('manual_change');
    });

    test('should log mode change', () => {
      runtimeMode.setMode(RUNTIME_MODES.SAFE);
      
      expect(mockDebugSystem.log).toHaveBeenCalledWith(
        'runtime',
        expect.stringContaining('Режим изменен: normal → safe')
      );
    });

    test('should throw error for unknown mode', () => {
      expect(() => {
        runtimeMode.setMode('unknown-mode');
      }).toThrow('Неизвестный режим: unknown-mode');
      
      expect(mockErrorUtils.createError).toHaveBeenCalledWith('Неизвестный режим: unknown-mode');
    });
  });

  describe('setFlags', () => {
    test('should set flags successfully', () => {
      const newFlags = [MODE_FLAGS.ENABLE_LOGGING, MODE_FLAGS.ENABLE_DEBUGGING];
      const result = runtimeMode.setFlags(newFlags);
      
      expect(result.success).toBe(true);
      expect(result.previousFlags).toEqual(MODE_CONFIGS[RUNTIME_MODES.NORMAL].flags);
      expect(result.newFlags).toEqual(newFlags);
      expect(runtimeMode.activeFlags.size).toBe(2);
    });

    test('should validate flags array', () => {
      mockValidationUtils.isArray.mockReturnValue(false);
      
      expect(() => {
        runtimeMode.setFlags('not-an-array');
      }).toThrow('Флаги должны быть массивом');
      
      expect(mockValidationUtils.isArray).toHaveBeenCalledWith('not-an-array');
    });

    test('should validate individual flags', () => {
      const invalidFlags = ['valid_flag', 'invalid_flag'];
      
      expect(() => {
        runtimeMode.setFlags(invalidFlags);
      }).toThrow('Неизвестный флаг: invalid_flag');
    });

    test('should log flag changes', () => {
      const newFlags = [MODE_FLAGS.ENABLE_LOGGING];
      runtimeMode.setFlags(newFlags);
      
      expect(mockDebugSystem.log).toHaveBeenCalledWith(
        'runtime',
        expect.stringContaining('Флаги изменены:')
      );
    });
  });

  describe('isReadonly', () => {
    test('should return true for readonly mode', () => {
      runtimeMode.currentMode = RUNTIME_MODES.READONLY;
      expect(runtimeMode.isReadonly()).toBe(true);
    });

    test('should return false for non-readonly modes', () => {
      const nonReadonlyModes = [RUNTIME_MODES.NORMAL, RUNTIME_MODES.SAFE, RUNTIME_MODES.TEST, RUNTIME_MODES.DEBUG];
      
      for (const mode of nonReadonlyModes) {
        runtimeMode.currentMode = mode;
        expect(runtimeMode.isReadonly()).toBe(false);
      }
    });
  });

  describe('isReadonlyAllowed', () => {
    test('should return true when file modifications not allowed', () => {
      runtimeMode.activeFlags.delete(MODE_FLAGS.ALLOW_FILE_MODIFICATIONS);
      expect(runtimeMode.isReadonlyAllowed()).toBe(true);
    });

    test('should return false when file modifications allowed', () => {
      runtimeMode.activeFlags.add(MODE_FLAGS.ALLOW_FILE_MODIFICATIONS);
      expect(runtimeMode.isReadonlyAllowed()).toBe(false);
    });
  });

  describe('isDangerousCommandsAllowed', () => {
    test('should return true when flag is set', () => {
      runtimeMode.activeFlags.add(MODE_FLAGS.ALLOW_DANGEROUS_COMMANDS);
      expect(runtimeMode.isDangerousCommandsAllowed()).toBe(true);
    });

    test('should return false when flag is not set', () => {
      runtimeMode.activeFlags.delete(MODE_FLAGS.ALLOW_DANGEROUS_COMMANDS);
      expect(runtimeMode.isDangerousCommandsAllowed()).toBe(false);
    });
  });

  describe('isFileModificationAllowed', () => {
    test('should return true when flag is set', () => {
      runtimeMode.activeFlags.add(MODE_FLAGS.ALLOW_FILE_MODIFICATIONS);
      expect(runtimeMode.isFileModificationAllowed()).toBe(true);
    });

    test('should return false when flag is not set', () => {
      runtimeMode.activeFlags.delete(MODE_FLAGS.ALLOW_FILE_MODIFICATIONS);
      expect(runtimeMode.isFileModificationAllowed()).toBe(false);
    });
  });

  describe('isNetworkAccessAllowed', () => {
    test('should return true when flag is set', () => {
      runtimeMode.activeFlags.add(MODE_FLAGS.ALLOW_NETWORK_ACCESS);
      expect(runtimeMode.isNetworkAccessAllowed()).toBe(true);
    });

    test('should return false when flag is not set', () => {
      runtimeMode.activeFlags.delete(MODE_FLAGS.ALLOW_NETWORK_ACCESS);
      expect(runtimeMode.isNetworkAccessAllowed()).toBe(false);
    });
  });

  describe('isSystemCommandsAllowed', () => {
    test('should return true when flag is set', () => {
      runtimeMode.activeFlags.add(MODE_FLAGS.ALLOW_SYSTEM_COMMANDS);
      expect(runtimeMode.isSystemCommandsAllowed()).toBe(true);
    });

    test('should return false when flag is not set', () => {
      runtimeMode.activeFlags.delete(MODE_FLAGS.ALLOW_SYSTEM_COMMANDS);
      expect(runtimeMode.isSystemCommandsAllowed()).toBe(false);
    });
  });

  describe('isDebuggingEnabled', () => {
    test('should return true when flag is set', () => {
      runtimeMode.activeFlags.add(MODE_FLAGS.ENABLE_DEBUGGING);
      expect(runtimeMode.isDebuggingEnabled()).toBe(true);
    });

    test('should return false when flag is not set', () => {
      runtimeMode.activeFlags.delete(MODE_FLAGS.ENABLE_DEBUGGING);
      expect(runtimeMode.isDebuggingEnabled()).toBe(false);
    });
  });

  describe('isLoggingEnabled', () => {
    test('should return true when flag is set', () => {
      runtimeMode.activeFlags.add(MODE_FLAGS.ENABLE_LOGGING);
      expect(runtimeMode.isLoggingEnabled()).toBe(true);
    });

    test('should return false when flag is not set', () => {
      runtimeMode.activeFlags.delete(MODE_FLAGS.ENABLE_LOGGING);
      expect(runtimeMode.isLoggingEnabled()).toBe(false);
    });
  });

  describe('getModeInfo', () => {
    test('should return comprehensive mode information', () => {
      const modeInfo = runtimeMode.getModeInfo();
      
      expect(modeInfo).toHaveProperty('currentMode');
      expect(modeInfo).toHaveProperty('modeConfig');
      expect(modeInfo).toHaveProperty('activeFlags');
      expect(modeInfo).toHaveProperty('readonly');
      expect(modeInfo).toHaveProperty('readonlyAllowed');
      expect(modeInfo).toHaveProperty('dangerousCommandsAllowed');
      expect(modeInfo).toHaveProperty('fileModificationAllowed');
      expect(modeInfo).toHaveProperty('networkAccessAllowed');
      expect(modeInfo).toHaveProperty('systemCommandsAllowed');
      expect(modeInfo).toHaveProperty('debuggingEnabled');
      expect(modeInfo).toHaveProperty('loggingEnabled');
      expect(modeInfo).toHaveProperty('history');
      
      expect(typeof modeInfo.readonly).toBe('boolean');
      expect(typeof modeInfo.readonlyAllowed).toBe('boolean');
      expect(typeof modeInfo.dangerousCommandsAllowed).toBe('boolean');
      expect(typeof modeInfo.fileModificationAllowed).toBe('boolean');
      expect(typeof modeInfo.networkAccessAllowed).toBe('boolean');
      expect(typeof modeInfo.systemCommandsAllowed).toBe('boolean');
      expect(typeof modeInfo.debuggingEnabled).toBe('boolean');
      expect(typeof modeInfo.loggingEnabled).toBe('boolean');
      expect(Array.isArray(modeInfo.history)).toBe(true);
    });

    test('should limit history to last 5 entries', () => {
      // Add more than 5 mode changes
      for (let i = 0; i < 10; i++) {
        runtimeMode.setMode(RUNTIME_MODES.SAFE);
        runtimeMode.setMode(RUNTIME_MODES.NORMAL);
      }
      
      const modeInfo = runtimeMode.getModeInfo();
      expect(modeInfo.history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('resetMode', () => {
    test('should reset to normal mode', () => {
      runtimeMode.setMode(RUNTIME_MODES.SAFE);
      expect(runtimeMode.currentMode).toBe(RUNTIME_MODES.SAFE);
      
      const result = runtimeMode.resetMode();
      
      expect(result.success).toBe(true);
      expect(result.previousMode).toBe(RUNTIME_MODES.SAFE);
      expect(result.newMode).toBe(RUNTIME_MODES.NORMAL);
      expect(runtimeMode.currentMode).toBe(RUNTIME_MODES.NORMAL);
    });

    test('should add reset entry to history', () => {
      runtimeMode.resetMode();
      
      expect(runtimeMode.modeHistory.length).toBe(1);
      expect(runtimeMode.modeHistory[0].reason).toBe('reset');
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete mode workflow', () => {
      // Start in normal mode
      expect(runtimeMode.currentMode).toBe(RUNTIME_MODES.NORMAL);
      expect(runtimeMode.isDangerousCommandsAllowed()).toBe(true);
      expect(runtimeMode.isFileModificationAllowed()).toBe(true);
      
      // Switch to safe mode
      runtimeMode.setMode(RUNTIME_MODES.SAFE);
      expect(runtimeMode.currentMode).toBe(RUNTIME_MODES.SAFE);
      expect(runtimeMode.isDangerousCommandsAllowed()).toBe(false);
      expect(runtimeMode.isFileModificationAllowed()).toBe(true);
      expect(runtimeMode.getFsSandboxRoot()).toBe(process.cwd());
      
      // Switch to readonly mode
      runtimeMode.setMode(RUNTIME_MODES.READONLY);
      expect(runtimeMode.currentMode).toBe(RUNTIME_MODES.READONLY);
      expect(runtimeMode.isReadonly()).toBe(true);
      expect(runtimeMode.isFileModificationAllowed()).toBe(false);
      expect(runtimeMode.isReadonlyAllowed()).toBe(true);
      
      // Reset to normal
      runtimeMode.resetMode();
      expect(runtimeMode.currentMode).toBe(RUNTIME_MODES.NORMAL);
      expect(runtimeMode.isReadonly()).toBe(false);
    });

    test('should handle custom flags workflow', () => {
      // Start with normal flags
      const normalFlags = MODE_CONFIGS[RUNTIME_MODES.NORMAL].flags;
      expect(runtimeMode.activeFlags.size).toBe(normalFlags.length);
      
      // Set custom flags
      const customFlags = [MODE_FLAGS.ENABLE_LOGGING, MODE_FLAGS.ENABLE_DEBUGGING];
      runtimeMode.setFlags(customFlags);
      
      expect(runtimeMode.activeFlags.size).toBe(2);
      expect(runtimeMode.isLoggingEnabled()).toBe(true);
      expect(runtimeMode.isDebuggingEnabled()).toBe(true);
      expect(runtimeMode.isDangerousCommandsAllowed()).toBe(false);
      expect(runtimeMode.isFileModificationAllowed()).toBe(false);
    });

    test('should handle mode history correctly', () => {
      const modes = [RUNTIME_MODES.SAFE, RUNTIME_MODES.READONLY, RUNTIME_MODES.TEST, RUNTIME_MODES.DEBUG];
      
      for (const mode of modes) {
        runtimeMode.setMode(mode, { reason: `test_${mode}` });
      }
      
      const modeInfo = runtimeMode.getMode();
      expect(modeInfo.history.length).toBe(4);
      
      for (let i = 0; i < modes.length; i++) {
        expect(modeInfo.history[i].newMode).toBe(modes[i]);
        expect(modeInfo.history[i].reason).toBe(`test_${modes[i]}`);
      }
    });
  });
});
