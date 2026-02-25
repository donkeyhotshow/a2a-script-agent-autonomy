/**
 * Browser-compatible stub for config-unified/index.cjs
 * Exports browser-compatible mocks for browser environment.
 */

import { unifiedConfigManager } from './core/UnifiedConfigManager.browser.js';
import { ModelRegistry } from './core/ModelRegistry.browser.js';
import { ModelFactory } from './core/ModelFactory.browser.js';

// Basic mocks for Models
class BaseModel {}
class ServicesModel {}
class ServersModel {}

// Mock ModelUtils for browser
const ModelUtils = {
  validateConfig: (config, schema) => ({ valid: true, errors: [] }),
  transformAndValidateConfig: (config, schema) => ({ valid: true, errors: [], transformed: config }),
  loadConfig: (path) => Promise.resolve({}),
  saveConfig: (path, config) => Promise.resolve(),
  deepMerge: (target, source) => ({ ...target, ...source }),
};

export { unifiedConfigManager, ModelUtils, ModelRegistry, ModelFactory, BaseModel, ServicesModel, ServersModel };
