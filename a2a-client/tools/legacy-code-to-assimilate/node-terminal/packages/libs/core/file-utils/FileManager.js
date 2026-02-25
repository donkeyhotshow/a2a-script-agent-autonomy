/**
 * FileManager - алиас для FileSystemUtils
 * Предоставляет унифицированный интерфейс для работы с файловой системой
 */

const fileUtilsFactory = require('../../../system/file-operations/index.cjs');

class FileManager {
  constructor(logger = console) {
    this.logger = logger;
    const fileOps = fileUtilsFactory(this.logger);

    // Delegate all methods from fileOps to this instance
    for (const key in fileOps) {
      if (typeof fileOps[key] === 'function') {
        this[key] = fileOps[key];
      }
    }

    // Aliases for backward compatibility
    this.readJson = this.readFileJson.bind(this);
    this.writeJson = this.writeFile.bind(this);
    this.readDirectory = this.listDirectory.bind(this);
    this.fileExists = this.fileExists.bind(this);
    this.remove = this.deletePath.bind(this);
  }
}

module.exports = { FileManager };
