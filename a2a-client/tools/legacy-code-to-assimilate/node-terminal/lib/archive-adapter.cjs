/**
 * Адаптер для совместимости ES модулей archive-operations с CommonJS
 * Предоставляет интерфейс для работы с архивами в MCP проекте
 */

const {fileSystemUtils} = require('@libs/system/file-operations/index.js');
const {errorUtils} = require('@libs/error-management/error-handler/error-utils.js');
const {consoleUtils} = require('@libs/logging-monitoring/logging/console-utils.js');

// Safe validationUtils import with fallback
let validationUtils;
try {
    const validationModule = require('@libs/validation/validation/validation-utils.cjs');
    validationUtils = validationModule.validationUtils || validationModule;
    if (!validationUtils || typeof validationUtils !== 'object') {
        throw new Error('validation-utils.cjs did not export validationUtils object');
    }
} catch (validationError) {
    if (process && process.stderr && typeof process.stderr.write === 'function') {
        process.stderr.write(`[MCP-SERVER-WARN] validation-utils.cjs not found or invalid in archive-adapter.cjs: ${validationError.message}\n`);
    }
    validationUtils = {
        validate: () => ({ errors: [] }),
        isString: (val) => typeof val === 'string',
        isNumber: (val) => typeof val === 'number',
        isArray: (val) => Array.isArray(val),
        isFunction: (val) => typeof val === 'function',
    };
}

const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const unzipper = require('unzipper');
const tar = require('tar');

/**
 * Класс для работы с архивами (адаптер)
 */
class ArchiveOperationsAdapter {
    constructor(options = {}) {
        this.archivePath = options.archivePath || fileSystemUtils.join(process.cwd(), 'archives');
        this.defaultFormat = options.defaultFormat || 'zip';
        this.compressionLevel = options.compressionLevel || 6;
        this.ensureArchiveDir();
    }

    /**
     * Создать директорию для архивов если не существует
     * @private
     */
    ensureArchiveDir() {
        if (!fileSystemUtils.existsSync(this.archivePath)) {
            fileSystemUtils.mkdir(this.archivePath, {recursive: true});
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

        const archivePath = fileSystemUtils.join(this.archivePath, `${archiveName}.${format}`);

        errorUtils.safeExecute(async () => {

            // Проверяем существование файлов
            const validFiles = [];
            for (const file of validationUtils.isArray(files) ? files : [files]) {
                if (await fs.pathExists(file)) {
                    validFiles.push(file);
                }
            }

            if (validFiles.length === 0) {
                throw errorUtils.createError('Нет валидных файлов для архивирования');
            }

            // Создаем поток для записи архива
            const output = fs.createWriteStream(archivePath);
            const archive = archiver(format, {
                zlib: {level: compressionLevel}
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
                    archive.file(file, {name: fileName});
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
                options: {format, compressionLevel, preserveStructure, includeHidden},
                message: `Архив создан: ${archivePath} (${(archiveStats.size / 1024 / 1024).toFixed(2)} MB)`
            };


        }, 'error')`
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
    const {
      overwrite = false,
      preserveStructure = true,
      filter = null,
      password = null
    } = options;

    try {
      if (!await fs.pathExists(archivePath)) {
        throw errorUtils.createError('Архив не найден: ' + archivePath);
      }

      await fs.ensureDir(extractPath);

      const archiveStats = await fs.stat(archivePath);
      const format = path.extname(archivePath).toLowerCase();

      let extractedFiles = [];

      if (format === '.zip') {
        extractedFiles = await this._extractZip(archivePath, extractPath, { overwrite, filter, password });
      } else if (format === '.tar' || format === '.tar.gz' || format === '.tgz') {
        extractedFiles = await this._extractTar(archivePath, extractPath, { overwrite, filter });
      } else {
        throw errorUtils.createError('Неподдерживаемый формат архива: ' + format);
      }

      return {
        success: true,
        archivePath,
        extractPath,
        extractedFiles,
        originalSize: archiveStats.size,
        options: { overwrite, preserveStructure, filter },
        message: 'Архив извлечен, файлов: ' + extractedFiles.length,
      };
    } catch (err) {
      throw errorUtils.createError('Ошибка извлечения архива: ' + err.message);
    }
  }

/**
 * Извлечь ZIP архив
 * @private
 */
async
_extractZip(archivePath, extractPath, options)
{
    const {overwrite, filter, password} = options;
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
                    const filePath = fileSystemUtils.join(extractPath, fileName);

                    if (!overwrite && fileSystemUtils.existsSync(filePath)) {
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
async
_extractTar(archivePath, extractPath, options)
{
    const {overwrite, filter} = options;

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
            const filePath = fileSystemUtils.join(dir, file);
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
async
listArchiveFiles(archivePath)
{
    errorUtils.safeExecute(async () => {

        if (!await fs.pathExists(archivePath)) {
            throw errorUtils.createError('Архив не найден: ' + archivePath);
        }

        const format = path.extname(archivePath).toLowerCase();
        const files = [];

        if (format === '.zip') {
            return new Promise((resolve, reject) => {
                fs.createReadStream(archivePath)
                    .pipe(unzipper.Parse())
                    .on('entry', (entry) => {
                        files.push({
                            name: entry.path,
                            size: entry.vars.uncompressedSize,
                            type: entry.type,
                            date: entry.vars.lastModifiedDate
                        });
                        entry.autodrain();
                    })
                    .on('close', () => resolve(files))
                    .on('error', reject);
            });
        } else if (format === '.tar' || format === '.tar.gz' || format === '.tgz') {
            const entries = await tar.list({file: archivePath});
            return entries.map(entry => ({
                name: entry.name,
                size: entry.size,
                type: entry.type,
                date: entry.mtime
            }));
        } else {
            throw errorUtils.createError('Неподдерживаемый формат архива: ' + format);
        }


    }, 'error')
}

/**
 * Поиск в архиве
 * @param {string} archivePath - Путь к архиву
 * @param {string} query - Поисковый запрос
 * @param {Object} options - Опции поиска
 * @returns {Promise<Object>} Результаты поиска
 */
async
searchInArchive(archivePath, query, options = {})
{
    const {
        caseSensitive = false,
        maxResults = 100,
        fileTypes = [],
        includeContent = false
    } = options;

    errorUtils.safeExecute(async () => {

        const files = await this.listArchiveFiles(archivePath);
        const results = [];

        for (const file of files) {
            if (results.length >= maxResults) break;

            const fileName = caseSensitive ? file.name : file.name.toLowerCase();
            const searchQuery = caseSensitive ? query : query.toLowerCase();

            // Фильтр по типу файла
            if (fileTypes.length > 0) {
                const fileExt = path.extname(file.name).toLowerCase();
                if (!fileTypes.includes(fileExt)) continue;
            }

            // Поиск по имени файла
            if (fileName.includes(searchQuery)) {
                results.push({
                    file: file.name,
                    size: file.size,
                    type: file.type,
                    date: file.date,
                    matchType: 'filename'
                });
            }
        }

        return {
            archivePath,
            query,
            results,
            totalFound: results.length,
            searchOptions: {caseSensitive, maxResults, fileTypes, includeContent}
        };


    }, 'error')
}

}
}

/**
 * Получить информацию об архиве
 * @param {string} archivePath - Путь к архиву
 * @returns {Promise<Object>} Информация об архиве
 */
async
getArchiveInfo(archivePath)
{
    errorUtils.safeExecute(async () => {

        if (!await fs.pathExists(archivePath)) {
            throw errorUtils.createError('Архив не найден: ' + archivePath);
        }

        const stats = await fs.stat(archivePath);
        const files = await this.listArchiveFiles(archivePath);

        const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
        const compressionRatio = totalSize > 0 ? ((totalSize - stats.size) / totalSize * 100) : 0;

        return {
            path: archivePath,
            exists: true,
            size: stats.size,
            fileCount: files.length,
            uncompressedSize: totalSize,
            compressionRatio: Math.round(compressionRatio * 100) / 100,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            format: path.extname(archivePath).toLowerCase(),
            files: files.slice(0, 10) // Первые 10 файлов для предварительного просмотра
        };


    }, 'error');
}
}

/**
 * Проверить целостность архива
 * @param {string} archivePath - Путь к архиву
 * @returns {Promise<Object>} Результат проверки
 */
async
validateArchive(archivePath)
  async validateArchive(archivePath) {
    if (!await fs.pathExists(archivePath)) {
      throw errorUtils.createError('Архив не найден: ' + archivePath);
    }

    const format = path.extname(archivePath).toLowerCase();
    const errors = [];
    const warnings = [];

    // Пытаемся прочитать содержимое архива
    try {
      await this.listArchiveFiles(archivePath);
    } catch (e) {
      errors.push('Не удалось прочитать содержимое архива: ' + e.message);
    }

    // Проверяем размер архива
    const stats = await fs.stat(archivePath);
    if (stats.size === 0) {
      errors.push('Архив пустой');
    } else if (stats.size < 100) {
      warnings.push('Архив очень маленький, возможно поврежден');
    }

    return {
      path: archivePath,
      isValid: errors.length === 0,
      errors,
      warnings,
      size: stats.size,
      format,
      message: errors.length === 0 ? 'Архив валиден' : 'Архив содержит ошибки'
    };
  }

/**
 * Получить статистику по архивам
 * @returns {Promise<Object>} Статистика
 */
  async getArchiveStatistics() {
    try {
      const archives = await this.listAllArchives();
      const totalSize = archives.reduce((sum, archive) => sum + archive.size, 0);

      const formats = {};
      archives.forEach(archive => {
        const format = path.extname(archive.path).toLowerCase();
        formats[format] = (formats[format] || 0) + 1;
      });

      const largestArchive = archives.reduce(
        (largest, current) => (current.size > largest.size ? current : largest),
        {size: 0}
      );

      const recentArchives = archives
        .slice()
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 5);

      return {
        totalArchives: archives.length,
        totalSize,
        largestArchive: largestArchive.size > 0 ? largestArchive : null,
        recentArchives,
        formats,
        averageSize: archives.length > 0 ? totalSize / archives.length : 0
      };
    } catch (error) {
      return {
        totalArchives: 0,
        totalSize: 0,
        largestArchive: null,
        recentArchives: [],
        formats: {},
        averageSize: 0,
        error: error.message
      };
    }
  }

/**
 * Очистить старые архивы
 * @param {Object} options - Опции очистки
 * @returns {Promise<Object>} Результат очистки
 */
async
cleanupOldArchives(options = {})
{
    const {
        maxAge = 30, // дни
        maxSize = 1024 * 1024 * 1024, // 1GB
        dryRun = true
    } = options;

    errorUtils.safeExecute(async () => {

        const archives = await this.listAllArchives();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAge);

        const oldArchives = archives.filter(archive =>
            archive.mtime < cutoffDate || archive.size > maxSize
        );

        if (oldArchives.length === 0) {
            return {
                success: true,
                removedArchives: [],
                freedSpace: 0,
                options: {maxAge, maxSize, dryRun},
                message: 'Нет старых архивов для удаления'
            };
        }

        const removedArchives = [];
        let freedSpace = 0;

        for (const archive of oldArchives) {
            if (!dryRun) {
                try {
                    await fs.remove(archive.path);
                    removedArchives.push(archive);
                    freedSpace += archive.size;
                } catch (error) {
                    return {
                        success: false,
                        removedArchives,
                        freedSpace,
                        options: {maxAge, maxSize, dryRun},
                        message: 'Ошибка очистки: ' + error.message
                    };
                }
            } else {
                removedArchives.push(archive);
                freedSpace += archive.size;
            }
        }

        return {
            success: true,
            removedArchives,
            freedSpace,
            options: {maxAge, maxSize, dryRun},
            message: (dryRun ? 'Будет удалено ' : 'Удалено ') +
                removedArchives.length +
                ' архивов, освобождено ' +
                (freedSpace / 1024 / 1024).toFixed(2) +
                ' MB'
        };
    } catch (error) {
        return {
            success: false,
            removedArchives: [],
            freedSpace: 0,
            options: {maxAge, maxSize, dryRun},
            message: 'Ошибка очистки архивов: ' + error.message
        };
    }
  }

  /**
   * Создать архив с автоматическим именованием
   * @param {Array|string} files - Массив путей к файлам
   * @param {Object} options - Опции архивирования
   * @returns {Promise<Object>} Результат архивирования
   */
  async createAutoNamedArchive(files, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `
                archive_$
                {
                    timestamp
                }
                `;
    
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
          const filePath = fileSystemUtils.join(searchDir, file);
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

      return archives.sort((a, b) => b.mtime - a.mtime);
    } catch (error) {
      return [];
    }
  }
}

module.exports = {ArchiveOperationsAdapter};