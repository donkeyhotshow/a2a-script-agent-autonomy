/**
 * @fileoverview Библиотека для работы с архивами и атомарными операциями
 * Предоставляет функциональность для создания, извлечения, поиска и управления архивами
 * а также атомарные операции с файлами
 * @author MCP Team
 * @version 1.1.0
 */

import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import unzipper from 'unzipper';
import tar from 'tar';
import { fileURLToPath } from 'url';

// Импорт модуля атомарных операций
import { AtomicOperations } from './atomic-operations.js';
import { ArchiveExtractor } from './ArchiveExtractor.js';
import { ArchiveAnalyzer } from './ArchiveAnalyzer.js';
import { ArchiveMaintenance } from './ArchiveMaintenance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Класс для работы с архивами
 */
export class ArchiveOperations {
  constructor(options = {}) {
    this.archivePath = options.archivePath || path.join(process.cwd(), 'archives');
    this.defaultFormat = options.defaultFormat || 'zip';
    this.compressionLevel = options.compressionLevel || 6;
    this.ensureArchiveDir();
    this.archiveExtractor = new ArchiveExtractor({ password: options.password });
    this.archiveAnalyzer = new ArchiveAnalyzer({ password: options.password });
    this.archiveMaintenance = new ArchiveMaintenance(this);
  }

  /**
   * Создать директорию для архивов если не существует
   * @private
   */
  ensureArchiveDir() {
    if (!fs.existsSync(this.archivePath)) {
      fs.mkdirSync(this.archivePath, { recursive: true });
    }
  }

  /**
   * Создать архив из указанных файлов
   * @param {Array|string} files - Массив путей к файлам или директориям для архивирования
   * @param {string} archiveName - Имя архива (без расширения)
   * @param {Object} options - Дополнительные опции
   * @returns {Promise<Object>} Результат архивирования
   */
  async createArchive(files, archiveName = 'archive', options = {}) {
    const {
      format = this.defaultFormat,
      compressionLevel = this.compressionLevel,
      preserveStructure = true,
      includeHidden = false,
      password = null
    } = options;

    const archivePath = path.join(this.archivePath, `${archiveName}.${format}`);
    
    try {
      // Проверяем существование файлов
      const validFiles = [];
      for (const file of Array.isArray(files) ? files : [files]) {
        if (await fs.pathExists(file)) {
          validFiles.push(file);
        }
      }

      if (validFiles.length === 0) {
        throw new Error('Нет валидных файлов для архивирования');
      }

      // Создаем поток для записи архива
      const output = fs.createWriteStream(archivePath);
      const archive = archiver(format, {
        zlib: { level: compressionLevel }
      });

      if (password) {
        archive.password(password);
      }

      // Обрабатываем ошибки
      archive.on('error', (err) => {
        throw err;
      });

      // Подключаем к потоку вывода
      archive.pipe(output);

      // Добавляем файлы в архив
      for (const file of validFiles) {
        const stats = await fs.stat(file);
        
        if (stats.isDirectory()) {
          archive.directory(file, preserveStructure ? path.basename(file) : false);
        } else {
          const fileName = preserveStructure ? file : path.basename(file);
          archive.file(file, { name: fileName });
        }
      }

      // Завершаем архивирование
      await archive.finalize();

      const archiveStats = await fs.stat(archivePath);
      
      return {
        success: true,
        archivePath,
        files: validFiles,
        size: archiveStats.size,
        options: { format, compressionLevel, preserveStructure, includeHidden },
        message: `Архив создан: ${archivePath} (${(archiveStats.size / 1024 / 1024).toFixed(2)} MB)`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        archivePath,
        files: Array.isArray(files) ? files : [files],
        message: `Ошибка создания архива: ${error.message}`
      };
    }
  }

  /**
   * Извлечь файлы из архива
   * @param {string} archivePath - Путь к архиву
   * @param {string} extractPath - Путь для извлечения
   * @param {Object} options - Опции извлечения
   * @returns {Promise<Object>} Результат извлечения
   */
  async extractArchive(archivePath, extractPath = '.', options = {}) {
    return this.archiveExtractor.extractArchive(archivePath, extractPath, options);
  }

  /**
   * Извлечь ZIP архив
   * @private
   */
  async _extractZip(archivePath, extractPath, options) {
    const { overwrite, filter, password } = options;
    const extractedFiles = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(archivePath)
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          const fileName = entry.path;
          
          if (filter && !filter(fileName)) {
            entry.autodrain();
            return;
          }

          if (entry.type === 'File') {
            const filePath = path.join(extractPath, fileName);
            
            if (!overwrite && fs.existsSync(filePath)) {
              entry.autodrain();
              return;
            }

            fs.ensureDirSync(path.dirname(filePath));
            entry.pipe(fs.createWriteStream(filePath));
            extractedFiles.push(fileName);
          } else {
            entry.autodrain();
          }
        })
        .on('close', () => resolve(extractedFiles))
        .on('error', reject);
    });
  }

  /**
   * Извлечь TAR архив
   * @private
   */
  async _extractTar(archivePath, extractPath, options) {
    const { overwrite, filter } = options;
    
    await tar.extract({
      file: archivePath,
      cwd: extractPath,
      filter: filter,
      overwrite: overwrite
    });

    // Получаем список извлеченных файлов
    const extractedFiles = [];
    const walkDir = async (dir) => {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          extractedFiles.push(path.relative(extractPath, filePath));
        } else if (stats.isDirectory()) {
          await walkDir(filePath);
        }
      }
    };
    
    await walkDir(extractPath);
    return extractedFiles;
  }

  /**
   * Получить список файлов в архиве
   * @param {string} archivePath - Путь к архиву
   * @returns {Promise<Array>} Список файлов
   */
  async listArchiveFiles(archivePath) {
    return this.archiveAnalyzer.listArchiveFiles(archivePath);
  }

  /**
   * Поиск в архиве
   * @param {string} archivePath - Путь к архиву
   * @param {string} query - Поисковый запрос
   * @param {Object} options - Опции поиска
   * @returns {Promise<Object>} Результаты поиска
   */
  async searchInArchive(archivePath, query, options = {}) {
    return this.archiveAnalyzer.searchInArchive(archivePath, query, options);
  }

  /**
   * Получить информацию об архиве
   * @param {string} archivePath - Путь к архиву
   * @returns {Promise<Object>} Информация об архиве
   */
  async getArchiveInfo(archivePath) {
    return this.archiveAnalyzer.getArchiveInfo(archivePath);
  }

  /**
   * Проверить целостность архива
   * @param {string} archivePath - Путь к архиву
   * @returns {Promise<Object>} Результат проверки
   */
  async validateArchive(archivePath) {
    return this.archiveAnalyzer.validateArchive(archivePath);
  }

  /**
   * Получить статистику по архивам
   * @returns {Promise<Object>} Статистика
   */
  async getArchiveStatistics() {
    return this.archiveMaintenance.getArchiveStatistics();
  }

  /**
   * Очистить старые архивы
   * @param {Object} options - Опции очистки
   * @returns {Promise<Object>} Результат очистки
   */
  async cleanupOldArchives(options = {}) {
    return this.archiveMaintenance.cleanupOldArchives(options);
  }

  /**
   * Создать архив с автоматическим именованием
   * @param {Array|string} files - Массив путей к файлам
   * @param {Object} options - Опции архивирования
   * @returns {Promise<Object>} Результат архивирования
   */
  async createAutoNamedArchive(files, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `archive_${timestamp}`;
    
    return await this.createArchive(files, archiveName, options);
  }

  /**
   * Получить размер архива
   * @param {string} archivePath - Путь к архиву
   * @returns {Promise<number>} Размер в байтах
   */
  async getArchiveSize(archivePath) {
    try {
      const stats = await fs.stat(archivePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Проверить существование архива
   * @param {string} archivePath - Путь к архиву
   * @returns {Promise<boolean>} Существует ли архив
   */
  async archiveExists(archivePath) {
    return await fs.pathExists(archivePath);
  }

  /**
   * Получить список всех архивов в директории
   * @param {string} directory - Директория для поиска
   * @returns {Promise<Array>} Список архивов
   */
  async listAllArchives(directory = null) {
    const searchDir = directory || this.archivePath;
    const archives = [];
    
    try {
      if (!await fs.pathExists(searchDir)) {
        return archives;
      }

      const files = await fs.readdir(searchDir);
      
      for (const file of files) {
        if (file.match(/\.(zip|tar|gz|rar|7z)$/i)) {
          const filePath = path.join(searchDir, file);
          const stats = await fs.stat(filePath);
          
          archives.push({
            name: file,
            path: filePath,
            size: stats.size,
            mtime: stats.mtime,
            date: stats.mtime.toISOString().split('T')[0]
          });
        }
      }
    } catch (error) {
      console.error(`Ошибка чтения директории ${searchDir}: ${error.message}`);
    }
    
    return archives.sort((a, b) => b.mtime - a.mtime);
  }
}

// Экспорт экземпляра класса по умолчанию
export default new ArchiveOperations();

// Экспорт модуля атомарных операций
export { AtomicOperations };
