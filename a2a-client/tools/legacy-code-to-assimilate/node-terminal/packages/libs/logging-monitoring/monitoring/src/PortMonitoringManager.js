const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const { execFile, exec } = require('child_process');
const http = require('http');

const { FileSystemUtils } = require('../../../system/file-operations/index.cjs');
const { LoggingUtils } = require('../../../app-framework/logging-reporting/index.js');

class PortMonitoringManager {
  constructor(options = {}, logger = new LoggingUtils()) {
    this.logger = logger;
    this.config = {
      timeout: options.timeout || 5000, // Таймаут для HTTP-запросов и проверок портов
      ...options
    };
    this.fileSystem = options.fileSystem || FileSystemUtils;
    this.appsConfig = { apps: [] }; // Для хранения конфигурации приложений
  }

  /**
   * Проверяет, слушает ли процесс указанный порт через netstat (нативная реализация)
   * @private
   */
  async _checkPortWithNetstatNative(port) {
    return new Promise((resolve) => {
      const command = `netstat -ano | findstr \":${port} \"`;
      exec(command, (err, stdout) => {
        if (err || !stdout) {
          resolve({ listening: false, pid: null, details: '' });
          return;
        }
        const lines = stdout.split('\n').filter(line => line.includes(':' + port));
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5 && parts[3] === 'LISTENING') {
            resolve({ listening: true, pid: parts[4], details: line.trim() });
            return;
          }
        }
        resolve({ listening: false, pid: null, details: stdout });
      });
    });
  }

  /**
   * Проверяет, слушает ли порт какой-либо процесс.
   * @param {number} port - Номер порта для проверки.
   * @returns {Promise<boolean>} true, если порт занят, false если свободен или произошла ошибка.
   */
  async checkPortListening(port) {
    try {
      const result = await this._checkPortWithNetstatNative(port);
      return result.listening;
    } catch (error) {
      this.logger.error(`[PortMonitoringManager] Error checking port ${port}: ${error.message}`);
      return false;
    }
  }

  /**
   * Убивает процесс по порту.
   * @param {number} port - Номер порта.
   * @returns {Promise<object>} Результат операции.
   */
  async killProcessByPort(port) {
    const portInfo = await this._checkPortWithNetstatNative(port);
    if (!portInfo.listening) {
      this.logger.info(`[PortMonitoringManager] Port ${port} already free.`);
      return { success: true, message: `Порт ${port} уже свободен` };
    }
    if (!portInfo.pid) {
      this.logger.warn(`[PortMonitoringManager] Could not determine PID for port ${port}.`);
      return { success: false, message: `Не удалось определить PID для порта ${port}` };
    }
    this.logger.info(`[PortMonitoringManager] Attempting to kill process ${portInfo.pid} on port ${port}.`);
    return new Promise((resolve) => {
      exec(`taskkill /PID ${portInfo.pid} /F`, (err) => {
        if (err) {
          this.logger.error(`[PortMonitoringManager] Error killing process ${portInfo.pid}: ${err.message}`);
          resolve({ success: false, message: `Ошибка убийства процесса: ${err.message}` });
        } else {
          this.logger.info(`[PortMonitoringManager] Process ${portInfo.pid} on port ${port} killed successfully.`);
          resolve({ success: true, message: `Процесс ${portInfo.pid} на порту ${port} убит` });
        }
      });
    });
  }

  /**
   * Получает полный статус портов и приложений.
   * @returns {Promise<object>} Объект, содержащий информацию о портах, приложениях, конфликтах и переменных окружения.
   */
  async getPortStatus() {
    try {
      // Сканируем активные порты
      const activePorts = await this.scanActivePorts();
      
      // Получаем конфигурацию приложений
      const appsConfig = await this.getAppsConfig();
      
      // Сопоставляем порты с приложениями
      const apps = await this.mapPortsToApps(activePorts, appsConfig.apps); // Передаем только apps из конфигурации
      
      // Находим конфликты
      const conflicts = this.findPortConflicts(activePorts);
      
      // Генерируем ENV переменные
      const envVariables = this.generateEnvFromPorts(activePorts);
      
      return {
        ports: activePorts,
        total_ports: activePorts.length,
        active_apps: apps.length,
        apps: apps,
        conflicts: conflicts,
        env_variables: envVariables
      };
    } catch (error) {
      this.logger.error('[PortMonitoringManager] getPortStatus error:', error);
      return {
        ports: [],
        total_ports: 0,
        active_apps: 0,
        apps: [],
        conflicts: [],
        env_variables: {}
      };
    }
  }

  /**
   * Сканирует активные порты с помощью netstat.
   * @returns {Promise<Array<object>>} Массив объектов портов.
   */
  async scanActivePorts() {
    return new Promise((resolve) => {
      const command = 'netstat -ano | findstr "LISTENING"';
      exec(command, (err, stdout) => {
        if (err || !stdout) {
          this.logger.warn(`[PortMonitoringManager] scanActivePorts error: ${err ? err.message : 'No stdout'}`);
          resolve([]);
          return;
        }
        
        const ports = [];
        const lines = stdout.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4) {
            const address = parts[1];
            const portMatch = address.match(/:(\d+)$/);
            if (portMatch) {
              const port = parseInt(portMatch[1]);
              const pid = parts[4];
              
              // Исключаем системные порты
              if (port > 1024 && port < 65536) {
                ports.push({
                  port: port,
                  pid: pid,
                  address: address,
                  status: 'listening'
                });
              }
            }
          }
        }
        
        resolve(ports);
      });
    });
  }

  /**
   * Получает конфигурацию приложений из файла.
   * @returns {Promise<object>} Объект конфигурации с массивом apps.
   */
  async getAppsConfig() {
    try {
      const dataPath = this.fileSystem.resolve(process.cwd(), 'data/apps-list.json');
      const configPath = this.fileSystem.resolve(process.cwd(), 'config/apps-list.json');
      const targetPath = await this.fileSystem.exists(dataPath) ? dataPath : configPath;
      if (await this.fileSystem.exists(targetPath)) {
        const content = await this.fileSystem.readFile(targetPath, 'utf8');
        this.appsConfig = JSON.parse(content);
        return this.appsConfig;
      }
      return { apps: [] };
    } catch (e) {
      this.logger.error('[PortMonitoringManager] Error reading apps config:', e.message);
      return { apps: [] };
    }
  }

  /**
   * Сопоставляет активные порты с конфигурацией приложений.
   * @param {Array<object>} activePorts - Массив активных портов.
   * @param {Array<object>} appsConfigArray - Массив конфигураций приложений.
   * @returns {Array<object>} Массив приложений с их статусом и портами.
   */
  async mapPortsToApps(activePorts, appsConfigArray) {
    const apps = [];
    const usedPorts = new Set();
    
    // Создаем приложения из конфигурации
    for (const appConfig of appsConfigArray) {
      const app = {
        appId: appConfig.id || `app-${Date.now()}-${Math.random()}`,
        name: appConfig.name || 'Unknown App',
        status: 'stopped',
        ports: []
      };
      
      // Проверяем порты приложения
      if (appConfig.port) {
        const portInfo = activePorts.find(p => p.port === appConfig.port);
        if (portInfo) {
          app.status = 'active';
          app.ports.push({
            port: appConfig.port,
            service: appConfig.name,
            env_var: appConfig.env_var || 'PORT'
          });
          usedPorts.add(appConfig.port);
        }
      }
      
      apps.push(app);
    }
    
    // Добавляем приложения для неиспользуемых портов
    for (const portInfo of activePorts) {
      if (!usedPorts.has(portInfo.port)) {
        apps.push({
          appId: `unknown-${portInfo.port}`,
          name: `Unknown App (Port ${portInfo.port})`,
          status: 'active',
          ports: [{
            port: portInfo.port,
            service: 'Unknown Service',
            env_var: 'PORT'
          }]
        });
      }
    }
    
    return apps;
  }

  /**
   * Находит конфликты портов.
   * @param {Array<object>} activePorts - Массив активных портов.
   * @returns {Array<object>} Массив объектов конфликтов.
   */
  findPortConflicts(activePorts) {
    const conflicts = [];
    const portCounts = {};
    
    // Подсчитываем использование портов
    for (const portInfo of activePorts) {
      portCounts[portInfo.port] = (portCounts[portInfo.port] || 0) + 1;
    }
    
    // Находим конфликты
    for (const [port, count] of Object.entries(portCounts)) {
      if (count > 1) {
        const conflictingApps = activePorts
          .filter(p => p.port === parseInt(port))
          .map(p => `PID ${p.pid}`);
        
        conflicts.push({
          port: parseInt(port),
          severity: 'high',
          apps: conflictingApps,
          message: `Порт ${port} используется ${count} процессами`
        });
      }
    }
    
    return conflicts;
  }

  /**
   * Генерирует переменные окружения из активных портов.
   * @param {Array<object>} activePorts - Массив активных портов.
   * @returns {object} Объект с переменными окружения.
   */
  generateEnvFromPorts(activePorts) {
    const envVars = {};
    
    for (const portInfo of activePorts) {
      const envKey = `PORT_${portInfo.port}`;
      envVars[envKey] = portInfo.port.toString();
    }
    
    // Добавляем общие переменные
    if (activePorts.length > 0) {
      envVars['DEFAULT_PORT'] = activePorts[0].port.toString();
      envVars['TOTAL_PORTS'] = activePorts.length.toString();
    }
    
    return envVars;
  }
}

module.exports = { PortMonitoringManager };
