/**
 * Unified Leader Election Utilities Library
 * Объединенная библиотека утилит для управления выборами лидера и heartbeat в распределенной системе
 */

const EventEmitter = require('eventemitter3');
const { LoggingUtils } = require('../logging'); // Зависимость от LoggingUtils
const { ErrorHandlingUtils } = require('../error-handling'); // Зависимость от ErrorHandlingUtils

class LeaderElectionManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || new LoggingUtils();
    this.errorHandler = options.errorHandler || new ErrorHandlingUtils({ logger: this.logger });
    this.daemonId = options.daemonId; // Уникальный идентификатор текущего демона
    this.electionTimeout = options.electionTimeout || 5000; // Таймаут для выборов лидера
    this.heartbeatInterval = options.heartbeatInterval || 3000; // Интервал отправки Heartbeat
    this.workers = options.workers; // Map рабочих процессов из ClusterManager
    this.mcpConnections = options.mcpConnections; // Map соединений с другими MCP серверами

    this.isLeader = false;
    this.currentLeader = null;
    this.leaderElectionTimer = null;
    this.heartbeatTimer = null;
  }

  /**
   * Запускает процесс выборов лидера.
   */
  startLeaderElection() {
    if (this.leaderElectionTimer) {
      clearInterval(this.leaderElectionTimer);
    }
    this.leaderElectionTimer = setInterval(async () => {
      await this.electLeader();
    }, this.electionTimeout);
    this.logger.info('[LeaderElectionManager] Лидер-выборы запущены.');
  }

  /**
   * Выполняет выборы лидера.
   * Логика: выбирается кандидат с наименьшим ID.
   */
  async electLeader() {
    try {
      // Включаем себя и всех известных рабочих в список кандидатов
      const candidates = [this.daemonId, ...Array.from(this.workers.keys())];
      // TODO: Добавить сюда ID других MCP серверов, если они участвуют в выборах лидера
      
      if (candidates.length === 0) {
        this.logger.warn('[LeaderElectionManager] Нет кандидатов для выборов лидера.');
        return;
      }

      const sortedCandidates = candidates.sort(); // Сортируем по ID для детерминированного выбора
      const newLeader = sortedCandidates[0];

      if (newLeader !== this.currentLeader) {
        this.currentLeader = newLeader;
        this.isLeader = newLeader === this.daemonId;

        this.logger.info('[LeaderElectionManager] Новый лидер выбран', {
          leader: newLeader,
          isLeader: this.isLeader,
          candidates: sortedCandidates
        });

        this.emit('leaderChanged', { leader: newLeader, isLeader: this.isLeader });
      }
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'LeaderElectionManager.electLeader' });
    }
  }

  /**
   * Запускает отправку Heartbeat сообщений.
   */
  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval);
    this.logger.info('[LeaderElectionManager] Heartbeat запущен.');
  }

  /**
   * Отправляет Heartbeat сообщение.
   */
  sendHeartbeat() {
    const heartbeat = {
      daemonId: this.daemonId,
      timestamp: Date.now(),
      isLeader: this.isLeader,
      workersCount: this.workers ? this.workers.size : 0, // Проверка на null/undefined
      mcpConnectionsCount: this.mcpConnections ? this.mcpConnections.size : 0 // Проверка на null/undefined
    };

    this.emit('heartbeat', heartbeat);

    // Отправляем Heartbeat всем рабочим процессам
    if (this.workers) {
      for (const worker of this.workers.values()) {
        if (worker.send) {
          worker.send({ type: 'heartbeat', data: heartbeat });
        }
      }
    }
    // TODO: Отправлять Heartbeat другим MCP серверам через mcpConnections
  }

  /**
   * Передает лидерство другому демону.
   * @param {string} targetDaemonId - ID демона, которому передается лидерство.
   * @returns {boolean} true, если передача началась, false если текущий демон не является лидером.
   */
  async transferLeadership(targetDaemonId) {
    if (!this.isLeader) {
      this.logger.warn('[LeaderElectionManager] Не лидер, не могу передать лидерство.');
      return false;
    }

    try {
      this.logger.info('[LeaderElectionManager] Передача лидерства', { targetDaemonId });

      // Отправляем сообщение целевому демону о том, что он становится лидером
      // (реализация зависит от механизма обмена сообщениями между демонами)
      this.emit('leadershipTransfer', { targetDaemonId });

      this.isLeader = false;
      this.currentLeader = targetDaemonId;
      this.stop(); // Останавливаем свои циклы как лидера
      return true;
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'LeaderElectionManager.transferLeadership' });
      return false;
    }
  }

  /**
   * Останавливает процессы выборов лидера и Heartbeat.
   */
  stop() {
    if (this.leaderElectionTimer) {
      clearInterval(this.leaderElectionTimer);
      this.leaderElectionTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.logger.info('[LeaderElectionManager] Лидер-выборы и Heartbeat остановлены.');
  }

  /**
   * Устанавливает текущий статус лидерства.
   * @param {boolean} isLeader - true, если текущий демон является лидером.
   * @param {string} leaderId - ID текущего лидера.
   */
  setLeaderStatus(isLeader, leaderId) {
    this.isLeader = isLeader;
    this.currentLeader = leaderId;
    this.logger.info('[LeaderElectionManager] Статус лидера обновлен', { isLeader, leaderId });
    this.emit('leaderChanged', { leader: leaderId, isLeader: isLeader });
  }
}

export { LeaderElectionManager, leaderElectionManager: new LeaderElectionManager() };
