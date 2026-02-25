/**
 * TestCommandInterceptor - Перехватчик для тестовых команд
 * Обрабатывает команды тестирования и интегрируется с TestInterceptor
 */

const {BaseInterceptor} = require('./BaseInterceptor.cjs');
const {errorUtils} = require('@libs/error-management/error-handler/error-utils.js');
const {consoleUtils} = require('@libs/logging-monitoring/logging/console-utils.js');
const {testInterceptor} = require('../test/TestInterceptorNew.cjs');

class TestCommandInterceptor extends BaseInterceptor {
    constructor() {
        super();
        this.name = 'test';
        this.priority = 200; // Высокий приоритет для тестов
    }

    /**
     * Проверяет, может ли перехватчик обработать команду
     */
    canHandle(command) {
        const cmd = command.trim().toLowerCase();
        return [
            'npm test', 'npm run test', 'vitest', 'jest', 'yarn test', 'pnpm test'
        ].some(pattern => cmd.startsWith(pattern));
    }

    /**
     * Обрабатывает команду
     */
    async handle(command, context = {}) {
        try {
            this.validateCommand(command);
            this.logAction('intercept', {command});

            consoleUtils.log(`[TestCommandInterceptor] 🧪 Перехватываю тестовую команду: ${command}`);

            // Используем TestInterceptor для обработки
            const result = await testInterceptor.interceptRunAllTests(command, context);

            if (result) {
                return {
                    success: true,
                    output: 'Тестовая команда перехвачена. Выберите вариант запуска.',
                    intercepted: true,
                    type: 'test',
                    testInfo: result.testInfo,
                    recommendations: result.recommendations
                };
            } else {
                // Если перехват не удался, выполняем команду как обычно
                return {
                    success: true,
                    output: 'Тестовая команда выполнена стандартно.',
                    intercepted: false,
                    type: 'test'
                };
            }
        } catch (error) {
            this.logAction('error', {command, error: error.message});
            return {
                success: false,
                output: `Ошибка перехвата тестовой команды: ${error.message}`,
                intercepted: false,
                type: 'test',
                error: error.message
            };
        }
    }

    /**
     * Получает информацию о перехватчике
     */
    getInfo() {
        return {
            name: this.name,
            priority: this.priority,
            description: 'Intercepts and handles test commands (npm test, vitest, jest, etc.)',
            supportedCommands: [
                'npm test',
                'npm run test',
                'vitest',
                'jest',
                'yarn test',
                'pnpm test'
            ]
        };
    }

    /**
     * Получение статистики тестов
     */
    getTestStats() {
        return testInterceptor.getTestReport();
    }

    /**
     * Выполнение тестов с перехватом
     */
    async executeTests(command, options = {}) {
        try {
            this.validateCommand(command);
            this.logAction('execute', {command, options});

            const result = await testInterceptor.executeTests(command, options);

            return {
                success: true,
                result,
                intercepted: true,
                type: 'test_execution'
            };
        } catch (error) {
            this.logAction('execute_error', {command, error: error.message});
            return {
                success: false,
                error: error.message,
                intercepted: false,
                type: 'test_execution'
            };
        }
    }
}

module.exports = {TestCommandInterceptor};

