/**
 * Browser-compatible UnifiedConfigManager
 * Мок для браузерного окружения
 */

class BrowserUnifiedConfigManager {
  constructor() {
    this.initialized = false;
    this.configs = new Map();
    this.managers = new Map();
  }

  async initialize() {
    console.log('[BrowserUnifiedConfigManager] Initializing...');
    this.initialized = true;
  }

  async loadAllConfigs() {
    console.log('[BrowserUnifiedConfigManager] Loading configs...');
    
    // Загружаем дефолтные конфиги
    const defaultConfigs = {
      ports: {
        rules: [],
        ranges: [],
        singlePorts: [],
        systems: [],
        occupied: []
      },
      settings: {
        theme: 'dark',
        language: 'ru',
        autoSave: true
      },
      logging: {
        level: 'info',
        enableConsole: true
      }
    };

    Object.entries(defaultConfigs).forEach(([key, value]) => {
      this.configs.set(key, value);
    });

    // Создаем менеджеры для каждого типа конфига
    this.managers.set('ports', this.createPortsManager());
    this.managers.set('settings', this.createSettingsManager());
  }

  getConfig(key) {
    return this.configs.get(key) || {};
  }

  setConfig(key, value) {
    this.configs.set(key, value);
  }

  getManager(name) {
    return this.managers.get(name) || this.createDefaultManager();
  }

  getFeatureConfig(featureName) {
    return this.getConfig(featureName);
  }

  getFeatureManager(featureName) {
    return this.getManager(featureName);
  }

  createPortsManager() {
    return {
      getConfig: (key) => this.getConfig('ports'),
      setConfig: (key, value) => this.setConfig('ports', value),
      getAllowedRanges: () => Promise.resolve([]),
      getBlockedRanges: () => Promise.resolve([]),
      isPortAllowed: (port) => Promise.resolve(true),
      addPortRange: (range) => Promise.resolve({ id: Date.now().toString(), ...range }),
      updatePortRange: (id, updates) => Promise.resolve({ id, ...updates }),
      removePortRange: (id) => Promise.resolve(true),
      getPortStats: () => Promise.resolve({
        totalPorts: 0,
        totalSinglePorts: 0,
        totalRanges: 0,
        allowedRanges: 0,
        blockedRanges: 0
      })
    };
  }

  createSettingsManager() {
    return {
      getConfig: (key) => this.getConfig('settings'),
      setConfig: (key, value) => this.setConfig('settings', value),
      updateSetting: (key, value) => {
        const settings = this.getConfig('settings');
        settings[key] = value;
        this.setConfig('settings', settings);
        return Promise.resolve();
      }
    };
  }

  createDefaultManager() {
    return {
      getConfig: () => ({}),
      setConfig: () => Promise.resolve(),
      updateConfig: () => Promise.resolve()
    };
  }
}

export const unifiedConfigManager = new BrowserUnifiedConfigManager();
