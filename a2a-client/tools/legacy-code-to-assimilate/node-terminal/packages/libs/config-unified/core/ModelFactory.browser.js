/**
 * Browser-compatible ModelFactory
 * Мок для браузерного окружения
 */

class BrowserModelFactory {
  constructor() {
    this.models = new Map();
  }

  createModel(modelName, options = {}) {
    const model = {
      name: modelName,
      data: {},
      options,
      get: (key) => this.data[key],
      set: (key, value) => { this.data[key] = value; },
      save: () => Promise.resolve(),
      load: () => Promise.resolve(),
      delete: (key) => { delete this.data[key]; },
      clear: () => { this.data = {}; },
      validate: (data) => ({ valid: true, errors: [] })
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
      models: Array.from(this.models.keys())
    };
  }
}

export { BrowserModelFactory as ModelFactory };
