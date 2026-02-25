/**
 * TestGetter - Модуль для получения списка тестов и построения вариантов запуска
 * Интегрирован с TestInterceptor для умного управления тестами
 */

// Настройка module-alias для корректной работы с путями
try {
  require('../setup-module-alias.cjs');
} catch (setupError) {
  // Если setup-module-alias не найден, это не критично - продолжим без него
  if (process.stderr && typeof process.stderr.write === 'function') {
    process.stderr.write(`[MCP-SERVER-WARN] setup-module-alias.cjs not found: ${setupError.message}\n`);
  }
}

const {ValidationUtils} = require('@libs/validation/validation/validation-utils.cjs');
const FileOperations = require('@libs/system/file-operations/index.cjs');
const {ErrorUtils} = require('@libs/error-management/error-handler/error-utils.cjs');
const {ConsoleUtils} = require('@libs/logging-monitoring/logging/console-utils.js');
const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');

class TestGetter {
    constructor(logger, errorHandler) {
        this.logger = logger;
        this.errorHandler = errorHandler;
        this.errorUtils = new ErrorUtils({errorHandler: this.errorHandler, logger: this.logger});
        this.consoleUtils = new ConsoleUtils({logger: this.logger});
        this.validationUtils = new ValidationUtils({errorHandler: this.errorHandler, logger: this.logger});
        this.fileSystemUtils = new FileOperations(); // FileOperations экспортируется напрямую
        this.testPatterns = [
            /\.test\.(js|ts|jsx|tsx)$/,
            /\.spec\.(js|ts|jsx|tsx)$/,
            /test\.(js|ts|jsx|tsx)$/,
            /spec\.(js|ts|jsx|tsx)$/
        ];

        this.testRunnerConfigs = {
            jest: ['jest.config.js', 'jest.config.cjs', 'jest.config.ts', 'jest.config.json'],
            vitest: ['vitest.config.js', 'vitest.config.cjs', 'vitest.config.ts', 'vitest.config.json'],
            mocha: ['mocha.config.js', 'mocha.config.cjs', '.mocharc.js', '.mocharc.json'],
            cypress: ['cypress.config.js', 'cypress.config.ts', 'cypress.json']
        };

        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 минут
    }

    /**
     * Определяет тип тестового раннера в проекте
     */
    detectTestRunner(cwd = process.cwd()) {
        const packageJsonPath = this.fileSystemUtils.join(cwd, 'package.json');

        if (!this.fileSystemUtils.existsSync(packageJsonPath)) {
            return null;
        }

        this.errorUtils.safeExecute(async () => {

            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const scripts = packageJson.scripts || {};
            const dependencies = {...packageJson.dependencies, ...packageJson.devDependencies};

            // Проверяем скрипты
            if (scripts.test && scripts.test.includes('jest')) return 'jest';
            if (scripts.test && scripts.test.includes('vitest')) return 'vitest';
            if (scripts.test && scripts.test.includes('mocha')) return 'mocha';
            if (scripts.test && scripts.test.includes('cypress')) return 'cypress';

            // Проверяем зависимости
            if (dependencies.jest) return 'jest';
            if (dependencies.vitest) return 'vitest';
            if (dependencies.mocha) return 'mocha';
            if (dependencies.cypress) return 'cypress';

            // Проверяем конфигурационные файлы
            for (const [runner, configs] of Object.entries(this.testRunnerConfigs)) {
                for (const config of configs) {
                    if (this.fileSystemUtils.existsSync(this.fileSystemUtils.join(cwd, config))) {
                        return runner;
                    }
                }
            }

            return null;

        }, 'error')
    }

    /**
     * Получает список всех тестовых файлов в проекте
     */
    async getTestFiles(cwd = process.cwd(), options = {}) {
        const cacheKey = `${cwd}_${JSON.stringify(options)}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        const testFiles = [];
        const excludePatterns = options.exclude || [
            /node_modules/,
            /\.git/,
            /dist/,
            /build/,
            /coverage/,
            /\.next/,
            /\.nuxt/
        ];

        const includePatterns = options.include || this.testPatterns;

        this.errorUtils.safeExecute(async () => {

            await this.scanDirectory(cwd, testFiles, includePatterns, excludePatterns, options.maxDepth || 10);

            // Сортируем по пути для консистентности
            testFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

            const result = {
                total: testFiles.length,
                files: testFiles,
                runner: this.detectTestRunner(cwd),
                cwd: cwd,
                scanTime: new Date().toISOString()
            };

            // Кэшируем результат
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;

        }, 'error');
    }

    /**
     * Рекурсивно сканирует директорию для поиска тестовых файлов
     */
    async scanDirectory(dir, testFiles, includePatterns, excludePatterns, maxDepth, currentDepth = 0) {
        if (currentDepth > maxDepth) return;

        this.errorUtils.safeExecute(async () => {

            const entries = fs.readdirSync(dir, {withFileTypes: true});

            for (const entry of entries) {
                const fullPath = this.fileSystemUtils.join(dir, entry.name);
                const relativePath = path.relative(process.cwd(), fullPath);

                // Проверяем исключения
                if (excludePatterns.some(pattern =>
                    this.validationUtils.isString(pattern) ? fullPath.includes(pattern) : pattern.test(fullPath)
                )) {
                    continue;
                }

                if (entry.isDirectory()) {
                    await this.scanDirectory(fullPath, testFiles, includePatterns, excludePatterns, maxDepth, currentDepth + 1);
                } else if (entry.isFile()) {
                    // Проверяем, является ли файл тестовым
                    if (includePatterns.some(pattern => pattern.test(entry.name))) {
                        const stats = fs.statSync(fullPath);
                        testFiles.push({
                            name: entry.name,
                            fullPath: fullPath,
                            relativePath: relativePath,
                            size: stats.size,
                            modified: stats.mtime,
                            type: this.getTestFileType(entry.name)
                        });
                    }
                }
            }

        }, 'error')
    }

    /**
     * Определяет тип тестового файла
     */
    getTestFileType(filename) {
        if (filename.includes('.test.')) return 'unit';
        if (filename.includes('.spec.')) return 'spec';
        if (filename.includes('test.')) return 'test';
        if (filename.includes('spec.')) return 'spec';
        return 'unknown';
    }

    /**
     * Группирует тесты по различным критериям
     */
    groupTests(testFiles, groupingStrategy = 'type') {
        const groups = {};

        switch (groupingStrategy) {
            case 'type':
                for (const file of testFiles) {
                    const type = file.type;
                    if (!groups[type]) groups[type] = [];
                    groups[type].push(file);
                }
                break;

            case 'directory':
                for (const file of testFiles) {
                    const dir = path.dirname(file.relativePath);
                    if (!groups[dir]) groups[dir] = [];
                    groups[dir].push(file);
                }
                break;

            case 'size':
                for (const file of testFiles) {
                    let sizeGroup = 'small';
                    if (file.size > 1024 * 10) sizeGroup = 'medium';
                    if (file.size > 1024 * 50) sizeGroup = 'large';

                    if (!groups[sizeGroup]) groups[sizeGroup] = [];
                    groups[sizeGroup].push(file);
                }
                break;

            case 'modified':
                const now = Date.now();
                const oneDay = 24 * 60 * 60 * 1000;
                const oneWeek = 7 * oneDay;

                for (const file of testFiles) {
                    const age = now - file.modified.getTime();
                    let timeGroup = 'old';
                    if (age < oneDay) timeGroup = 'today';
                    else if (age < oneWeek) timeGroup = 'recent';

                    if (!groups[timeGroup]) groups[timeGroup] = [];
                    groups[timeGroup].push(file);
                }
                break;
        }

        return groups;
    }

    /**
     * Строит варианты команд для запуска тестов
     */
    buildTestCommands(testFiles, runner = null, options = {}) {
        const commands = [];
        const detectedRunner = runner || this.detectTestRunner();

        if (!detectedRunner) {
            // Fallback на npm test
            commands.push({
                type: 'all',
                description: 'Запустить все тесты',
                command: 'npm test',
                files: testFiles.map(f => f.relativePath)
            });
            return commands;
        }

        // Команда для всех тестов
        commands.push({
            type: 'all',
            description: `Запустить все тесты (${testFiles.length} файлов)`,
            command: this.buildRunnerCommand(detectedRunner, 'all', testFiles),
            files: testFiles.map(f => f.relativePath),
            estimatedTime: this.estimateTestTime(testFiles)
        });

        // Группируем тесты по типу
        const typeGroups = this.groupTests(testFiles, 'type');
        for (const [type, files] of Object.entries(typeGroups)) {
            if (files.length > 1) {
                commands.push({
                    type: `group_${type}`,
                    description: `Запустить ${type} тесты (${files.length} файлов)`,
                    command: this.buildRunnerCommand(detectedRunner, 'group', files, type),
                    files: files.map(f => f.relativePath),
                    groupType: type,
                    estimatedTime: this.estimateTestTime(files)
                });
            }
        }

        // Группируем по директориям (только если много директорий)
        const dirGroups = this.groupTests(testFiles, 'directory');
        const dirsWithMultipleTests = Object.entries(dirGroups).filter(([_, files]) => files.length > 1);

        if (dirsWithMultipleTests.length > 1) {
            for (const [dir, files] of dirsWithMultipleTests) {
                commands.push({
                    type: `directory_${dir}`,
                    description: `Запустить тесты в ${dir} (${files.length} файлов)`,
                    command: this.buildRunnerCommand(detectedRunner, 'directory', files, dir),
                    files: files.map(f => f.relativePath),
                    directory: dir,
                    estimatedTime: this.estimateTestTime(files)
                });
            }
        }

        // Индивидуальные тесты (только если их не слишком много)
        if (testFiles.length <= 20) {
            for (const file of testFiles) {
                commands.push({
                    type: 'individual',
                    description: `Запустить ${file.relativePath}`,
                    command: this.buildRunnerCommand(detectedRunner, 'individual', [file], file.relativePath),
                    files: [file.relativePath],
                    estimatedTime: this.estimateTestTime([file])
                });
            }
        }

        return commands;
    }

    /**
     * Строит команду для конкретного тестового раннера
     */
    buildRunnerCommand(runner, type, files, context = '') {
        switch (runner) {
            case 'jest':
                switch (type) {
                    case 'all':
                        return 'npm test';
                    case 'group':
                        return `npm test -- --testPathPattern="(${context})"`;
                    case 'directory':
                        return `npm test -- --testPathPattern="${context}"`;
                    case 'individual':
                        return `npm test -- ${context}`;
                }
                break;

            case 'vitest':
                switch (type) {
                    case 'all':
                        return 'npm test';
                    case 'group':
                        return `npm test -- --run --reporter=verbose --testNamePattern="(${context})"`;
                    case 'directory':
                        return `npm test -- --run --reporter=verbose --include="${context}/**/*"`;
                    case 'individual':
                        return `npm test -- --run --reporter=verbose ${context}`;
                }
                break;

            case 'mocha':
                switch (type) {
                    case 'all':
                        return 'npm test';
                    case 'group':
                        return `npm test -- --grep="(${context})"`;
                    case 'directory':
                        return `npm test -- ${context}/**/*.test.js`;
                    case 'individual':
                        return `npm test -- ${context}`;
                }
                break;

            case 'cypress':
                switch (type) {
                    case 'all':
                        return 'npm run cypress:run';
                    case 'group':
                        return `npm run cypress:run -- --spec "cypress/e2e/**/*${context}*"`;
                    case 'directory':
                        return `npm run cypress:run -- --spec "cypress/e2e/${context}/**/*"`;
                    case 'individual':
                        return `npm run cypress:run -- --spec "${context}"`;
                }
                break;
        }

        // Fallback
        return 'npm test';
    }

    /**
     * Оценивает примерное время выполнения тестов
     */
    estimateTestTime(files) {
        // Простая эвристика: 1 секунда на файл + 2 секунды базового времени
        const baseTime = 2000;
        const perFileTime = 1000;
        return baseTime + (files.length * perFileTime);
    }

    /**
     * Получает детальную информацию о тестах для интерактивного выбора
     */
    async getInteractiveTestInfo(cwd = process.cwd()) {
        const testInfo = await this.getTestFiles(cwd);
        const commands = this.buildTestCommands(testInfo.files, testInfo.runner);

        return {
            ...testInfo,
            commands: commands,
            recommendations: this.generateRecommendations(testInfo, commands)
        };
    }

    /**
     * Генерирует рекомендации по запуску тестов
     */
    generateRecommendations(testInfo, commands) {
        const recommendations = [];

        if (testInfo.total === 0) {
            recommendations.push({
                type: 'warning',
                message: 'Тестовые файлы не найдены. Проверьте структуру проекта.',
                action: 'scan_project'
            });
            return recommendations;
        }

        if (testInfo.total > 100) {
            recommendations.push({
                type: 'info',
                message: `Обнаружено много тестов (${testInfo.total}). Рекомендуется запускать по группам.`,
                action: 'use_groups'
            });
        }

        if (testInfo.total <= 10) {
            recommendations.push({
                type: 'info',
                message: 'Небольшое количество тестов. Можно запустить все сразу.',
                action: 'run_all'
            });
        }

        // Анализируем размеры файлов
        const largeFiles = testInfo.files.filter(f => f.size > 1024 * 50);
        if (largeFiles.length > 0) {
            recommendations.push({
                type: 'warning',
                message: `Обнаружены большие тестовые файлы (${largeFiles.length}). Могут выполняться долго.`,
                action: 'check_large_files',
                files: largeFiles.map(f => f.relativePath)
            });
        }

        return recommendations;
    }

    /**
     * Очищает кэш
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Получает статистику кэша
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys()),
            oldestEntry: this.cache.size > 0 ? Math.min(...Array.from(this.cache.values()).map(v => v.timestamp)) : null,
            newestEntry: this.cache.size > 0 ? Math.max(...Array.from(this.cache.values()).map(v => v.timestamp)) : null
        };
    }
}

// Создаем единственный экземпляр

module.exports = {
    TestGetter,
};

