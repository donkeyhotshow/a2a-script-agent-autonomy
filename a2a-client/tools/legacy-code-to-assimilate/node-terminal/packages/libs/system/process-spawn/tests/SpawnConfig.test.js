const { SpawnConfig } = require('../SpawnConfig');
const { RESOURCE_LIMITS, SPAWN_TYPES } = require('../types/SpawnTypes');
const { consoleUtils } = require('@libs/logging-monitoring/logging/console-utils');

describe('SpawnConfig', () => {
  let validator;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    validator = new SpawnConfig();
    consoleWarnSpy = jest.spyOn(consoleUtils, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(consoleUtils, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    test('should initialize with empty errors and warnings arrays', () => {
      expect(validator.errors).toEqual([]);
      expect(validator.warnings).toEqual([]);
    });
  });

  describe('validateRequiredFields', () => {
    test('should add error if config is not provided', () => {
      validator.validateRequiredFields(undefined);
      expect(validator.getErrors()).toContain('Конфигурация не предоставлена');
    });

    test('should add error if command is missing', () => {
      validator.validateRequiredFields({ daemonId: 'test' });
      expect(validator.getErrors()).toContain('Поле "command" обязательно');
    });

    test('should add error if daemonId is missing', () => {
      validator.validateRequiredFields({ command: 'test' });
      expect(validator.getErrors()).toContain('Поле "daemonId" обязательно');
    });
  });

  describe('validateDataTypes', () => {
    test('should add error for invalid command type', () => {
      validator.validateDataTypes({ command: 123, daemonId: 'test' });
      expect(validator.getErrors()).toContain('Поле "command" должно быть строкой');
    });

    test('should add error for invalid args type', () => {
      validator.validateDataTypes({ args: 'string' });
      expect(validator.getErrors()).toContain('Поле "args" должно быть массивом');
    });

    test('should add error for invalid cwd type', () => {
      validator.validateDataTypes({ cwd: 123 });
      expect(validator.getErrors()).toContain('Поле "cwd" должно быть строкой');
    });

    test('should add error for invalid env type', () => {
      validator.validateDataTypes({ env: 'string' });
      expect(validator.getErrors()).toContain('Поле "env" должно быть объектом');
    });

    test('should add error for invalid type type', () => {
      validator.validateDataTypes({ type: 123 });
      expect(validator.getErrors()).toContain(`Поле "type" должно быть одним из: ${Object.values(SPAWN_TYPES).join(', ')}`);
    });

    test('should add error for invalid options type', () => {
      validator.validateDataTypes({ options: 'string' });
      expect(validator.getErrors()).toContain('Поле "options" должно быть объектом');
    });

    test('should add error for invalid limits type', () => {
      validator.validateDataTypes({ limits: 'string' });
      expect(validator.getErrors()).toContain('Поле "limits" должно быть объектом');
    });
  });

  describe('validateValues', () => {
    test('should add error if command is empty string', () => {
      validator.validateValues({ command: ' ', daemonId: 'test' });
      expect(validator.getErrors()).toContain('Команда не может быть пустой');
    });

    test('should add error if cwd is empty string', () => {
      validator.validateValues({ command: 'test', daemonId: 'test', cwd: ' ' });
      expect(validator.getErrors()).toContain('Рабочая директория не может быть пустой');
    });

    test('should add error for unknown spawn type', () => {
      validator.validateValues({ command: 'test', daemonId: 'test', type: 'UNKNOWN' });
      expect(validator.getErrors()).toContain('Неизвестный тип запуска: UNKNOWN');
    });

    test('should call validateResourceLimits if limits are present', () => {
      const spy = jest.spyOn(validator, 'validateResourceLimits').mockImplementation(() => {});
      validator.validateValues({ command: 'test', daemonId: 'test', limits: {} });
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });

    test('should call validateOptions if options are present', () => {
      const spy = jest.spyOn(validator, 'validateOptions').mockImplementation(() => {});
      validator.validateValues({ command: 'test', daemonId: 'test', options: {} });
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
  });

  describe('validateResourceLimits', () => {
    test('should add error for invalid cpuPercent type', () => {
      validator.validateResourceLimits({ cpuPercent: '50' });
      expect(validator.getErrors()).toContain('cpuPercent должен быть числом');
    });

    test('should add error for cpuPercent out of range', () => {
      validator.validateResourceLimits({ cpuPercent: 0 });
      expect(validator.getErrors()).toContain('cpuPercent должен быть от 1 до 100');
      validator.validateResourceLimits({ cpuPercent: 101 });
      expect(validator.getErrors()).toContain('cpuPercent должен быть от 1 до 100');
    });

    test('should add error for invalid memoryMB type', () => {
      validator.validateResourceLimits({ memoryMB: '1024' });
      expect(validator.getErrors()).toContain('memoryMB должен быть числом');
    });

    test('should add error for memoryMB less than 1', () => {
      validator.validateResourceLimits({ memoryMB: 0 });
      expect(validator.getErrors()).toContain('memoryMB должен быть больше 0');
    });

    test('should add error for invalid timeoutMs type', () => {
      validator.validateResourceLimits({ timeoutMs: '10000' });
      expect(validator.getErrors()).toContain('timeoutMs должен быть числом');
    });

    test('should add error for timeoutMs less than 1000', () => {
      validator.validateResourceLimits({ timeoutMs: 500 });
      expect(validator.getErrors()).toContain('timeoutMs должен быть не менее 1000 мс');
    });
  });

  describe('validateOptions', () => {
    test('should add error for invalid autoKill type', () => {
      validator.validateOptions({ autoKill: 'true' });
      expect(validator.getErrors()).toContain('autoKill должен быть boolean');
    });

    test('should add error for invalid monitorResources type', () => {
      validator.validateOptions({ monitorResources: 'true' });
      expect(validator.getErrors()).toContain('monitorResources должен быть boolean');
    });

    test('should add error for invalid logOutput type', () => {
      validator.validateOptions({ logOutput: 'true' });
      expect(validator.getErrors()).toContain('logOutput должен быть boolean');
    });

    test('should add error for invalid timeout type', () => {
      validator.validateOptions({ timeout: '10000' });
      expect(validator.getErrors()).toContain('timeout должен быть числом');
    });

    test('should add error for timeout less than 1000', () => {
      validator.validateOptions({ timeout: 500 });
      expect(validator.getErrors()).toContain('timeout должен быть не менее 1000 мс');
    });

    test('should add error for invalid gracefulTimeout type', () => {
      validator.validateOptions({ gracefulTimeout: '10000' });
      expect(validator.getErrors()).toContain('gracefulTimeout должен быть числом');
    });

    test('should add error for gracefulTimeout less than 1000', () => {
      validator.validateOptions({ gracefulTimeout: 500 });
      expect(validator.getErrors()).toContain('gracefulTimeout должен быть не менее 1000 мс');
    });
  });

  describe('setDefaults', () => {
    test('should set default values for missing fields', () => {
      const config = { command: 'test', daemonId: 'test-id' };
      const defaultedConfig = validator.setDefaults(config);
      expect(defaultedConfig.args).toEqual([]);
      expect(defaultedConfig.cwd).toBe(process.cwd());
      expect(defaultedConfig.env).toEqual({});
      expect(defaultedConfig.type).toBe(SPAWN_TYPES.SPAWN);
      expect(defaultedConfig.options.autoKill).toBe(true);
      expect(defaultedConfig.options.monitorResources).toBe(true);
      expect(defaultedConfig.options.logOutput).toBe(true);
      expect(defaultedConfig.options.timeout).toBe(RESOURCE_LIMITS.TIMEOUT_MS);
      expect(defaultedConfig.options.gracefulTimeout).toBe(RESOURCE_LIMITS.GRACEFUL_TIMEOUT_MS);
      expect(defaultedConfig.limits.cpuPercent).toBe(RESOURCE_LIMITS.CPU_PERCENT);
      expect(defaultedConfig.limits.memoryMB).toBe(RESOURCE_LIMITS.MEMORY_MB);
      expect(defaultedConfig.limits.timeoutMs).toBe(RESOURCE_LIMITS.TIMEOUT_MS);
    });

    test('should override default values with provided ones', () => {
      const config = {
        command: 'test',
        daemonId: 'test-id',
        args: ['--version'],
        cwd: '/tmp',
        env: { PATH: '/bin' },
        type: SPAWN_TYPES.EXEC,
        options: { autoKill: false, timeout: 5000 },
        limits: { cpuPercent: 90, memoryMB: 2048, timeoutMs: 30000 },
      };
      const defaultedConfig = validator.setDefaults(config);
      expect(defaultedConfig.args).toEqual(['--version']);
      expect(defaultedConfig.cwd).toBe('/tmp');
      expect(defaultedConfig.env).toEqual({ PATH: '/bin' });
      expect(defaultedConfig.type).toBe(SPAWN_TYPES.EXEC);
      expect(defaultedConfig.options.autoKill).toBe(false);
      expect(defaultedConfig.options.timeout).toBe(5000);
      expect(defaultedConfig.limits.cpuPercent).toBe(90);
      expect(defaultedConfig.limits.memoryMB).toBe(2048);
      expect(defaultedConfig.limits.timeoutMs).toBe(30000);
    });
  });

  describe('static createSpawnConfig', () => {
    test('should create a valid spawn config', () => {
      const config = SpawnConfig.createSpawnConfig('ls', { daemonId: 'test' });
      expect(config.command).toBe('ls');
      expect(config.daemonId).toBe('test');
      expect(config.type).toBe(SPAWN_TYPES.SPAWN);
      expect(config.options.autoKill).toBe(true);
    });

    test('should throw error for invalid command', () => {
      expect(() => SpawnConfig.createSpawnConfig(null, { daemonId: 'test' })).toThrow();
    });
  });

  describe('static createExecConfig', () => {
    test('should create a valid exec config', () => {
      const config = SpawnConfig.createExecConfig('echo hello', { daemonId: 'test' });
      expect(config.command).toBe('echo hello');
      expect(config.daemonId).toBe('test');
      expect(config.type).toBe(SPAWN_TYPES.EXEC);
    });
  });

  describe('static createExecFileConfig', () => {
    test('should create a valid execFile config', () => {
      const config = SpawnConfig.createExecFileConfig('node', ['script.js'], { daemonId: 'test' });
      expect(config.command).toBe('node');
      expect(config.args).toEqual(['script.js']);
      expect(config.daemonId).toBe('test');
      expect(config.type).toBe(SPAWN_TYPES.EXEC_FILE);
    });
  });

  describe('getErrors, getWarnings, hasErrors, hasWarnings', () => {
    test('should correctly report errors and warnings', () => {
      validator.errors.push('Error 1');
      validator.warnings.push('Warning 1');

      expect(validator.getErrors()).toEqual(['Error 1']);
      expect(validator.hasErrors()).toBe(true);
      expect(validator.getWarnings()).toEqual(['Warning 1']);
      expect(validator.hasWarnings()).toBe(true);
    });

    test('should return empty arrays and false if no errors/warnings', () => {
      expect(validator.getErrors()).toEqual([]);
      expect(validator.hasErrors()).toBe(false);
      expect(validator.getWarnings()).toEqual([]);
      expect(validator.hasWarnings()).toBe(false);
    });
  });
});
