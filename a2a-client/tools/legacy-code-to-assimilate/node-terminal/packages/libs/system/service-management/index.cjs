/**
 * Unified Service Management Utilities Library
 * Предоставляет утилиты для управления жизненным циклом сервисов, их мониторингом и автозапуском.
 */

const path = require('path');
const fs = require('fs');
const { LoggingUtils } = require('@libs/logging-monitoring/logging/index.cjs');
const { ErrorHandlingUtils } = require('@libs/error-management/error-handler/index.cjs');
const { ConfigurationUtils } = require('@libs/core/configuration/index.js');
const { ProcessManagementUtils } = require('../process-management/index.js');
const { MonitoringUtils } = require('@libs/logging-monitoring/monitoring/index.cjs');
const FileSystemUtilsFactory = require('@libs/system/file-operations/index.mjs');
const { SharedUtils } = require('@libs/core/shared/index.js');
const { ServiceProcessManager } = require('./src/ServiceProcessManager.js');
const { ServiceLogger } = require('./src/ServiceLogger.js');
const { ServiceConfigManager } = require('./src/ServiceConfigManager.js'); // Из предыдущего рефакторинга

class ServiceManagementUtils {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || new LoggingUtils();
    this.errorHandler = dependencies.errorHandler || new ErrorHandlingUtils({ logger: this.logger });
    this.configManager = dependencies.configManager || new ConfigurationUtils();
    this.processManager = dependencies.processManager || new ProcessManagementUtils({ logger: this.logger, errorHandler: this.errorHandler });
    this.monitoringUtils = dependencies.monitoringUtils || new MonitoringUtils({ logger: this.logger, errorHandler: this.errorHandler });
    this.fileSystemUtils = dependencies.fileSystemUtils || FileSystemUtilsFactory(this.logger, this.errorHandler); // Corrected instantiation
    this.sharedUtils = dependencies.sharedUtils || new SharedUtils();
    this.notificationService = dependencies.notificationService;
    this.projectAnalyzer = dependencies.projectAnalyzer;
    this.projectRoot = dependencies.projectRoot || process.cwd(); // Ensure projectRoot is set

    this.serviceConfigManager = new ServiceConfigManager(path.join(this.projectRoot, 'config', 'services.json'), this.logger, this.eventEmitter); // Предполагается, что eventEmitter есть в зависимостях
    this.serviceProcessManager = new ServiceProcessManager(this.logger);
    this.serviceLogger = new ServiceLogger(this.logger);

    this.services = new Map();
    this.retryDelaysMs = dependencies.retryDelaysMs || [1000, 2000, 4000];
    this.statusCheckInterval = dependencies.statusCheckInterval || 10000;
    this.restartBackoffMs = dependencies.restartBackoffMs || 60000;
    this.scripts = dependencies.scripts || {};

    this.statusCheckTimer = null;
    this.restartCycleTimer = null;

    this.projectRoot = dependencies.projectRoot || process.cwd();
    this.configDir = dependencies.configDir || path.join(__dirname, 'config');

    this.configWatcher = this.configManager;

    // Привязываем методы к контексту для предотвращения ошибок
    this.autostart = this.autostart.bind(this);
    this.startService = this.startService.bind(this);
    this.stopService = this.stopService.bind(this);
    this.restartService = this.restartService.bind(this);
    this.getService = this.getService.bind(this);
    this.getServiceConfig = this.getServiceConfig.bind(this);
    this.loadServicesFromConfig = this.loadServicesFromConfig.bind(this);
    this.initialize = this.initialize.bind(this);

    // Алиасы для совместимости
    this.start = this.startService.bind(this);
    this.stop = this.stopService.bind(this);
    this.restart = this.restartService.bind(this);

    this.logger.info('[ServiceManagementUtils] Инициализирован');

    this.initialize();
  }

  async initialize() {
    try {
      this.logger.info('[ServiceManagementUtils] ErrorHandler initialized successfully');

      await this.serviceConfigManager.loadConfiguration();
      await this.loadServicesFromConfig(this.serviceConfigManager.rawConfig);

      this.configWatcher.startWatchingConfig(this.configDir, async (filename, config) => {
            await this.handleConfigChange(filename, config);
        },
        async (filename) => {
            await this.handleConfigRemoval(filename);
        }
      );
      this.logger.info('[ServiceManagementUtils] ConfigWatcher (via ConfigurationUtils) started successfully');

      this._startStatusCheckCycle();
      this._startRestartCycle();
      await this._adoptExistingProcesses();

      this.logger.info('[ServiceManagementUtils] Инициализация завершена успешно.');
    } catch (error) {
      this.logger.error('[ServiceManagementUtils] Не удалось инициализировать:', error.message);
      throw error;
    }
  }

  async stop() {
    this.logger.info('[ServiceManagementUtils] Остановка всех сервисов и циклов.');
    this.stopStatusCheckCycle();
    this.stopRestartCycle();
    this.configWatcher.stopWatchingConfig(this.configDir);
    for (const [id] of this.services) {
      await this.stopService(id);
    }
  }

  _extractCandidatePorts(config, mode) {
    return this.processManager.extractCandidatePorts(config, mode);
  }

  async stopService(id) {
    const service = this.services.get(id);
    if (!service) return { success: false, error: 'Service not found' };

    this.serviceLogger.logServiceEvent(id, 'STOP', `Stopping service ${id}.`);
    const result = await this.serviceProcessManager.stopServiceProcess(id);

    if (result.success) {
      service.status = 'stopped';
      service.statusInfo = { ok: false, message: 'Service stopped' };
      service.lastRestartAttempt = null;
      service.process = null;
      this.services.set(id, service);
      this.serviceLogger.logServiceEvent(id, 'STOPPED', `Service ${id} stopped successfully.`);
    } else {
      this.serviceLogger.logServiceError(id, `Failed to stop service ${id}.`, new Error(result.error || 'Unknown error'));
    }
    return result;
  }

  async startService(id, config, modeId) {
    this.serviceLogger.logServiceEvent(id, 'START', `Starting service ${id}.`);
    try {
      const mode = this.pickMode(config, modeId);
      if (!mode) {
        return { success: false, error: 'No start modes configured' };
      }

      let attempt = 1;
      let lastError = null;
      
      while (attempt <= this.errorHandler.maxRetries) {
        try {
          const result = await this.serviceProcessManager.startServiceProcess(id, config, mode);
          if (result.success) {
            this.services.set(id, { ...this.services.get(id), ...result, status: 'running' });
            this.serviceLogger.logServiceEvent(id, 'STARTED', `Service ${id} started successfully.`, { pid: result.pid });
            return result;
          }
          lastError = result.error;
        } catch (error) {
          lastError = error.message;
        }
        
        const shouldContinue = await this.errorHandler.handleStartupFailure(
          { id, name: config.name || id, path: config.cwd || process.cwd(), command: mode.command || 'unknown' },
          attempt,
          lastError
        );
        
        if (!shouldContinue) {
          break;
        }
        
        attempt++;
      }
      
      this.serviceLogger.logServiceError(id, `Service failed to start after ${this.errorHandler.maxRetries} attempts.`, new Error(lastError || 'Unknown error'));
      return { 
        success: false, 
        error: `Service failed to start after ${this.errorHandler.maxRetries} attempts. Last error: ${lastError}` 
      };
      
    } catch (error) {
      this.serviceLogger.logServiceError(id, `Error in startService for ${id}.`, error);
      return { success: false, error: error.message };
    }
  }

  async restartService(id) {
    this.serviceLogger.logServiceEvent(id, 'RESTART', `Restarting service ${id}.`);
    const service = this.services.get(id);
    if (!service) return { success: false, error: 'Service configuration not found' };

    service.lastRestartAttempt = Date.now();
    this.services.set(id, service);

    const result = await this.serviceProcessManager.restartServiceProcess(id, service.config, this.pickMode(service.config, service.modeId));

    if (result.success) {
      this.services.set(id, { ...this.services.get(id), ...result, status: 'running' });
      this.serviceLogger.logServiceEvent(id, 'RESTARTED', `Service ${id} restarted successfully.`, { pid: result.pid });
    } else {
      this.serviceLogger.logServiceError(id, `Failed to restart service ${id}.`, new Error(result.error || 'Unknown error'));
    }
    return result;
  }

  async getServiceStatus(id) {
    const service = this.services.get(id);
    if (!service) return { status: 'not_found' };

    let detectedPids = await this.monitoringUtils.detectRunningPids(id, service.config);
    let processRunning = detectedPids.length > 0;
    
    if (!processRunning) {
      processRunning = await this.serviceProcessManager.getServiceProcessStatus(id) === 'running';
    }

    const currentMode = this.pickMode(service.config, service.modeId);
    const statusUrl = currentMode?.statusCheckUrl || service.config?.statusUrl;

    if (statusUrl) {
      const statusResult = await this.monitoringUtils.checkUrl(statusUrl);
      service.statusInfo = statusResult;
    } else {
      service.statusInfo = { ok: false, message: 'Status URL not specified' };
    }

    const port = this.processManager.getServicePort(service.config, currentMode);
    const isListening = port ? await this.monitoringUtils.checkPortListening(port) : null;

    if (!processRunning) {
      service.status = 'failed_to_start';
      service.statusInfo = { ok: false, message: 'Process not found - startup error' };
    } else if (service.statusInfo.ok) {
      service.status = 'running';
    } else if (isListening) {
      service.status = 'running_no_status';
    } else {
      service.status = 'stopped';
    }

    service.lastCheck = Date.now();
    return {
      status: service.status,
      isListening,
      processRunning,
      startTime: service.startTime,
      uptime: Date.now() - service.startTime,
      pid: service.process ? service.process.pid : (detectedPids[0] || null),
      config: service.config,
      modeId: service.modeId,
      statusInfo: service.statusInfo
    };
  }

  async updateService(id, newConfig) {
    this.serviceLogger.logServiceEvent(id, 'UPDATE', `Updating service ${id}.`);
    const service = this.services.get(id);
    if (!service) return { success: false, error: 'Service not found' };

    const oldConfig = service.config;
    const mergedConfig = Object.assign({}, oldConfig, newConfig);

    const requiresRestart = 
      oldConfig.command !== mergedConfig.command ||
      oldConfig.cwd !== mergedConfig.cwd ||
      JSON.stringify(oldConfig?.env) !== JSON.stringify(mergedConfig?.env) ||
      JSON.stringify(oldConfig?.ports) !== JSON.stringify(mergedConfig?.ports) ||
      JSON.stringify(oldConfig?.startCommands) !== JSON.stringify(mergedConfig?.startCommands);

    service.config = mergedConfig;

    if (service.status === 'running' && requiresRestart) {
      this.serviceLogger.logServiceWarn(id, `Service ${id} config changed, restarting.`);
      await this.restartService(id);
    } else if (service.status === 'running' && service.config?.statusUrl) {
      service.statusInfo = await this.monitoringUtils.checkUrl(service.config?.statusUrl);
    }

    this.services.set(id, service);
    this.serviceLogger.logServiceEvent(id, 'UPDATED', `Service ${id} updated successfully.`);
    return { success: true, config: service.config };
  }

  async addService(id, config) {
    this.serviceLogger.logServiceEvent(id, 'ADD', `Adding service ${id}.`);
    if (this.services.has(id)) return { success: false, error: 'Service already exists' };
    this.services.set(id, { id, config, status: 'stopped', startTime: null, process: null, modeId: null, health: { ok: false, message: 'Not checked yet' }, lastRestartAttempt: null });
    this.serviceLogger.logServiceEvent(id, 'ADDED', `Service ${id} added successfully.`);
    return { success: true, id, config };
  }

  async removeService(id) {
    this.serviceLogger.logServiceEvent(id, 'REMOVE', `Removing service ${id}.`);
    const service = this.services.get(id);
    if (!service) return { success: false, error: 'Service not found' };
    if (service.process) await this.stopService(id);
    this.services.delete(id);
    this.serviceLogger.logServiceEvent(id, 'REMOVED', `Service ${id} removed successfully.`);
    return { success: true };
  }

  async loadServicesFromConfig(configData) {
    this.serviceLogger.logServiceEvent('N/A', 'CONFIG_LOAD', 'Loading services from configuration...');

    const loadedConfig = configData; // Теперь configData это уже разобранная конфигурация
    
    if (!loadedConfig || typeof loadedConfig.services !== 'object') {
      this.serviceLogger.logServiceError('N/A', 'Failed to load services config: Invalid config data', new Error('Invalid config data'));
      return { success: false, error: 'Invalid config data' };
    }

    this.services.clear();

    for (const serviceId in loadedConfig.services) {
        const serviceConfig = loadedConfig.services[serviceId];
        this.services.set(serviceId, {
          id: serviceId,
          config: serviceConfig,
          status: 'stopped',
          startTime: null,
          process: null,
          modeId: null,
          statusInfo: { ok: false, message: 'Not checked yet' },
          lastRestartAttempt: null
        });
        this.serviceLogger.logServiceDebug(serviceId, `Service loaded: ${serviceId} - ${serviceConfig.name} (autostart: ${serviceConfig.autostart}, enabled: ${serviceConfig.enabled})`);
    }
    this.serviceLogger.logServiceEvent('N/A', 'CONFIG_LOADED', `Total services loaded: ${this.services.size}`);
    return { success: true, count: this.services.size };
  }

  async handleConfigChange(filename, config) {
    this.serviceLogger.logServiceEvent('N/A', 'CONFIG_CHANGE', `Config file changed: ${filename}`);
    const parsedConfig = await this.serviceConfigManager.loadConfiguration(); // Перезагружаем конкретный файл
    if (parsedConfig && parsedConfig.services) {
        await this.loadServicesFromConfig(this.serviceConfigManager.rawConfig);
    }
  }

  async handleConfigRemoval(filename) {
    this.serviceLogger.logServiceEvent('N/A', 'CONFIG_REMOVAL', `Config file removed: ${filename}`);
  }

  pickMode(config, modeId) {
    if (!config || !Array.isArray(config.startCommands) || config.startCommands.length === 0) {
      return null;
    }
    if (modeId) {
      return config.startCommands.find(m => m.id === modeId) || null;
    }
    return config.startCommands.find(m => m.enabled === true) || config.startCommands[0] || null;
  }

  getServiceConfig(serviceId) {
    return this.serviceConfigManager.services[serviceId];
  }

  getService(serviceId) {
    const service = this.services.get(serviceId);
    if (service && !service.config) {
      this.serviceLogger.logServiceError(serviceId, 'Service has no config', new Error('Service config missing'));
      return null;
    }
    return service || null;
  }

  getServicesStatus() {
    const statuses = {};
    for (const [id, service] of this.services.entries()) {
      statuses[id] = {
        status: service.status,
        startTime: service.startTime,
        statusInfo: service.statusInfo,
        enabled: service.config?.enabled || false,
        autoStart: service.config?.autoStart || false,
        pid: service.process ? service.process.pid : (service.externalPids ? service.externalPids[0] : null)
      };
    }
    return statuses;
  }

  getRunningServices() {
    const runningServices = [];
    for (const [serviceId, service] of this.services) {
      if (service.status === 'running' || service.status === 'starting') {
        runningServices.push({
          appId: serviceId,
          name: service.config?.name || serviceId,
          status: service.status,
          config: service.config
        });
      }
    }
    return runningServices;
  }

  async autostart(group = null) {
    this.serviceLogger.logServiceEvent('N/A', 'AUTOSTART', 'Starting autostart process...');

    let servicesToStart = [];

    for (const [id, service] of this.services.entries()) {
      if (group && service.config?.group !== group) {
        this.serviceLogger.logServiceDebug(id, `Skipping service ${id} - group mismatch: ${service.config?.group} !== ${group}`);
        continue;
      }

      const shouldAutoStart = (service.config?.autoStart === true || service.config?.autostart === true) && 
                              service.config?.enabled !== false &&
                              service.status !== 'running';

      this.serviceLogger.logServiceDebug(id, `Service ${id}: autoStart=${service.config?.autoStart}, autostart=${service.config?.autostart}, enabled=${service.config?.enabled}, status=${service.status}, shouldAutoStart=${shouldAutoStart}`);

      if (shouldAutoStart) {
        servicesToStart.push({ id, service });
      }
    }

    this.serviceLogger.logServiceEvent('N/A', 'AUTOSTART', `Found ${servicesToStart.length} services to autostart`);

    for (const { id, service } of servicesToStart) {
      try {
        this.serviceLogger.logServiceEvent(id, 'AUTOSTART', `Autostarting service: ${id}`);
        await this.startService(id, service.config);
      } catch (error) {
        this.serviceLogger.logServiceError(id, `Failed to autostart service ${id}.`, error);
      }
    }

    this.serviceLogger.logServiceEvent('N/A', 'AUTOSTART_COMPLETE', 'Autostart process completed');
    return { success: true, started: servicesToStart.length };
  }

  _startStatusCheckCycle() {
    if (this.statusCheckTimer) {
      clearInterval(this.statusCheckTimer);
    }
    this.statusCheckTimer = setInterval(() => {
      this._checkAllServicesStatus();
    }, this.statusCheckInterval);
  }

  stopStatusCheckCycle() {
    if (this.statusCheckTimer) {
      clearInterval(this.statusCheckTimer);
      this.statusCheckTimer = null;
    }
  }

  _startRestartCycle() {
    if (this.restartCycleTimer) {
      clearInterval(this.restartCycleTimer);
    }
    this.restartCycleTimer = setInterval(() => {
      this._checkAndRestartServices();
    }, this.restartBackoffMs);
  }

  stopRestartCycle() {
    if (this.restartCycleTimer) {
      clearInterval(this.restartCycleTimer);
      this.restartCycleTimer = null;
    }
  }

  async _checkAllServicesStatus() {
    for (const [id, service] of this.services.entries()) {
      if (service.status === 'running' && service.config?.statusUrl) {
        try {
          service.statusInfo = await this.monitoringUtils.checkUrl(service.config?.statusUrl);
        } catch (error) {
          this.serviceLogger.logServiceError(id, `Status check failed for ${id}.`, error);
        }
      }
    }
  }

  async _checkAndRestartServices() {
    for (const [id, service] of this.services.entries()) {
      if (service.status === 'running' && service.config?.autoRestart && service.statusInfo && !service.statusInfo.ok) {
        this.serviceLogger.logServiceWarn(id, `Service ${id} is unhealthy and auto-restart is enabled. Attempting restart.`);
        await this.restartService(id);
      }
    }
  }

  async _adoptExistingProcesses() {
    this.serviceLogger.logServiceDebug('N/A', 'Attempting to adopt external processes...');
    for (const [id, svc] of this.services.entries()) {
      try {
        if (svc.process) continue;
        const detected = await this.monitoringUtils.detectRunningPids(id, svc.config);
        if (detected && detected.length > 0) {
          svc.externalPids = detected;
          svc.status = 'running';
          svc.startTime = svc.startTime || Date.now();
          svc.statusInfo = svc.statusInfo || { ok: false, message: 'External process (adopted)' };
          this.services.set(id, svc);
          this.serviceLogger.logServiceDebug(id, `Adopted external process for service ${id}: ${detected.length} PIDs`);
        }
      } catch (error) {
        this.serviceLogger.logServiceError(id, `Error adopting external process for service ${id}.`, error);
      }
    }
  }
}

exports.ServiceManager = ServiceManagementUtils;
