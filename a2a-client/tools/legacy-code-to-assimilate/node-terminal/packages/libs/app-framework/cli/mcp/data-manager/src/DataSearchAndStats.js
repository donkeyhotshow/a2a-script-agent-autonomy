const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { safeParse } = require('@mcp/core-json-utils');

class DataSearchAndStats {
    constructor(dataManager, logger, errorHandler) {
        this.dataManager = dataManager;
        this.logger = logger;
        this.errorHandler = errorHandler;
        this.cache = dataManager.cache; // Используем общий кэш
        this.cacheTimeout = dataManager.cacheTimeout; // Используем общий таймаут кэша
    }

    /**
     * Нормализация имени файла (из simple-mcp-server.js)
     */
    normalizeFileName(fileName) {
        return String(fileName)
            .toLowerCase()
            .replace(/[^\p{L}\p{N}._-]+/gu, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }

    /**
     * Поиск файла по имени (из simple-mcp-server.js)
     */
    async findFileByName(fileName, dataTypesConfig = {}, options = {}) {
        const {
            searchDataType = null // Если указан, то ищем только по этому типу данных
        } = options;

        if (!fileName) {
            throw new Error('Имя файла не указано');
        }

        const normalizedName = this.normalizeFileName(fileName);
        const results = [];
        this.logger.debug(`Searching for file: ${fileName} in types: ${searchDataType || 'all'}`);
        this.logger.debug(`Current working directory: ${process.cwd()}`);

        try {
            const typesToSearch = searchDataType ? [searchDataType] : Object.keys(dataTypesConfig);

            for (const type of typesToSearch) {
                const typeConfig = dataTypesConfig[type];
                if (!typeConfig) continue;

                const paths = Array.isArray(typeConfig.paths) ? typeConfig.paths : [typeConfig.path];
                
                for (const typePath of paths) {
                    const fullPath = path.join(process.cwd(), typePath);
                    if (!await fs.pathExists(fullPath)) {
                        continue;
                    }

                    const files = await this.dataManager.getFilesRecursive(fullPath, typeConfig.extensions);
                    
                    for (const file of files) {
                        const fileNameWithoutExt = path.basename(file, path.extname(file));
                        const normalizedFileName = this.normalizeFileName(fileNameWithoutExt);
                        
                        if (normalizedFileName.includes(normalizedName) || 
                            normalizedName.includes(normalizedFileName)) {
                            const stats = await fs.stat(file);
                            results.push({
                                type,
                                path: file,
                                name: path.basename(file),
                                relativePath: path.relative(process.cwd(), file),
                                size: stats.size,
                                modified: stats.mtime
                            });
                        }
                    }
                }
            }

            return {
                search_term: fileName,
                data_type: searchDataType || 'all',
                results_count: results.length,
                results: results
            };
        } catch (error) {
            this.errorHandler.handle(error, 'DataSearchAndStats.findFileByName');
            throw error;
        }
    }

    /**
     * Получение статистики по типу данных (из simple-mcp-server.js)
     * dataTypesConfig должен быть передан извне, чтобы DataManager был более универсальным
     */
    async getDataTypeStats(dataType, dataTypesConfig) {
        if (!dataType) {
            throw new Error('Тип данных не указан');
        }

        try {
            const typeConfig = dataTypesConfig[dataType];
            if (!typeConfig) {
                throw new Error(`Неизвестный тип данных: ${dataType}`);
            }

            const basePaths = Array.isArray(typeConfig.paths) ? typeConfig.paths : [typeConfig.path];
            let files = [];
            for (const base of basePaths) {
                if (!base) continue;
                const typePath = path.join(process.cwd(), base);
                if (!await fs.pathExists(typePath)) continue;
                const sub = await this.dataManager.getFilesRecursive(typePath, typeConfig.extensions);
                files.push(...sub);
            }
            let totalSize = 0;
            let validFiles = 0;
            let invalidFiles = 0;
            let lastModified = null;

            for (const file of files) {
                const integrity = await this.dataManager.checkFileIntegrity({ file_path: file });
                const stats = await fs.stat(file);
                
                totalSize += stats.size;
                
                if (integrity.isValid) {
                    validFiles++;
                } else {
                    invalidFiles++;
                }

                if (!lastModified || stats.mtime > lastModified) {
                    lastModified = stats.mtime;
                }
            }

            return {
                totalFiles: files.length,
                totalSize,
                validFiles,
                invalidFiles,
                lastModified,
                averageFileSize: files.length > 0 ? Math.round(totalSize / files.length) : 0
            };
        } catch (error) {
            this.errorHandler.handle(error, 'DataSearchAndStats.getDataTypeStats');
            throw error;
        }
    }

    /**
     * Получение данных по типу (из simple-mcp-server.js)
     */
    async getDataByType(dataType, dataTypesConfig, options = {}) {
        const {
            page = 1,
            pageSize = 100,
            filter = {},
            sort = {},
            search = null
        } = options;

        if (!dataType) {
            throw new Error('Тип данных не указан');
        }

        try {
            const typeConfig = dataTypesConfig[dataType];
            if (!typeConfig) {
                throw new Error(`Неизвестный тип данных: ${dataType}`);
            }

            const basePaths = Array.isArray(typeConfig.paths) ? typeConfig.paths : [typeConfig.path];
            let files = [];
            for (const base of basePaths) {
                if (!base) continue;
                const typePath = path.join(process.cwd(), base);
                if (!await fs.pathExists(typePath)) continue;
                const sub = await this.dataManager.getFilesRecursive(typePath, typeConfig.extensions);
                files.push(...sub);
            }
            let items = [];

            for (const file of files) {
                try {
                    const integrity = await this.dataManager.checkFileIntegrity({ file_path: file });
                    if (!integrity.isValid) {
                        continue;
                    }

                    const content = await fs.readFile(file, 'utf8');
                    let item;

                    if (path.extname(file) === '.json') {
                        item = JSON.parse(content);
                    } else {
                        item = {
                            content,
                            filePath: file,
                            fileName: path.basename(file)
                        };
                    }

                    item._metadata = {
                        filePath: file,
                        size: integrity.size,
                        modified: integrity.modified,
                        hash: integrity.hash
                    };

                    // Применение фильтров, сортировки и поиска
                    let matchesFilter = true;
                    for (const key in filter) {
                        if (item[key] !== filter[key]) {
                            matchesFilter = false;
                            break;
                        }
                    }
                    if (!matchesFilter) continue;

                    if (search && JSON.stringify(item).toLowerCase().indexOf(search.toLowerCase()) === -1) {
                        continue;
                    }

                    items.push(item);
                } catch (error) {
                    this.logger.error(`Error reading file ${file}: ${error.message}`);
                }
            }

            // Сортировка
            if (sort.field) {
                const sortOrder = sort.order === 'desc' ? -1 : 1;
                items.sort((a, b) => {
                    if (a[sort.field] < b[sort.field]) return -1 * sortOrder;
                    if (a[sort.field] > b[sort.field]) return 1 * sortOrder;
                    return 0;
                });
            }

            const totalItems = items.length;
            const totalPages = Math.ceil(totalItems / pageSize);
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedItems = items.slice(startIndex, endIndex);

            return {
                data: paginatedItems,
                pagination: {
                    page,
                    pageSize,
                    totalItems,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                filters: {
                    applied: filter,
                    search,
                    sort
                }
            };
        } catch (error) {
            this.errorHandler.handle(error, 'DataSearchAndStats.getDataByType');
            throw error;
        }
    }
}

export { DataSearchAndStats };
