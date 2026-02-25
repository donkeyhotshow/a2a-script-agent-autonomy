const fs = require('fs');
const { FileSystemUtils } = require('C:/apps/libs/app-framework/core/file-utils/file-system/index.js');

class WorkDirectoryManager {
  constructor(logger = console) {
    this.logger = logger;
    this.fileSystem = new FileSystemUtils(logger);
  }

  /**
   * Создает рабочую директорию если её нет
   */
  async createWorkDirectory(workDirectoryPath) {
    try {
      if (!await this.fileSystem.exists(workDirectoryPath)) {
        await fs.promises.mkdir(workDirectoryPath, { recursive: true });
        this.logger.info(`📁 Создана папка work: ${workDirectoryPath}`);
      } else {
        this.logger.info(`Work directory already exists: ${workDirectoryPath}`);
      }
      return true;
    } catch (error) {
      this.logger.error(`❌ Ошибка создания папки work: ${error.message}`);
      throw error;
    }
  }

  /**
   * Очищает рабочую директорию
   */
  async clearWorkDirectory(workDirectoryPath) {
    try {
      if (!await this.fileSystem.exists(workDirectoryPath)) {
        this.logger.warn(`Attempted to clear non-existent work directory: ${workDirectoryPath}`);
        return true; // gracefully handle non-existent directory
      }

      const files = await this.fileSystem.readdir(workDirectoryPath);
      let clearedCount = 0;
      
      for (const file of files) {
        const filePath = this.fileSystem.join(workDirectoryPath, file);
        await this.fileSystem.deleteFile(filePath);
        clearedCount++;
      }
      
      this.logger.info(`🧹 Папка work очищена: ${workDirectoryPath} (удалено ${clearedCount} файлов)`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Ошибка очистки папки work: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получает список файлов в рабочей директории
   */
  async getWorkDirectoryFiles(workDirectoryPath) {
    try {
      const files = await this.fileSystem.readdir(workDirectoryPath);
      return files.filter(file => file.endsWith('.md') || file.endsWith('.json'));
    } catch (error) {
      this.logger.error(`❌ Ошибка чтения папки work: ${error.message}`);
      return [];
    }
  }
}

export { WorkDirectoryManager };
