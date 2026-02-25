const path = require('path');
const { spawn } = require('child_process');

class HousekeepingManager {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.housekeepingIntervalMs = options.interval || 60 * 1000; // 1 минута
    this.taskManagerCliPath = options.taskManagerCliPath || path.join(__dirname, '..', '..', 'core', 'task-manager', 'cli.js'); // Исправленный путь
    this.housekeepingTimer = null;
  }

  start() {
    if (this.housekeepingTimer) {
      this.logger.warn('[HousekeepingManager] Housekeeping is already running.');
      return;
    }

    this.logger.info('[HousekeepingManager] Starting housekeeping tasks.');
    this.housekeepingTimer = setInterval(() => {
      try {
        // Запускаем очистку завершённых задач
        spawn(process.execPath, [
          this.taskManagerCliPath,
          'cleanup'
        ], { stdio: 'inherit' }).on('close', (code) => {
          if (code !== 0) {
            this.logger.error(`[HousekeepingManager] task-manager cleanup exited with code ${code}`);
          }
        });

        // Обновляем updatedAt у незавершённых задач (heartbeat)
        spawn(process.execPath, [
          this.taskManagerCliPath,
          'heartbeat'
        ], { stdio: 'inherit' }).on('close', (code) => {
          if (code !== 0) {
            this.logger.error(`[HousekeepingManager] task-manager heartbeat exited with code ${code}`);
          }
        });
      } catch (error) {
        this.logger.error('[HousekeepingManager] Failed to run cleanup:', error);
      }
    }, this.housekeepingIntervalMs);
    this.housekeepingTimer.unref?.(); // Не мешать корректному завершению процесса
    this.logger.info('[HousekeepingManager] Housekeeping started.');
  }

  stop() {
    if (this.housekeepingTimer) {
      clearInterval(this.housekeepingTimer);
      this.housekeepingTimer = null;
      this.logger.info('[HousekeepingManager] Housekeeping stopped.');
    } else {
      this.logger.warn('[HousekeepingManager] Housekeeping is not running.');
    }
  }
}

export default HousekeepingManager;
