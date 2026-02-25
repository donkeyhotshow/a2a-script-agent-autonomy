/**
 * Unified Monitoring Utilities Library
 * Объединенная библиотека утилит для мониторинга системы и сервисов
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const { execFile, exec } = require('child_process');
const http = require('http');
const { HealthCheckManager } = require('./src/HealthCheckManager.js');
const { PortMonitoringManager } = require('./src/PortMonitoringManager.js');

const { FileSystemUtils } = require('../../system/file-operations/index.cjs');
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
      config.ports.forEach(p => {
        if (typeof p === 'number') ports.push(p);
        else if (p && typeof p.number === 'number') ports.push(p.number);
      });
    }
    if (mode && mode.port) ports.push(mode.port);
    return ports;
  }
  
  async findProcesses(criteria) {
    // Simple process finding implementation
    return [];
  }
  
  async findProcessByPort(port) {
    // Simple port-based process finding
    return { success: false, pid: null };
  }
}

class MonitoringUtils {
  constructor(options = {}, logger = new LoggingUtils()) {
    this.logger = logger;
    this.config = {
      enabled: options.enabled !== undefined ? options.enabled : true,
      timeout: options.timeout || 5000, // Таймаут для HTTP-запросов и проверок портов
      checkInterval: options.checkInterval || 10000, // Интервал проверки здоровья
      pidFilePath: options.pidFilePath || path.join(process.cwd(), 'runtime'),
      ...options
    };
    this.metrics = {}; // Здесь будут храниться собранные метрики
    this.healthCheckTimer = null;
    this.fileSystem = options.fileSystem || FileSystemUtils;
    this.appsConfig = { apps: [] }; // Для хранения конфигурации приложений

    // Инициализация ProcessManagementUtils для использования его методов обнаружения процессов
    this.processManager = new ProcessManagementUtils({ logger: this.logger });
    this.healthCheckManager = new HealthCheckManager(this.config, this.logger);
    this.portMonitoringManager = new PortMonitoringManager(this.config, this.logger);
  }

  /**
   * Выполняет HTTP Health Check по указанному URL.
   * @param {string} url - URL для проверки здоровья.
   * @returns {Promise<object>} Результат проверки: { ok: boolean, status?: number, message: string }
   */
  async checkUrl(url) {
    if (!this.config.enabled) {
      return { ok: true, message: 'Monitoring disabled' };
    }
    return this.healthCheckManager.checkUrl(url);
  }

  /**
   * Проверяет, слушает ли процесс указанный порт через netstat (нативная реализация)
   * @private
   */
  async _checkPortWithNetstatNative(port) {
    return this.portMonitoringManager._checkPortWithNetstatNative(port);
  }

  /**
   * Проверяет, слушает ли порт какой-либо процесс.
   * @param {number} port - Номер порта для проверки.
   * @returns {Promise<boolean>} true, если порт занят, false если свободен или произошла ошибка.
   */
  async checkPortListening(port) {
    if (!this.config.enabled) {
      return false; // Если мониторинг выключен, предполагаем, что порт свободен для простоты
    }
    return this.portMonitoringManager.checkPortListening(port);
  }

  /**
   * Убивает процесс по порту.
   * @param {number} port - Номер порта.
   * @returns {Promise<object>} Результат операции.
   */
  async killProcessByPort(port) {
    return this.portMonitoringManager.killProcessByPort(port);
  }

  /**
   * Проверяет health endpoint с использованием HTTP модуля Node.js.
   * @param {string} url - URL для проверки здоровья.
   * @param {number} timeout - Таймаут в мс.
   * @returns {Promise<object>} Результат проверки: { ok: boolean, statusCode?: number, error?: string }.
   */
  async checkHealthEndpoint(url, timeout = this.config.timeout) {
    return this.healthCheckManager.checkHealthEndpoint(url, timeout);
  }

  /**
   * Пытается обнаружить запущенные PIDы для сервиса, используя различные методы.
   * @param {string} serviceId - Идентификатор сервиса.
   * @param {object} config - Конфигурация сервиса (может содержать порты, команды и т.д.).
   * @returns {Promise<Array<number>>} Массив найденных PIDов.
   */
  async detectRunningPids(serviceId, config) {
    if (!this.config.enabled) {
      return [];
    }
    try {
      // 0) Попробуем прочитать PID из файла runtime/<serviceId>.pid
      const fromPidFile = await this._checkPidFile(serviceId);
      if (fromPidFile.length) {
        this.logger.debug(`[MonitoringUtils] detect[pidfile] id=${serviceId} pids=${fromPidFile.join(',')}`);
        return fromPidFile;
      }

      const mode = this._pickModeFromConfig(config); // Вспомогательный метод для выбора режима
      const ports = this.processManager.extractCandidatePorts(config, mode);
      const hints = this._buildDetectionHints(serviceId, config, mode);
      
      // 1) по портам
      const byPorts = await this._findPidsByPorts(ports);
      if (byPorts.length) {
        this.logger.debug(`[MonitoringUtils] detect[ports] id=${serviceId} pids=${byPorts.join(',')}`);
        return Array.from(new Set(byPorts));
      }
      // 2) PowerShell (Windows)
      if (os.platform() === 'win32') {
        const byPs = await this._findPidsViaPowerShell(hints.exe, hints.contains);
        if (byPs.length) {
          this.logger.debug(`[MonitoringUtils] detect[ps] id=${serviceId} pids=${byPs.join(',')}`);
          return Array.from(new Set(byPs));
        }
      }
      
      // 3) Fallback к универсальному поиску процессов по исполняемому файлу и аргументам
      const byGenericSearch = await this.processManager.findProcesses({
        name: hints.exe,
        commandIncludes: hints.contains
      });

      if (byGenericSearch.length) {
        this.logger.debug(`[MonitoringUtils] detect[generic] id=${serviceId} pids=${byGenericSearch.join(',')}`);
      }
      return Array.from(new Set(byGenericSearch));

    } catch (error) {
      this.logger.error(`[MonitoringUtils] Error detecting running PIDs for service ${serviceId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Комплексная проверка здоровья сервиса с портом.
   * @param {object} serviceConfig - Конфигурация сервиса (должна содержать port и healthUrl).
   * @returns {Promise<object>} Объект статуса здоровья сервиса.
   */
  async checkServiceHealth(serviceConfig) {
    return this.healthCheckManager.checkServiceHealth(serviceConfig, this.portMonitoringManager._checkPortWithNetstatNative.bind(this.portMonitoringManager));
  }

  /**
   * Получает метрики мониторинга.
   * @returns {object} Объект с текущими метриками.
   */
  getMetrics() {
    // Дополнительные метрики можно собирать здесь
    this.metrics.timestamp = Date.now();
    this.metrics.uptime = process.uptime();
    this.metrics.memoryUsage = process.memoryUsage();
    this.metrics.cpuUsage = os.loadavg(); // Нагрузка CPU
    return this.metrics;
  }

  /**
   * Запускает цикл проверки здоровья всех отслеживаемых сервисов.
   * @param {Array<object>} servicesToMonitor - Массив объектов сервисов, каждый из которых должен иметь id, config.healthUrl и config.autoRestart.
   * @param {function} onServiceStatusChange - Колбэк, вызываемый при изменении статуса сервиса.
   */
  startHealthCheckCycle(servicesToMonitor, onServiceStatusChange) {
    if (!this.config.enabled) {
      this.logger.info('[MonitoringUtils] Health check cycle disabled.');
      return;
    }

    this.logger.info('[MonitoringUtils] Starting health check cycle...');

    // Очищаем существующий таймер, если он есть
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      for (const service of servicesToMonitor) {
        const currentMode = service.config?.startCommands?.find(m => m.id === service.modeId) || service.config?.startCommands?.[0];
        const healthUrl = currentMode?.healthCheckUrl || service.config?.healthUrl;
        const autoRestart = service.config?.autoRestart;

        let newHealth = { ok: false, message: 'Not checked' };
        if (healthUrl) {
          newHealth = await this.checkUrl(healthUrl);
        }

        let processRunning = false;
        const detectedPids = await this.detectRunningPids(service.id, service.config);
        processRunning = detectedPids.length > 0;

        const port = (service.config && (currentMode?.port || service.config.port || (service.config.ports && service.config.ports[0] && service.config.ports[0].number))) ?
          Number(currentMode?.port || service.config.port || (service.config.ports && service.config.ports[0] && service.config.ports[0].number)) : null;
        const isListening = port ? await this.checkPortListening(port) : null;

        let newStatus = service.status;
        if (!processRunning) {
          newStatus = 'failed_to_start';
          newHealth = { ok: false, message: 'Process not found - startup error' };
        } else if (newHealth.ok) {
          newStatus = 'running';
        } else if (isListening) {
          newStatus = 'running_no_health';
        } else {
          newStatus = 'stopped';
        }

        // Если статус или здоровье изменились, вызываем колбэк
        if (newStatus !== service.status || JSON.stringify(newHealth) !== JSON.stringify(service.health)) {
          service.status = newStatus;
          service.health = newHealth;
          service.lastCheck = Date.now();
          onServiceStatusChange(service.id, { status: newStatus, health: newHealth, processRunning, isListening, autoRestart, pid: detectedPids[0] || null });
        }
      }
    }, this.config.checkInterval);
  }

  /**
   * Останавливает цикл проверки здоровья.
   */
  stopHealthCheckCycle() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      this.logger.info('[MonitoringUtils] Health check cycle stopped.');
    }
  }

  /**
   * Приватный метод: Читает PID из файла.
   * @private
   * @param {string} serviceId - Идентификатор сервиса.
   * @returns {Promise<Array<number>>} Массив PIDов.
   */
  async _checkPidFile(serviceId) {
    const pidPath = path.join(this.config.pidFilePath, `${serviceId}.pid`);
    try {
      if (!fsSync.existsSync(pidPath)) return [];
      const raw = (await fs.readFile(pidPath, 'utf8')).trim();
      const pid = Number(raw);
      if (!pid || isNaN(pid)) return [];
      // Проверим, существует ли процесс
      try {
        process.kill(pid, 0);
        return [pid];
      } catch (e) { return []; }
    } catch (e) {
      this.logger.warn(`[MonitoringUtils] Error reading PID file for ${serviceId}: ${e.message}`);
      return [];
    }
  }

  /**
   * Приватный метод: Ищет PIDы по списку портов.
   * @private
   * @param {Array<number>} ports - Массив портов.
   * @returns {Promise<Array<number>>} Массив найденных PIDов.
   */
  async _findPidsByPorts(ports) {
    if (!ports || ports.length === 0) return [];
    const pids = [];
    for (const port of ports) {
      const result = await this.processManager.findProcessByPort(port);
      if (result.success) {
        pids.push(result.pid);
      }
    }
    return Array.from(new Set(pids));
  }

  /**
   * Приватный метод: Ищет PIDы через PowerShell (только для Windows).
   * @private
   * @param {string|null} exeName - Имя исполняемого файла (например, 'node.exe').
   * @param {Array<string>} containsList - Список строк, которые должны содержаться в командной строке процесса.
   * @returns {Promise<Array<number>>} Массив найденных PIDов.
   */
  async _findPidsViaPowerShell(exeName, containsList) {
    if (os.platform() !== 'win32') return [];
    const psPath = 'pwsh';
    const cmd = [
      "$ErrorActionPreference='SilentlyContinue'",
      "Get-CimInstance Win32_Process | Select-Object ProcessId,Name,CommandLine,ExecutablePath | ConvertTo-Csv -NoTypeInformation"
    ].join('; ');
    const encoded = Buffer.from(cmd, 'utf16le').toString('base64');
    return new Promise((resolve) => {
      execFile(psPath, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], { windowsHide: true, timeout: this.config.timeout }, (err, stdout) => {
        if (err || !stdout) { this.logger.warn(`[MonitoringUtils] PowerShell process detection error: ${err ? err.message : 'No stdout'}`); return resolve([]); }
        const lines = stdout.split(/\r?\n/).filter(Boolean);
        const header = lines.shift();
        if (!header) return resolve([]);
        const cols = header.split(',').map(s => s.replace(/^"|"$/g, ''));
        const rows = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const parts = [];
          let cur = '';
          let inQ = false;
          for (let j = 0; j < line.length; j++) {
            const ch = line[j];
            if (ch === '"') { inQ = !inQ; continue; }
            if (ch === ',' && !inQ) { parts.push(cur); cur=''; }
            else { cur += ch; }
          }
          parts.push(cur);
          const obj = {};
          for (let k = 0; k < cols.length; k++) obj[cols[k]] = (parts[k] || '').trim();
          rows.push({
            pid: Number(obj.ProcessId) || null,
            name: obj.Name || '',
            commandLine: obj.CommandLine || '',
            exe: obj.ExecutablePath || ''
          });
        }
        const exeLower = (exeName || '').toLowerCase();
        const needles = (containsList || []).map(s => String(s).toLowerCase()).filter(Boolean);
        const pids = rows.filter(r => {
          const okExe = exeLower ? ((r.exe || r.name || '').toLowerCase().includes(exeLower)) : true;
          if (!okExe) return false;
          if (!needles.length) return true;
          const cl = (r.commandLine || '').toLowerCase();
          return needles.some(n => cl.includes(n));
        }).map(r => r.pid).filter(Boolean);
        resolve(Array.from(new Set(pids)));
      });
    });
  }

  /**
   * Приватный метод: Строит подсказки для обнаружения процесса на основе конфигурации сервиса.
   * @private
   * @param {string} serviceId - Идентификатор сервиса.
   * @param {object} config - Конфигурация сервиса.
   * @param {object|null} mode - Текущий режим запуска сервиса.
   * @returns {object} Объект с подсказками: { exe: string|null, contains: Array<string> }.
   */
  _buildDetectionHints(serviceId, config, mode) {
    const hints = { exe: null, contains: [] };
    const cwd = (mode && mode.cwd) || config.cwd || config.appPath || '';
    if (cwd) hints.contains.push(String(cwd));
    const command = mode && mode.command ? String(mode.command) : '';
    if (/\\bvite\\b/i.test(command)) hints.contains.push('vite');
    if (/\\bartisan\\b/i.test(command)) hints.contains.push('artisan');
    if (/\\bnpm\\s+run\\s+([\\w:-]+)/i.test(command)) {
      const m = command.match(/\\bnpm\\s+run\\s+([\\w:-]+)/i);
      if (m && m[1]) hints.contains.push(m[1]);
    }
    if (Array.isArray(config && config.detectContains)) {
      for (const s of config.detectContains) {
        if (s && typeof s === 'string') hints.contains.push(s);
      }
    }
    try {
      const pathLike = (command.match(/([\\w@\\/\\\\.\-]+\\.(?:m?js|cjs|ts))/gi) || []);
      for (const t of pathLike) {
        const rel = t;
        const abs = cwd ? path.resolve(cwd, t) : t; // Используем path.resolve
        const base = path.basename(t);
        [rel, abs, base].forEach(s => { if (s && !hints.contains.includes(s)) hints.contains.push(s); });
      }
    }
    catch {}
    const svcType = (config && config.type) ? String(config.type).toLowerCase() : 'node';
    if (!hints.exe) {
      if (svcType === 'node') hints.exe = 'node.exe';
      else if (svcType === 'php') hints.exe = 'php.exe';
    }
    return hints;
  }

  /**
   * Приватный метод: Выбирает режим запуска сервиса из конфигурации.
   * @private
   * @param {object} config - Конфигурация сервиса.
   * @param {string|null} modeId - Идентификатор режима (опционально).
   * @returns {object|null} Выбранный режим запуска или null.
   */
  _pickModeFromConfig(config, modeId = null) {
    if (!config || !Array.isArray(config.startCommands) || config.startCommands.length === 0) {
      return null;
    }
    if (modeId) {
      return config.startCommands.find(m => m.id === modeId) || null;
    }
    return config.startCommands.find(m => m.enabled === true) || config.startCommands[0] || null;
  }

  /**
   * Получает полный статус портов и приложений.
   * @returns {Promise<object>} Объект, содержащий информацию о портах, приложениях, конфликтах и переменных окружения.
   */
  async getPortStatus() {
    return this.portMonitoringManager.getPortStatus();
  }
 
  /**
   * Сканирует активные порты с помощью netstat.
   * @returns {Promise<Array<object>>} Массив объектов портов.
   */
  async scanActivePorts() {
    return this.portMonitoringManager.scanActivePorts();
  }
 
  /**
   * Получает конфигурацию приложений из файла.
   * @returns {Promise<object>} Объект конфигурации с массивом apps.
   */
  async getAppsConfig() {
    return this.portMonitoringManager.getAppsConfig();
  }
 
  /**
   * Сопоставляет активные порты с конфигурацией приложений.
   * @param {Array<object>} activePorts - Массив активных портов.
   * @param {Array<object>} appsConfigArray - Массив конфигураций приложений.
   * @returns {Array<object>} Массив приложений с их статусом и портами.
   */
  async mapPortsToApps(activePorts, appsConfigArray) {
    return this.portMonitoringManager.mapPortsToApps(activePorts, appsConfigArray);
  }
 
  /**
   * Находит конфликты портов.
   * @param {Array<object>} activePorts - Массив активных портов.
   * @returns {Array<object>} Массив объектов конфликтов.
   */
  findPortConflicts(activePorts) {
    return this.portMonitoringManager.findPortConflicts(activePorts);
  }
 
  /**
   * Генерирует переменные окружения из активных портов.
   * @param {Array<object>} activePorts - Массив активных портов.
   * @returns {object} Объект с переменными окружения.
   */
  generateEnvFromPorts(activePorts) {
    return this.portMonitoringManager.generateEnvFromPorts(activePorts);
  }
}

const monitoringUtils = new MonitoringUtils();

module.exports = { MonitoringUtils, monitoringUtils };
