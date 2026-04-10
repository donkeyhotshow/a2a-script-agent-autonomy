/**
 * Central Test Configuration
 * 
 * Provides unified configuration for different test modes:
 * - mocked: Fast unit tests with all mocks
 * - recording: Record real responses for replay
 * - replay: Replay recorded responses
 * - real: Full integration tests without mocks
 */

export interface TestConfig {
  // Test mode
  mode: 'mocked' | 'real' | 'hybrid';
  
  // Mock settings
  mocks: {
    llm: 'preset' | 'replay' | 'real';
    http: 'mock' | 'record' | 'real';
    database: 'mock' | 'real';
    filesystem: 'mock' | 'real';
  };
  
  // Test options
  options: {
    skipAuth: boolean;
    recordHttp: boolean;
    updateSnapshots: boolean;
    replayDir?: string;
  };
}

// Predefined test configurations
export const testConfigs: Record<string, TestConfig> = {
  // Fast unit tests with all mocks
  mocked: {
    mode: 'mocked',
    mocks: { 
      llm: 'preset', 
      http: 'mock', 
      database: 'mock', 
      filesystem: 'mock' 
    },
    options: { 
      skipAuth: true, 
      recordHttp: false, 
      updateSnapshots: false 
    }
  },
  
  // Record/Replay - record real responses
  recording: {
    mode: 'hybrid',
    mocks: { 
      llm: 'replay', 
      http: 'record', 
      database: 'real', 
      filesystem: 'real' 
    },
    options: { 
      skipAuth: true, 
      recordHttp: true, 
      updateSnapshots: false 
    }
  },
  
  // Replay - replay recorded responses
  replay: {
    mode: 'hybrid',
    mocks: { 
      llm: 'replay', 
      http: 'replay', 
      database: 'real', 
      filesystem: 'real' 
    },
    options: { 
      skipAuth: true, 
      recordHttp: false, 
      updateSnapshots: false 
    }
  },
  
  // Full integration without mocks
  real: {
    mode: 'real',
    mocks: { 
      llm: 'real', 
      http: 'real', 
      database: 'real', 
      filesystem: 'real' 
    },
    options: { 
      skipAuth: false, 
      recordHttp: false, 
      updateSnapshots: false 
    }
  }
};

/**
 * Get test configuration from environment variable
 * Defaults to 'mocked' if TEST_MODE is not set or invalid
 */
export function getTestConfig(): TestConfig {
  const mode = process.env.TEST_MODE || 'mocked';
  const config = testConfigs[mode];
  
  if (!config) {
    console.warn(`Unknown TEST_MODE: ${mode}, using 'mocked'`);
    return testConfigs.mocked;
  }
  
  return config;
}

/**
 * Get test mode from environment variable
 */
export function getTestMode(): string {
  return process.env.TEST_MODE || 'mocked';
}

/**
 * Check if current mode uses mocks
 */
export function usesMocks(): boolean {
  const config = getTestConfig();
  return config.mode === 'mocked' || config.mode === 'hybrid';
}

/**
 * Check if current mode uses real database
 */
export function usesRealDatabase(): boolean {
  const config = getTestConfig();
  return config.mocks.database === 'real';
}

/**
 * Check if current mode uses real LLM
 */
export function usesRealLLM(): boolean {
  const config = getTestConfig();
  return config.mocks.llm === 'real';
}

/**
 * Check if HTTP recording is enabled
 */
export function isHttpRecordingEnabled(): boolean {
  const config = getTestConfig();
  return config.options.recordHttp;
}
