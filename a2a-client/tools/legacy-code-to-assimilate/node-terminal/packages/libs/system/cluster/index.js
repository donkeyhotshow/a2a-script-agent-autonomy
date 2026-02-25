/**
 * Unified Cluster Management Utilities Library
 * Объединенная библиотека утилит для управления кластером Node.js процессов
 */

const cluster = require('cluster');
const os = require('os');
const path = require('path');
const EventEmitter = require('eventemitter3'); // Используем eventemitter3 для единообразия
const { LoggingUtils } = require('../../core/logging'); // Зависимость от LoggingUtils
const { ErrorHandlingUtils } = require('../../error-management/error-handler'); // Зависимость от ErrorHandlingUtils

class ClusterManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || new LoggingUtils();
    this.errorHandler = options.errorHandler || new ErrorHandlingUtils({ logger: this.logger });
    this.maxWorkers = options.maxWorkers || os.cpus().length;
    this.daemonScript = options.daemonScript;
    this.workers = new Map(); // Карта рабочих процессов
    this.workerCount = 0;
  }

  /**
   * Запускает мастер-процесс и форкает рабочих.
   */
  async startMaster() {
    if (!cluster.isMaster) {
      this.logger.warn('[ClusterManager] startMaster может быть вызван только из мастер-процесса.');
      return;
    }
    this.logger.info(`Мастер-процесс ${process.pid} запускает ${this.maxWorkers} рабочих процессов`);
    for (let i = 0; i < this.maxWorkers; i++) {
      this.forkWorker();
    }

    cluster.on('exit', (worker, code, signal) => {
      this.logger.warn(`Рабочий процесс ${worker.process.pid} умер (code: ${code}, signal: ${signal}). Перезапускаю...`);
      this.workers.delete(worker.id);
      this.workerCount--;
      this.forkWorker();
    });
  }

  /**
   * Форкает новый рабочий процесс.
   */
  forkWorker() {
    const worker = cluster.fork();
    this.workers.set(worker.id, worker);
    this.workerCount++;
    this.logger.info(`Запущен рабочий процесс ${worker.process.pid}, ID: ${worker.id}`);
    this.setupWorkerListeners(worker);
  }

  /**
   * Останавливает все рабочие процессы.
   */
  async stopWorkers() {
    this.logger.info('Остановка всех рабочих процессов...');
    for (const worker of this.workers.values()) {
      this.logger.info(`Завершение рабочего процесса ${worker.process.pid}`);
      worker.kill();
    }
    this.workers.clear();
    this.workerCount = 0;
  }

  /**
   * Настраивает слушателей событий для рабочего процесса.
   * @param {Worker} worker - Объект рабочего процесса.
   */
  setupWorkerListeners(worker) {
    worker.on('message', (msg) => {
      this.logger.debug(`Мастер получил сообщение от рабочего ${worker.process.pid}:`, msg);
      this.emit('workerMessage', worker.id, msg);
    });
    worker.on('error', (err) => {
      this.errorHandler.handleError(err, { context: `Worker ${worker.process.pid} error` });
    });
    worker.on('online', () => {
      this.logger.info(`Рабочий процесс ${worker.process.pid} онлайн.`);
      this.emit('workerOnline', worker.id);
    });
    worker.on('listening', (address) => {
      this.logger.info(`Рабочий процесс ${worker.process.pid} слушает на ${address.port}.`);
      this.emit('workerListening', worker.id, address);
    });
  }

  /**
   * Возвращает текущее количество рабочих процессов.
   * @returns {number}
   */
  getWorkersCount() {
    return this.workerCount;
  }

  /**
   * Отправляет сообщение всем рабочим процессам.
   * @param {any} message - Сообщение для отправки.
   */
  sendToAllWorkers(message) {
    for (const worker of this.workers.values()) {
      worker.send(message);
    }
  }

  /**
   * Отправляет сообщение конкретному рабочему процессу.
   * @param {number} workerId - ID рабочего процесса.
   * @param {any} message - Сообщение для отправки.
   * @returns {boolean} true, если сообщение отправлено, false если рабочий процесс не найден.
   */
  sendToWorker(workerId, message) {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.send(message);
      return true;
    }
    this.logger.warn(`Рабочий процесс с ID ${workerId} не найден для отправки сообщения.`);
    return false;
  }

  /**
   * Получает рабочий процесс по его ID.
   * @param {number} workerId - ID рабочего процесса.
   * @returns {Worker|undefined}
   */
  getWorker(workerId) {
    return this.workers.get(workerId);
  }
}

module.exports = { ClusterManager, clusterManager: new ClusterManager() };
