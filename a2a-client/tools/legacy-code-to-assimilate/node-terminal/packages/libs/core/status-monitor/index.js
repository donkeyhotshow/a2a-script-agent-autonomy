/**
 * Status Monitor - мониторинг статуса системы
 * Заглушка для совместимости
 */

class StatusMonitor {
  constructor(options = {}) {
    this.options = options;
    this.isRunning = false;
    this.status = 'stopped';
  }

  start() {
    this.isRunning = true;
    this.status = 'running';
    return Promise.resolve(true);
  }

  stop() {
    this.isRunning = false;
    this.status = 'stopped';
    return Promise.resolve(true);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      status: this.status,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  StatusMonitor,
  statusMonitor: new StatusMonitor()
};
