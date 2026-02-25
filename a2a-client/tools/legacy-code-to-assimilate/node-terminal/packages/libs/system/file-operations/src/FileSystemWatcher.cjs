const fs = require('fs');
const { EventEmitter } = require('events');

class FileSystemWatcher extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.watchers = new Map(); // Map: path -> fs.FSWatcher instance
  }

  /**
   * Начинает наблюдение за файлом или директорией.
   * @param {string} targetPath - Путь к файлу или директории.
   * @param {object} options - Опции наблюдения (recursive, encoding, etc.).
   * @returns {void}
   */
  watch(targetPath, options = {}) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemWatcher] File system watching is not supported in browser.`);
      return;
    }
    if (this.watchers.has(targetPath)) {
      this.logger.warn(`[FileSystemWatcher] Already watching: ${targetPath}`);
      return;
    }

    this.logger.info(`[FileSystemWatcher] Starting watch on: ${targetPath}`);
    const watcher = fs.watch(targetPath, options, (eventType, filename) => {
      this.logger.debug(`[FileSystemWatcher] Event: ${eventType} on ${filename} in ${targetPath}`);
      this.emit('change', { eventType, filename, targetPath });

      if (filename) {
        // Возможно, более детализированные события, если требуется
        if (eventType === 'rename') {
          this.emit('rename', { filename, targetPath });
        } else if (eventType === 'change') {
          this.emit('fileChange', { filename, targetPath });
        }
      }
    });

    watcher.on('error', (error) => {
      this.logger.error(`[FileSystemWatcher] Watcher error for ${targetPath}: ${error.message}`);
      this.emit('error', error, targetPath);
      this.unwatch(targetPath);
    });

    watcher.on('ready', () => {
      this.logger.info(`[FileSystemWatcher] Watcher ready for: ${targetPath}`);
      this.emit('ready', targetPath);
    });

    this.watchers.set(targetPath, watcher);
  }

  /**
   * Останавливает наблюдение за файлом или директорией.
   * @param {string} targetPath - Путь к файлу или директории.
   * @returns {void}
   */
  unwatch(targetPath) {
    if (typeof window !== 'undefined') {
      return;
    }
    const watcher = this.watchers.get(targetPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(targetPath);
      this.logger.info(`[FileSystemWatcher] Stopped watching: ${targetPath}`);
    } else {
      this.logger.warn(`[FileSystemWatcher] Not watching: ${targetPath}`);
    }
  }

  /**
   * Останавливает все активные наблюдатели.
   * @returns {void}
   */
  unwatchAll() {
    if (typeof window !== 'undefined') {
      return;
    }
    for (const targetPath of this.watchers.keys()) {
      this.unwatch(targetPath);
    }
    this.logger.info(`[FileSystemWatcher] Stopped all watchers.`);
  }

  /**
   * Проверяет, наблюдается ли путь в данный момент.
   * @param {string} targetPath - Путь к файлу или директории.
   * @returns {boolean} true, если наблюдается, иначе false.
   */
  isWatching(targetPath) {
    return this.watchers.has(targetPath);
  }
}

module.exports = { FileSystemWatcher };
