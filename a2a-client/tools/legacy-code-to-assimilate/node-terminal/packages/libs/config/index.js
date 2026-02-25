/**
 * Config библиотеки - управление конфигурацией
 */

const path = require('path');
const fs = require('fs');
const { unifiedConfigManager, ModelUtils, BaseModel, ServicesModel, ServersModel, ModelFactory, ModelRegistry } = require('../config-unified');
const { defaultLogger } = require('../logging-monitoring/logging'); // Import defaultLogger

// Check feature flag
let useUnifiedConfig = false;
try {
  const configPath = path.resolve(__dirname, '../config-unified/settings/config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    useUnifiedConfig = config.featureFlags?.USE_UNIFIED_CONFIG || false;
  }
} catch (error) {
  // Feature flag not found, default to false
}

if (useUnifiedConfig) {
  // New unified implementation
  const managerWrapper = {
    // Re-export ModelUtils directly
    ModelUtils,

    // Provide a simple config loader that uses unifiedConfigManager for global settings
    loader: {
      async loadFile(filePath) {
        await unifiedConfigManager.initialize();
        const settingsConfig = unifiedConfigManager.getFeatureConfig('settings');
        const config = settingsConfig.getConfig(); // Assuming getConfig() returns the loaded config
        return config; // Return raw config for compatibility
      },
      // Potentially other loader methods to map
    },

    // Provide a simple config validator that uses ModelUtils
    validator: {
      validate(config, schema) {
        return ModelUtils.validateConfig(config, schema);
      },
      // Potentially other validator methods to map
    },

    // Provide a manager facade for compatibility
    manager: {
      async initialize() {
        await unifiedConfigManager.initialize();
      },
      async getConfig() {
        await unifiedConfigManager.initialize();
        const settingsConfig = unifiedConfigManager.getFeatureConfig('settings');
        return settingsConfig.getConfig();
      },
      async updateConfig(newConfig) {
        await unifiedConfigManager.initialize();
        const settingsConfig = unifiedConfigManager.getFeatureConfig('settings');
        settingsConfig.updateConfig(newConfig);
        await settingsConfig.save();
      },
      // Map other methods as needed
    },

    // Provide a parser facade (parsing handled internally by unifiedConfigManager)
    parser: {
      parseJson(jsonString) {
        defaultLogger.warn('[Config/parser] Parsing is handled by config-unified. Returning parsed string.'); // Use defaultLogger
        return JSON.parse(jsonString);
      },
    },

    // Expose ModelRegistry and ModelFactory for advanced usage
    ModelRegistry,
    ModelFactory,
    unifiedConfigManager,

    // Re-export models for direct access (if desired)
    BaseModel,
    ServicesModel,
    ServersModel,
  };

  module.exports = managerWrapper;

} else {
  // Old implementation
  module.exports = require('./index.old.js');
}
