const FileSystemUtils = require('@libs/system/file-operations');
const { LoggingUtils } = require('@libs/logging-monitoring/logging');
const path = require('path');

class PidFilePersistence {
  constructor(pidFilePath = 'C:/apps/data/unified-daemon-pids.json', logger, fileSystem) {
    this.pidFilePath = pidFilePath;
    this.writeQueue = [];
    this.isWriting = false;
    this.logger = logger || new LoggingUtils({ filePath: null });
    this.fileSystem = fileSystem || FileSystemUtils(this.logger);
  }

  async initializePersistence() {
    try {
      await this.fileSystem.ensureDir(path.dirname(this.pidFilePath));
      if (!(await this.fileSystem.exists(this.pidFilePath))) {
        await this.createInitialPidFile();
      }
      this.logger.log('✅ PidFilePersistence инициализирован');
      return true;
    } catch (error) {
      this.logger.error('❌ Ошибка инициализации PidFilePersistence:', error);
      throw error;
    }
  }

  async createInitialPidFile() {
    const initialData = {
      version: "1.0",
      created: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      daemons: {},
      queue: {
        active: null,
        waiting: [],
        maxConcurrent: 1,
        processingOrder: []
      },
      metadata: {
        totalDaemons: 0,
        runningDaemons: 0,
        queuedDaemons: 0,
        failedDaemons: 0
      }
    };
    await this.fileSystem.writeFile(this.pidFilePath, JSON.stringify(initialData, null, 2));
    this.logger.log('📄 Создан начальный PID файл');
  }

  async readPidData() {
    const defaultPidData = {
      version: "1.0",
      daemons: {},
      queue: { active: null, waiting: [], maxConcurrent: 1, processingOrder: [] },
      metadata: { totalDaemons: 0 }
    };
    try {
      const data = await this.fileSystem.readFile(this.pidFilePath, 'utf8');
      if (!data) {
        this.logger.log('⚠️ PID файл пуст, инициализация дефолтной структуры.');
        return defaultPidData;
      }
      return JSON.parse(data);
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.logger.error('❌ Ошибка чтения или парсинга PID файла. Будет использована дефолтная структура.', error);
        return defaultPidData;
      }
      this.logger.error('❌ Ошибка чтения PID файла:', error);
      throw error;
    }
  }

  async writePidData(data) {
    return new Promise((resolve, reject) => {
      this.writeQueue.push({ data, resolve, reject });
      this.processWriteQueue();
    });
  }

  async processWriteQueue() {
    if (this.isWriting || this.writeQueue.length === 0) {
      return;
    }

    this.isWriting = true;

    while (this.writeQueue.length > 0) {
      const { data, resolve, reject } = this.writeQueue.shift();
      try {
        await this.fileSystem.writeFile(this.pidFilePath, JSON.stringify(data, null, 2));
        resolve();
      } catch (error) {
        this.logger.error('❌ Ошибка записи PID файла:', error);
        reject(error);
      }
    }
    this.isWriting = false;
  }
}

module.exports = { PidFilePersistence };
