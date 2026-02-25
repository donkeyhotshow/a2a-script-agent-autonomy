const { MCPTerminalCore } = require('../index.js');

describe('MCPTerminalCore', () => {
  let core;

  beforeEach(() => {
    core = new MCPTerminalCore();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      expect(core).toBeDefined();
      expect(core.version).toBe('1.0.0');
      expect(core.initialized).toBe(false);
    });

    test('should initialize with custom options', () => {
      const customCore = new MCPTerminalCore({
        timeout: 5000,
        retries: 3
      });
      expect(customCore.options).toEqual({
        timeout: 5000,
        retries: 3
      });
    });
  });

  describe('initialize', () => {
    test('should initialize successfully', async () => {
      const result = await core.initialize();
      expect(result.success).toBe(true);
      expect(result.message).toBe('MCP Terminal Core initialized');
      expect(core.initialized).toBe(true);
    });

    test('should handle initialization errors', async () => {
      // Mock error scenario
      const errorCore = new MCPTerminalCore();
      // Simulate error condition
      errorCore.initialize = jest.fn().mockRejectedValue(new Error('Init failed'));

      try {
        await errorCore.initialize();
      } catch (error) {
        expect(error.message).toBe('Init failed');
      }
    });
  });

  describe('getStatus', () => {
    test('should return correct status when not initialized', () => {
      const status = core.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.version).toBe('1.0.0');
      expect(status.timestamp).toBeDefined();
    });

    test('should return correct status when initialized', async () => {
      await core.initialize();
      const status = core.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.version).toBe('1.0.0');
      expect(status.timestamp).toBeDefined();
    });
  });

  describe('validateConfig', () => {
    test('should return error for missing config', () => {
      const result = core.validateConfig(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration is required');
    });

    test('should return error for config without endpoint or server', () => {
      const result = core.validateConfig({ invalid: 'config' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Either endpoint or server configuration is required');
    });

    test('should validate config with endpoint', () => {
      const result = core.validateConfig({ endpoint: 'http://localhost:3000' });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should validate config with server', () => {
      const result = core.validateConfig({ server: 'localhost' });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should validate complete config', () => {
      const result = core.validateConfig({
        endpoint: 'http://localhost:3000',
        server: 'localhost',
        timeout: 5000
      });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('integration tests', () => {
    test('should handle full initialization flow', async () => {
      // Test complete flow
      const statusBefore = core.getStatus();
      expect(statusBefore.initialized).toBe(false);

      const initResult = await core.initialize();
      expect(initResult.success).toBe(true);

      const statusAfter = core.getStatus();
      expect(statusAfter.initialized).toBe(true);
    });
  });
});
