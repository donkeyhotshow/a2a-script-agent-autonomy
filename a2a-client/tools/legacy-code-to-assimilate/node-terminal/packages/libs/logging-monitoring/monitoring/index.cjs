/**
 * Unified Monitoring Utilities Library
 * Объединенная библиотека утилит для мониторинга системы и сервисов
 * CommonJS version for Jest compatibility
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const { execFile, exec } = require('child_process');
const http = require('http');

// Import CommonJS modules
const fileSystemUtilsFactory = require('../../system/file-operations/index.cjs');
const { LoggingUtils } = require('../../app-framework/logging-reporting/index.js');

// Temporary ProcessManagementUtils stub
class ProcessManagementUtils {
  constructor(options = {}) {
    this.logger = options.logger || console;
  }
  
  extractCandidatePorts(config, mode) {
    const ports = [];
    if (config.port) ports.push(config.port);
    if (config.ports && Array.isArray(config.ports)) {
      ports.push(...config.ports);
    }
    return ports;
  }
}

// Temporary HealthCheckManager stub
class HealthCheckManager {
  constructor(options = {}) {
    this.logger = options.logger || console;
  }
  
  async checkHealth() {
    return { status: 'healthy', timestamp: Date.now() };
  }
}

// Temporary PortMonitoringManager stub
class PortMonitoringManager {
  constructor(options = {}) {
    this.logger = options.logger || console;
  }
  
  async getActivePorts() {
    return [];
  }
  
  getAppsConfig() {
    return [];
  }
  
  async mapPortsToApps(activePorts, appsConfigArray) {
    return [];
  }
  
  findPortConflicts(activePorts) {
    return [];
  }
  
  generateEnvFromPorts(activePorts) {
    return {};
  }
}

/**
 * Unified Monitoring Utilities Class
 * Основной класс для мониторинга системы и сервисов
 */
class MonitoringUtils {
  constructor(options = {}) {
    this.options = {
      enableLogging: options.enableLogging !== false,
      enableHealthChecks: options.enableHealthChecks !== false,
      enablePortMonitoring: options.enablePortMonitoring !== false,
      ...options
    };
    
    this.logger = options.logger || console;
    this.fileSystemUtils = fileSystemUtilsFactory(this.logger);
    this.processManagementUtils = new ProcessManagementUtils({ logger: this.logger });
    this.healthCheckManager = new HealthCheckManager({ logger: this.logger });
    this.portMonitoringManager = new PortMonitoringManager({ logger: this.logger });
  }

  /**
   * Получает информацию о системе
   */
  async getSystemInfo() {
    try {
      const info = {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpus: os.cpus(),
        networkInterfaces: os.networkInterfaces(),
        timestamp: Date.now()
      };
      
      if (this.options.enableLogging) {
        this.logger.debug('[MonitoringUtils] System info retrieved');
      }
      
      return info;
    } catch (error) {
      this.logger.error('[MonitoringUtils] Error getting system info:', error);
      throw error;
    }
  }

  /**
   * Проверяет здоровье системы
   */
  async checkSystemHealth() {
    try {
      const health = await this.healthCheckManager.checkHealth();
      
      if (this.options.enableLogging) {
        this.logger.debug('[MonitoringUtils] System health checked');
      }
      
      return health;
    } catch (error) {
      this.logger.error('[MonitoringUtils] Error checking system health:', error);
      throw error;
    }
  }

  /**
   * Получает активные порты
   */
  async getActivePorts() {
    return this.portMonitoringManager.getActivePorts();
  }

  /**
   * Получает конфигурацию приложений
   */
  getAppsConfig() {
    return this.portMonitoringManager.getAppsConfig();
  }

  /**
   * Сопоставляет активные порты с конфигурацией приложений
   */
  async mapPortsToApps(activePorts, appsConfigArray) {
    return this.portMonitoringManager.mapPortsToApps(activePorts, appsConfigArray);
  }

  /**
   * Находит конфликты портов
   */
  findPortConflicts(activePorts) {
    return this.portMonitoringManager.findPortConflicts(activePorts);
  }

  /**
   * Генерирует переменные окружения из активных портов
   */
  generateEnvFromPorts(activePorts) {
    return this.portMonitoringManager.generateEnvFromPorts(activePorts);
  }
}

const monitoringUtils = new MonitoringUtils();

module.exports = { MonitoringUtils, monitoringUtils };
