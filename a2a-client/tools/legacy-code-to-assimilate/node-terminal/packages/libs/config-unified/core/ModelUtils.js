/**
 * Browser-compatible ModelUtils
 * Мок для браузерного окружения
 */

export const ModelUtils = {
  validateConfig: (config, schema) => {
    return { valid: true, errors: [] };
  },
  
  mergeConfigs: (config1, config2) => {
    return { ...config1, ...config2 };
  },
  
  deepClone: (obj) => {
    return JSON.parse(JSON.stringify(obj));
  }
};
