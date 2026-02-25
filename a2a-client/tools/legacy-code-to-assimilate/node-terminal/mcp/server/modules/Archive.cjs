/**
 * Модуль архивирования
 * Обеспечивает создание, извлечение и управление архивами
 * Использует современную библиотеку archive-operations
 */

const {validationUtils} = require('@libs/validation/validation/validation-utils.cjs');
const {fileSystemUtils} = require('@libs/system/file-operations/index.js');
const {errorUtils} = require('@libs/error-management/error-handler/error-utils.js');
const {ModuleBase} = require('../core/ModuleBase.cjs');
const fs = require('fs').promises;
const path = require('path');

// Импортируем адаптер для работы с архивами
const {ArchiveOperationsAdapter} = require('../../../lib/archive-adapter.cjs');

class ArchiveModule extends ModuleBase {
    constructor(server) {
        super(server, {
            name: 'Archive',
            version: '2.0.0',
            description: 'Архивирование файлов и папок с использованием современной библиотеки'
        });

        // Инициализируем экземпляр ArchiveOperationsAdapter
        this.archiveOps = new ArchiveOperationsAdapter({
            archivePath: fileSystemUtils.join(process.cwd(), 'archives'),
            defaultFormat: 'zip',
            compressionLevel: 6
        });
    }

    async processRequest(id, args) {
        const {action, files, archivePath, ...params} = args;

        switch (action) {
            case 'create':
                return await this.handleCreate(id, files, archivePath, params);
            case 'extract':
                return await this.handleExtract(id, archivePath, params);
            case 'list':
                return await this.handleList(id, archivePath);
            case 'info':
                return await this.handleInfo(id, archivePath);
            case 'search':
                return await this.handleSearch(id, archivePath, params);
            case 'validate':
                return await this.handleValidate(id, archivePath);
            case 'statistics':
                return await this.handleStatistics(id);
            case 'cleanup':
                return await this.handleCleanup(id, params);
            default:
                throw errorUtils.createError(`Unknown archive action: ${action}`);
        }
    }

    async handleCreate(id, files, archivePath, {format = 'zip', compressionLevel = 6, preserveStructure = true} = {}) {
        if (!files || !validationUtils.isArray(files) || files.length === 0) {
            throw errorUtils.createError('Files array is required for archive creation');
        }

        if (!archivePath) {
            throw errorUtils.createError('Archive path is required');
        }

        errorUtils.safeExecute(async () => {

            // Используем современную библиотеку для создания архива
            const result = await this.archiveOps.createArchive(files, path.basename(archivePath, path.extname(archivePath)), {
                format,
                compressionLevel,
                preserveStructure
            });

            if (!result.success) {
                throw errorUtils.createError(result.error || 'Failed to create archive');
            }

            return {
                success: true,
                archivePath: result.archivePath,
                format,
                files: result.files.length,
                size: this.formatSize(result.size),
                originalSize: result.size,
                message: result.message
            };


        }, 'error')`);
    }
  }

  async handleExtract(id, archivePath, { extractPath = '.', overwrite = false, preserveStructure = true } = {}) {
    if (!archivePath) {
      throw errorUtils.createError('Archive path is required');
    }

    errorUtils.safeExecute(async () => {

      // Используем современную библиотеку для извлечения
      const result = await this.archiveOps.extractArchive(archivePath, extractPath, {
        overwrite,
        preserveStructure
      });

      if (!result.success) {
        throw errorUtils.createError(result.error || 'Failed to extract archive');
      }

      return {
        success: true,
        archivePath,
        extractPath,
        extractedFiles: result.extractedFiles.length,
        originalSize: result.originalSize,
        message: result.message
      };

    
}, 'error')`
    )

    }
}

async
handleList(id, archivePath)
{
    if (!archivePath) {
        throw errorUtils.createError('Archive path is required');
    }

    errorUtils.safeExecute(async () => {

        // Используем современную библиотеку для получения списка файлов
        const files = await this.archiveOps.listArchiveFiles(archivePath);

        return {
            success: true,
            archivePath,
            files: files.map(file => ({
                name: file.name,
                size: file.size,
                type: file.type,
                date: file.date
            })),
            count: files.length
        };


    }, 'error')`);
    }
  }

  async handleInfo(id, archivePath) {
    if (!archivePath) {
      throw errorUtils.createError('Archive path is required');
    }

    errorUtils.safeExecute(async () => {

      // Используем современную библиотеку для получения информации
      const info = await this.archiveOps.getArchiveInfo(archivePath);

      if (!info.exists) {
        throw errorUtils.createError(`
    Archive
    not
    $
    {
        archivePath
    }
    `);
      }

      return {
        success: true,
        archivePath,
        format: info.format,
        size: this.formatSize(info.size),
        originalSize: info.size,
        fileCount: info.fileCount,
        uncompressedSize: info.uncompressedSize,
        compressionRatio: `
    $
    {
        info.compressionRatio
    }
%
    `,
        created: info.createdAt,
        modified: info.modifiedAt,
        files: info.files
      };

    
}, 'error')`
)

}
}

async
handleSearch(id, archivePath, {query, caseSensitive = false, maxResults = 100, fileTypes = []} = {})
{
    if (!archivePath || !query) {
        throw errorUtils.createError('Archive path and search query are required');
    }

    errorUtils.safeExecute(async () => {

        // Используем современную библиотеку для поиска
        const result = await this.archiveOps.searchInArchive(archivePath, query, {
            caseSensitive,
            maxResults,
            fileTypes,
            includeContent: false
        });

        return {
            success: true,
            archivePath,
            query,
            results: result.results,
            count: result.totalFound,
            searchOptions: result.searchOptions
        };


    }, 'error')`);
    }
  }

  async handleValidate(id, archivePath) {
    if (!archivePath) {
      throw errorUtils.createError('Archive path is required');
    }

    errorUtils.safeExecute(async () => {

      // Используем современную библиотеку для валидации
      const result = await this.archiveOps.validateArchive(archivePath);

      return {
        success: true,
        archivePath,
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        size: result.size,
        format: result.format,
        message: result.message
      };

    
}, 'error')`
)

}
}

async
handleStatistics(id)
{
    errorUtils.safeExecute(async () => {

        // Используем современную библиотеку для получения статистики
        const stats = await this.archiveOps.getArchiveStatistics();

        return {
            success: true,
            totalArchives: stats.totalArchives,
            totalSize: this.formatSize(stats.totalSize),
            originalTotalSize: stats.totalSize,
            largestArchive: stats.largestArchive ? {
                name: stats.largestArchive.name,
                size: this.formatSize(stats.largestArchive.size),
                originalSize: stats.largestArchive.size
            } : null,
            recentArchives: stats.recentArchives.map(archive => ({
                name: archive.name,
                size: this.formatSize(archive.size),
                originalSize: archive.size,
                date: archive.date
            })),
            formats: stats.formats,
            averageSize: this.formatSize(stats.averageSize)
        };


    }, 'error')`);
    }
  }

  async handleCleanup(id, { maxAge = 30, maxSize = 1024 * 1024 * 1024, dryRun = true } = {}) {
    errorUtils.safeExecute(async () => {

      // Используем современную библиотеку для очистки
      const result = await this.archiveOps.cleanupOldArchives({
        maxAge,
        maxSize,
        dryRun
      });

      return {
        success: result.success,
        removedArchives: result.removedArchives.length,
        freedSpace: this.formatSize(result.freedSpace),
        originalFreedSpace: result.freedSpace,
        options: result.options,
        message: result.message
      };

    
}, 'error')`
)

}
}

formatSize(bytes)
{
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

getTools()
{
    return [{
        name: 'archive',
        description: 'Архивирование: create | extract | list | info | search | validate | statistics | cleanup',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'extract', 'list', 'info', 'search', 'validate', 'statistics', 'cleanup']
                },
                files: {type: 'array', items: {type: 'string'}, description: 'Файлы для архивирования'},
                archivePath: {type: 'string', description: 'Путь к архиву'},
                format: {type: 'string', enum: ['zip', 'tar'], default: 'zip'},
                compressionLevel: {type: 'number', minimum: 1, maximum: 9, default: 6},
                extractPath: {type: 'string', description: 'Путь для извлечения'},
                overwrite: {type: 'boolean', default: false},
                preserveStructure: {type: 'boolean', default: true},
                query: {type: 'string', description: 'Поисковый запрос'},
                caseSensitive: {type: 'boolean', default: false},
                maxResults: {type: 'number', default: 100},
                fileTypes: {type: 'array', items: {type: 'string'}, description: 'Типы файлов для поиска'},
                maxAge: {type: 'number', default: 30, description: 'Максимальный возраст архивов в днях'},
                maxSize: {type: 'number', default: 1073741824, description: 'Максимальный размер архива в байтах'},
                dryRun: {type: 'boolean', default: true, description: 'Пробный запуск очистки'}
            },
            required: ['action']
        }
    }];
}
}

module.exports = {ArchiveModule};


