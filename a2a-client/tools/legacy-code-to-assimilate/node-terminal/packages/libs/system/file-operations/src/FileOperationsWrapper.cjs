const { FileSystemBasicOperations } = require('./FileSystemBasicOperations.cjs');
const { FileSystemAdvancedOperations } = require('./FileSystemAdvancedOperations.cjs');
const { FileSystemPathUtils } = require('./FileSystemPathUtils.cjs');
const { FileSystemWatcher } = require('./FileSystemWatcher.cjs');

// Простой мок-логгер для избежания циклических зависимостей
class LoggingUtils {
  constructor() {}
  debug() {}
  info() {}
  warn() {}
  error() {}
}

/**
 * Обёртка для операций с файлами, которая возвращает стандартизированный формат результатов
 */
class FileOperationsWrapper {
  constructor(options = {}, logger = new LoggingUtils()) {
    this.logger = logger;
    this.basicOps = new FileSystemBasicOperations(this.logger);
    this.advancedOps = new FileSystemAdvancedOperations(this.logger);
    this.pathUtils = new FileSystemPathUtils(this.logger);
    this.watcher = new FileSystemWatcher(this.logger);

    this.defaultEncoding = options.defaultEncoding || 'utf8';
  }

  /**
   * Читает файл и возвращает результат в стандартном формате
   */
  async readFile(filePath, options = {}) {
    try {
      const encoding = options.encoding !== undefined ? options.encoding : this.defaultEncoding;
      const content = await this.basicOps.readFile(filePath, encoding);
      
      // Если это бинарный файл (encoding: null), возвращаем Buffer
      if (options.encoding === null) {
        return {
          success: true,
          content: content, // Это уже Buffer
          size: content.length
        };
      }
      
      // Обработка диапазона строк для текстовых файлов
      if (options.startLine || options.endLine) {
        const lines = content.split('\n');
        const startLine = (options.startLine || 1) - 1; // Преобразуем в 0-based индекс
        const endLine = options.endLine || lines.length;
        
        const selectedLines = lines.slice(startLine, endLine);
        const selectedContent = selectedLines.join('\n');
        
        return {
          success: true,
          content: selectedContent,
          lines: selectedLines.length,
          totalLines: lines.length,
          size: selectedContent.length
        };
      }
      
      // Подсчёт строк для текстовых файлов
      const lines = content.split('\n');
      
      return {
        success: true,
        content: content,
        lines: lines.length,
        size: content.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Записывает файл и возвращает результат в стандартном формате
   */
  async writeFile(filePath, data, options = {}) {
    try {
      const encoding = options.encoding || this.defaultEncoding;
      
      if (options.mode === 'append') {
        await this.basicOps.appendFile(filePath, data, { encoding });
      } else {
        await this.basicOps.writeFile(filePath, data, { encoding });
      }
      
      return {
        success: true,
        bytesWritten: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, encoding)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Копирует файл или директорию
   */
  async copyPath(sourcePath, destinationPath, options = {}) {
    try {
      const sourceExists = await this.basicOps.exists(sourcePath);
      if (!sourceExists) {
        return {
          success: false,
          error: `Source path does not exist: ${sourcePath}`
        };
      }

      const isDir = await this.basicOps.isDirectory(sourcePath);
      
      if (isDir) {
        // Копирование директории
        await this._copyDirectory(sourcePath, destinationPath);
      } else {
        // Копирование файла
        await this.advancedOps.copyFile(sourcePath, destinationPath);
      }
      
      return {
        success: true,
        source: sourcePath,
        destination: destinationPath
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Перемещает файл или директорию
   */
  async movePath(sourcePath, destinationPath, options = {}) {
    try {
      const sourceExists = await this.basicOps.exists(sourcePath);
      if (!sourceExists) {
        return {
          success: false,
          error: `Source path does not exist: ${sourcePath}`
        };
      }

      await this.advancedOps.moveItem(sourcePath, destinationPath);
      
      return {
        success: true,
        source: sourcePath,
        destination: destinationPath
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Удаляет файл или директорию
   */
  async deletePath(targetPath, options = {}) {
    try {
      const exists = await this.basicOps.exists(targetPath);
      if (!exists) {
        return {
          success: false,
          error: `Path does not exist: ${targetPath}`
        };
      }

      const isDir = await this.basicOps.isDirectory(targetPath);
      
      if (isDir) {
        // Используем рекурсивное удаление для директорий
        await this.basicOps.deleteDirectory(targetPath, { recursive: true, force: true });
      } else {
        await this.basicOps.deleteFile(targetPath);
      }
      
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Листит содержимое директории
   */
  async listDirectory(directoryPath, options = {}) {
    try {
      const isDir = await this.basicOps.isDirectory(directoryPath);
      if (!isDir) {
        return {
          success: false,
          error: `Path is not a directory: ${directoryPath}`
        };
      }

      const entries = await this.basicOps.readDirectory(directoryPath, { withFileTypes: true });
      
      let result = entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'dir' : 'file',
        path: this.pathUtils.joinPath(directoryPath, entry.name)
      }));

      // Рекурсивный поиск
      if (options.recursive) {
        const subDirs = entries.filter(entry => entry.isDirectory());
        for (const subDir of subDirs) {
          const subPath = this.pathUtils.joinPath(directoryPath, subDir.name);
          const subResult = await this.listDirectory(subPath, { recursive: true });
          if (subResult.success) {
            result = result.concat(subResult.entries);
          }
        }
      }

      // Фильтрация
      if (options.filter && typeof options.filter === 'function') {
        result = result.filter(options.filter);
      }
      
      return {
        success: true,
        path: directoryPath,
        entries: result,
        count: result.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Получает статистику файла или директории
   */
  async getStats(filePath) {
    try {
      const stats = await this.advancedOps.getStats(filePath);
      return {
        success: true,
        stats: stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Создаёт директорию
   */
  async ensureDir(dirPath, options = {}) {
    try {
      await this.basicOps.createDirectory(dirPath, { recursive: true, ...options });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Вспомогательный метод для копирования директории
   */
  async _copyDirectory(sourceDir, destDir) {
    // Создаём целевую директорию
    await this.basicOps.createDirectory(destDir, { recursive: true });
    
    // Читаем содержимое исходной директории
    const entries = await this.basicOps.readDirectory(sourceDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = this.pathUtils.joinPath(sourceDir, entry.name);
      const destPath = this.pathUtils.joinPath(destDir, entry.name);
      
      if (entry.isDirectory()) {
        await this._copyDirectory(sourcePath, destPath);
      } else {
        await this.advancedOps.copyFile(sourcePath, destPath);
      }
    }
  }

  /**
   * Удаляет файлы или директории по заданному шаблону.
   */
  async removeByPattern(basePath, pattern) {
    try {
      await this.advancedOps.removeByPattern(basePath, pattern);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Удаляет директорию, если она пуста.
   */
  async removeDirectoryIfEmpty(dirPath) {
    try {
      await this.advancedOps.removeDirectoryIfEmpty(dirPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Изменяет права доступа к файлу или директории.
   */
  async changePermissions(filePath, mode) {
    try {
      await this.advancedOps.changePermissions(filePath, mode);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Создает символическую ссылку.
   */
  async createSymlink(target, link) {
    try {
      await this.advancedOps.createSymlink(target, link);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = { FileOperationsWrapper };
