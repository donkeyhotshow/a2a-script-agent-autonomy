const { consoleUtils } = require('@libs/logging-monitoring/logging/console-utils');

class PidQueueManager {
  constructor(persistenceManager, logger) {
    this.persistenceManager = persistenceManager;
    this.logger = logger;
  }

  async addToQueue(ticketId, daemonName, reason = 'limit_reached') {
    try {
      const currentData = await this.persistenceManager.readPidData();

      if (!currentData.queue.waiting.includes(ticketId)) {
        currentData.queue.waiting.push(ticketId);
      }

      if (currentData.daemons[daemonName]) {
        currentData.daemons[daemonName] = {
          ...currentData.daemons[daemonName],
          status: 'queued',
          queuePosition: currentData.queue.waiting.indexOf(ticketId) + 1,
          waitingSince: new Date().toISOString(),
          queueReason: reason
        };
      }

      currentData.lastUpdate = new Date().toISOString();
      await this.persistenceManager.writePidData(currentData);

      this.logger.log(`⏳ Тикет ${ticketId} добавлен в очередь (позиция: ${currentData.queue.waiting.length})`);

      return {
        position: currentData.queue.waiting.length,
        reason,
        waitingSince: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`❌ Ошибка добавления в очередь:`, error);
      throw error;
    }
  }

  async removeFromQueue(ticketId) {
    try {
      const currentData = await this.persistenceManager.readPidData();

      const index = currentData.queue.waiting.indexOf(ticketId);
      if (index !== -1) {
        currentData.queue.waiting.splice(index, 1);

        for (const daemonName of Object.keys(currentData.daemons)) {
          const daemon = currentData.daemons[daemonName];
          if (daemon.status === 'queued' && daemon.queuePosition) {
            const newPosition = currentData.queue.waiting.indexOf(daemon.ticketId) + 1;
            if (newPosition > 0) {
              daemon.queuePosition = newPosition;
            } else {
              delete daemon.queuePosition;
              delete daemon.waitingSince;
              delete daemon.queueReason;
            }
          }
        }

        currentData.lastUpdate = new Date().toISOString();
        await this.persistenceManager.writePidData(currentData);

        this.logger.log(`✅ Тикет ${ticketId} удален из очереди`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`❌ Ошибка удаления из очереди:`, error);
      throw error;
    }
  }

  async getNextFromQueue() {
    try {
      const currentData = await this.persistenceManager.readPidData();

      if (currentData.queue.waiting.length > 0) {
        const nextTicketId = currentData.queue.waiting[0];

        const daemonName = Object.keys(currentData.daemons).find(
          name => currentData.daemons[name].ticketId === nextTicketId
        );

        if (daemonName) {
          return {
            ticketId: nextTicketId,
            daemonName,
            daemonInfo: currentData.daemons[daemonName]
          };
        }
      }

      return null;
    } catch (error) {
      this.logger.error('❌ Ошибка получения следующего тикета из очереди:', error);
      return null;
    }
  }

  async canStartDaemon(daemonName) {
    try {
      const currentData = await this.persistenceManager.readPidData();

      const existingDaemon = currentData.daemons[daemonName];
      if (existingDaemon && existingDaemon.status === 'running') {
        return {
          canStart: false,
          reason: 'already_running',
          existingPid: existingDaemon.pid,
          existingTicketId: existingDaemon.ticketId
        };
      }

      const runningCount = Object.values(currentData.daemons).filter(
        d => d.status === 'running'
      ).length;

      if (runningCount >= currentData.queue.maxConcurrent) {
        return {
          canStart: false,
          reason: 'limit_reached',
          runningCount,
          maxConcurrent: currentData.queue.maxConcurrent
        };
      }

      return { canStart: true };
    } catch (error) {
      this.logger.error('❌ Ошибка проверки возможности запуска:', error);
      return { canStart: false, reason: 'error', error: error.message };
    }
  }

  async getQueueInfo() {
    try {
      const currentData = await this.persistenceManager.readPidData();

      return {
        active: currentData.queue.active,
        waiting: currentData.queue.waiting,
        maxConcurrent: currentData.queue.maxConcurrent,
        processingOrder: currentData.queue.processingOrder,
        stats: {
          totalWaiting: currentData.queue.waiting.length,
          activeCount: currentData.queue.active ? 1 : 0
        }
      };
    } catch (error) {
      this.logger.error('❌ Ошибка получения информации об очереди:', error);
      return null;
    }
  }
}

module.exports = { PidQueueManager };
