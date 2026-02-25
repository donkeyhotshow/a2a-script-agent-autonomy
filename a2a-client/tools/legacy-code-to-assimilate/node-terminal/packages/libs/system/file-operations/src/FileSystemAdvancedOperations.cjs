const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const crypto = require('crypto');

class FileSystemAdvancedOperations {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Копирует файл из источника в целевое место.
   * @param {string} sourcePath - Путь к исходному файлу.
   * @param {string} destinationPath - Путь к целевому файлу.
   * @param {number} mode - Режим копирования (например, fs.constants.COPYFILE_EXCL).
   * @returns {Promise<void>}
   */
  async copyFile(sourcePath, destinationPath, mode = 0) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemAdvancedOperations] Copying files is not supported in browser: ${sourcePath} -> ${destinationPath}`);
      return;
    }
    try {
      await fs.copyFile(sourcePath, destinationPath, mode);
    } catch (error) {
      this.logger.error(`[FileSystemAdvancedOperations] Error copying file ${sourcePath} to ${destinationPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Перемещает файл или директорию.
   * @param {string} oldPath - Старый путь.
   * @param {string} newPath - Новый путь.
   * @returns {Promise<void>}
   */
  async moveItem(oldPath, newPath) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemAdvancedOperations] Moving items is not supported in browser: ${oldPath} -> ${newPath}`);
      return;
    }
    try {
      await fs.rename(oldPath, newPath);
    } catch (error) {
      this.logger.error(`[FileSystemAdvancedOperations] Error moving item ${oldPath} to ${newPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Сравнивает содержимое двух файлов.
   * @param {string} filePath1 - Путь к первому файлу.
   * @param {string} filePath2 - Путь ко второму файлу.
   * @returns {Promise<boolean>} true, если файлы идентичны, иначе false.
   */
  async compareFiles(filePath1, filePath2) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemAdvancedOperations] Comparing files is not supported in browser: ${filePath1}, ${filePath2}`);
      return false;
    }
    try {
      const buffer1 = await fs.readFile(filePath1);
      const buffer2 = await fs.readFile(filePath2);
      return buffer1.equals(buffer2);
    } catch (error) {
      this.logger.error(`[FileSystemAdvancedOperations] Error comparing files ${filePath1} and ${filePath2}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Создает временный файл с уникальным именем.
   * @param {string} prefix - Префикс для имени файла (по умолчанию 'temp-').
   * @param {string} suffix - Суффикс для имени файла (по умолчанию '.tmp').
   * @returns {Promise<string>} Путь к созданному временному файлу.
   */
  async createTempFile(prefix = 'temp-', suffix = '.tmp') {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemAdvancedOperations] Creating temp files is not supported in browser.`);
      return `browser-temp-file-${Date.now()}`;
    }
    const tempDir = require('os').tmpdir();
    const fileName = `${prefix}${Date.now()}-${crypto.randomBytes(8).toString('hex')}${suffix}`;
    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, '');
    return filePath;
  }

  /**
   * Возвращает статистику файла или директории.
   * @param {string} filePath - Путь к файлу или директории.
   * @returns {Promise<fs.Stats>} Объект статистики.
   */
  async getStats(filePath) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemAdvancedOperations] Getting file stats is not supported in browser: ${filePath}`);
      return null;
    }
    try {
      return await fs.stat(filePath);
    } catch (error) {
      this.logger.error(`[FileSystemAdvancedOperations] Error getting stats for ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Проверяет доступность файла/директории по указанному режиму.
   * @param {string} filePath - Путь к файлу или директории.
   * @param {number} mode - Режим доступа (например, fs.constants.F_OK, fs.constants.W_OK).
   * @returns {Promise<boolean>} true, если доступен, иначе false.
   */
  async checkAccess(filePath, mode = fsSync.constants.F_OK) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemAdvancedOperations] Checking file access is not fully supported in browser: ${filePath}`);
      try {
        const response = await fetch(filePath, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    }
    try {
      await fs.access(filePath, mode);
      return true;
    } catch (error) {
      this.logger.error(`[FileSystemAdvancedOperations] Error checking access for ${filePath}: ${error.message}`);
      return false;
    }
  }

  /**
   * Создает или очищает файл.
   * @param {string} filePath - Путь к файлу.
   * @returns {Promise<void>}
   */
  async ensureFile(filePath) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemAdvancedOperations] ensureFile is not supported in browser: ${filePath}`);
      return;
    }
    try {
      await fs.writeFile(filePath, '', { flag: 'w' });
    } catch (error) {
      this.logger.error(`[FileSystemAdvancedOperations] Error ensuring file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Очищает содержимое директории.
   * @param {string} dirPath - Путь к директории.
   * @returns {Promise<void>}
   */
  async emptyDirectory(dirPath) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemAdvancedOperations] emptyDirectory is not supported in browser: ${dirPath}`);
      return;
    }
    try {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
          await fs.rm(fullPath, { recursive: true, force: true });
        } else {
          await fs.unlink(fullPath);
        }
      }
    } catch (error) {
      this.logger.error(`[FileSystemAdvancedOperations] Error emptying directory ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Удаляет файлы или директории по заданному шаблону в базовой директории.
   * @param {string} basePath - Базовая директория для поиска.
   * @param {string} pattern - Шаблон для поиска файлов/директорий (например, '*.tmp', 'log-*.log').
   * @returns {Promise<void>}
   */
  async removeByPattern(basePath, pattern) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemAdvancedOperations] removeByPattern is not supported in browser: ${basePath}, ${pattern}`);
      return;
    }
    try {
      const files = await fs.readdir(basePath);
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));

      for (const file of files) {
        if (regex.test(file)) {
          const filePath = path.join(basePath, file);
          const stat = await fs.stat(filePath);

          if (stat.isDirectory()) {
            await fs.rm(filePath, { recursive: true, force: true });
          } else {
            await fs.unlink(filePath);
          }
          this.logger.info(`[FileSystemAdvancedOperations] Removed by pattern: ${filePath}`);
        }
      }
    } catch (error) {
      this.logger.error(`[FileSystemAdvancedOperations] Error removing by pattern ${pattern} in ${basePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Удаляет директорию, если она пуста.
   * @param {string} dirPath - Путь к директории.
   * @returns {Promise<void>}
   */
  async removeDirectoryIfEmpty(dirPath) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemAdvancedOperations] removeDirectoryIfEmpty is not supported in browser: ${dirPath}`);
      return;
    }
    try {
      const files = await fs.readdir(dirPath);
      if (files.length === 0) {
        await fs.rmdir(dirPath); // Use rmdir for empty directories
        this.logger.info(`[FileSystemAdvancedOperations] Removed empty directory: ${dirPath}`);
      } else {
        this.logger.info(`[FileSystemAdvancedOperations] Directory not empty, skipping removal: ${dirPath}`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn(`[FileSystemAdvancedOperations] Directory does not exist, skipping removal: ${dirPath}`);
      } else {
        this.logger.error(`[FileSystemAdvancedOperations] Error removing directory if empty ${dirPath}: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Изменяет права доступа к файлу или директории.
   * @param {string} filePath - Путь к файлу или директории.
   * @param {number | string} mode - Права доступа (например, 0o755).
   * @returns {Promise<void>}
   */
  async changePermissions(filePath, mode) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemAdvancedOperations] changePermissions is not supported in browser: ${filePath}`);
      return;
    }
    try {
      await fs.chmod(filePath, mode);
      this.logger.info(`[FileSystemAdvancedOperations] Changed permissions for ${filePath} to ${mode}`);
    } catch (error) {
      this.logger.error(`[FileSystemAdvancedOperations] Error changing permissions for ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Создает символическую ссылку.
   * @param {string} target - Цель ссылки (куда указывает ссылка).
   * @param {string} link - Путь, где будет создана ссылка.
   * @returns {Promise<void>}
   */
  async createSymlink(target, link) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemAdvancedOperations] createSymlink is not supported in browser: ${target} -> ${link}`);
      return;
    }
    try {
      await fs.symlink(target, link);
      this.logger.info(`[FileSystemAdvancedOperations] Created symlink from ${target} to ${link}`);
    } catch (error) {
      this.logger.error(`[FileSystemAdvancedOperations] Error creating symlink from ${target} to ${link}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { FileSystemAdvancedOperations };
