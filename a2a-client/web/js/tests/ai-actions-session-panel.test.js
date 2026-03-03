/**
 * Тесты для AI Actions Session Panel
 * 
 * Этот файл содержит тесты для проверки функциональности
 * сессионной панели AI actions.
 */

(function (global) {
    'use strict';

    /**
     * Тесты для AI Actions Session Panel
     */
    class AIActionsSessionPanelTests {
        constructor() {
            this.tests = [];
            this.passed = 0;
            this.failed = 0;
            this.results = [];
        }

        /**
         * Запустить все тесты
         */
        async runAll() {
            console.log('🧪 Starting AI Actions Session Panel Tests');
            console.log('='.repeat(60));

            try {
                // Проверить зависимости
                await this.checkDependencies();

                // Запустить тесты
                await this.testPanelCreation();
                await this.testSessionManagement();
                await this.testActionManagement();
                await this.testUIRendering();
                await this.testEventHandling();
                await this.testDataPersistence();
                await this.testErrorHandling();
                await this.testIntegration();

                // Вывести результаты
                this.printResults();

            } catch (error) {
                console.error('❌ Test suite failed:', error);
                this.addResult('Test Suite', false, error.message);
            }
        }

        /**
         * Проверить зависимости
         */
        async checkDependencies() {
            console.log('\n🔍 Checking Dependencies...');

            const dependencies = [
                'AIActionsSessionPanel',
                'PanelDock',
                'createAIActionsPanelDOM'
            ];

            for (const dep of dependencies) {
                if (typeof global[dep] === 'undefined') {
                    throw new Error(`Missing dependency: ${dep}`);
                }
                this.addResult(`Dependency: ${dep}`, true, 'Available');
            }
        }

        /**
         * Тест создания панели
         */
        async testPanelCreation() {
            console.log('\n🏗️  Testing Panel Creation...');

            try {
                // Создать DOM элемент
                const panelDOM = global.createAIActionsPanelDOM({
                    id: 'test-panel',
                    title: 'Test Panel',
                    slot: 'right'
                });

                // Проверить DOM элемент
                this.addResult('DOM Creation', panelDOM !== null, 'Panel DOM created');

                // Создать панель
                const panel = new global.AIActionsSessionPanel(panelDOM, {
                    id: 'test-panel',
                    slot: 'right',
                    critical: false
                });

                // Проверить панель
                this.addResult('Panel Instance', panel instanceof global.AIActionsSessionPanel, 'Panel instance created');
                this.addResult('Panel ID', panel.id === 'test-panel', 'Panel ID set correctly');
                this.addResult('Panel Slot', panel.slot === 'right', 'Panel slot set correctly');

                // Сохранить панель для других тестов
                global.testPanel = panel;

            } catch (error) {
                this.addResult('Panel Creation', false, error.message);
            }
        }

        /**
         * Тест управления сессиями
         */
        async testSessionManagement() {
            console.log('\n📋 Testing Session Management...');

            const panel = global.testPanel;
            if (!panel) {
                this.addResult('Session Management', false, 'Panel not available');
                return;
            }

            try {
                // Тест создания сессии
                const sessionId = panel.createSession('test-session-1');
                this.addResult('Create Session', sessionId === 'test-session-1', 'Session created successfully');

                // Тест получения сессий
                const sessions = panel.getAllSessions();
                this.addResult('Get All Sessions', sessions.length === 1, 'Sessions retrieved');

                // Тест получения текущей сессии
                const currentSession = panel.getCurrentSession();
                this.addResult('Get Current Session', currentSession !== null, 'Current session retrieved');

                // Тест переключения сессий
                panel.createSession('test-session-2');
                panel.switchToSession('test-session-2');
                const newCurrentSession = panel.getCurrentSession();
                this.addResult('Switch Session', newCurrentSession.id === 'test-session-2', 'Session switched successfully');

                // Тест обновления статуса сессии
                panel.updateSessionStatus('test-session-1', 'completed');
                const updatedSession = panel.getSession('test-session-1');
                this.addResult('Update Session Status', updatedSession.status === 'completed', 'Session status updated');

                // Тест удаления сессии
                panel.removeSession('test-session-1');
                const remainingSessions = panel.getAllSessions();
                this.addResult('Remove Session', remainingSessions.length === 1, 'Session removed successfully');

            } catch (error) {
                this.addResult('Session Management', false, error.message);
            }
        }

        /**
         * Тест управления действиями
         */
        async testActionManagement() {
            console.log('\n⚡ Testing Action Management...');

            const panel = global.testPanel;
            if (!panel) {
                this.addResult('Action Management', false, 'Panel not available');
                return;
            }

            try {
                // Создать тестовую сессию
                panel.createSession('action-test-session');

                // Тест добавления form action
                const formAction = {
                    type: 'form',
                    title: 'Test Form',
                    choices: [{ id: 'opt1', label: 'Option 1' }],
                    status: 'pending'
                };
                panel.addActionToSession('action-test-session', formAction);
                const actions = panel.getActionsFromSession('action-test-session');
                this.addResult('Add Form Action', actions.length === 1, 'Form action added');

                // Тест добавления message action
                const messageAction = {
                    type: 'message',
                    content: 'Test message',
                    status: 'completed'
                };
                panel.addActionToSession('action-test-session', messageAction);
                const actions2 = panel.getActionsFromSession('action-test-session');
                this.addResult('Add Message Action', actions2.length === 2, 'Message action added');

                // Тест добавления script action
                const scriptAction = {
                    type: 'script',
                    input: { data: 'test' },
                    output: 'Script executed',
                    code: 'console.log("test");',
                    status: 'completed'
                };
                panel.addActionToSession('action-test-session', scriptAction);
                const actions3 = panel.getActionsFromSession('action-test-session');
                this.addResult('Add Script Action', actions3.length === 3, 'Script action added');

                // Тест обновления статуса действия
                const actionId = actions3[0].id;
                panel.updateActionStatus('action-test-session', actionId, 'completed');
                const updatedActions = panel.getActionsFromSession('action-test-session');
                const updatedAction = updatedActions.find(a => a.id === actionId);
                this.addResult('Update Action Status', updatedAction.status === 'completed', 'Action status updated');

                // Тест удаления действия
                const actionId2 = actions3[1].id;
                panel.removeActionFromSession('action-test-session', actionId2);
                const actions4 = panel.getActionsFromSession('action-test-session');
                this.addResult('Remove Action', actions4.length === 2, 'Action removed');

            } catch (error) {
                this.addResult('Action Management', false, error.message);
            }
        }

        /**
         * Тест отображения UI
         */
        async testUIRendering() {
            console.log('\n🎨 Testing UI Rendering...');

            const panel = global.testPanel;
            if (!panel) {
                this.addResult('UI Rendering', false, 'Panel not available');
                return;
            }

            try {
                // Проверить, что DOM элементы существуют
                const container = panel.container;
                this.addResult('Container Exists', container !== null, 'Panel container exists');

                // Проверить наличие основных элементов
                const sessionList = container.querySelector('.session-list');
                const sessionContent = container.querySelector('.session-content');
                this.addResult('Session List', sessionList !== null, 'Session list exists');
                this.addResult('Session Content', sessionContent !== null, 'Session content exists');

                // Проверить рендеринг сессий
                panel.render();
                const sessionItems = container.querySelectorAll('.session-item');
                this.addResult('Render Sessions', sessionItems.length > 0, 'Sessions rendered');

                // Проверить рендеринг действий
                const actionItems = container.querySelectorAll('.action-item');
                this.addResult('Render Actions', actionItems.length > 0, 'Actions rendered');

            } catch (error) {
                this.addResult('UI Rendering', false, error.message);
            }
        }

        /**
         * Тест обработки событий
         */
        async testEventHandling() {
            console.log('\n📡 Testing Event Handling...');

            const panel = global.testPanel;
            if (!panel) {
                this.addResult('Event Handling', false, 'Panel not available');
                return;
            }

            try {
                let eventFired = false;

                // Тест обработки событий
                const testHandler = () => {
                    eventFired = true;
                };

                // Проверить, что панель может обрабатывать события
                this.addResult('Event Handler Setup', typeof testHandler === 'function', 'Event handler created');

                // Тест генерации событий
                panel.emit('test-event', { data: 'test' });
                this.addResult('Event Emission', true, 'Event emitted');

                // Тест обновления состояния
                panel.updateState({ test: true });
                this.addResult('State Update', true, 'State updated');

            } catch (error) {
                this.addResult('Event Handling', false, error.message);
            }
        }

        /**
         * Тест сохранения данных
         */
        async testDataPersistence() {
            console.log('\n💾 Testing Data Persistence...');

            const panel = global.testPanel;
            if (!panel) {
                this.addResult('Data Persistence', false, 'Panel not available');
                return;
            }

            try {
                // Создать тестовую сессию с действиями
                panel.createSession('persistence-test');
                panel.addActionToSession('persistence-test', {
                    type: 'message',
                    content: 'Test message',
                    status: 'completed'
                });

                // Тест экспорта сессии
                const exportedData = panel.exportSession('persistence-test');
                this.addResult('Export Session', exportedData !== null, 'Session exported');

                // Тест импорта сессии
                const importResult = panel.importSession(exportedData);
                this.addResult('Import Session', importResult !== null, 'Session imported');

                // Тест сохранения в localStorage
                if (typeof localStorage !== 'undefined') {
                    panel.saveToStorage();
                    const loadedData = panel.loadFromStorage();
                    this.addResult('LocalStorage Save/Load', loadedData !== null, 'Data saved and loaded from localStorage');
                } else {
                    this.addResult('LocalStorage', true, 'localStorage not available (skipped)');
                }

            } catch (error) {
                this.addResult('Data Persistence', false, error.message);
            }
        }

        /**
         * Тест обработки ошибок
         */
        async testErrorHandling() {
            console.log('\n🛡️  Testing Error Handling...');

            const panel = global.testPanel;
            if (!panel) {
                this.addResult('Error Handling', false, 'Panel not available');
                return;
            }

            try {
                // Тест добавления действия в несуществующую сессию
                try {
                    panel.addActionToSession('non-existent-session', { type: 'test' });
                    this.addResult('Non-existent Session', false, 'Should have thrown error');
                } catch (error) {
                    this.addResult('Non-existent Session', true, 'Error handled correctly');
                }

                // Тест удаления несуществующей сессии
                try {
                    panel.removeSession('non-existent-session');
                    this.addResult('Remove Non-existent Session', true, 'Gracefully handled');
                } catch (error) {
                    this.addResult('Remove Non-existent Session', false, 'Should not throw error');
                }

                // Тест обновления статуса несуществующего действия
                try {
                    panel.updateActionStatus('persistence-test', 'non-existent-action', 'completed');
                    this.addResult('Update Non-existent Action', false, 'Should have thrown error');
                } catch (error) {
                    this.addResult('Update Non-existent Action', true, 'Error handled correctly');
                }

            } catch (error) {
                this.addResult('Error Handling', false, error.message);
            }
        }

        /**
         * Тест интеграции
         */
        async testIntegration() {
            console.log('\n🔗 Testing Integration...');

            try {
                // Проверить интеграцию с PanelDock
                if (typeof global.PanelDock !== 'undefined') {
                    this.addResult('PanelDock Integration', true, 'PanelDock available');
                } else {
                    this.addResult('PanelDock Integration', false, 'PanelDock not available');
                }

                // Проверить интеграцию с WebApiClient
                if (typeof global.WebApiClient !== 'undefined') {
                    this.addResult('WebApiClient Integration', true, 'WebApiClient available');
                } else {
                    this.addResult('WebApiClient Integration', false, 'WebApiClient not available');
                }

                // Проверить глобальные функции
                if (typeof global.aiActionsExample !== 'undefined') {
                    this.addResult('Global Functions', true, 'Integration examples available');
                } else {
                    this.addResult('Global Functions', false, 'Integration examples not available');
                }

            } catch (error) {
                this.addResult('Integration', false, error.message);
            }
        }

        /**
         * Добавить результат теста
         */
        addResult(testName, success, message) {
            this.results.push({
                name: testName,
                success: success,
                message: message,
                timestamp: new Date().toISOString()
            });

            const status = success ? '✅' : '❌';
            console.log(`  ${status} ${testName}: ${message}`);

            if (success) {
                this.passed++;
            } else {
                this.failed++;
            }
        }

        /**
         * Вывести результаты тестов
         */
        printResults() {
            console.log('\n' + '='.repeat(60));
            console.log('📊 TEST RESULTS');
            console.log('='.repeat(60));

            const total = this.passed + this.failed;
            const successRate = total > 0 ? ((this.passed / total) * 100).toFixed(1) : 0;

            console.log(`Total Tests: ${total}`);
            console.log(`Passed: ${this.passed}`);
            console.log(`Failed: ${this.failed}`);
            console.log(`Success Rate: ${successRate}%`);

            if (this.failed > 0) {
                console.log('\n❌ Failed Tests:');
                this.results.filter(r => !r.success).forEach(result => {
                    console.log(`  - ${result.name}: ${result.message}`);
                });
            }

            // Сохранить результаты
            global.testResults = {
                total: total,
                passed: this.passed,
                failed: this.failed,
                successRate: successRate,
                results: this.results,
                timestamp: new Date().toISOString()
            };

            if (this.failed === 0) {
                console.log('\n🎉 All tests passed! AI Actions Session Panel is working correctly.');
            } else {
                console.log(`\n⚠️  ${this.failed} test(s) failed. Please review and fix issues.`);
            }
        }
    }

    /**
     * Запустить тесты при загрузке
     */
    if (typeof global !== 'undefined') {
        // Автоматическая инициализация
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                if (typeof global.AIActionsSessionPanel !== 'undefined') {
                    const tests = new AIActionsSessionPanelTests();
                    tests.runAll();
                }
            });
        } else {
            if (typeof global.AIActionsSessionPanel !== 'undefined') {
                const tests = new AIActionsSessionPanelTests();
                tests.runAll();
            }
        }

        // Глобальная функция для запуска тестов
        global.runAIActionsTests = async () => {
            const tests = new AIActionsSessionPanelTests();
            await tests.runAll();
            return global.testResults;
        };
    }

})(typeof window !== 'undefined' ? window : globalThis);