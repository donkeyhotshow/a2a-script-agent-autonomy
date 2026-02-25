const { consoleUtils } = require('@libs/logging-monitoring/logging/console-utils');
const { spawn } = require('child_process');

class PidDaemonManager {
  constructor(persistenceManager, logger) {
    this.persistenceManager = persistenceManager;
    this.logger = logger;
  }

  async validateRunningProcesses(daemons) {
    const updatedDaemons = { ...daemons };
    let hasChanges = false;

    for (const [daemonName, daemonInfo] of Object.entries(daemons)) {
      if (daemonInfo.status === 'running' && daemonInfo.pid) {
        const isAlive = await this.isProcessAlive(daemonInfo.pid);

        if (!isAlive) {
          this.logger.log(`⚠️ Процесс ${daemonName} (PID: ${daemonInfo.pid}) не отвечает`);
          updatedDaemons[daemonName] = {
            ...daemonInfo,
            status: 'failed',
            failedAt: new Date().toISOString(),
            reason: 'process_died'
          };
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      const currentData = await this.persistenceManager.readPidData();
      currentData.daemons = updatedDaemons;
      await this.persistenceManager.writePidData(currentData);
    }
    return updatedDaemons;
  }

  async isProcessAlive(pid) {
    try {
      const checkCommand = `Get-Process -Id ${pid} -ErrorAction SilentlyContinue`;
      const process = spawn('powershell', ['-Command', checkCommand], {
        stdio: 'pipe',
        shell: true
      });

      return new Promise((resolve) => {
        process.on('close', (code) => {
          resolve(code === 0);
        });
      });
    } catch (error) {
      return false;
    }
  }

  async registerDaemon(daemonName, ticketId, config = {}) {
    try {
      const daemonInfo = {
        pid: null,
        ticketId,
        status: 'pending',
        startTime: null,
        restartCount: 0,
        port: config.port || null,
        command: config.command || '',
        cwd: config.cwd || '',
        env: config.env || {},
        args: config.args || [],
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          createdBy: config.createdBy || 'system'
        }
      };

      await this.updateDaemon(daemonName, daemonInfo);

      this.logger.log(`📝 Зарегистрирован демон: ${daemonName} (Ticket: ${ticketId})`);

      return daemonInfo;
    } catch (error) {
      this.logger.error(`❌ Ошибка регистрации демона ${daemonName}:`, error);
      throw error;
    }
  }

  async updateDaemonStatus(daemonName, status, additionalData = {}) {
    try {
      const currentData = await this.persistenceManager.readPidData();
      const daemon = currentData.daemons[daemonName];

      if (!daemon) {
        throw new Error(`Демон ${daemonName} не найден`);
      }

      const updatedDaemon = {
        ...daemon,
        status,
        metadata: {
          ...daemon.metadata,
          updated: new Date().toISOString()
        },
        ...additionalData
      };

      switch (status) {
        case 'running':
          updatedDaemon.startTime = new Date().toISOString();
          break;
        case 'failed':
          updatedDaemon.failedAt = new Date().toISOString();
          break;
        case 'stopped':
          updatedDaemon.stoppedAt = new Date().toISOString();
          break;
      }

      await this.updateDaemon(daemonName, updatedDaemon);

      this.logger.log(`🔄 Обновлен статус демона ${daemonName}: ${status}`);

      return updatedDaemon;
    } catch (error) {
      this.logger.error(`❌ Ошибка обновления статуса демона ${daemonName}:`, error);
      throw error;
    }
  }

  async updateDaemon(daemonName, daemonInfo) {
    try {
      const currentData = await this.persistenceManager.readPidData();

      currentData.daemons[daemonName] = daemonInfo;
      currentData.lastUpdate = new Date().toISOString();

      await this.persistenceManager.writePidData(currentData);

      return daemonInfo;
    } catch (error) {
      this.logger.error(`❌ Ошибка обновления демона ${daemonName}:`, error);
      throw error;
    }
  }

  async getDaemon(daemonName) {
    try {
      const data = await this.persistenceManager.readPidData();
      return data.daemons[daemonName] || null;
    } catch (error) {
      this.logger.error(`❌ Ошибка получения демона ${daemonName}:`, error);
      return null;
    }
  }

  async getAllDaemons() {
    try {
      const data = await this.persistenceManager.readPidData();
      return data.daemons;
    } catch (error) {
      this.logger.error('❌ Ошибка получения всех демонов:', error);
      return {};
    }
  }

  async removeDaemon(daemonName) {
    try {
      const currentData = await this.persistenceManager.readPidData();

      if (currentData.daemons[daemonName]) {
        delete currentData.daemons[daemonName];
        currentData.lastUpdate = new Date().toISOString();

        await this.persistenceManager.writePidData(currentData);

        this.logger.log(`🗑️ Удален демон: ${daemonName}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`❌ Ошибка удаления демона ${daemonName}:`, error);
      throw error;
    }
  }

  async cleanupCompletedDaemons() {
    try {
      const currentData = await this.persistenceManager.readPidData();
      let hasChanges = false;

      for (const [daemonName, daemonInfo] of Object.entries(currentData.daemons)) {
        if (['completed', 'failed', 'cancelled'].includes(daemonInfo.status)) {
          delete currentData.daemons[daemonName];
          hasChanges = true;
          this.logger.log(`🧹 Удален завершенный демон: ${daemonName}`);
        }
      }

      if (hasChanges) {
        currentData.lastUpdate = new Date().toISOString();
        await this.persistenceManager.writePidData(currentData);
      }
      return hasChanges;
    } catch (error) {
      this.logger.error('❌ Ошибка очистки завершенных демонов:', error);
      throw error;
    }
  }
}

module.exports = { PidDaemonManager };
