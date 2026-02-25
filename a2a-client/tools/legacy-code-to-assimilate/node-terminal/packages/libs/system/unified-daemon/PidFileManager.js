/**
 * PidFileManager - Управление единым PID файлом для всех демонов
 * Критически важные детали:
 * - Единый JSON файл для всех PID данных
 * - Атомарные операции записи
 * - Проверка активности процессов
 * - Очередь ожидания
 * - Логирование изменений
 */

const { fileSystemUtils } = require('@libs/system/file-operations/index.cjs');
const { consoleUtils } = require('@libs/logging-monitoring/logging/console-utils');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const { PidFilePersistence } = require('./src/PidFilePersistence');
const { PidDaemonManager } = require('./src/PidDaemonManager');
const { PidQueueManager } = require('./src/PidQueueManager');

class PidFileManager {
  constructor(pidFilePath = 'C:/apps/data/unified-daemon-pids.json') {
    this.pidFilePath = pidFilePath;
    this.persistenceManager = new PidFilePersistence(this.pidFilePath);
    this.daemonManager = new PidDaemonManager(this.persistenceManager, consoleUtils);
    this.queueManager = new PidQueueManager(this.persistenceManager, consoleUtils);

    this.isInitialized = false;
    this.stats = {
      totalDaemons: 0,
      runningDaemons: 0,
      queuedDaemons: 0,
      failedDaemons: 0,
      lastUpdate: null
    };
  }

  async initialize() {
    try {
      await this.persistenceManager.initializePersistence();
      const initialData = await this.persistenceManager.readPidData();
      await this.daemonManager.validateRunningProcesses(initialData.daemons);
      this.updateStats(initialData);
      this.isInitialized = true;
      consoleUtils.log('✅ PidFileManager инициализирован');
      return true;
    } catch (error) {
      consoleUtils.error('❌ Ошибка инициализации PidFileManager:', error);
      throw error;
    }
  }

  async createInitialPidFile() {
    return this.persistenceManager.createInitialPidFile();
  }

  async loadAndValidatePidData() {
    const data = await this.persistenceManager.readPidData();
    await this.daemonManager.validateRunningProcesses(data.daemons);
    this.updateStats(data);
    consoleUtils.log(`📊 Загружено ${Object.keys(data.daemons).length} демонов`);
    return data;
  }

  async isProcessAlive(pid) {
    return this.daemonManager.isProcessAlive(pid);
  }

  async registerDaemon(daemonName, ticketId, config = {}) {
    return this.daemonManager.registerDaemon(daemonName, ticketId, config);
  }

  async updateDaemonStatus(daemonName, status, additionalData = {}) {
    const updatedDaemon = await this.daemonManager.updateDaemonStatus(daemonName, status, additionalData);
    const currentData = await this.persistenceManager.readPidData();
    this.updateStats(currentData);
    return updatedDaemon;
  }

  async updateDaemon(daemonName, daemonInfo) {
    const updatedDaemon = await this.daemonManager.updateDaemon(daemonName, daemonInfo);
    const currentData = await this.persistenceManager.readPidData();
    this.updateStats(currentData);
    return updatedDaemon;
  }

  async getDaemon(daemonName) {
    return this.daemonManager.getDaemon(daemonName);
  }

  async getAllDaemons() {
    return this.daemonManager.getAllDaemons();
  }

  async removeDaemon(daemonName) {
    const result = await this.daemonManager.removeDaemon(daemonName);
    if (result) {
      const currentData = await this.persistenceManager.readPidData();
      this.updateStats(currentData);
    }
    return result;
  }

  async addToQueue(ticketId, daemonName, reason = 'limit_reached') {
    const result = await this.queueManager.addToQueue(ticketId, daemonName, reason);
    const currentData = await this.persistenceManager.readPidData();
    this.updateStats(currentData);
    return result;
  }

  async removeFromQueue(ticketId) {
    const result = await this.queueManager.removeFromQueue(ticketId);
    if (result) {
      const currentData = await this.persistenceManager.readPidData();
      this.updateStats(currentData);
    }
    return result;
  }

  async getNextFromQueue() {
    return this.queueManager.getNextFromQueue();
  }

  async canStartDaemon(daemonName) {
    return this.queueManager.canStartDaemon(daemonName);
  }

  async readPidData() {
    return this.persistenceManager.readPidData();
  }

  async writePidData(data) {
    return this.persistenceManager.writePidData(data);
  }

  updateStats(data) {
    const daemons = Object.values(data.daemons);
    this.stats = {
      totalDaemons: daemons.length,
      runningDaemons: daemons.filter(d => d.status === 'running').length,
      queuedDaemons: daemons.filter(d => d.status === 'queued').length,
      failedDaemons: daemons.filter(d => d.status === 'failed').length,
      lastUpdate: new Date().toISOString()
    };
    if (data.metadata) {
      data.metadata = { ...this.stats };
    }
  }

  getStats() {
    return {
      ...this.stats,
      queueLength: this.persistenceManager.writeQueue.length,
      isWriting: this.persistenceManager.isWriting
    };
  }

  async cleanupCompletedDaemons() {
    const result = await this.daemonManager.cleanupCompletedDaemons();
    if (result) {
      const currentData = await this.persistenceManager.readPidData();
      this.updateStats(currentData);
    }
    return result;
  }

  async getQueueInfo() {
    return this.queueManager.getQueueInfo();
  }
}

export { PidFileManager };


