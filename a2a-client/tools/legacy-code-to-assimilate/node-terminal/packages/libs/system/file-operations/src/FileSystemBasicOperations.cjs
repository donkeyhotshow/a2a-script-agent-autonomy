const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

class FileSystemBasicOperations {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Проверяет существование файла или директории.
   * @param {string} filePath - Путь к файлу или директории.
   * @returns {Promise<boolean>} true, если существует, иначе false.
   */
  async exists(filePath) {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(filePath, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    } else {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Асинхронно читает файл.
   * @param {string} filePath - Путь к файлу.
   * @param {string|null} encoding - Кодировка файла (по умолчанию 'utf8', null для бинарного режима).
   * @returns {Promise<string|Buffer>} Содержимое файла.
   */
  async readFile(filePath, encoding = 'utf8') {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        return await response.text();
      } catch (error) {
        this.logger.error(`[FileSystemBasicOperations] Error reading file in browser: ${error.message}`);
        throw error;
      }
    } else {
      try {
        // Если encoding равен null, читаем в бинарном режиме
        if (encoding === null) {
          return await fs.readFile(filePath);
        }
        return await fs.readFile(filePath, encoding);
      } catch (error) {
        this.logger.error(`[FileSystemBasicOperations] Error reading file ${filePath}: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Асинхронно записывает данные в файл.
   * @param {string} filePath - Путь к файлу.
   * @param {string|Buffer} data - Данные для записи.
   * @param {object} options - Опции записи (по умолчанию { encoding: 'utf8' }).
   * @returns {Promise<void>}
   */
  async writeFile(filePath, data, options = { encoding: 'utf8' }) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemBasicOperations] Writing files is not supported in browser: ${filePath}`);
      return;
    }
    try {
      await fs.writeFile(filePath, data, options);
    } catch (error) {
      this.logger.error(`[FileSystemBasicOperations] Error writing file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Асинхронно добавляет данные в конец файла.
   * @param {string} filePath - Путь к файлу.
   * @param {string|Buffer} data - Данные для добавления.
   * @param {object} options - Опции записи (по умолчанию { encoding: 'utf8' }).
   * @returns {Promise<void>}
   */
  async appendFile(filePath, data, options = { encoding: 'utf8' }) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemBasicOperations] Appending to files is not supported in browser: ${filePath}`);
      return;
    }
    try {
      await fs.appendFile(filePath, data, options);
    } catch (error) {
      this.logger.error(`[FileSystemBasicOperations] Error appending to file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Асинхронно удаляет файл.
   * @param {string} filePath - Путь к файлу.
   * @returns {Promise<void>}
   */
  async deleteFile(filePath) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemBasicOperations] Deleting files is not supported in browser: ${filePath}`);
      return;
    }
    try {
      await fs.unlink(filePath);
    } catch (error) {
      this.logger.error(`[FileSystemBasicOperations] Error deleting file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Асинхронно создает директорию.
   * @param {string} dirPath - Путь к директории.
   * @param {object} options - Опции создания (по умолчанию { recursive: true }).
   * @returns {Promise<void>}
   */
  async createDirectory(dirPath, options = { recursive: true }) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemBasicOperations] Creating directories is not supported in browser: ${dirPath}`);
      return;
    }
    try {
      await fs.mkdir(dirPath, options);
    } catch (error) {
      this.logger.error(`[FileSystemBasicOperations] Error creating directory ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Асинхронно удаляет директорию.
   * @param {string} dirPath - Путь к директории.
   * @param {object} options - Опции удаления (по умолчанию { recursive: true, force: true }).
   * @returns {Promise<void>}
   */
  async deleteDirectory(dirPath, options = { recursive: true, force: true }) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemBasicOperations] Deleting directories is not supported in browser: ${dirPath}`);
      return;
    }
    try {
      await fs.rm(dirPath, options);
    } catch (error) {
      this.logger.error(`[FileSystemBasicOperations] Error deleting directory ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Асинхронно читает содержимое директории.
   * @param {string} dirPath - Путь к директории.
   * @param {object} options - Опции чтения (по умолчанию { withFileTypes: false }).
   * @returns {Promise<string[]|fs.Dirent[]>} Массив имен файлов/директорий или объектов Dirent.
   */
  async readDirectory(dirPath, options = { withFileTypes: false }) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemBasicOperations] Reading directories is not supported in browser: ${dirPath}`);
      return [];
    }
    try {
      return await fs.readdir(dirPath, options);
    } catch (error) {
      this.logger.error(`[FileSystemBasicOperations] Error reading directory ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Проверяет, является ли путь файлом.
   * @param {string} filePath - Путь.
   * @returns {Promise<boolean>} true, если файл, иначе false.
   */
  async isFile(filePath) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemBasicOperations] isFile not fully supported in browser for local paths: ${filePath}`);
      try {
        const response = await fetch(filePath, { method: 'HEAD' });
        // Простая эмуляция: если HEAD запрос успешен и не возвращает HTML (что могло бы быть директорией),
        // предполагаем, что это файл. Ненадежно для всех случаев.
        return response.ok && !response.headers.get('Content-Type')?.includes('text/html');
      } catch {
        return false;
      }
    }
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch (error) {
      this.logger.error(`[FileSystemBasicOperations] Error checking if is file ${filePath}: ${error.message}`);
      return false;
    }
  }

  /**
   * Проверяет, является ли путь директорией.
   * @param {string} dirPath - Путь.
   * @returns {Promise<boolean>} true, если директория, иначе false.
   */
  async isDirectory(dirPath) {
    if (typeof window !== 'undefined') {
      this.logger.warn(`[FileSystemBasicOperations] isDirectory not fully supported in browser for local paths: ${dirPath}`);
      // В браузере директории обычно не доступны для прямого "stat" как файлы.
      // Можно попробовать загрузить известный файл из предполагаемой директории.
      return false; // По умолчанию предполагаем false для локальных путей в браузере
    }
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch (error) {
      this.logger.error(`[FileSystemBasicOperations] Error checking if is directory ${dirPath}: ${error.message}`);
      return false;
    }
  }
}

module.exports = { FileSystemBasicOperations };
