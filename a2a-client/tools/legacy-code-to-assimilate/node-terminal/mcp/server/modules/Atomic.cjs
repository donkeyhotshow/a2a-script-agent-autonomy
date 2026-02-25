/**
 * Модуль атомарных операций
 * Обеспечивает выполнение предопределенных наборов операций с файлами
 */

const {fileSystemUtils} = require('@libs/system/file-operations/index.js');
const {errorUtils} = require('@libs/error-management/error-handler/error-utils.js');
const {ModuleBase} = require('../core/ModuleBase.cjs');
const fs = require('fs').promises;
const path = require('path');

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
        process.stderr.write(`[MCP-SERVER-WARN] validation-utils.cjs not found or invalid in Atomic.cjs: ${validationError.message}\n`);
    }
    validationUtils = {
        validate: () => ({ errors: [] }),
        isString: (val) => typeof val === 'string',
        isNumber: (val) => typeof val === 'number',
        isArray: (val) => Array.isArray(val),
        isFunction: (val) => typeof val === 'function',
    };
}

class AtomicModule extends ModuleBase {
    constructor(server) {
        super(server, {
            name: 'Atomic',
            version: '1.0.0',
            description: 'Атомарные операции с файлами',
        });

        // Предопределенные наборы операций
        this.operationSets = new Map();
        this.initializeOperationSets();
    }

    /**
     * Инициализация предопределенных наборов операций
     */
    initializeOperationSets() {
        // Набор для очистки временных файлов
        this.operationSets.set('cleanup-temp', {
            name: 'Очистка временных файлов',
            description: 'Удаляет временные файлы и папки',
            operations: [
                {type: 'delete', path: 'tmp/**/*', pattern: true},
                {type: 'delete', path: 'logs/*.log', pattern: true},
                {type: 'delete', path: '*.tmp', pattern: true}
            ]
        });

        // Набор для создания резервной копии
        this.operationSets.set('create-backup', {
            name: 'Создание резервной копии',
            description: 'Создает резервную копию проекта',
            operations: [
                {type: 'mkdir', path: 'backup'},
                {type: 'copy', source: 'src/**/*', destination: 'backup/src', pattern: true},
                {type: 'copy', source: '*.json', destination: 'backup', pattern: true},
                {type: 'copy', source: '*.md', destination: 'backup', pattern: true}
            ]
        });

        // Набор для миграции
        this.operationSets.set('migration-setup', {
            name: 'Настройка миграции',
            description: 'Подготавливает структуру для миграции',
            operations: [
                {type: 'mkdir', path: 'mcp/server/modules'},
                {type: 'mkdir', path: 'mcp/server/core'},
                {type: 'mkdir', path: 'mcp/server/utils'},
                {type: 'copy', source: 'mcp-server.cjs', destination: 'mcp/server/CoreServer.cjs'}
            ]
        });
    }

    async processRequest(id, args) {
        const {action, set, operations, ...params} = args;

        switch (action) {
            case 'list-sets':
                return await this.handleListSets(id);
            case 'show-set':
                return await this.handleShowSet(id, set);
            case 'execute-set':
                return await this.handleExecuteSet(id, set, params);
            case 'execute-operations':
                return await this.handleExecuteOperations(id, operations, params);
            case 'execute-single':
                return await this.handleExecuteSingle(id, operations, params);
            default:
                throw errorUtils.createError(`Unknown atomic action: ${action}`);
        }
    }

    /**
     * Список доступных наборов операций
     */
    async handleListSets(id) {
        const sets = Array.from(this.operationSets.entries()).map(([key, set]) => ({
            key,
            name: set.name,
            description: set.description,
            operationCount: set.operations.length
        }));

        return {
            success: true,
            sets,
            count: sets.length
        };
    }

,

    /**
     * Показать детали набора операций
     */
    async handleShowSet(id, setKey) {
        if (!setKey) {
            throw errorUtils.createError('Set key is required');
        }

        const set = this.operationSets.get(setKey);
        if (!set) {
            throw errorUtils.createError(`Operation set not found: ${setKey}`);
        }

        return {
            success: true,
            key: setKey,
            ...set
        };
    }

,

    /**
     * Выполнение предопределенного набора операций
     */
    async handleExecuteSet(id, setKey, {dryRun = false} = {}) {
        if (!setKey) {
            throw errorUtils.createError('Set key is required');
        }

        const set = this.operationSets.get(setKey);
        if (!set) {
            throw errorUtils.createError(`Operation set not found: ${setKey}`);
        }

        this.logger.info(`Executing operation set: ${setKey}`, {dryRun, operations: set.operations.length});

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (const operation of set.operations) {
            errorUtils.safeExecute(async () => {

                const result = await this.executeOperation(operation, dryRun);
                results.push({...operation, success: true, result});
                successCount++;

            }, 'error')
        )

            errorCount++;
        }
    }
}
}

/**
 * Выполнение пользовательских операций
 */
async
handleExecuteOperations(id, operations, {dryRun = false} = {})
{
    if (!operations || !validationUtils.isArray(operations) || operations.length === 0) {
        throw errorUtils.createError('Operations array is required');
    }

    this.logger.info(`Executing custom operations`, {dryRun, operations: operations.length});

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const operation of operations) {
        errorUtils.safeExecute(async () => {

            const result = await this.executeOperation(operation, dryRun);
            results.push({...operation, success: true, result});
            successCount++;

        }, 'error')
    )

        errorCount++;
    }
}

return {
    success: true,
    dryRun,
    results,
    summary: {
        total: operations.length,
        successful: successCount,
        failed: errorCount
    }
};
}

/**
 * Выполнение одной операции
 */
async
handleExecuteSingle(id, operation, {dryRun = false} = {})
{
    if (!operation) {
        throw errorUtils.createError('Operation is required');
    }

    errorUtils.safeExecute(async () => {

        const result = await this.executeOperation(operation, dryRun);
        return {
            success: true,
            operation,
            dryRun,
            result
        };

    }, 'error');
}
}

/**
 * Выполнение отдельной операции
 */
async
executeOperation(operation, dryRun = false)
{
    const {type, path: opPath, source, destination, pattern, ...params} = operation;

    if (dryRun) {
        return {message: `[DRY RUN] Would execute: ${type} ${opPath || source}`};
    }

    switch (type) {
        case 'mkdir':
            return await this.createDirectory(opPath);
        case 'copy':
            return await this.copyFile(source, destination, pattern);
        case 'move':
            return await this.moveFile(source, destination);
        case 'delete':
            return await this.deleteFile(opPath, pattern);
        case 'write':
            return await this.writeFile(opPath, params.content, params.encoding);
        default:
            throw errorUtils.createError(`Unknown operation type: ${type}`);
    }
}

/**
 * Создание директории
 */
async
createDirectory(dirPath)
{
    await fileSystemUtils.mkdir(dirPath, {recursive: true});
    return {message: `Directory created: ${dirPath}`};
}

/**
 * Копирование файла
 */
async
copyFile(source, destination, pattern = false)
{
    if (pattern) {
        // Копирование по паттерну
        const files = await this.findFilesByPattern(source);
        const results = [];

        for (const file of files) {
            const destPath = fileSystemUtils.join(destination, path.basename(file));
            await fileSystemUtils.copyFile(file, destPath);
            results.push({source: file, destination: destPath});
        }

        return {message: `Copied ${results.length} files`, results};
    } else {
        // Обычное копирование
        await fileSystemUtils.copyFile(source, destination);
        return {message: `File copied: ${source} -> ${destination}`};
    }
}

/**
 * Перемещение файла
 */
async
moveFile(source, destination)
{
    await fileSystemUtils.rename(source, destination);
    return {message: `File moved: ${source} -> ${destination}`};
}

/**
 * Удаление файла
 */
async
deleteFile(filePath, pattern = false)
{
    if (pattern) {
        // Удаление по паттерну
        const files = await this.findFilesByPattern(filePath);
        const results = [];

        for (const file of files) {
            await fileSystemUtils.unlink(file);
            results.push({deleted: file});
        }

        return {message: `Deleted ${results.length} files`, results};
    } else {
        // Обычное удаление
        await fileSystemUtils.unlink(filePath);
        return {message: `File deleted: ${filePath}`};
    }
}

/**
 * Запись в файл
 */
async
writeFile(filePath, content, encoding = 'utf8')
{
    await fileSystemUtils.writeFile(filePath, content, encoding);
    return {message: `File written: ${filePath}`};
}

/**
 * Поиск файлов по паттерну
 */
async
findFilesByPattern(pattern)
{
    // Простая реализация поиска по паттерну
    const baseDir = process.cwd();
    const files = [];

    errorUtils.safeExecute(async () => {

        await this.searchFilesRecursive(baseDir, pattern, files);

    }, 'error')`, { error: error.message });
    }
    
    return files;
  }

  /**
   * Рекурсивный поиск файлов
   */
  async searchFilesRecursive(dirPath, pattern, files) {
    errorUtils.safeExecute(async () => {

      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = fileSystemUtils.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          await this.searchFilesRecursive(fullPath, pattern, files);
        } else if (item.isFile() && this.matchesPattern(item.name, pattern)) {
          files.push(fullPath);
        }
      }
    
}, 'error')
  }

  /**
   * Проверка соответствия файла паттерну
   */
  matchesPattern(filename, pattern) {
    // Простая проверка паттерна
    if (pattern === '**/*') return true;
    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*');
      return new RegExp(regexPattern).test(filename);
    }
    return filename === pattern;
  }

  getTools() {
    return [{
      name: 'atomic',
      description: 'Атомарные операции: list-sets | show-set | execute-set | execute-operations | execute-single',
      inputSchema: {
        type: 'object',
        properties: {
          action: { 
            type: 'string', 
            enum: ['list-sets', 'show-set', 'execute-set', 'execute-operations', 'execute-single'] 
          },
          set: { type: 'string', description: 'Ключ набора операций' },
          operations: { 
            type: 'array', 
            items: { type: 'object' }, 
            description: 'Массив операций для выполнения' 
          },
          dryRun: { type: 'boolean', default: false }
        },
        required: ['action']
      }
    }];
  }
}

module.exports = { AtomicModule };


