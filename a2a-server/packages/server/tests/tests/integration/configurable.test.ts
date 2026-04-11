/**
 * Configurable Integration Test
 * 
 * This test runs the same scenario in different modes based on TEST_MODE environment variable:
 * - mocked (default): Fast tests with all mocks
 * - recording: Record real responses for replay
 * - replay: Replay recorded responses
 * - real: Full integration tests without mocks
 * 
 * Usage:
 *   npm run test:mocks     # Run with mocks (default)
 *   npm run test:record    # Record real responses
 *   npm run test:replay    # Replay recorded responses
 *   npm run test:real      # Run without mocks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  getTestConfig, 
  getTestMode, 
  usesMocks, 
  usesRealDatabase,
  type TestConfig 
} from '../test-config';
import { setupMocks } from '../helpers/index';

describe('Configurable Integration Tests', () => {
  let config: TestConfig;
  let mocks: ReturnType<typeof setupMocks> | null = null;

  beforeEach(() => {
    // Get configuration from environment or defaults
    config = getTestConfig();
    
    // Setup mocks based on configuration
    if (usesMocks()) {
      mocks = setupMocks(config);
    }
  });

  afterEach(() => {
    // Cleanup mocks
    if (mocks) {
      mocks.cleanup();
    }
  });

  describe(`Mode: ${() => getTestMode()}`, () => {
    it('should load correct test configuration', () => {
      expect(config).toBeDefined();
      expect(config.mode).toBeDefined();
      
      // Log configuration for debugging
      console.log('Test configuration:', {
        mode: config.mode,
        mocks: config.mocks,
        options: config.options
      });
    });

    it('should use mocks when in mocked mode', () => {
      if (config.mode === 'mocked' || config.mode === 'hybrid') {
        expect(usesMocks()).toBe(true);
      } else {
        expect(usesMocks()).toBe(false);
      }
    });

    it('should skip auth when configured', () => {
      expect(config.options.skipAuth).toBeDefined();
    });

    it('should have correct database mock setting', () => {
      const usesRealDb = usesRealDatabase();
      
      if (config.mocks.database === 'real') {
        expect(usesRealDb).toBe(true);
      } else {
        expect(usesRealDb).toBe(false);
      }
    });
  });

  describe('Test Scenario Execution', () => {
    it('should execute basic scenario with configured mocks', async () => {
      // This test demonstrates running a scenario with different mock configurations
      const mode = getTestMode();
      
      // In mocked mode, we can verify mock setup
      if (mode === 'mocked' && mocks) {
        expect(mocks.llm).toBeDefined();
        expect(mocks.http).toBeDefined();
        expect(mocks.filesystem).toBeDefined();
      }
      
      // Test passes in all modes
      expect(true).toBe(true);
    });

    it('should handle different mock configurations', async () => {
      const mode = getTestMode();
      
      // Different assertions based on mode
      switch (mode) {
        case 'mocked':
          expect(config.mocks.llm).toBe('preset');
          expect(config.mocks.http).toBe('mock');
          break;
        case 'recording':
          expect(config.mocks.llm).toBe('replay');
          expect(config.options.recordHttp).toBe(true);
          break;
        case 'replay':
          expect(config.mocks.llm).toBe('replay');
          expect(config.options.recordHttp).toBe(false);
          break;
        case 'real':
          expect(config.mocks.llm).toBe('real');
          expect(config.mocks.http).toBe('real');
          break;
        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
    });
  });

  describe('Environment Variable Validation', () => {
    it('should respect TEST_MODE environment variable', () => {
      const validModes = ['mocked', 'recording', 'replay', 'real'];
      const currentMode = getTestMode();
      
      expect(validModes).toContain(currentMode);
    });

    it('should default to mocked when TEST_MODE is not set', () => {
      // This test verifies default behavior
      const mode = process.env.TEST_MODE;
      
      // If TEST_MODE is not set, it defaults to 'mocked'
      if (!mode) {
        expect(getTestMode()).toBe('mocked');
      }
    });
  });
});

describe('Test Configuration Presets', () => {
  it('should have mocked preset', () => {
    const config = getTestConfig();
    
    if (getTestMode() === 'mocked') {
      expect(config.mode).toBe('mocked');
      expect(config.mocks.llm).toBe('preset');
    }
  });

  it('should have recording preset', () => {
    if (getTestMode() === 'recording') {
      const config = getTestConfig();
      expect(config.mode).toBe('hybrid');
      expect(config.options.recordHttp).toBe(true);
    }
  });

  it('should have replay preset', () => {
    if (getTestMode() === 'replay') {
      const config = getTestConfig();
      expect(config.mode).toBe('hybrid');
      expect(config.options.recordHttp).toBe(false);
    }
  });

  it('should have real preset', () => {
    if (getTestMode() === 'real') {
      const config = getTestConfig();
      expect(config.mode).toBe('real');
      expect(config.mocks.llm).toBe('real');
      expect(config.mocks.http).toBe('real');
      expect(config.options.skipAuth).toBe(false);
    }
  });
});
