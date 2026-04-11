/**
 * Test Helpers
 */

import { getTestConfig, type TestConfig } from '../test-config';
import { setupLLMMock, clearLLMResponses } from '../mocks/llm/index';
import { setupMockFetch, getMockFetch } from '../mocks/http/index';
import { setupMockFs, getMockFs } from '../mocks/filesystem/index';

export { MockA2AServer, createMockServer, commonMockResponses } from './mock-server';
export type { MockServerConfig, MockResponse, RequestRecord } from './mock-server';

export { MockA2AClient, createMockClient, commonScenarios, setupMockClient } from './mock-client';
export type { 
    MockClientConfig, 
    ClientRequest, 
    ResponseScenario,
    InvokeParams,
    InvokeResponse,
    TaskStatusResponse,
    SubscribeResponse 
} from './mock-client';

// Re-export test config
export { testConfigs, getTestConfig } from '../test-config';
export type { TestConfig } from '../test-config';

/**
 * Setup all mocks based on test configuration
 * 
 * @param config - Test configuration (defaults to environment TEST_MODE)
 * @returns Object with cleanup functions
 */
export function setupMocks(config?: TestConfig): {
  llm: ReturnType<typeof setupLLMMock> | null;
  http: ReturnType<typeof setupMockFetch> | null;
  filesystem: ReturnType<typeof setupMockFs> | null;
  cleanup: () => void;
} {
  const testConfig = config || getTestConfig();
  
  const result = {
    llm: null as ReturnType<typeof setupLLMMock> | null,
    http: null as ReturnType<typeof setupMockFetch> | null,
    filesystem: null as ReturnType<typeof setupMockFs> | null,
    cleanup: () => {}
  };

  // Setup LLM mock if not real
  if (testConfig.mocks.llm !== 'real') {
    const llmMode = testConfig.mocks.llm; // 'preset' | 'replay'
    
    result.llm = setupLLMMock({
      verbose: false,
      mode: llmMode,
      replayDir: testConfig.options.replayDir
    });
  }

  // Setup HTTP mock if not real
  if (testConfig.mocks.http !== 'real') {
    const httpMode = testConfig.mocks.http; // 'mock' | 'record'
    
    result.http = setupMockFetch({
      verbose: false,
      mode: httpMode,
      recordDir: httpMode === 'record' ? './tests/fixtures/http' : undefined
    });
  }

  // Setup filesystem mock if not real
  if (testConfig.mocks.filesystem !== 'real') {
    result.filesystem = setupMockFs();
  }

  // Create combined cleanup function
  const cleanupFns: Array<() => void> = [];
  
  if (result.llm) {
    cleanupFns.push(() => clearLLMResponses());
  }
  
  result.cleanup = () => {
    cleanupFns.forEach(fn => fn());
  };

  return result;
}

/**
 * Get the current mock instances
 */
export function getCurrentMocks(): {
  llm: ReturnType<typeof getMockFetch> | null;
  http: ReturnType<typeof getMockFetch> | null;
  filesystem: ReturnType<typeof getMockFs> | null;
} {
  return {
    llm: null, // LLM mock doesn't have a getter like others
    http: getMockFetch(),
    filesystem: getMockFs()
  };
}
