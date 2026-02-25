const fs = require('fs').promises;
const path = require('path');
const { readFileSync, existsSync } = require('fs');
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats');
const { ConfigManager } = require('../../config-manager/index.cjs');

class SettingsConfigManager extends ConfigManager {
  constructor(configPath, schemaPath) {
    super(configPath, schemaPath);
    this.configName = 'settings';
    this.defaultConfig = this.getDefaultConfig();
  }

  // Методы getConfig, loadConfig, saveConfig, addWatcher, notifyWatchers, clearCache, getInfo
  // теперь наследуются от ConfigManager. Переопределите, если нужна специфическая логика.

  getDefaultConfig() {
    return {
      connection: {},
      performance: {},
      security: {},
      logging: {},
      interface: {},
      notifications: {},
      systemInfo: {},
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        description: 'Конфигурация настроек'
      }
    };
  }

  validateConfig(config) {
    const isValid = this.validate(config);
    if (!isValid) {
      console.error("Settings config validation errors:", this.validate.errors);
      // throw new Error("Settings config failed validation");
    }
  }

  async getConnectionServerUrl() {
    const config = await this.getConfig();
    return config.connection.serverUrl;
  }

  async getConnectionWebsocketUrl() {
    const config = await this.getConfig();
    return config.connection.websocketUrl;
  }

  async getConnectionTimeout() {
    const config = await this.getConfig();
    return config.connection.timeout;
  }

  async getConnectionRetries() {
    const config = await this.getConfig();
    return config.connection.retries;
  }

  async getPerformanceAutoRefresh() {
    const config = await this.getConfig();
    return config.performance.autoRefresh;
  }

  async getPerformanceRefreshInterval() {
    const config = await this.getConfig();
    return config.performance.refreshInterval;
  }

  async getPerformanceRealTimeMonitoring() {
    const config = await this.getConfig();
    return config.performance.realTimeMonitoring;
  }

  async getPerformanceMaxMemoryRecords() {
    const config = await this.getConfig();
    return config.performance.maxMemoryRecords;
  }

  async getPerformanceDataCompression() {
    const config = await this.getConfig();
    return config.performance.dataCompression;
  }

  async getSecurityRequireAuth() {
    const config = await this.getConfig();
    return config.security.requireAuth;
  }

  async getSecurityApiKey() {
    const config = await this.getConfig();
    return config.security.apiKey;
  }

  async getSecurityUseHttps() {
    const config = await this.getConfig();
    return config.security.useHttps;
  }

  async getSecurityVerifySsl() {
    const config = await this.getConfig();
    return config.security.verifySsl;
  }

  async getSecuritySessionTimeout() {
    const config = await this.getConfig();
    return config.security.sessionTimeout;
  }

  async getLoggingLevel() {
    const config = await this.getConfig();
    return config.logging.level;
  }

  async getLoggingRetentionDays() {
    const config = await this.getConfig();
    return config.logging.retentionDays;
  }

  async getInterfaceTheme() {
    const config = await this.getConfig();
    return config.interface.theme;
  }

  async getInterfaceLanguage() {
    const config = await this.getConfig();
    return config.interface.language;
  }

  async getInterfaceDateFormat() {
    const config = await this.getConfig();
    return config.interface.dateFormat;
  }

  async getInterfaceDashboardWidgets() {
    const config = await this.getConfig();
    return config.interface.dashboardWidgets;
  }

  async getNotificationsEnabled() {
    const config = await this.getConfig();
    return config.notifications.enabled;
  }

  async getNotificationsSystemNotifications() {
    const config = await this.getConfig();
    return config.notifications.systemNotifications;
  }

  async getNotificationsErrorNotifications() {
    const config = await this.getConfig();
    return config.notifications.errorNotifications;
  }

  async getNotificationsCompletionNotifications() {
    const config = await this.getConfig();
    return config.notifications.completionNotifications;
  }

  async getNotificationsSoundNotifications() {
    const config = await this.getConfig();
    return config.notifications.soundNotifications;
  }

  async getNotificationsSoundVolume() {
    const config = await this.getConfig();
    return config.notifications.soundVolume;
  }

  async getSystemInfoAppVersion() {
    const config = await this.getConfig();
    return config.systemInfo.appVersion;
  }

  async getSystemInfoOs() {
    const config = await this.getConfig();
    return config.systemInfo.os;
  }

  async getSystemInfoArch() {
    const config = await this.getConfig();
    return config.systemInfo.arch;
  }

  async getSystemInfoMemory() {
    const config = await this.getConfig();
    return config.systemInfo.memory;
  }

  async getSystemInfoFreeSpace() {
    const config = await this.getConfig();
    return config.systemInfo.freeSpace;
  }

  async getSystemInfoUptime() {
    const config = await this.getConfig();
    return config.systemInfo.uptime;
  }

  async getSettingsConfig() {
    const config = await this.getConfig();
    return config;
  }
}

const configPath = path.join(__dirname, 'config.json');
const schemaPath = path.join(__dirname, 'schema.json');
const settingsConfigManager = new SettingsConfigManager(configPath, schemaPath);

module.exports = settingsConfigManager;
