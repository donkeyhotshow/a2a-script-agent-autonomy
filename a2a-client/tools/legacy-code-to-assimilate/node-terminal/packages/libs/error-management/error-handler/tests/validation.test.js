const {
  validateInput,
  ValidationError
} = require('../index.js'); // Import from the .js file for Node.js environment
const { unifiedConfigManager } = require('@libs/config-unified/index.js');
const { defaultLogger } = require('../../../logging-monitoring/logging/index.js'); // Node.js version of logger

jest.mock('@libs/config-unified/index.js', () => {
  const mockGetConfig = jest.fn();
  return {
    unifiedConfigManager: {
      getFeatureConfig: jest.fn(() => ({
        getConfig: mockGetConfig,
      })),
    },
  };
});

jest.mock('../../../logging-monitoring/logging/index.js', () => ({
  defaultLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('validateInput', () => {
  let logger;

  beforeEach(() => {
    logger = defaultLogger;
    jest.clearAllMocks();
    // Set default feature flag to false for legacy path testing
    unifiedConfigManager.getFeatureConfig().getConfig.mockReturnValue({
      featureFlags: { USE_CORE_VALIDATION: false },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should validate correct input using legacy path', () => {
    const schema = {
      name: { required: true, type: 'string' },
      age: { required: true, type: 'number', min: 0, max: 150 },
    };
    const data = { name: 'John', age: 25 };
    expect(() => validateInput(data, schema, logger)).not.toThrow();
  });

  test('should validate correct input using unified path', () => {
    unifiedConfigManager.getFeatureConfig().getConfig.mockReturnValue({
      featureFlags: { USE_CORE_VALIDATION: true },
    });
    const schema = {
      name: { presence: { allowEmpty: false }, type: 'string' },
      age: { type: 'number', min: 0, max: 150 },
      email: { format: 'email' },
      status: { enum: ['active', 'inactive'] },
      secret: { pattern: /^S[0-9]{3}$/ },
    };
    const data = { name: 'John', age: 25, email: 'john@example.com', status: 'active', secret: 'S123' };
    expect(() => validateInput(data, schema, logger)).not.toThrow();
  });

  test('should throw ValidationError for invalid input (legacy path)', () => {
    const schema = {
      name: { required: true, type: 'string' },
      email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    };
    const data = { name: 'John', email: 'invalid-email' };
    expect(() => validateInput(data, schema, logger)).toThrow(ValidationError);
    expect(() => validateInput(data, schema, logger)).toThrow('Поле email имеет некорректный формат');
    expect(logger.error).toHaveBeenCalled();
  });

  test('should throw ValidationError for invalid input (unified path)', () => {
    // Set feature flag to true for unified path testing
    unifiedConfigManager.getFeatureConfig().getConfig.mockReturnValue({
      featureFlags: { USE_CORE_VALIDATION: true },
    });
    const schema = {
      email: { format: 'email' },
    };
    const data = { email: 'invalid-email' };
    expect(() => validateInput(data, schema, logger)).toThrow(ValidationError);
    expect(() => validateInput(data, schema, logger)).toThrow('email must be a valid email format');
    expect(logger.error).toHaveBeenCalled();
  });

  test('should validate required fields (legacy path)', () => {
    const schema = {
      name: { required: true },
      email: { required: true },
    };
    const data = { name: 'John' }; // missing email
    expect(() => validateInput(data, schema, logger)).toThrow(ValidationError);
    expect(() => validateInput(data, schema, logger)).toThrow('Поле email обязательно');
    expect(logger.error).toHaveBeenCalled();
  });

  test('should validate required fields (unified path)', () => {
    // Set feature flag to true for unified path testing
    unifiedConfigManager.getFeatureConfig().getConfig.mockReturnValue({
      featureFlags: { USE_CORE_VALIDATION: true },
    });
    const schema = {
      name: { presence: { allowEmpty: false } },
      email: { presence: { allowEmpty: false } },
    };
    const data = { name: 'John' }; // missing email
    expect(() => validateInput(data, schema, logger)).toThrow(ValidationError);
    expect(() => validateInput(data, schema, logger)).toThrow('email is required');
    expect(logger.error).toHaveBeenCalled();
  });

  test('should validate field types (legacy path)', () => {
    const schema = {
      age: { type: 'number' },
      active: { type: 'boolean' },
    };
    const data = { age: '25', active: 'true' }; // wrong types
    expect(() => validateInput(data, schema, logger)).toThrow(ValidationError);
    expect(() => validateInput(data, schema, logger)).toThrow('Поле age должно быть типа number');
    expect(logger.error).toHaveBeenCalled();
  });

  test('should validate field types (unified path)', () => {
    // Set feature flag to true for unified path testing
    unifiedConfigManager.getFeatureConfig().getConfig.mockReturnValue({
      featureFlags: { USE_CORE_VALIDATION: true },
    });
    const schema = {
      age: { type: 'number' },
    };
    const data = { age: '25' }; // wrong type
    expect(() => validateInput(data, schema, logger)).toThrow(ValidationError);
    expect(() => validateInput(data, schema, logger)).toThrow('Type mismatch: expected number, got string');
    expect(logger.error).toHaveBeenCalled();
  });

  test('should validate string length (legacy path)', () => {
    const schema = {
      password: { minLength: 8, maxLength: 20 },
    };
    expect(() => validateInput({ password: 'short' }, schema, logger)).toThrow(ValidationError);
    expect(() => validateInput({ password: 'short' }, schema, logger)).toThrow('Поле password должно содержать минимум 8 символов');
    expect(logger.error).toHaveBeenCalled();

    expect(() => validateInput({ password: 'very-long-password-that-exceeds-limit' }, schema, logger)).toThrow(ValidationError);
    expect(() => validateInput({ password: 'very-long-password-that-exceeds-limit' }, schema, logger)).toThrow('Поле password должно содержать максимум 20 символов');
    expect(logger.error).toHaveBeenCalled();
  });

  test('should validate string length (unified path)', () => {
    // Set feature flag to true for unified path testing
    unifiedConfigManager.getFeatureConfig().getConfig.mockReturnValue({
      featureFlags: { USE_CORE_VALIDATION: true },
    });
    const schema = {
      password: { min: 8, max: 20 },
    };
    expect(() => validateInput({ password: 'short' }, schema, logger)).toThrow(ValidationError);
    expect(() => validateInput({ password: 'short' }, schema, logger)).toThrow('password must be at least 8 characters');
    expect(logger.error).toHaveBeenCalled();

    expect(() => validateInput({ password: 'very-long-password-that-exceeds-limit' }, schema, logger)).toThrow(ValidationError);
    expect(() => validateInput({ password: 'very-long-password-that-exceeds-limit' }, schema, logger)).toThrow('password must be at most 20 characters');
    expect(logger.error).toHaveBeenCalled();
  });

  test('should validate enum values (legacy path)', () => {
    const schema = {
      status: { enum: ['active', 'inactive', 'pending'] },
    };
    expect(() => validateInput({ status: 'active' }, schema, logger)).not.toThrow();
    expect(() => validateInput({ status: 'unknown' }, schema, logger)).toThrow(ValidationError);
    expect(() => validateInput( { status: 'unknown' }, schema, logger)).toThrow('Поле status должно быть одним из: active, inactive, pending');
    expect(logger.error).toHaveBeenCalled();
  });

  test('should validate enum values (unified path)', () => {
    // Set feature flag to true for unified path testing
    unifiedConfigManager.getFeatureConfig().getConfig.mockReturnValue({
      featureFlags: { USE_CORE_VALIDATION: true },
    });
    const schema = {
      status: { enum: ['active', 'inactive', 'pending'] },
    };
    expect(() => validateInput({ status: 'active' }, schema, logger)).not.toThrow();
    expect(() => validateInput({ status: 'unknown' }, schema, logger)).toThrow(ValidationError);
    expect(() => validateInput({ status: 'unknown' }, schema, logger)).toThrow('status must be one of active, inactive, pending');
    expect(logger.error).toHaveBeenCalled();
  });

  test('should validate pattern (unified path)', () => {
    // Set feature flag to true for unified path testing
    unifiedConfigManager.getFeatureConfig().getConfig.mockReturnValue({
      featureFlags: { USE_CORE_VALIDATION: true },
    });
    const schema = {
      secret: { pattern: /^S[0-9]{3}$/ },
    };
    expect(() => validateInput({ secret: 'S123' }, schema, logger)).not.toThrow();
    expect(() => validateInput({ secret: 'invalid' }, schema, logger)).toThrow(ValidationError);
    expect(() => validateInput({ secret: 'invalid' }, schema, logger)).toThrow('secret has an invalid format');
    expect(logger.error).toHaveBeenCalled();
  });

  test('should skip validation for undefined values (legacy path)', () => {
    const schema = {
      optional: { type: 'string' },
    };
    const data = {}; // optional field is undefined
    expect(() => validateInput(data, schema, logger)).not.toThrow();
  });

  test('should skip validation for undefined values (unified path)', () => {
    // Set feature flag to true for unified path testing
    unifiedConfigManager.getFeatureConfig().getConfig.mockReturnValue({
      featureFlags: { USE_CORE_VALIDATION: true },
    });
    const schema = {
      optional: { type: 'string' },
    };
    const data = {}; // optional field is undefined
    expect(() => validateInput(data, schema, logger)).not.toThrow();
  });

  test('should log validation errors (legacy path)', () => {
    const schema = { name: { required: true } };
    const data = {};
    try {
      validateInput(data, schema, logger);
    } catch (e) {
      expect(logger.error).toHaveBeenCalledWith('Поле name обязательно', expect.arrayContaining([
        expect.objectContaining({
          message: 'Поле name обязательно',
          field: 'name',
        }),
      ]));
    }
  });

  test('should log validation errors (unified path)', () => {
    // Set feature flag to true for unified path testing
    unifiedConfigManager.getFeatureConfig().getConfig.mockReturnValue({
      featureFlags: { USE_CORE_VALIDATION: true },
    });
    const schema = { name: { presence: { allowEmpty: false } } };
    const data = {};
    try {
      validateInput(data, schema, logger);
    } catch (e) {
      expect(logger.error).toHaveBeenCalledWith('Ошибки валидации (Unified)', expect.arrayContaining([
        expect.objectContaining({
          message: 'name is required',
          field: 'name',
        }),
      ]));
    }
  });

  test('should handle validation of nested objects (legacy path)', () => {
    const schema = {
      user: {
        type: 'object',
        schema: {
          id: { type: 'number', required: true },
          profile: {
            type: 'object',
            schema: {
              username: { type: 'string', required: true },
            },
          },
        },
      },
    };

    const data = {
      user: {
        id: 123,
        profile: {
          username: 'testuser',
        },
      },
    };

    expect(() => validateInput(data, schema, logger)).not.toThrow();

    const invalidData = {
      user: {
        id: 123,
        profile: {},
      },
    };

    expect(() => validateInput(invalidData, schema, logger)).toThrow(ValidationError);
    expect(() => validateInput(invalidData, schema, logger)).toThrow('Поле user.profile.username обязательно');
    expect(logger.error).toHaveBeenCalled();
  });

  test('should handle validation of nested objects (unified path)', () => {
    // Set feature flag to true for unified path testing
    unifiedConfigManager.getFeatureConfig().getConfig.mockReturnValue({
      featureFlags: { USE_CORE_VALIDATION: true },
    });
    const schema = {
      user: {
        type: 'object',
        properties: {
          id: { type: 'number', presence: { allowEmpty: false } },
          profile: {
            type: 'object',
            properties: {
              username: { type: 'string', presence: { allowEmpty: false } },
            },
          },
        },
      },
    };

    const data = {
      user: {
        id: 123,
        profile: {
          username: 'testuser',
        },
      },
    };

    expect(() => validateInput(data, schema, logger)).not.toThrow();

    const invalidData = {
      user: {
        id: 123,
        profile: {},
      },
    };

    expect(() => validateInput(invalidData, schema, logger)).toThrow(ValidationError);
    expect(() => validateInput(invalidData, schema, logger)).toThrow('username is required');
    expect(logger.error).toHaveBeenCalled();
  });
});
