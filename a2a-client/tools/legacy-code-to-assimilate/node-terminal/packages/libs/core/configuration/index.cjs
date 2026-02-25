/**
 * Unified Configuration Utilities Library (CommonJS Version)
 * Объединенная библиотека утилит конфигурации
 */

const path = require('path');
const fs = require('fs');
const { unifiedConfigManager, ModelUtils, BaseModel, ServicesModel, ServersModel, ModelFactory, ModelRegistry } = require('@libs/config-unified');
const { defaultLogger } = require('../../logging-monitoring/logging'); // Import defaultLogger

// Check feature flag
let useUnifiedConfig = false;
try {
  const configPath = path.resolve(__dirname, '../../config-unified/settings/config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    useUnifiedConfig = config.featureFlags?.USE_UNIFIED_CONFIG || false;
  }
} catch (error) {
  // Feature flag not found, default to false
}

if (useUnifiedConfig) {
  // New unified implementation
  class ConfigurationUtilsWrapper {
    constructor(options = {}) {
      this.logger = options.logger || defaultLogger; // Use defaultLogger
      this.configDir = options.configDir || 'config'; // For compatibility, though config-unified manages this
      this.defaults = options.defaults || {}; // For compatibility
      this.env = options.env || process.env.NODE_ENV || 'development';
      this.autoLoad = options.autoLoad !== false;
      this.sensitiveFields = options.sensitiveFields || [];
      this.unifiedManager = unifiedConfigManager; // Reference to the singleton
      this.settingsConfig = this.unifiedManager.getFeatureConfig('settings');
      this.initialized = false;

      if (this.autoLoad) {
        this.loadAllConfigs();
      }
    }

    async initialize() {
      if (!this.initialized) {
        await this.unifiedManager.initialize();
        this.initialized = true;
      }
    }

    async loadAllConfigs() {
      await this.initialize();
      defaultLogger.warn('[ConfigurationUtilsWrapper] loadAllConfigs is largely handled by config-unified. Manual calls might be unnecessary.'); // Use defaultLogger
      // In config-unified, models handle their own loading. This might just trigger a refresh or do nothing.
    }

    async load(configName, filePath) {
      await this.initialize();
      defaultLogger.warn(`[ConfigurationUtilsWrapper] load method for ${configName} is deprecated. Use config-unified models.`); // Use defaultLogger
      // Attempt to load via settingsConfig if it's a global setting
      if (configName === 'settings') {
        return this.settingsConfig.getConfig();
      }
      // For other configNames, you might need to create a specific model if it exists
      try {
        const registry = new ModelRegistry();
        await registry.initialize();
        const model = registry.createModel(configName); // This will only work if a model for configName exists
        return model.getAll();
      } catch (e) {
        defaultLogger.error(`[ConfigurationUtilsWrapper] Failed to load config ${configName} via config-unified:`, e.message); // Use defaultLogger
        throw e;
      }
    }

    isConfigFile(filename) {
      // This logic might not be directly mappable. Config-unified works with defined models.
      defaultLogger.warn('[ConfigurationUtilsWrapper] isConfigFile is deprecated. Config-unified uses defined models.'); // Use defaultLogger
      return true; // Placeholder
    }

    get(configName, key, defaultValue) {
      // This maps to unifiedConfigManager's get functionality
      if (configName === 'settings') {
        const config = this.settingsConfig.getConfig();
        return key ? (ModelUtils.get(config, key) || defaultValue) : config;
      }
      // For other configNames, assume a model can provide it
      try {
        const registry = new ModelRegistry();
        // registry.initialize(); // Assuming registry is initialized globally or on demand
        const model = registry.createModel(configName); // This might fail if model not found
        const config = model.getAll();
        return key ? (ModelUtils.get(config, key) || defaultValue) : config;
      } catch (e) {
        defaultLogger.error(`[ConfigurationUtilsWrapper] Failed to get config ${configName} via config-unified:`, e.message); // Use defaultLogger
        return defaultValue;
      }
    }

    set(configName, key, value) {
      // This maps to unifiedConfigManager's set functionality
      if (configName === 'settings') {
        this.settingsConfig.updateConfig(ModelUtils.set(this.settingsConfig.getConfig(), key, value));
        this.settingsConfig.save();
      }
      // For other configNames, assume a model can update it
      try {
        const registry = new ModelRegistry();
        // registry.initialize();
        const model = registry.createModel(configName);
        model.update(ModelUtils.set(model.getAll(), key, value));
      } catch (e) {
        defaultLogger.error(`[ConfigurationUtilsWrapper] Failed to set config ${configName} via config-unified:`, e.message); // Use defaultLogger
      }
    }

    async validate(configName, configData) {
      await this.initialize();
      defaultLogger.warn(`[ConfigurationUtilsWrapper] validate method for ${configName} is deprecated. Rely on model validation.`); // Use defaultLogger
      // Use ModelUtils for generic schema validation if a schema is provided
      const schema = {}; // How to get schema here? From the model itself?
      if (schema) {
        const { valid, errors } = ModelUtils.validateConfig(configData, schema);
        if (!valid) {
          throw new Error(`Configuration validation failed for ${configName}: ${JSON.stringify(errors)}`);
        }
      }
      return true;
    }

    addSchema(configName, schema) {
      defaultLogger.warn(`[ConfigurationUtilsWrapper] addSchema is deprecated. Schemas are defined in config-unified models.`); // Use defaultLogger
      // No direct equivalent. Schemas are part of config-unified models.
    }

    getAll() {
      defaultLogger.warn('[ConfigurationUtilsWrapper] getAll is deprecated. Use specific model getters.'); // Use defaultLogger
      return this.unifiedManager.loadAllConfigs(); // This is a rough mapping, might not be accurate
    }

    clear(configName) {
      defaultLogger.warn(`[ConfigurationUtilsWrapper] clear method for ${configName} is deprecated. Use model-specific reset.`); // Use defaultLogger
      // No direct equivalent. Use model.reset() or delete data from models.
    }

    // Expose other useful config-unified features if needed
    async createModel(modelName) {
      await this.initialize();
      const registry = new ModelRegistry();
      await registry.initialize();
      return registry.createModel(modelName);
    }
  }

  const defaultConfig = new ConfigurationUtilsWrapper();

  module.exports = {
    ConfigurationUtils: ConfigurationUtilsWrapper,
    ConfigManager: ConfigurationUtilsWrapper, // Alias for compatibility
    default: defaultConfig,
    unifiedConfigManager // Expose the unified manager directly
  };

} else {
  // Old implementation
  module.exports = require('./index.old.cjs');
}
