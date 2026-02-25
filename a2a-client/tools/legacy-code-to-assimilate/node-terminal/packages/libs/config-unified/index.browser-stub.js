/**
 * Browser-compatible stub for config-unified/index.cjs
 * Minimal version for debugging
 */

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

export { ModelUtils, BaseModel, ServicesModel, ServersModel };
