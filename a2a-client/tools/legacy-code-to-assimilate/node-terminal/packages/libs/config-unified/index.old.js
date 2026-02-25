import { UnifiedConfigManager } from './core/UnifiedConfigManager.mjs';
import { ModelRegistry } from './core/ModelRegistry.mjs';
import { BaseModel } from './core/BaseModel.mjs';
import { ServicesModel } from './models/ServicesModel.mjs';
import { ServersModel } from './models/ServersModel.mjs';
import { defaultLogger } from '../logging-monitoring/logging/index.mjs'; // Import default logger

const ModelUtils = {
  validateConfig: (config, schema) => {
    // Placeholder for schema validation logic
    // In a real scenario, this would integrate with a robust schema validation library (e.g., Joi, Yup, Ajv)
    defaultLogger.warn('ModelUtils.validateConfig not fully implemented or found. Skipping validation.'); // Use defaultLogger
    return { valid: true, errors: [] };
  },
  deepMerge(target, source) {
    // A simple deep merge function
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== 'object') {
            Object.assign(target, { [key]: {} });
          }
          ModelUtils.deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
    return target;
  },
  createBackup(model) {
    // This will create a deep clone of the model's current data
    return JSON.parse(JSON.stringify(model.data));
  },
  restoreFromBackup(model, backup) {
    // This will restore the model's data from a backup
    model.data = JSON.parse(JSON.stringify(backup));
  },
  async ensureSettingsConfig(defaultSettings) {
    const settingsModel = ModelRegistry.getModel('Settings');
    if (!settingsModel) {
      defaultLogger.error('Settings model not found in registry.');
      throw new Error('Settings model not found.');
    }

    const currentSettings = settingsModel.getConfig();
    const mergedSettings = ModelUtils.deepMerge(currentSettings, defaultSettings);
    settingsModel.updateConfig(mergedSettings);
    await settingsModel.saveConfig();
    defaultLogger.info('Settings config ensured and merged with defaults.');
  },
};

export const unifiedConfigManager = UnifiedConfigManager;
export { ModelUtils, ModelRegistry, BaseModel, ServicesModel, ServersModel };
