const { spawn } = require('child_process');
const path = require('path');
const FileSystemUtilsFactory = require('@libs/system/file-operations/index.cjs');

class ServiceProcessManager {
  constructor(logger) {
    this.logger = logger;
    this.runningServices = new Map(); // serviceId -> { process, config, startTime }
    this.fileSystem = FileSystemUtilsFactory(this.logger); // Corrected instantiation
  }

  async startServiceProcess(serviceId, serviceConfig, commandConfig) {
    const { command, args = [], cwd, env = {}, logFile, port } = commandConfig;
    const resolvedCwd = path.resolve(cwd);

    try {
      if (this.runningServices.has(serviceId)) {
        this.logger.warn(`[ServiceProcessManager] Service ${serviceId} already running.`);
        return {
          success: false,
          message: 'Service already running.',
          status: this.getServiceProcessStatus(serviceId)
        };
      }

      if (!await this.fileSystem.exists(resolvedCwd)) {
        throw new Error(`Working directory does not exist: ${resolvedCwd}`);
      }

      const childEnv = { ...process.env, ...env };
      const process = spawn(command, args, {
        cwd: resolvedCwd,
        env: childEnv,
        detached: true, // Позволяет дочернему процессу работать независимо от родительского
        stdio: 'ignore' // Отключает стандартные потоки, чтобы не блокировать родителя
      });

      process.unref(); // Отвязываем родительский процесс

      this.runningServices.set(serviceId, {
        process,
        config: serviceConfig,
        commandConfig,
        startTime: new Date(),
        logPath: logFile ? path.join(resolvedCwd, logFile) : null
      });

      this.logger.info(`[ServiceProcessManager] Service ${serviceId} started (PID: ${process.pid}).`);

      return {
        success: true,
        message: `Service ${serviceId} started.`,
        pid: process.pid,
        status: 'running',
        startTime: this.runningServices.get(serviceId).startTime
      };
    } catch (error) {
      this.logger.error(`[ServiceProcessManager] Error starting service ${serviceId}: ${error.message}`);
      return {
        success: false,
        message: `Failed to start service: ${error.message}`,
        error: error.message
      };
    }
  }

  async stopServiceProcess(serviceId) {
    const serviceInfo = this.runningServices.get(serviceId);
    if (!serviceInfo) {
      this.logger.warn(`[ServiceProcessManager] Service ${serviceId} not running.`);
      return {
        success: false,
        message: 'Service not running.'
      };
    }

    const { process: childProcess, config } = serviceInfo;

    try {
      this.logger.info(`[ServiceProcessManager] Attempting to stop service ${serviceId} (PID: ${childProcess.pid}).`);

      if (process.platform === 'win32') {
        // На Windows используем taskkill
        await this._killWindowsProcess(childProcess.pid);
      } else {
        // На Unix-подобных системах отправляем SIGTERM
        process.kill(childProcess.pid, 'SIGTERM');

        // Даем немного времени для graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Если процесс все еще жив, принудительно завершаем его
        if (await this._isProcessRunning(childProcess.pid)) {
          this.logger.warn(`[ServiceProcessManager] Service ${serviceId} (PID: ${childProcess.pid}) did not terminate gracefully, sending SIGKILL.`);
          process.kill(childProcess.pid, 'SIGKILL');
        }
      }

      this.runningServices.delete(serviceId);
      this.logger.info(`[ServiceProcessManager] Service ${serviceId} stopped.`);
      return {
        success: true,
        message: `Service ${serviceId} stopped.`
      };
    } catch (error) {
      this.logger.error(`[ServiceProcessManager] Error stopping service ${serviceId}: ${error.message}`);
      return {
        success: false,
        message: `Failed to stop service: ${error.message}`,
        error: error.message
      };
    }
  }

  async restartServiceProcess(serviceId, serviceConfig, commandConfig) {
    this.logger.info(`[ServiceProcessManager] Restarting service ${serviceId}.`);
    await this.stopServiceProcess(serviceId);
    return this.startServiceProcess(serviceId, serviceConfig, commandConfig);
  }

  getServiceProcessStatus(serviceId) {
    const serviceInfo = this.runningServices.get(serviceId);
    if (!serviceInfo) {
      return 'stopped';
    }

    // Дополнительная проверка, чтобы убедиться, что процесс действительно запущен
    try {
      process.kill(serviceInfo.process.pid, 0); // Проверяем, существует ли процесс
      return 'running';
    } catch (error) {
      if (error.code === 'ESRCH') {
        this.logger.warn(`[ServiceProcessManager] Process for ${serviceId} (PID: ${serviceInfo.process.pid}) not found, removing from running services.`);
        this.runningServices.delete(serviceId);
        return 'stopped';
      }
      this.logger.error(`[ServiceProcessManager] Error checking process status for ${serviceId}: ${error.message}`);
      return 'unknown';
    }
  }

  async _isProcessRunning(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return error.code !== 'ESRCH';
    }
  }

  async _killWindowsProcess(pid) {
    return new Promise((resolve, reject) => {
      const command = `taskkill /PID ${pid} /F`;
      spawn('cmd', ['/c', command], { stdio: 'inherit' })
        .on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`taskkill failed with code ${code}`));
          }
        })
        .on('error', (err) => reject(err));
    });
  }
}

module.exports = { ServiceProcessManager };
