/**
 * A2A Client Mocks
 * 
 * Central export point for all mock utilities for testing a2a-client SDK.
 */

export { MockA2AServer, createMockA2AServer } from './server/mock-a2a-server.js';
export type { MockA2AServerConfig, A2AEndpointHandlers } from './server/mock-a2a-server.js';

export { MockFetch, setupMockFetch, getMockFetch, createMockFetchFn, commonMocks } from './http/mock-fetch.js';
export type { MockFetchResponse, MockFetchOptions, MockFetchConfig } from './http/mock-fetch.js';

export { MockStorage, setupMockStorage, getMockStorage, createStorageMock } from './storage/mock-storage.js';
export type { MockStorageConfig, StorageData } from './storage/mock-storage.js';
