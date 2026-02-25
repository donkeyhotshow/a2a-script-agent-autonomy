const { unifiedConfigManager } = require('@libs/config-unified');
const { UnifiedApiClient: NewRootApiClient } = require('../../network/api-client/index.js');
const { defaultLogger } = require('@libs/logging-monitoring/logging');

/**
 * Unified API Client
 * Централизованный клиент для работы с API
 */

class UnifiedApiClient {
  constructor(config = {}) {
    if (unifiedConfigManager.getFeatureFlag('USE_UNIFIED_NETWORK_CLIENT')) {
      this.rootClient = NewRootApiClient.create({
        baseURL: config.baseURL,
        timeout: config.timeout,
        logger: config.logger || defaultLogger,
        errorHandler: config.errorHandler,
        configManager: config.configManager
      });
      this.request = (method, url, data, options) => this.rootClient.executeRequest(method, url, data, options);
      this.get = (url, options) => this.rootClient.executeRequest('GET', url, null, options);
      this.post = (url, data, options) => this.rootClient.executeRequest('POST', url, data, options);
      this.put = (url, data, options) => this.rootClient.executeRequest('PUT', url, data, options);
      this.delete = (url, options) => this.rootClient.executeRequest('DELETE', url, null, options);
      this.patch = (url, data, options) => this.rootClient.executeRequest('PATCH', url, data, options);
      defaultLogger.info('[app-framework/api/unified-api-client] Using Root Unified API Client via feature flag.');
      return;
    }

    this.baseURL = config.baseURL || 'http://localhost:3000';
    this.timeout = config.timeout || 10000;
    this.logger = config.logger || defaultLogger;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };
    defaultLogger.warn('[app-framework/api/unified-api-client] Using deprecated UnifiedApiClient. Please migrate to network/api-client/index.js');
  }

  async request(method, url, data = null, options = {}) {
    const config = {
      method,
      url: `${this.baseURL}${url}`,
      headers: { ...this.headers, ...options.headers },
      timeout: this.timeout,
      ...options
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(config.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return { data: result };
    } catch (error) {
      this.logger.error('API Request failed:', error);
      throw error;
    }
  }

  async get(url, options = {}) {
    return this.request('GET', url, null, options);
  }

  async post(url, data, options = {}) {
    return this.request('POST', url, data, options);
  }

  async put(url, data, options = {}) {
    return this.request('PUT', url, data, options);
  }

  async delete(url, options = {}) {
    return this.request('DELETE', url, null, options);
  }

  async patch(url, data, options = {}) {
    return this.request('PATCH', url, data, options);
  }
}

function createApiClient(config = {}) {
  if (unifiedConfigManager.getFeatureFlag('USE_UNIFIED_NETWORK_CLIENT')) {
    defaultLogger.info('[createApiClient] Creating Root Unified API Client via feature flag.');
    return NewRootApiClient.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      logger: config.logger || defaultLogger,
      errorHandler: config.errorHandler,
      configManager: config.configManager
    });
  }
  defaultLogger.warn('[createApiClient] Creating deprecated UnifiedApiClient. Please migrate to network/api-client/index.js');
  return new UnifiedApiClient(config);
}

module.exports = {
  UnifiedApiClient,
  createApiClient
};
