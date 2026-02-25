/**
 * Browser-compatible ModelRegistry
 * Мок для браузерного окружения
 */

class BrowserModelRegistry {
  constructor(options = {}) {
    this.apiClient = options.apiClient || null;
    this.models = new Map();
    this.initialized = false;
  }

  async initialize() {
    console.log('[BrowserModelRegistry] Initializing...');
    this.initialized = true;
  }

  createModel(modelName) {
    const model = {
      name: modelName,
      data: {},
      get: (key) => this.data[key],
      set: (key, value) => { this.data[key] = value; },
      save: () => Promise.resolve(),
      load: () => Promise.resolve(),
      delete: (key) => { delete this.data[key]; },
      clear: () => { this.data = {}; }
    };
    
    this.models.set(modelName, model);
    return model;
  }

  getModel(modelName) {
    return this.models.get(modelName);
  }

  getStats() {
    return {
      modelsCount: this.models.size,
      initialized: this.initialized,
      models: Array.from(this.models.keys())
    };
  }
}

export { BrowserModelRegistry as ModelRegistry };
