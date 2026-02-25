/**
 * TestInterceptor - Система перехвата запусков тестов
 * Отслеживает все запуски тестов (npm test, vitest, jest) и сохраняет историю отдельно
 * Интегрирован с testing-taskmanager для умного управления тестами
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

const {FileSystemUtils} = require('@libs/app-framework/core/file-utils/file-system');
const fileSystemUtils = new FileSystemUtils();
const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const {getCurrentSessionId} = require('@libs/system/history/index.cjs');
const testGetter = require(path.resolve(__dirname, 'TestGetter.cjs')); // Добавляем импорт TestGetter.cjs с правильным путем и регистром
const {ErrorUtils} = require('@libs/error-management/error-handler/error-utils.cjs');
const {ConsoleUtils} = require('@libs/logging-monitoring/logging/console-utils.js'); // Импортируем класс

// TestingTaskManagerMCPClient больше не используется

class TestInterceptor {
    constructor(logger, errorHandler) { // Принимаем logger и errorHandler напрямую
        this.logger = logger; // Сохраняем логгер
        this.errorHandler = errorHandler; // Сохраняем обработчик ошибок
        this.errorUtils = new ErrorUtils({errorHandler: this.errorHandler, logger: this.logger}); // Инициализируем ErrorUtils
        this.consoleUtils = new ConsoleUtils({logger: this.logger}); // Инициализируем ConsoleUtils
        this.testHistoryPath = fileSystemUtils.join(process.cwd(), 'work', 'test_history.jsonl');
        this.testStatusPath = fileSystemUtils.join(process.cwd(), 'work', 'test_status.json');
        this.testMetricsPath = fileSystemUtils.join(process.cwd(), 'work', 'test_metrics.json');

        // Статистика тестов (инициализируем ДО вызова initializeMetrics)
        this.testStats = {
            total_runs: 0,
            successful: 0,
            failed: 0,
            timeout: 0,
            interrupted: 0,
            total_duration: 0,
            average_duration: 0
        };

        // Паттерны для определения тестовых команд
        this.testPatterns = [
            /^npm\s+(?:run\s+)?test/,
            /^npm\s+(?:run\s+)?test:/,
            /^vitest/,
            /^jest/,
            /^npx\s+(?:vitest|jest)/,
            /^yarn\s+test/,
            /^pnpm\s+test/
        ];

        // Система "шороха" - активности изменений
        this.activityMap = new Map(); // Путь -> уровень активности
        this.changeHistory = new Map(); // Путь -> история изменений
        this.activityDecayRate = 0.95; // Скорость затухания активности
        this.maxActivityHistory = 100; // Максимум записей истории
        this.activityBoostMultiplier = 2.0; // Множитель приоритета для активных областей

        // Интеграция с testing-taskmanager - ОТКЛЮЧЕНА
        this.testingTaskManager = null;
        this.testQueue = [];
        this.maxConcurrentTests = 0; // Отключаем параллельное выполнение через TaskManager
        this.isDaemonRunning = false;

        // Создаем директории если не существуют
        this.ensureDirectories();

        // Инициализируем метрики (после инициализации testStats)
        this.initializeMetrics();

        // Запускаем систему затухания активности
        this.startActivityDecay();

        // Инициализация подключения к testing-taskmanager - ОТКЛЮЧЕНА
        // this.initializeTestingTaskManager();
    }

    /**
     * Создает необходимые директории
     */
    ensureDirectories() {
        const workDir = fileSystemUtils.join(fileSystemUtils.getDirname(this.testHistoryPath));
        if (!fs.existsSync(workDir)) {
            fileSystemUtils.mkdir(workDir, {recursive: true});
        }
    }

    /**
     * Инициализирует файл метрик
     */
    initializeMetrics() {
        // Проверяем, что testStats инициализирован
        if (!this.testStats) {
            this.logger.warn('testStats не инициализирован, используем значения по умолчанию');
            this.testStats = {
                total_runs: 0,
                successful: 0,
                failed: 0,
                timeout: 0,
                interrupted: 0,
                total_duration: 0,
                average_duration: 0
            };
        }

        if (!fs.existsSync(this.testMetricsPath)) {
            fs.writeFileSync(this.testMetricsPath, JSON.stringify(this.testStats, null, 2));
        } else {
            this.errorHandler.handleWithFallback(async () => { // Используем errorHandler.handleWithFallback

                this.testStats = JSON.parse(fs.readFileSync(this.testMetricsPath, 'utf8'));

            }, async (error) => {
                this.logger.error(`Ошибка чтения метрик теста: ${error.message}`);
            }, {context: 'initializeMetrics'});
        }
    }

    /**
     * Инициализирует подключение к testing-taskmanager - МЕТОД УДАЛЕН
     */

    // async initializeTestingTaskManager() { /* Метод удален */ }

    /**
     * Запускает систему затухания активности
     */
    startActivityDecay() {
        setInterval(() => {
            this.decayActivity();
        }, 60000); // Каждую минуту
    }

    /**
     * Затухание активности изменений
     */
    decayActivity() {
        for (const [path, activity] of this.activityMap.entries()) {
            const newActivity = activity * this.activityDecayRate;
            if (newActivity < 0.01) {
                this.activityMap.delete(path);
            } else {
                this.activityMap.set(path, newActivity);
            }
        }
    }

    /**
     * Увеличивает активность пути (система "шороха")
     */
    boostActivity(filePath, boostAmount = 1.0) {
        // Нормализуем путь и приводим к относительному формату
        let normalizedPath = path.normalize(filePath);

        // Убираем ./ в начале если есть
        if (normalizedPath.startsWith('./')) {
            normalizedPath = normalizedPath.substring(2);
        }

        // Убираем . в начале если есть
        if (normalizedPath.startsWith('.')) {
            normalizedPath = normalizedPath.substring(1);
        }

        // Убираем / в начале если есть
        if (normalizedPath.startsWith('/')) {
            normalizedPath = normalizedPath.substring(1);
        }

        const currentActivity = this.activityMap.get(normalizedPath) || 0;
        const newActivity = currentActivity + boostAmount;

        this.activityMap.set(normalizedPath, newActivity);

        // Сохраняем в историю изменений
        if (!this.changeHistory.has(normalizedPath)) {
            this.changeHistory.set(normalizedPath, []);
        }

        const history = this.changeHistory.get(normalizedPath);
        history.push({
            timestamp: Date.now(),
            boostAmount,
            newActivity
        });

        // Ограничиваем историю
        if (history.length > this.maxActivityHistory) {
            history.splice(0, history.length - this.maxActivityHistory);
        }

        this.logger.log(`[TestInterceptor] Увеличена активность пути: ${normalizedPath} -> ${newActivity.toFixed(2)}`);
    }

    /**
     * Получает приоритет теста на основе активности изменений
     */
    getTestPriority(testPath, basePriority = 5) {
        // Нормализуем путь и приводим к относительному формату
        let normalizedPath = path.normalize(testPath);

        // Убираем ./ в начале если есть
        if (normalizedPath.startsWith('./')) {
            normalizedPath = normalizedPath.substring(2);
        }

        // Убираем . в начале если есть
        if (normalizedPath.startsWith('.')) {
            normalizedPath = normalizedPath.substring(1);
        }

        // Убираем / в начале если есть
        if (normalizedPath.startsWith('/')) {
            normalizedPath = normalizedPath.substring(1);
        }

        const activity = this.activityMap.get(normalizedPath) || 0;

        if (activity > 0) {
            const boostedPriority = Math.max(1, Math.floor(basePriority / (activity * this.activityBoostMultiplier)));
            this.logger.log(`[TestInterceptor] Приоритет теста ${normalizedPath}: ${basePriority} -> ${boostedPriority} (активность: ${activity.toFixed(2)})`);
            return boostedPriority;
        }

        return basePriority;
    }

    /**
     * Проверяет, является ли команда тестовой
     */
    isTestCommand(command) {
        return this.testPatterns.some(pattern => pattern.test(command));
    }

    /**
     * Проверяет, является ли команда попыткой запустить все тесты
     */
    isRunAllTestsCommand(command) {
        const cmd = command.trim().toLowerCase();
        return [
            'npm test',
            'npm run test',
            'npm test --',
            'npm run test --',
            'vitest',
            'vitest run',
            'jest',
            'jest --runInBand',
            'yarn test',
            'pnpm test'
        ].some(pattern => cmd.startsWith(pattern));
    }

    /**
     * Перехватывает команду запуска всех тестов и предлагает варианты
     */
    async interceptRunAllTests(command, options = {}) {
        if (!this.isRunAllTestsCommand(command)) {
            return null;
        }

        this.logger.log('\n[TestInterceptor] 🧪 Обнаружена попытка запуска всех тестов');
        this.logger.log('[TestInterceptor] 📋 Анализирую проект для построения вариантов...\n');

        this.errorHandler.handleWithFallback(async () => {

            // Получаем информацию о тестах через test-getter
            const testInfo = await testGetter.getInteractiveTestInfo(options.cwd || process.cwd());

            if (testInfo.total === 0) {
                this.logger.log('[TestInterceptor] ⚠️  Тестовые файлы не найдены');
                this.logger.log('[TestInterceptor] 💡 Рекомендации:');
                this.logger.log('   - Проверьте структуру проекта');
                this.logger.log('   - Убедитесь, что тесты находятся в правильных директориях');
                this.logger.log('   - Проверьте package.json на наличие тестовых скриптов\n');
                return null;
            }

            // Показываем варианты запуска
            this.displayTestOptions(testInfo);

            // Возвращаем информацию для дальнейшей обработки
            return {
                type: 'run_all_tests_intercepted',
                originalCommand: command,
                testInfo: testInfo,
                recommendations: testInfo.recommendations
            };


        }, async (error) => {
            this.logger.error(`Ошибка перехвата всех тестов: ${error.message}`);
        }, {context: 'interceptRunAllTests'});
    }

    /**
     * Отображает варианты запуска тестов
     */
    displayTestOptions(testInfo) {
        this.logger.log(`[TestInterceptor] 📊 Найдено тестов: ${testInfo.total}`);
        this.logger.log(`[TestInterceptor] 🚀 Тестовый раннер: ${testInfo.runner || 'не определен'}\n`);

        this.logger.log('[TestInterceptor] 🎯 Варианты запуска:\n');

        // Показываем команды по приоритету
        const priorityOrder = ['all', 'group', 'directory', 'individual'];
        const sortedCommands = testInfo.commands.sort((a, b) => {
            const aIndex = priorityOrder.indexOf(a.type.split('_')[0]);
            const bIndex = priorityOrder.indexOf(b.type.split('_')[0]);
            return aIndex - bIndex;
        });

        for (let i = 0; i < sortedCommands.length; i++) {
            const cmd = sortedCommands[i];
            const index = i + 1;
            const timeStr = cmd.estimatedTime ? ` (~${Math.round(cmd.estimatedTime / 1000)}с)` : '';

            this.logger.log(`  ${index}. ${cmd.description}${timeStr}`);

            if (cmd.type === 'all') {
                this.logger.log(`     Команда: ${cmd.command}`);
            } else if (cmd.type.startsWith('group_')) {
                this.logger.log(`     Команда: ${cmd.command}`);
                this.logger.log(`     Файлы: ${cmd.files.length}`);
            } else if (cmd.type.startsWith('directory_')) {
                this.logger.log(`     Команда: ${cmd.command}`);
                this.logger.log(`     Директория: ${cmd.directory}`);
            } else if (cmd.type === 'individual') {
                this.logger.log(`     Команда: ${cmd.command}`);
            }
            this.logger.log('');
        }

        // Показываем рекомендации
        if (testInfo.recommendations.length > 0) {
            this.logger.log('[TestInterceptor] 💡 Рекомендации:\n');
            for (const rec of testInfo.recommendations) {
                const icon = rec.type === 'warning' ? '⚠️' : 'ℹ️';
                this.logger.log(`  ${icon} ${rec.message}`);
            }
            this.logger.log('');
        }

        this.logger.log('[TestInterceptor] 💭 Для выбора варианта используйте:');
        this.logger.log('   - Выберите номер варианта (1, 2, 3...)');
        this.logger.log('   - Или выполните команду напрямую');
        this.logger.log('   - Или используйте --help для получения справки\n');
    }

    /**
     * Выполняет выбранный вариант тестов
     */
    async executeTestOption(optionIndex, testInfo, originalCommand) {
        if (!testInfo.commands || optionIndex < 1 || optionIndex > testInfo.commands.length) {
            this.logger.error('[TestInterceptor] ❌ Неверный номер варианта');
            return false;
        }

        const selectedCommand = testInfo.commands[optionIndex - 1];
        this.logger.log(`[TestInterceptor] 🚀 Выполняю: ${selectedCommand.description}`);
        this.logger.log(`[TestInterceptor] 📝 Команда: ${selectedCommand.command}\n`);

        this.errorHandler.handleWithFallback(async () => {

            // Создаем запись о тесте
            const testId = this.interceptCommand(selectedCommand.command, {cwd: testInfo.cwd});

            if (testId) {
                // Обновляем статус
                this.updateTestStatus(testId, 'executing_option');

                // Выполняем команду
                const result = await this.executeTestCommand(selectedCommand.command, {
                    cwd: testInfo.cwd,
                    testId: testId,
                    originalCommand: originalCommand,
                    selectedOption: selectedCommand
                });

                return result;
            }

        }, async (error) => {
            this.logger.error(`Ошибка выполнения опции теста: ${error.message}`);
        }, {context: 'executeTestOption'});
    }

    /**
     * Выполняет тестовую команду
     */
    async executeTestCommand(command, options = {}) {
        return new Promise((resolve, reject) => {
            const {cwd = process.cwd(), testId, originalCommand, selectedOption} = options;

            this.logger.log(`[TestInterceptor] 🔄 Запуск: ${command}`);

            const child = spawn(command, [], {
                shell: true,
                cwd: cwd,
                stdio: ['inherit', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                process.stdout.write(output);
            });

            child.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                process.stderr.write(output);
            });

            child.on('close', (code) => {
                const duration = Date.now() - (this.testStats.start_time || Date.now());

                // Обновляем статус теста
                if (testId) {
                    this.updateTestStatus(testId, code === 0 ? 'completed' : 'failed');
                    this.logTestEvent({
                        id: testId,
                        status: code === 0 ? 'completed' : 'failed',
                        exit_code: code,
                        duration: duration,
                        stdout: stdout,
                        stderr: stderr,
                        command: command,
                        original_command: originalCommand,
                        selected_option: selectedOption
                    });
                }

                if (code === 0) {
                    this.logger.log(`\n[TestInterceptor] ✅ Тест завершен успешно (${Math.round(duration / 1000)}с)`);
                    resolve({success: true, code, duration, stdout, stderr});
                } else {
                    this.logger.log(`\n[TestInterceptor] ❌ Тест завершен с ошибкой (код: ${code}, время: ${Math.round(duration / 1000)}с)`);
                    resolve({success: false, code, duration, stdout, stderr});
                }
            });

            child.on('error', (error) => {
                this.logger.error(`[TestInterceptor] ❌ Ошибка запуска теста:`, error.message);
                reject(error);
            });
        });
    }

    /**
     * Перехватывает команду и определяет, нужно ли логировать как тест
     */
    interceptCommand(command, options = {}) {
        if (!this.isTestCommand(command)) {
            return null; // Не тестовая команда
        }

        // Проверяем, является ли это попыткой запуска всех тестов
        if (this.isRunAllTestsCommand(command)) {
            // Используем Promise.resolve для асинхронной обработки
            this.interceptRunAllTests(command, options).then(interceptionResult => {
                if (interceptionResult) {
                    this.logger.log('[TestInterceptor] Команда перехвачена, предлагаем варианты запуска');
                }
            }).catch(error => {
                this.logger.error('[TestInterceptor] Ошибка перехвата:', error.message);
            });

            // Возвращаем специальный ID для перехваченной команды
            return `intercepted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sessionId = getCurrentSessionId();

        // Определяем приоритет на основе активности изменений
        const cwd = options.cwd || process.cwd();
        const testPriority = this.getTestPriority(cwd);

        const testRecord = {
            id: testId,
            session_id: sessionId,
            timestamp: new Date().toISOString(),
            command: command,
            status: 'started',
            start_time: Date.now(),
            cwd: cwd,
            platform: process.platform,
            test_runner: this.detectTestRunner(command),
            options: options,
            pid: null,
            duration: null,
            exit_code: null,
            stdout: '',
            stderr: '',
            error: null,
            priority: testPriority,
            activity_level: this.activityMap.get(path.normalize(cwd)) || 0
        };

        // Сохраняем запись о запуске теста
        this.logTestEvent(testRecord);

        // Обновляем статус
        this.updateTestStatus(testId, 'running');

        // Не добавляем в очередь testing-taskmanager
        // this.queueTestForTaskManager(testId, testRecord);

        return testId;
    }

    /**
     * Добавляет тест в очередь testing-taskmanager - МЕТОД УДАЛЕН
     */
    // queueTestForTaskManager(testId, testRecord) { /* Метод удален */ }

    /**
     * Обрабатывает очередь тестов - МЕТОД УДАЛЕН
     */
    // async processTestQueue() { /* Метод удален */ }

    /**
     * Выполняет тест через testing-taskmanager - МЕТОД УДАЛЕН
     */
    // async executeTestViaTaskManager(testTask) { /* Метод удален */ }

    /**
     * Симулирует выполнение теста (временная реализация) - МЕТОД УДАЛЕН
     */
    // async simulateTestExecution(testTask) { /* Метод удален */ }

    /**
     * Обеспечивает запуск демона testing-taskmanager - МЕТОД УДАЛЕН
     */

    // async ensureDaemonRunning() { /* Метод удален */ }

    /**
     * Перехватывает npm команды и отслеживает их выполнение
     */
    interceptNpmCommand(command, options = {}) {
        // Проверяем, содержит ли команда npm test
        if (command.includes('npm') && (command.includes('test') || command.includes('run test'))) {
            return this.interceptCommand(command, options);
        }
        return null;
    }

    /**
     * Перехватывает команды на уровне процесса
     */
    interceptProcessCommand(command, pid, options = {}) {
        if (!this.isTestCommand(command)) {
            return null;
        }

        const testId = this.interceptCommand(command, options);
        if (testId) {
            // Обновляем PID процесса
            this.updateTestStatus(testId, 'running', {pid});
        }
        return testId;
    }

    /**
     * Определяет тип тестового раннера
     */
    detectTestRunner(command) {
        if (command.includes('vitest')) return 'vitest';
        if (command.includes('jest')) return 'jest';
        if (command.includes('npm test') || command.includes('npm run test')) return 'npm';
        if (command.includes('yarn test')) return 'yarn';
        if (command.includes('pnpm test')) return 'pnpm';
        return 'unknown';
    }

    /**
     * Логирует событие теста
     */
    logTestEvent(testRecord) {
        this.errorHandler.handleWithFallback(async () => {

            const logEntry = JSON.stringify(testRecord) + '\n';
            fs.appendFileSync(this.testHistoryPath, logEntry);

            // Обновляем метрики
            this.updateTestMetrics(testRecord);


        }, async (error) => {
            this.logger.error(`Ошибка логирования события теста: ${error.message}`);
        }, {context: 'logTestEvent'});
    }

    /**
     * Обновляет статус теста
     */
    updateTestStatus(testId, status, additionalData = {}) {
        this.errorHandler.handleWithFallback(async () => {

            let statusData = {};
            if (fs.existsSync(this.testStatusPath)) {
                statusData = JSON.parse(fs.readFileSync(this.testStatusPath, 'utf8'));
            }

            statusData[testId] = {
                ...statusData[testId],
                status,
                last_update: new Date().toISOString(),
                ...additionalData
            };

            fs.writeFileSync(this.testStatusPath, JSON.stringify(statusData, null, 2));


        }, async (error) => {
            this.logger.error(`Ошибка обновления статуса теста: ${error.message}`);
        }, {context: 'updateTestStatus'});
    }

    /**
     * Завершает тест
     */
    async completeTest(testId, result) {
        this.errorHandler.handleWithFallback(async () => {

            // Находим запись в истории
            const historyLines = fs.readFileSync(this.testHistoryPath, 'utf8')
                .trim()
                .split('\n')
                .filter(line => line.trim());

            let testRecord = null;
            let recordIndex = -1;

            for (let i = 0; i < historyLines.length; i++) {
                const record = await this.errorHandler.handleWithFallback(async () => {
                    return JSON.parse(historyLines[i]);
                }, async (error) => {
                    this.logger.warn(`Ошибка парсинга записи ${i}: ${error.message}`);
                    return null;
                }, {context: 'parseTestHistoryRecord'});

                if (record && record.id === testId) {
                    testRecord = record;
                    recordIndex = i;
                    break;
                }
            }

            if (!testRecord) {
                this.logger.warn(`Запись теста ${testId} не найдена в истории`);
                return;
            }

            // Обновляем запись
            const updatedRecord = {
                ...testRecord,
                status: result.status,
                end_time: Date.now(),
                duration: Date.now() - testRecord.start_time,
                exit_code: result.exit_code,
                stdout: result.stdout || '',
                stderr: result.stderr || '',
                error: result.error || null
            };

            // Заменяем строку в файле
            historyLines[recordIndex] = JSON.stringify(updatedRecord);
            fs.writeFileSync(this.testHistoryPath, historyLines.join('\n') + '\n');

            // Обновляем статус
            this.updateTestStatus(testId, result.status, {
                end_time: updatedRecord.end_time,
                duration: updatedRecord.duration,
                exit_code: result.exit_code
            });

            // Обновляем метрики
            this.updateTestMetrics(updatedRecord);


        }, async (error) => {
            this.logger.error(`Ошибка завершения теста: ${error.message}`);
        }, {context: 'completeTest'});
    }

    /**
     * Обновляет метрики тестов
     */
    updateTestMetrics(testRecord) {
        this.errorHandler.handleWithFallback(async () => {

            this.testStats.total_runs++;

            if (testRecord.status === 'completed' || testRecord.status === 'success') {
                this.testStats.successful++;
            } else if (testRecord.status === 'failed' || testRecord.status === 'error') {
                this.testStats.failed++;
            } else if (testRecord.status === 'timeout') {
                this.testStats.timeout++;
            } else if (testRecord.status === 'interrupted') {
                this.testStats.interrupted++;
            }

            if (testRecord.duration) {
                this.testStats.total_duration += testRecord.duration;
                this.testStats.average_duration = this.testStats.total_duration / this.testStats.total_runs;
            }

            // Сохраняем обновленные метрики
            fs.writeFileSync(this.testMetricsPath, JSON.stringify(this.testStats, null, 2));


        }, async (error) => {
            this.logger.error(`Ошибка обновления метрик теста: ${error.message}`);
        }, {context: 'updateTestMetrics'});
    }

    /**
     * Получает историю тестов
     */
    getTestHistory(options = {}) {
        this.errorHandler.handleWithFallback(async () => {

            if (!fs.existsSync(this.testHistoryPath)) {
                return [];
            }

            const historyLines = fs.readFileSync(this.testHistoryPath, 'utf8')
                .trim()
                .split('\n')
                .filter(line => line.trim());

            let records = historyLines.map(line => {
                const record = this.errorHandler.handleWithFallback(async () => {
                    return JSON.parse(line);
                }, async (error) => {
                    this.logger.warn(`Ошибка парсинга записи: ${error.message}`);
                    return null;
                }, {context: 'parseHistoryLine'});
                return record;
            }).filter(record => record !== null);

            // Фильтрация по статусу
            if (options.status) {
                records = records.filter(record => record.status === options.status);
            }

            // Фильтрация по тестовому раннеру
            if (options.testRunner) {
                records = records.filter(record => record.test_runner === options.testRunner);
            }

            // Фильтрация по сессии
            if (options.sessionId) {
                records = records.filter(record => record.session_id === options.sessionId);
            }

            // Сортировка по времени (новые сначала)
            records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Ограничение количества
            if (options.limit) {
                records = records.slice(0, options.limit);
            }

            return records;


        }, async (error) => {
            this.logger.error(`Ошибка получения истории тестов: ${error.message}`);
            return [];
        }, {context: 'getTestHistory'});
    }

    /**
     * Получает статистику тестов
     */
    getTestStats() {
        return {...this.testStats};
    }

    /**
     * Получает активные тесты
     */
    getActiveTests() {
        this.errorHandler.handleWithFallback(async () => {

            if (!fs.existsSync(this.testStatusPath)) {
                return [];
            }

            const statusData = JSON.parse(fs.readFileSync(this.testStatusPath, 'utf8'));
            return Object.entries(statusData)
                .filter(([id, data]) => data.status === 'running')
                .map(([id, data]) => ({
                    id,
                    ...data
                }));


        }, async (error) => {
            this.logger.error(`Ошибка получения активных тестов: ${error.message}`);
            return [];
        }, {context: 'getActiveTests'});
    }

    /**
     * Получает статистику активности (система "шороха")
     */
    getActivityStats() {
        const stats = {
            total_paths: this.activityMap.size,
            high_activity_paths: 0,
            medium_activity_paths: 0,
            low_activity_paths: 0,
            total_activity: 0,
            most_active_paths: []
        };

        for (const [path, activity] of this.activityMap.entries()) {
            stats.total_activity += activity;

            if (activity > 2.0) {
                stats.high_activity_paths++;
            } else if (activity > 0.5) {
                stats.medium_activity_paths++;
            } else {
                stats.low_activity_paths++;
            }
        }

        // Топ-5 самых активных путей
        stats.most_active_paths = Array.from(this.activityMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([path, activity]) => ({path, activity}));

        return stats;
    }

    /**
     * Очищает старые записи тестов
     */
    cleanupOldTests(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 дней по умолчанию
        this.errorHandler.handleWithFallback(async () => {

            const cutoffTime = Date.now() - maxAge;
            const historyLines = fs.readFileSync(this.testHistoryPath, 'utf8')
                .trim()
                .split('\n')
                .filter(line => line.trim());

            const filteredLines = historyLines.filter(line => {
                const record = this.errorHandler.handleWithFallback(async () => {
                    return JSON.parse(line);
                }, async (error) => {
                    this.logger.warn(`Ошибка парсинга записи: ${error.message}`);
                    return null;
                }, {context: 'filterOldTests'});
                return record ? new Date(record.timestamp).getTime() > cutoffTime : false;
            });

            if (filteredLines.length < historyLines.length) {
                fs.writeFileSync(this.testHistoryPath, filteredLines.join('\n') + '\n');
                // console.log removed
            }


        }, async (error) => {
            this.logger.error(`Ошибка очистки старых тестов: ${error.message}`);
        }, {context: 'cleanupOldTests'});
    }

    /**
     * Экспортирует историю тестов
     */
    exportTestHistory(outputPath, options = {}) {
        this.errorHandler.handleWithFallback(async () => {

            const history = this.getTestHistory(options);
            const exportData = {
                export_timestamp: new Date().toISOString(),
                total_records: history.length,
                filters: options,
                records: history
            };

            fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
            return true;


        }, async (error) => {
            this.logger.error(`Ошибка экспорта истории тестов: ${error.message}`);
            return false;
        }, {context: 'exportTestHistory'});
    }
}

// Экспортируем класс TestInterceptor
module.exports = {
    TestInterceptor,
    // testInterceptor, // Удаляем глобальный экземпляр
    // Экспортируем новые методы для внешнего использования (теперь они будут вызываться через экземпляр)
    // interceptRunAllTests: (command, options) => testInterceptor.interceptRunAllTests(command, options),
    // executeTestOption: (optionIndex, testInfo, originalCommand) => testInterceptor.executeTestOption(optionIndex, testInfo, originalCommand),
    // getTestOptions: (cwd) => testGetter.getInteractiveTestInfo(cwd)
};

