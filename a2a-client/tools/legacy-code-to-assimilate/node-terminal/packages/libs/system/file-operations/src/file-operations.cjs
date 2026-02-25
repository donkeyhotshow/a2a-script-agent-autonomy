const { FileOperationsWrapper } = require('./FileOperationsWrapper.cjs');

// Простой мок-логгер для избежания циклических зависимостей
class LoggingUtils {
  constructor() {}
  debug() {}
  info() {}
  warn() {}
  error() {}
}

/**
 * Класс для операций с файлами
 */
class FileOperations {
  constructor(options = {}, logger = new LoggingUtils()) {
    this.logger = logger;
    this.wrapper = new FileOperationsWrapper(options, logger);
    this.defaultEncoding = options.defaultEncoding || 'utf8';
  }

  // Делегируем все методы к обёртке
  async readFile(filePath, options = {}) {
    return await this.wrapper.readFile(filePath, options);
  }

  async writeFile(filePath, data, options = {}) {
    return await this.wrapper.writeFile(filePath, data, options);
  }

  async copyPath(sourcePath, destinationPath, options = {}) {
    return await this.wrapper.copyPath(sourcePath, destinationPath, options);
  }

  async movePath(sourcePath, destinationPath, options = {}) {
    return await this.wrapper.movePath(sourcePath, destinationPath, options);
  }

  async deletePath(targetPath, options = {}) {
    return await this.wrapper.deletePath(targetPath, options);
  }

  async listDirectory(directoryPath, options = {}) {
    return await this.wrapper.listDirectory(directoryPath, options);
  }

  async getStats(filePath) {
    return await this.wrapper.getStats(filePath);
  }

  async ensureDir(dirPath, options = {}) {
    return await this.wrapper.ensureDir(dirPath, options);
  }

  // Алиасы для совместимости
  async getFileStats(filePath) {
    return await this.getStats(filePath);
  }

  async removeByPattern(basePath, pattern) {
    return await this.wrapper.removeByPattern(basePath, pattern);
  }

  async removeDirectoryIfEmpty(dirPath) {
    return await this.wrapper.removeDirectoryIfEmpty(dirPath);
  }

  async changePermissions(filePath, mode) {
    return await this.wrapper.changePermissions(filePath, mode);
  }

  async createSymlink(target, link) {
    return await this.wrapper.createSymlink(target, link);
  }
}

module.exports = { FileOperations };

