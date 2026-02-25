/**
 * Модуль файловых операций
 * Обрабатывает чтение, запись, копирование и другие файловые операции
 * Улучшенная версия с дополнительными возможностями и детальными подсказками
 */

const {fileSystemUtils} = require('@libs/system/file-operations/index.js');
const {PathUtils} = require('@libs/system/path-utils/index.js');
const {errorUtils} = require('@libs/error-management/error-handler/error-utils.js');
const {ModuleBase} = require('../core/ModuleBase.cjs');
const {EncodingUtils} = require('../utils/encoding-utils.cjs');
const fs = require('fs').promises;
const path = require('path');

class FileOperationsModule extends ModuleBase {
    constructor(server) {
        super(server, {
            name: 'FileOperations',
            version: '2.0.0',
            description: 'Расширенные файловые операции: чтение, запись, копирование, перемещение, создание директорий, проверка существования'
        });

        this.fileUtils = server?.fileUtils || {};
        this.pathUtils = server?.pathUtils || {};
        this.encodingUtils = new EncodingUtils();

        // Создаем директорию для логов если её нет
        this.ensureLogDirectory();

        // Метрики для мониторинга
        this.metrics = {
            totalOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            operationTypes: {}
        };

        // Подсказки для операций
        this.operationHints = {
            list: 'Используйте pattern для фильтрации, recursive=true для рекурсивного обхода, showHidden=true для скрытых файлов',
            read: 'Используйте start/end для чтения части файла, encoding для указания кодировки',
            write: 'Используйте append=true для добавления к файлу, createDirs=true для автоматического создания директорий',
            copy: 'Используйте overwrite=true для перезаписи существующих файлов, createDirs=true для создания директорий',
            move: 'Используйте overwrite=true для перезаписи существующих файлов, createDirs=true для создания директорий',
            delete: 'Используйте recursive=true для удаления директорий',
            exists: 'Проверяет существование файла/директории и возвращает детальную информацию',
            info: 'Возвращает полную информацию о файле/директории',
            mkdir: 'Используйте recursive=true для создания вложенных директорий, mode для прав доступа',
            rmdir: 'Используйте recursive=true для удаления непустых директорий, force=true для игнорирования ошибок'
        };
    }

    /**
     * Создание директории для логов
     */
    async ensureLogDirectory() {
        try {
            const logDir = path.join(process.cwd(), 'logs', 'mcp-calls');
            await fs.mkdir(logDir, {recursive: true});
            this.logDir = logDir;
        } catch (error) {
            this.logger.error(`Failed to create log directory: ${error.message}`);
            throw error;
        }
    }

    /**
     * Обновление метрик
     */
    updateMetrics(action, success) {
        this.metrics.totalOperations++;
        if (success) {
            this.metrics.successfulOperations++;
        } else {
            this.metrics.failedOperations++;
        }

        if (!this.metrics.operationTypes[action]) {
            this.metrics.operationTypes[action] = {total: 0, success: 0, failed: 0};
        }

        this.metrics.operationTypes[action].total++;
        if (success) {
            this.metrics.operationTypes[action].success++;
        } else {
            this.metrics.operationTypes[action].failed++;
        }
    }

    /**
     * Валидация и нормализация пути с улучшенными подсказками
     */
    validateAndNormalizePath(filePath, operation = 'read') {
        if (!filePath) {
            const hint = this.operationHints[operation] || 'Укажите путь к файлу или директории';
            throw errorUtils.createError(`❌ Path parameter is required for ${operation} operation\n💡 ${hint}`);
        }

        if (typeof filePath !== 'string') {
            throw errorUtils.createError(`❌ Path must be a string, got ${typeof filePath}\n💡 Укажите корректный путь к файлу`);
        }

        if (filePath.trim() === '') {
            throw errorUtils.createError(`❌ Path cannot be empty\n💡 Укажите непустой путь к файлу`);
        }

        // Проверяем безопасность пути
        const normalizedPath = path.resolve(filePath);

        // Базовые проверки безопасности (можно расширить)
        if (normalizedPath.includes('..') && !normalizedPath.startsWith(process.cwd())) {
            throw errorUtils.createError(`❌ Access denied: Path traversal detected\n💡 Путь ${filePath} содержит недопустимые символы`);
        }

        return normalizedPath;
    }

    /**
     * Улучшенная валидация параметров с подсказками
     */
    validateOperationParams(action, params, requiredParams = []) {
        const missingParams = requiredParams.filter(param => params[param] === undefined);

        if (missingParams.length > 0) {
            const hint = this.operationHints[action] || 'Проверьте параметры операции';
            throw errorUtils.createError(`❌ Missing required parameters: ${missingParams.join(', ')}\n💡 ${hint}`);
        }

        // Специальные проверки для разных операций
        switch (action) {
            case 'write':
                if (params.content === undefined) {
                    throw errorUtils.createError(`❌ Content parameter is required for write action\n💡 ${this.operationHints.write}`);
                }
                break;
            case 'copy':
            case 'move':
                if (!params.destination) {
                    throw errorUtils.createError(`❌ Destination parameter is required for ${action} action\n💡 ${this.operationHints[action]}`);
                }
                break;
            case 'delete':
                if (params.recursive === undefined && params.force === undefined) {
                    // Предупреждение для директорий
                    return {warning: 'Consider using recursive=true for directories'};
                }
                break;
        }

        return {valid: true};
    }

    /**
     * Проверка существования файла/директории
     */
    async checkExists(filePath) {
        try {
            await fs.access(filePath);
            const stats = await fs.stat(filePath);
            return {
                exists: true,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                size: stats.size,
                modified: stats.mtime,
                created: stats.birthtime
            };
        } catch (error) {
            this.logger.error(`Failed to check existence of ${filePath}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Автоматическое создание директорий для файла
     */
    async ensureDirectoryExists(filePath) {
        const dir = path.dirname(filePath);
        if (dir !== '.') {
            await fs.mkdir(dir, {recursive: true});
        }
    }

    /**
     * Логирование вызова MCP с улучшенной информацией
     */
    async logMcpCall(id, args, result, error = null) {
        errorUtils.safeExecute(async () => {

            if (!this.logDir) return;

            const logEntry = {
                timestamp: new Date().toISOString(),
                id,
                args,
                result: error ? null : result,
                error: error ? error.message : null,
                stack: error ? error.stack : null,
                metrics: {...this.metrics},
                duration: result?.duration || null
            };

            const logFile = path.join(this.logDir, 'file-operations-calls.log');
            const logLine = JSON.stringify(logEntry) + '\n';

            await fs.appendFile(logFile, logLine, 'utf8');

        }, 'logError');
    }

    async processRequest(id, args) {
        const startTime = Date.now();

        // Логируем входящий запрос
        this.logger.info(`FileOperations processing request`, {id, args});

        let operationResult;
        let operationError = null;

        try {
            operationResult = await errorUtils.safeExecute(async () => {

                // Извлекаем параметры с правильной обработкой
                const {action, target_file, path: filePath, ...params} = args;

                // Поддерживаем оба варианта именования параметра
                const actualPath = target_file || filePath;

                if (!action) {
                    throw errorUtils.createError(`❌ Action parameter is required\n💡 Доступные действия: list, read, write, copy, move, delete, exists, info, mkdir, rmdir`);
                }

                // Проверяем корректность действия
                const validActions = ['list', 'read', 'write', 'copy', 'move', 'delete', 'exists', 'info', 'mkdir', 'rmdir'];
                if (!validActions.includes(action)) {
                    throw errorUtils.createError(`❌ Unknown file action: ${action}\n💡 Доступные действия: ${validActions.join(', ')}`);
                }

                // Валидируем параметры
                const validation = this.validateOperationParams(action, {...params, path: actualPath});
                if (validation.warning) {
                    if (this.logger && typeof this.logger.warn === 'function') {
                        this.logger.warn(`Warning for ${action}: ${validation.warning}`);
                    } else {
                        console.warn(`Warning for ${action}: ${validation.warning}`);
                    }
                }

                let result;
                switch (action) {
                    case 'list':
                        result = await this.handleList(id, actualPath || '.', params);
                        break;
                    case 'read':
                        result = await this.handleRead(id, actualPath, params);
                        break;
                    case 'write':
                        result = await this.handleWrite(id, actualPath, params);
                        break;
                    case 'copy':
                        result = await this.handleCopy(id, actualPath, params);
                        break;
                    case 'move':
                        result = await this.handleMove(id, actualPath, params);
                        break;
                    case 'delete':
                        result = await this.handleDelete(id, actualPath, params);
                        break;
                    case 'exists':
                        result = await this.handleExists(id, actualPath);
                        break;
                    case 'info':
                        result = await this.handleInfo(id, actualPath);
                        break;
                    case 'mkdir':
                        result = await this.handleMkdir(id, actualPath, params);
                        break;
                    case 'rmdir':
                        result = await this.handleRmdir(id, actualPath, params);
                        break;
                }

                // Добавляем время выполнения и подсказки
                result.duration = Date.now() - startTime;
                result.hint = this.operationHints[action];
                result.nextSteps = this.getNextSteps(action, result);

                // Обновляем метрики
                this.updateMetrics(action, true);

                // Логируем успешный результат
                await this.logMcpCall(id, args, result);
                return result;

            }, 'error');
        } catch (e) {
            operationError = this.enhanceErrorMessage(e, args);
            this.updateMetrics(args.action, false);
            await this.logMcpCall(id, args, null, operationError);
            throw operationError;
        }

        return operationResult;
    }

    /**
     * Улучшение сообщений об ошибках с подсказками
     */
    enhanceErrorMessage(error, args) {
        const {action} = args;

        // Добавляем контекст к ошибкам
        if (error.code === 'ENOENT') {
            error.message = `❌ File not found: ${error.message}\n💡 Проверьте правильность пути и существование файла`;
        } else if (error.code === 'EACCES') {
            error.message = `❌ Permission denied: ${error.message}\n💡 Проверьте права доступа к файлу/директории`;
        } else if (error.code === 'EISDIR') {
            error.message = `❌ Path is a directory: ${error.message}\n💡 Используйте соответствующую операцию для директорий`;
        } else if (error.code === 'ENOTDIR') {
            error.message = `❌ Path is not a directory: ${error.message}\n💡 Укажите путь к директории`;
        } else if (error.code === 'EEXIST') {
            error.message = `❌ File already exists: ${error.message}\n💡 Используйте overwrite=true для перезаписи`;
        }

        // Добавляем подсказки для конкретных операций
        if (action && this.operationHints[action]) {
            error.message += `\n💡 ${this.operationHints[action]}`;
        }

        return error;
    }

    /**
     * Получение следующих шагов для операции
     */
    getNextSteps(action, result) {
        switch (action) {
            case 'list':
                if (result.directories > 0) {
                    return `Используйте 'read' для просмотра содержимого файлов, 'mkdir' для создания директорий`;
                }
                return `Используйте 'write' для создания файлов, 'mkdir' для создания директорий`;
            case 'read':
                return `Используйте 'write' для изменения файла, 'copy' для создания копии`;
            case 'write':
                return `Используйте 'read' для проверки содержимого, 'copy' для резервной копии`;
            case 'copy':
                return `Используйте 'move' для перемещения, 'delete' для удаления исходного файла`;
            case 'move':
                return `Используйте 'copy' для создания копии, 'delete' для удаления исходного файла`;
            case 'delete':
                return `Используйте 'exists' для проверки удаления, 'list' для просмотра директории`;
            case 'exists':
                if (result.exists) {
                    return `Используйте 'info' для детальной информации, 'read' для чтения файла`;
                }
                return `Используйте 'write' для создания файла, 'mkdir' для создания директории`;
            case 'info':
                return `Используйте 'read' для чтения файла, 'list' для просмотра директории`;
            case 'mkdir':
                return `Используйте 'list' для проверки создания, 'write' для создания файлов`;
            case 'rmdir':
                return `Используйте 'exists' для проверки удаления, 'list' для просмотра директории`;
            default:
                return `Используйте 'list' для просмотра содержимого, 'exists' для проверки существования`;
        }
    }

    async handleList(id, dirPath, {pattern, recursive = false, showHidden = false} = {}) {
        const targetPath = this.validateAndNormalizePath(dirPath || '.', 'list');
        const items = await fs.readdir(targetPath, {withFileTypes: true});

        let result = items.map(item => ({
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file',
            path: path.join(targetPath, item.name),
            hidden: item.name.startsWith('.'),
            size: item.isFile() ? null : null // Размер будет добавлен позже для файлов
        }));

        // Фильтруем скрытые файлы если не запрошены
        if (!showHidden) {
            result = result.filter(item => !item.hidden);
        }

        // Применяем паттерн если указан
        if (pattern) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            result = result.filter(item => regex.test(item.name));
        }

        // Добавляем размеры для файлов
        for (const item of result) {
            if (item.type === 'file') {
                errorUtils.safeExecute(async () => {
                    try {
                        const stats = await fs.stat(item.path);
                        item.size = stats.size;
                        item.modified = stats.mtime;
                    } catch (error) {
                        // Игнорируем ошибки получения статистики файла
                        item.size = 0;
                        item.modified = new Date();
                    }
                }, 'error');
            }
        }

        // Рекурсивный обход если запрошен
        if (recursive) {
            for (const item of result) {
                if (item.type === 'directory') {
                    errorUtils.safeExecute(async () => {

                        const subItems = await this.handleList(id, item.path, {pattern, recursive: true, showHidden});
                        item.children = subItems.items;

                    }, 'error');
                }
            }
        }

        const summary = {
            success: true,
            items: result,
            path: targetPath,
            total: result.length,
            directories: result.filter(i => i.type === 'directory').length,
            files: result.filter(i => i.type === 'file').length,
            hidden: result.filter(i => i.hidden).length,
            message: `📁 Найдено ${result.length} элементов в ${targetPath}`,
            details: {
                directories: result.filter(i => i.type === 'directory').length,
                files: result.filter(i => i.type === 'file').length,
                hidden: result.filter(i => i.hidden).length,
                recursive: recursive || false,
                pattern: pattern || 'none',
                showHidden: showHidden || false
            }
        };

        // Добавляем подсказки для пустых директорий
        if (result.length === 0) {
            summary.message += ' (директория пуста)';
            summary.suggestion = 'Используйте write для создания файлов или mkdir для создания поддиректорий';
        }

        return summary;
    }

    async handleRead(id, filePath, {encoding = 'utf8', start, end} = {}) {
        const normalizedPath = this.validateAndNormalizePath(filePath, 'read');

        // Проверяем существование файла
        const exists = await this.checkExists(normalizedPath);
        if (!exists.exists) {
            throw errorUtils.createError(`❌ File not found: ${normalizedPath}\n💡 Проверьте правильность пути и существование файла`);
        }
        if (!exists.isFile) {
            throw errorUtils.createError(`❌ Path is not a file: ${normalizedPath}\n💡 Укажите путь к файлу`);
        }

        let content;
        if (start !== undefined || end !== undefined) {
            // Чтение части файла
            const buffer = await fs.readFile(normalizedPath);
            const startPos = start || 0;
            const endPos = end || buffer.length;
            const partialBuffer = buffer.slice(startPos, endPos);

            if (this.encodingUtils.isSupported(encoding)) {
                content = this.encodingUtils.convertEncoding(partialBuffer.toString('binary'), 'binary', encoding);
            } else {
                content = partialBuffer.toString(encoding);
            }
        } else {
            // Чтение всего файла
            if (this.encodingUtils.isSupported(encoding)) {
                content = await this.encodingUtils.readFileWithEncoding(normalizedPath, encoding);
            } else {
                content = await fs.readFile(normalizedPath, encoding);
            }
        }

        const result = {
            success: true,
            content,
            path: normalizedPath,
            encoding,
            size: exists.size,
            modified: exists.modified,
            partial: start !== undefined || end !== undefined,
            message: `📖 Файл ${normalizedPath} успешно прочитан`,
            details: {
                size: exists.size,
                modified: exists.modified,
                created: exists.created,
                encoding: encoding,
                partial: start !== undefined || end !== undefined
            }
        };

        if (start !== undefined || end !== undefined) {
            result.message += ` (частично: ${start || 0}-${end || 'конец'})`;
            result.details.range = {start: start || 0, end: end || 'end'};
        }

        return result;
    }

    async handleWrite(id, filePath, {content, encoding = 'utf8', append = false, createDirs = true} = {}) {
        if (!content && content !== '') {
            throw errorUtils.createError(`❌ Content is required for write action\n💡 ${this.operationHints.write}`);
        }

        const normalizedPath = this.validateAndNormalizePath(filePath, 'write');

        // Создаем директории если запрошено
        if (createDirs) {
            await this.ensureDirectoryExists(normalizedPath);
        }

        if (append) {
            if (this.encodingUtils.isSupported(encoding)) {
                const existingContent = await this.encodingUtils.readFileWithEncoding(normalizedPath, encoding);
                const newContent = existingContent + content;
                await this.encodingUtils.writeFileWithEncoding(normalizedPath, newContent, encoding);
            } else {
                await fs.appendFile(normalizedPath, content, encoding);
            }
        } else {
            if (this.encodingUtils.isSupported(encoding)) {
                await this.encodingUtils.writeFileWithEncoding(normalizedPath, content, encoding);
            } else {
                await fs.writeFile(normalizedPath, content, encoding);
            }
        }

        const exists = await this.checkExists(normalizedPath);

        const result = {
            success: true,
            path: normalizedPath,
            message: `📝 Файл ${normalizedPath} успешно ${append ? 'дополнен' : 'записан'}`,
            size: exists.size,
            operation: append ? 'append' : 'write',
            details: {
                contentLength: content.length,
                encoding: encoding,
                append: append,
                createDirs: createDirs,
                finalSize: exists.size
            }
        };

        if (append) {
            result.message += ` (добавлено ${content.length} символов)`;
        }

        return result;
    }

    async handleCopy(id, filePath, {destination, overwrite = false, createDirs = true} = {}) {
        if (!destination) {
            throw errorUtils.createError(`❌ Destination path required for copy\n💡 ${this.operationHints.copy}`);
        }

        const sourcePath = this.validateAndNormalizePath(filePath, 'copy');
        const destPath = this.validateAndNormalizePath(destination, 'copy');

        // Проверяем существование исходного файла
        const sourceExists = await this.checkExists(sourcePath);
        if (!sourceExists.exists) {
            throw errorUtils.createError(`❌ Source file not found: ${sourcePath}\n💡 Проверьте правильность пути и существование файла`);
        }
        if (!sourceExists.isFile) {
            throw errorUtils.createError(`❌ Source path is not a file: ${sourcePath}\n💡 Укажите путь к файлу`);
        }

        // Проверяем существование целевого файла
        const destExists = await this.checkExists(destPath);
        if (destExists.exists && !overwrite) {
            throw errorUtils.createError(`❌ Destination file already exists: ${destPath}. Use overwrite=true to overwrite\n💡 Используйте overwrite=true для перезаписи`);
        }

        // Создаем директории если запрошено
        if (createDirs) {
            await this.ensureDirectoryExists(destPath);
        }

        await fs.copyFile(sourcePath, destPath);

        const result = {
            success: true,
            source: sourcePath,
            destination: destPath,
            size: sourceExists.size,
            overwritten: destExists.exists,
            message: `📋 Файл ${sourcePath} успешно скопирован в ${destPath}`,
            details: {
                sourceSize: sourceExists.size,
                sourceModified: sourceExists.modified,
                overwritten: destExists.exists,
                createDirs: createDirs
            }
        };

        if (destExists.exists) {
            result.message += ' (существующий файл перезаписан)';
        }

        return result;
    }

    async handleMove(id, filePath, {destination, overwrite = false, createDirs = true} = {}) {
        if (!destination) {
            throw errorUtils.createError(`❌ Destination path required for move\n💡 ${this.operationHints.move}`);
        }

        const sourcePath = this.validateAndNormalizePath(filePath, 'move');
        const destPath = this.validateAndNormalizePath(destination, 'move');

        // Проверяем существование исходного файла
        const sourceExists = await this.checkExists(sourcePath);
        if (!sourceExists.exists) {
            throw errorUtils.createError(`❌ Source file not found: ${sourcePath}\n💡 Проверьте правильность пути и существование файла`);
        }

        // Проверяем существование целевого файла
        const destExists = await this.checkExists(destPath);
        if (destExists.exists && !overwrite) {
            throw errorUtils.createError(`❌ Destination already exists: ${destPath}. Use overwrite=true to overwrite\n💡 Используйте overwrite=true для перезаписи`);
        }

        // Создаем директории если запрошено
        if (createDirs) {
            await this.ensureDirectoryExists(destPath);
        }

        await fs.rename(sourcePath, destPath);

        const result = {
            success: true,
            source: sourcePath,
            destination: destPath,
            size: sourceExists.size,
            overwritten: destExists.exists,
            message: `🚚 Файл ${sourcePath} успешно перемещен в ${destPath}`,
            details: {
                sourceSize: sourceExists.size,
                sourceModified: sourceExists.modified,
                overwritten: destExists.exists,
                createDirs: createDirs
            }
        };

        if (destExists.exists) {
            result.message += ' (существующий файл перезаписан)';
        }

        return result;
    }

    async handleDelete(id, filePath, {recursive = false} = {}) {
        const normalizedPath = this.validateAndNormalizePath(filePath, 'delete');

        // Проверяем существование
        const exists = await this.checkExists(normalizedPath);
        if (!exists.exists) {
            throw errorUtils.createError(`❌ File not found: ${normalizedPath}\n💡 Проверьте правильность пути и существование файла`);
        }

        if (exists.isDirectory && !recursive) {
            throw errorUtils.createError(`❌ Cannot delete directory: ${normalizedPath}. Use recursive=true to delete directories\n💡 Используйте recursive=true для удаления директорий`);
        }

        if (exists.isDirectory) {
            await fs.rm(normalizedPath, {recursive: true});
        } else {
            await fs.unlink(normalizedPath);
        }

        const result = {
            success: true,
            path: normalizedPath,
            message: `🗑️ ${exists.isDirectory ? 'Директория' : 'Файл'} ${normalizedPath} успешно удален`,
            type: exists.isDirectory ? 'directory' : 'file',
            details: {
                wasDirectory: exists.isDirectory,
                recursive: recursive,
                originalSize: exists.size
            }
        };

        if (exists.isDirectory) {
            result.message += ' (рекурсивно)';
        }

        return result;
    }

    async handleExists(id, filePath) {
        const normalizedPath = this.validateAndNormalizePath(filePath, 'exists');
        const exists = await this.checkExists(normalizedPath);

        const result = {
            success: true,
            path: normalizedPath,
            exists: exists.exists,
            message: exists.exists ? `✅ Путь ${normalizedPath} существует` : `❌ Путь ${normalizedPath} не существует`,
            ...exists
        };

        if (exists.exists) {
            result.message += ` (${exists.isDirectory ? 'директория' : 'файл'})`;
            if (exists.isFile) {
                result.message += `, размер: ${exists.size} байт`;
            }
        }

        return result;
    }

    async handleInfo(id, filePath) {
        const normalizedPath = this.validateAndNormalizePath(filePath, 'info');
        const exists = await this.checkExists(normalizedPath);

        if (!exists.exists) {
            throw errorUtils.createError(`❌ File not found: ${normalizedPath}\n💡 Проверьте правильность пути и существование файла`);
        }

        const result = {
            success: true,
            path: normalizedPath,
            message: `ℹ️ Детальная информация о ${normalizedPath}`,
            ...exists,
            details: {
                type: exists.isDirectory ? 'directory' : 'file',
                size: exists.size,
                modified: exists.modified,
                created: exists.created,
                permissions: 'readable'
            }
        };

        if (exists.isDirectory) {
            result.message += ' (директория)';
        } else {
            result.message += ` (файл, ${exists.size} байт)`;
        }

        return result;
    }

    async handleMkdir(id, dirPath, {recursive = true, mode = 0o755} = {}) {
        const normalizedPath = this.validateAndNormalizePath(dirPath, 'mkdir');

        // Проверяем существование
        const exists = await this.checkExists(normalizedPath);
        if (exists.exists && exists.isDirectory) {
            throw errorUtils.createError(`❌ Directory already exists: ${normalizedPath}\n💡 Директория уже существует`);
        }
        if (exists.exists && exists.isFile) {
            throw errorUtils.createError(`❌ Path is a file, cannot create directory: ${normalizedPath}\n💡 Укажите путь к директории`);
        }

        await fs.mkdir(normalizedPath, {recursive, mode});

        const result = {
            success: true,
            path: normalizedPath,
            message: `📂 Директория ${normalizedPath} успешно создана`,
            recursive,
            mode: mode.toString(8),
            details: {
                recursive: recursive,
                mode: mode.toString(8),
                permissions: `0o${mode.toString(8)}`
            }
        };

        if (recursive) {
            result.message += ' (рекурсивно)';
        }

        return result;
    }

    async handleRmdir(id, dirPath, {recursive = false, force = false} = {}) {
        const normalizedPath = this.validateAndNormalizePath(dirPath, 'rmdir');

        // Проверяем существование
        const exists = await this.checkExists(normalizedPath);
        if (!exists.exists) {
            if (force) {
                return {
                    success: true,
                    path: normalizedPath,
                    message: 'Directory does not exist (force mode)',
                    force: true
                };
            }
            throw errorUtils.createError(`❌ Directory not found: ${normalizedPath}\n💡 Директория не найдена`);
        }

        if (!exists.isDirectory) {
            throw errorUtils.createError(`❌ Path is not a directory: ${normalizedPath}\n💡 Укажите путь к директории`);
        }

        await fs.rm(normalizedPath, {recursive});

        const result = {
            success: true,
            path: normalizedPath,
            message: `🗑️ Директория ${normalizedPath} успешно удалена`,
            recursive,
            details: {
                recursive: recursive,
                force: force
            }
        };

        if (recursive) {
            result.message += ' (рекурсивно)';
        }
        if (force) {
            result.message += ' (принудительно)';
        }

        return result;
    }

    /**
     * Получение метрик модуля
     */
    getMetrics() {
        return {...this.metrics};
    }

    /**
     * Получение справки по модулю
     */
    getHelp() {
        return {
            module: 'FileOperations',
            version: '2.0.0',
            description: 'Расширенные файловые операции с детальными подсказками',
            operations: Object.keys(this.operationHints).map(action => ({
                action,
                hint: this.operationHints[action],
                examples: this.getOperationExamples(action)
            })),
            tips: [
                '💡 Используйте target_file или path для указания пути',
                '💡 Все операции поддерживают автоматическое создание директорий',
                '💡 Используйте recursive=true для работы с директориями',
                '💡 Проверяйте существование файлов через exists перед операциями',
                '💡 Используйте pattern для фильтрации файлов в list',
                '💡 Поддерживаются частичное чтение файлов (start/end)',
                '💡 Все ошибки содержат детальные подсказки по исправлению'
            ]
        };
    }

    /**
     * Получение примеров для операции
     */
    getOperationExamples(action) {
        const examples = {
            list: [
                {description: 'Просмотр текущей директории', params: {action: 'list', path: './'}},
                {
                    description: 'Рекурсивный обход с фильтром',
                    params: {action: 'list', path: './src', recursive: true, pattern: '*.js'}
                },
                {description: 'Показать скрытые файлы', params: {action: 'list', path: './', showHidden: true}}
            ],
            read: [
                {description: 'Чтение всего файла', params: {action: 'read', path: './config.json'}},
                {description: 'Чтение части файла', params: {action: 'read', path: './large.txt', start: 0, end: 1000}},
                {
                    description: 'Чтение в другой кодировке',
                    params: {action: 'read', path: './data.bin', encoding: 'base64'}
                }
            ],
            write: [
                {
                    description: 'Создание нового файла',
                    params: {action: 'write', path: './new.txt', content: 'Hello World!'}
                },
                {
                    description: 'Добавление к файлу',
                    params: {action: 'write', path: './log.txt', content: 'New entry', append: true}
                },
                {
                    description: 'Создание с директориями',
                    params: {action: 'write', path: './logs/app.log', content: 'Log entry', createDirs: true}
                }
            ],
            copy: [
                {
                    description: 'Копирование файла',
                    params: {action: 'copy', path: './source.txt', destination: './backup.txt'}
                },
                {
                    description: 'Копирование с перезаписью',
                    params: {action: 'copy', path: './source.txt', destination: './backup.txt', overwrite: true}
                },
                {
                    description: 'Копирование в новую директорию',
                    params: {action: 'copy', path: './file.txt', destination: './newdir/file.txt', createDirs: true}
                }
            ],
            move: [
                {
                    description: 'Перемещение файла',
                    params: {action: 'move', path: './old.txt', destination: './new.txt'}
                },
                {
                    description: 'Перемещение с перезаписью',
                    params: {action: 'move', path: './temp.txt', destination: './final.txt', overwrite: true}
                }
            ],
            delete: [
                {description: 'Удаление файла', params: {action: 'delete', path: './temp.txt'}},
                {description: 'Удаление директории', params: {action: 'delete', path: './tempdir', recursive: true}}
            ],
            exists: [
                {description: 'Проверка существования', params: {action: 'exists', path: './config.json'}}
            ],
            info: [
                {description: 'Информация о файле', params: {action: 'info', path: './config.json'}}
            ],
            mkdir: [
                {description: 'Создание директории', params: {action: 'mkdir', path: './newdir'}},
                {
                    description: 'Создание вложенных директорий',
                    params: {action: 'mkdir', path: './parent/child/grandchild', recursive: true}
                }
            ],
            rmdir: [
                {description: 'Удаление пустой директории', params: {action: 'rmdir', path: './emptydir'}},
                {
                    description: 'Рекурсивное удаление',
                    params: {action: 'rmdir', path: './dirwithfiles', recursive: true}
                }
            ]
        };

        return examples[action] || [];
    }

    getTools() {
        return [{
            name: 'file',
            description: '🚀 Расширенные файловые операции с детальными подсказками и улучшенной обработкой ошибок',
            inputSchema: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['list', 'read', 'write', 'copy', 'move', 'delete', 'exists', 'info', 'mkdir', 'rmdir'],
                        description: '📋 Тип операции для выполнения',
                        examples: ['list', 'read', 'write', 'copy', 'move', 'delete', 'exists', 'info', 'mkdir', 'rmdir']
                    },
                    target_file: {
                        type: 'string',
                        description: '📁 Путь к файлу или директории (альтернативное имя для path)',
                        examples: ['./test.txt', '/home/user/documents', 'C:\\Users\\User\\Desktop']
                    },
                    path: {
                        type: 'string',
                        description: '📁 Путь к файлу или директории',
                        examples: ['./test.txt', '/home/user/documents', 'C:\\Users\\User\\Desktop']
                    },
                    content: {
                        type: 'string',
                        description: '📝 Содержимое для записи в файл',
                        examples: ['Hello World!', '{"key": "value"}', '#!/bin/bash\necho "Hello"']
                    },
                    destination: {
                        type: 'string',
                        description: '🎯 Путь назначения для операций copy/move',
                        examples: ['./backup.txt', '/backup/folder', 'C:\\Backup\\file.txt']
                    },
                    encoding: {
                        type: 'string',
                        default: 'utf8',
                        description: '🔤 Кодировка файла для чтения/записи',
                        examples: ['utf8', 'ascii', 'latin1', 'base64']
                    },
                    append: {
                        type: 'boolean',
                        default: false,
                        description: '➕ Добавлять к существующему файлу вместо перезаписи (для write)',
                        examples: [true, false]
                    },
                    overwrite: {
                        type: 'boolean',
                        default: false,
                        description: '⚠️ Перезаписывать существующие файлы (для copy/move)',
                        examples: [true, false]
                    },
                    createDirs: {
                        type: 'boolean',
                        default: true,
                        description: '📂 Автоматически создавать недостающие директории',
                        examples: [true, false]
                    },
                    recursive: {
                        type: 'boolean',
                        default: false,
                        description: '🔄 Рекурсивная операция (для list, delete, rmdir)',
                        examples: [true, false]
                    },
                    pattern: {
                        type: 'string',
                        description: '🔍 Паттерн для фильтрации файлов (для list) - поддерживает wildcards',
                        examples: ['*.txt', '*.js', 'test*', '.*']
                    },
                    showHidden: {
                        type: 'boolean',
                        default: false,
                        description: '👁️ Показывать скрытые файлы и директории (для list)',
                        examples: [true, false]
                    },
                    start: {
                        type: 'number',
                        description: '📍 Начальная позиция для чтения части файла (для read)',
                        examples: [0, 100, 1024]
                    },
                    end: {
                        type: 'number',
                        description: '📍 Конечная позиция для чтения части файла (для read)',
                        examples: [100, 1024, -1]
                    },
                    force: {
                        type: 'boolean',
                        default: false,
                        description: '💪 Принудительное выполнение операции, игнорируя некоторые ошибки (для rmdir)',
                        examples: [true, false]
                    },
                    mode: {
                        type: 'string',
                        description: '🔐 Права доступа для директории (для mkdir, в восьмеричном формате)',
                        examples: ['755', '644', '777']
                    }
                },
                required: ['action'],
                anyOf: [
                    {required: ['target_file']},
                    {required: ['path']}
                ],
                examples: [
                    {
                        summary: 'Просмотр содержимого директории',
                        value: {
                            action: 'list',
                            path: './',
                            recursive: true,
                            showHidden: false
                        }
                    },
                    {
                        summary: 'Чтение файла с указанием кодировки',
                        value: {
                            action: 'read',
                            path: './config.json',
                            encoding: 'utf8'
                        }
                    },
                    {
                        summary: 'Запись в файл с созданием директорий',
                        value: {
                            action: 'write',
                            path: './logs/app.log',
                            content: 'New log entry',
                            createDirs: true
                        }
                    },
                    {
                        summary: 'Копирование файла с перезаписью',
                        value: {
                            action: 'copy',
                            path: './source.txt',
                            destination: './backup.txt',
                            overwrite: true
                        }
                    },
                    {
                        summary: 'Создание директории с правами доступа',
                        value: {
                            action: 'mkdir',
                            path: './uploads',
                            recursive: true,
                            mode: '755'
                        }
                    }
                ]
            }
        }];
    }
}

module.exports = {FileOperationsModule};


