const fsOriginal = require('fs'); // Переименовано в fsOriginal
const fs = require('fs-extra'); // Добавляем fs-extra
const path = require('path');
const crypto = require('crypto'); // Добавляем crypto
const { safeParse } = require('../../../../core/json-utils'); // Corrected path and import
const { LoggerCore } = require('../../../logging-reporting/core-logger/index.js'); // Updated path after libs reorganization
const ErrorHandler = require('../../../core/error-handler/index.js');
const AtomicOperations = require('../../atomic-operations/src/atomic-operations.js');
const { DataSearchAndStats } = require('./DataSearchAndStats.js');
const { DataBackupAndRestore } = require('./DataBackupAndRestore.js');

class DataManager {
    constructor(options = {}) {
        // Инициализируем логгер с базовой конфигурацией
        this.logger = options.logger || new LoggerCore({
            level: 'info',
            console: { enabled: true },
            file: { enabled: false }
        });
        
        // Инициализируем обработчик ошибок с логгером
        this.errorHandler = new ErrorHandler(this.logger);
        
        this.dataDir = path.join(process.cwd(), 'data');
        this.ensureDataDir();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 минут
        this.atomicOperations = new AtomicOperations();
        this.dataSearchAndStats = new DataSearchAndStats(this, this.logger, this.errorHandler);
        this.dataBackupAndRestore = new DataBackupAndRestore(this, this.logger, this.errorHandler);
    }

    ensureDataDir() {
        try {
            if (!fsOriginal.existsSync(this.dataDir)) {
                fsOriginal.mkdirSync(this.dataDir, { recursive: true });
            }
        } catch (error) {
            this.logger.error('Failed to create data directory:', error.message);
        }
    }

    getFilePath(key) {
        return path.join(this.dataDir, `${key}.json`);
    }

    async set(key, value, options = {}) {
        const {
            ttl = null,
            compress = false,
            encrypt = false
        } = options;

        try {
            this.logger.debug('Setting data', { key, hasValue: !!value });

            const data = {
                value,
                metadata: {
                    created: new Date().toISOString(),
                    ttl,
                    compress,
                    encrypt,
                    size: JSON.stringify(value).length
                }
            };

            if (ttl) {
                data.metadata.expires = new Date(Date.now() + ttl).toISOString();
            }

            const filePath = this.getFilePath(key);
            const content = JSON.stringify(data, null, 2);

            // Записываем в файл
            await this.atomicOperations.atomicWrite(filePath, content, { encoding: 'utf8' });

            // Обновляем кэш
            this.cache.set(key, {
                data,
                timestamp: Date.now()
            });

            this.logger.info('Data saved successfully', { key, filePath });

            return {
                success: true,
                key,
                filePath,
                size: content.length
            };

        } catch (error) {
            this.errorHandler.handle(error, 'DataManager.set');
            throw error;
        }
    }

    async get(key, options = {}) {
        const {
            defaultValue = null,
            refreshCache = false
        } = options;

        try {
            // Проверяем кэш
            if (!refreshCache && this.cache.has(key)) {
                const cached = this.cache.get(key);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    this.logger.debug('Data retrieved from cache', { key });
                    return cached.data.value;
                }
            }

            const filePath = this.getFilePath(key);

            if (!fsOriginal.existsSync(filePath)) {
                this.logger.debug('Data not found, returning default', { key, defaultValue });
                return defaultValue;
            }

            const content = fsOriginal.readFileSync(filePath, 'utf8');
            const parseResult = safeParse(content);
            if (!parseResult.success) {
                this.logger.error('Failed to parse data file', { key, error: parseResult.error });
                return defaultValue;
            }
            const data = parseResult.data;

            // Проверяем TTL
            if (data.metadata.expires) {
                const expires = new Date(data.metadata.expires);
                if (Date.now() > expires.getTime()) {
                    this.logger.debug('Data expired, removing', { key });
                    this.delete(key);
                    return defaultValue;
                }
            }

            // Обновляем кэш
            this.cache.set(key, {
                data,
                timestamp: Date.now()
            });

            this.logger.debug('Data retrieved from file', { key, filePath });

            return data.value;

        } catch (error) {
            this.errorHandler.handle(error, 'DataManager.get');
            return defaultValue;
        }
    }

    async delete(key) {
        try {
            this.logger.debug('Deleting data', { key });

            const filePath = this.getFilePath(key);

            if (fsOriginal.existsSync(filePath)) {
                fsOriginal.unlinkSync(filePath);
            }

            // Удаляем из кэша
            this.cache.delete(key);

            this.logger.info('Data deleted successfully', { key });

            return {
                success: true,
                key
            };

        } catch (error) {
            this.errorHandler.handle(error, 'DataManager.delete');
            throw error;
        }
    }

    async has(key) {
        try {
            const filePath = this.getFilePath(key);
            return fsOriginal.existsSync(filePath);
        } catch (error) {
            this.errorHandler.handle(error, 'DataManager.has');
            return false;
        }
    }

    async keys(pattern = null) {
        try {
            const files = fsOriginal.readdirSync(this.dataDir);
            let keys = files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''));

            if (pattern) {
                const regex = new RegExp(pattern);
                keys = keys.filter(key => regex.test(key));
            }

            return keys;

        } catch (error) {
            this.errorHandler.handle(error, 'DataManager.keys');
            return [];
        }
    }

    async clear() {
        try {
            this.logger.info('Clearing all data');

            const files = fsOriginal.readdirSync(this.dataDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            for (const file of jsonFiles) {
                const filePath = path.join(this.dataDir, file);
                fsOriginal.unlinkSync(filePath);
            }

            // Очищаем кэш
            this.cache.clear();

            this.logger.info('All data cleared successfully', { filesDeleted: jsonFiles.length });

            return {
                success: true,
                filesDeleted: jsonFiles.length
            };

        } catch (error) {
            this.errorHandler.handle(error, 'DataManager.clear');
            throw error;
        }
    }

    async backup(backupPath = null) {
        return await this.dataBackupAndRestore.backup(backupPath);
    }

    async restore(backupPath) {
        return await this.dataBackupAndRestore.restore(backupPath);
    }

    clearCache() {
        this.cache.clear();
        this.logger.debug('Cache cleared');
    }

    setCacheTimeout(timeout) {
        this.cacheTimeout = timeout;
        this.logger.debug('Cache timeout updated', { timeout });
    }

    /**
     * Проверка кодировки файла (из simple-mcp-server.js)
     */
    isValidEncoding(content) {
        try {
            const invalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
            return !invalidChars.test(content);
        } catch (error) {
            return false;
        }
    }

    /**
     * Рекурсивный поиск файлов (из simple-mcp-server.js)
     */
    async getFilesRecursive(dirPath, extensions) {
        const cacheKey = `${dirPath}:${(extensions || []).join(',')}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.files;
        }

        const files = [];
        const maxFiles = 5000; 
        
        try {
            const items = await fs.readdir(dirPath);
            
            for (const item of items) {
                if (files.length >= maxFiles) {
                    this.logger.warn(`Reached file limit ${maxFiles} when traversing ${dirPath}`);
                    break;
                }

                const fullPath = path.join(dirPath, item);
                try {
                    const stat = await fs.stat(fullPath);
                    if (stat.isDirectory()) {
                        const subFiles = await this.getFilesRecursive(fullPath, extensions);
                        for (const f of subFiles) {
                            if (files.length >= maxFiles) break;
                            files.push(f);
                        }
                    } else if (stat.isFile()) {
                        const ext = path.extname(item).toLowerCase();
                        if (!extensions || extensions.length === 0 || extensions.includes(ext)) {
                            files.push(fullPath);
                        }
                    }
                } catch (err) {
                    this.logger.error(`Error accessing ${fullPath}: ${err.message}`);
                }
            }
        } catch (error) {
            this.errorHandler.handle(error, 'DataManager.getFilesRecursive');
        }
        
        this.cache.set(cacheKey, { files, timestamp: Date.now() });
        return files;
    }

    /**
     * Чтение файла с пагинацией (из simple-mcp-server.js)
     */
    async readFileWithPagination(filePath, options = {}) {
        const {
            page = 1,
            pageSize = 100,
            startLine = null,
            endLine = null
        } = options;

        if (!filePath) {
            throw new Error('Путь к файлу не указан');
        }

        try {
            const integrity = await this.checkFileIntegrity({ file_path: filePath });
            if (!integrity.isValid) {
                throw new Error(`Файл поврежден: ${integrity.error || 'Неизвестная ошибка'}`);
            }

            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n');
            const totalLines = lines.length;

            let start, end;

            if (startLine !== null && endLine !== null) {
                start = Math.max(0, startLine - 1);
                end = Math.min(totalLines, endLine);
            } else {
                start = (page - 1) * pageSize;
                end = Math.min(totalLines, start + pageSize);
            }

            const pageLines = lines.slice(start, end);
            const totalPages = Math.ceil(totalLines / pageSize);

            return {
                filePath,
                content: pageLines.join('\n'),
                lines: pageLines,
                pagination: {
                    page,
                    pageSize,
                    totalLines,
                    totalPages,
                    startLine: start + 1,
                    endLine: end,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                integrity,
                metadata: {
                    encoding: 'utf8',
                    size: content.length,
                    lastModified: integrity.modified
                }
            };
        } catch (error) {
            this.errorHandler.handle(error, 'DataManager.readFileWithPagination');
            throw error;
        }
    }

    /**
     * Проверка целостности файла (из simple-mcp-server.js)
     */
    async checkFileIntegrity(args) {
        const { file_path } = args;

        if (!file_path) {
            throw new Error('Путь к файлу не указан');
        }

        try {
            const stats = await fs.stat(file_path);
            const content = await fs.readFile(file_path, 'utf8');
            
            const hash = crypto.createHash('sha256').update(content).digest('hex');
            
            const isValidSize = stats.size > 0 && stats.size < 100 * 1024 * 1024;
            const isValidEncoding = this.isValidEncoding(content);
            
            let isValidStructure = true;
            if (path.extname(file_path) === '.json') {
                try {
                    JSON.parse(content);
                } catch (error) {
                    isValidStructure = false;
                }
            }

            return {
                filePath: file_path,
                size: stats.size,
                modified: stats.mtime,
                hash,
                isValidSize,
                isValidEncoding,
                isValidStructure,
                isValid: isValidSize && isValidEncoding && isValidStructure
            };
        } catch (error) {
            this.errorHandler.handle(error, 'DataManager.checkFileIntegrity');
            return {
                filePath: file_path,
                isValid: false,
                error: error.message
            };
        }
    }

    async getInfo(key) {
        return await this.dataBackupAndRestore.getInfo(key);
    }

    async getAllInfo() {
        return await this.dataBackupAndRestore.getAllInfo();
    }
}

export default DataManager;
