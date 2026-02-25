/**
 * Browser-compatible version of PortsConfigManager
 * This file provides a browser-safe implementation that doesn't use Node.js modules
 */

// Browser-safe mock implementation
class PortsConfigManager {
  constructor(configPath, schemaPath, enableValidation = true, options = {}) {
    this.configPath = configPath;
    this.schemaPath = schemaPath;
    this.enableValidation = enableValidation;
    this.options = options;
    this.config = {};
    this.logger = options.logger || console;
  }

  async loadConfig() {
    this.logger.debug('PortsConfigManager: Loading config from browser environment');
    // In browser, we'll use the unified config manager
    return this.config;
  }

  async saveConfig(config) {
    this.logger.debug('PortsConfigManager: Saving config in browser environment');
    this.config = config;
    return true;
  }

  async getConfig() {
    return this.config;
  }

  async addPortRange(portRange) {
    this.logger.debug('PortsConfigManager: Adding port range in browser environment');
    if (!this.config.rules) {
      this.config.rules = [];
    }
    this.config.rules.push(portRange);
    return portRange;
  }

  async updatePortRange(id, portRange) {
    this.logger.debug('PortsConfigManager: Updating port range in browser environment');
    if (!this.config.rules) {
      this.config.rules = [];
    }
    const index = this.config.rules.findIndex(rule => rule.id === id);
    if (index !== -1) {
      this.config.rules[index] = { ...portRange, id };
      return this.config.rules[index];
    }
    throw new Error(`Port range with id ${id} not found`);
  }

  async removePortRange(id) {
    this.logger.debug('PortsConfigManager: Removing port range in browser environment');
    if (!this.config.rules) {
      this.config.rules = [];
    }
    const index = this.config.rules.findIndex(rule => rule.id === id);
    if (index !== -1) {
      return this.config.rules.splice(index, 1)[0];
    }
    throw new Error(`Port range with id ${id} not found`);
  }

  async listPortRanges() {
    this.logger.debug('PortsConfigManager: Listing port ranges in browser environment');
    return this.config.rules || [];
  }

  async validateConfig(config) {
    this.logger.debug('PortsConfigManager: Validating config in browser environment');
    // Basic validation for browser environment
    if (!config || typeof config !== 'object') {
      return { isValid: false, errors: ['Config must be an object'] };
    }
    return { isValid: true, errors: [] };
  }
}

// Create a browser-safe instance
const portsConfigManager = new PortsConfigManager(
  'browser-config', 
  'browser-schema', 
  true, 
  { logger: console }
);

export { PortsConfigManager, portsConfigManager };
