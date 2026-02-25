/**
 * Модуль поиска и правок
 * Обеспечивает поиск по файлам и внесение изменений
 */

const {fileSystemUtils} = require('@libs/system/file-operations/index.js');
const {errorUtils} = require('@libs/error-management/error-handler/error-utils.js');
const {ModuleBase} = require('../core/ModuleBase.cjs');
const fs = require('fs').promises;
const path = require('path');

class SearchModule extends ModuleBase {
    constructor(server) {
        super(server, {
            name: 'Search',
            version: '1.0.0',
            description: 'Поиск по файлам и внесение изменений'
        });
    }

    async processRequest(id, args) {
        const {action, query, path: searchPath, ...params} = args;

        switch (action) {
            case 'find':
                return await this.handleFind(id, query, searchPath, params);
            case 'replace':
                return await this.handleReplace(id, query, searchPath, params);
            case 'grep':
                return await this.handleGrep(id, query, searchPath, params);
            default:
                throw errorUtils.createError(`Unknown search action: ${action}`);
        }
    }

    async handleFind(id, query, searchPath, {recursive = true, includePattern = '**/*'} = {}) {
        const targetPath = searchPath || '.';
        const results = [];

        if (recursive) {
            await this.searchRecursive(targetPath, query, includePattern, results);
        } else {
            await this.searchInDirectory(targetPath, query, results);
        }

        return {
            success: true,
            query,
            path: targetPath,
            results,
            count: results.length
        };
    }

    async handleReplace(id, query, searchPath, {replacement, dryRun = false} = {}) {
        if (!replacement) {
            throw errorUtils.createError('Replacement text is required');
        }

        const targetPath = searchPath || '.';
        const results = [];

        // Сначала находим все совпадения
        await this.searchRecursive(targetPath, query, '**/*', results);

        if (dryRun) {
            return {
                success: true,
                query,
                replacement,
                path: targetPath,
                results,
                count: results.length,
                dryRun: true
            };
        }

        // Выполняем замену
        let replacedCount = 0;
        for (const result of results) {
            errorUtils.safeExecute(async () => {

                const content = await fileSystemUtils.readFile(result.file, 'utf8');
                const newContent = content.replace(new RegExp(query, 'g'), replacement);

                if (content !== newContent) {
                    await fileSystemUtils.writeFile(result.file, newContent, 'utf8');
                    replacedCount++;
                    result.replaced = true;
                }

            }, 'error');
        }

        return {
            success: true,
            query,
            replacement,
            path: targetPath,
            results,
            replacedCount,
            totalCount: results.length
        };
    }

    async handleGrep(id, query, searchPath, {caseSensitive = false, maxResults = 100} = {}) {
        const targetPath = searchPath || '.';
        const results = [];
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(query, flags);

        await this.searchRecursive(targetPath, regex, '**/*', results, maxResults);

        return {
            success: true,
            query,
            path: targetPath,
            results: results.slice(0, maxResults),
            count: Math.min(results.length, maxResults),
            totalFound: results.length
        };
    }

    async searchRecursive(dirPath, query, pattern, results, maxResults = Infinity) {
        errorUtils.safeExecute(async () => {

            const items = await fs.readdir(dirPath, {withFileTypes: true});

            for (const item of items) {
                if (results.length >= maxResults) break;

                const fullPath = fileSystemUtils.join(dirPath, item.name);

                if (item.isDirectory()) {
                    await this.searchRecursive(fullPath, query, pattern, results, maxResults);
                } else if (this.matchesPattern(item.name, pattern)) {
                    await this.searchInFile(fullPath, query, results);
                }
            }

        }, 'error');
    }
}

async
searchInDirectory(dirPath, query, results)
{
    errorUtils.safeExecute(async () => {

        const items = await fs.readdir(dirPath, {withFileTypes: true});

        for (const item of items) {
            if (item.isFile()) {
                const fullPath = fileSystemUtils.join(dirPath, item.name);
                await this.searchInFile(fullPath, query, results);
            }
        }

    }, 'error');
}
}

async
searchInFile(filePath, query, results)
{
    errorUtils.safeExecute(async () => {

        const content = await fileSystemUtils.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        const matches = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            if (query instanceof RegExp) {
                if (query.test(line)) {
                    matches.push({lineNumber, line: line.trim()});
                }
            } else {
                if (line.includes(query)) {
                    matches.push({lineNumber, line: line.trim()});
                }
            }
        }

        if (matches.length > 0) {
            results.push({
                file: filePath,
                matches,
                matchCount: matches.length
            });
        }

    }, 'error');
}
}

matchesPattern(filename, pattern)
{
    // Простая проверка паттерна
    if (pattern === '**/*') return true;
    if (pattern.includes('*')) {
        const regexPattern = pattern.replace(/\*/g, '.*');
        return new RegExp(regexPattern).test(filename);
    }
    return filename === pattern;
}

getTools()
{
    return [{
        name: 'search',
        description: 'Поиск и правки: find | replace | grep',
        inputSchema: {
            type: 'object',
            properties: {
                action: {type: 'string', enum: ['find', 'replace', 'grep']},
                query: {type: 'string', description: 'Поисковый запрос'},
                path: {type: 'string', description: 'Путь для поиска'},
                replacement: {type: 'string', description: 'Текст для замены'},
                recursive: {type: 'boolean', default: true},
                caseSensitive: {type: 'boolean', default: false},
                dryRun: {type: 'boolean', default: false},
                maxResults: {type: 'number', default: 100}
            },
            required: ['action', 'query']
        }
    }];
}
}

module.exports = {SearchModule};


