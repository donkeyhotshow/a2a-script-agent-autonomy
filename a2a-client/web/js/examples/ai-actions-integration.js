/**
 * Пример интеграции AI Actions Session Panel
 * 
 * Этот файл демонстрирует, как интегрировать сессионную панель AI actions
 * в существующий веб-интерфейс.
 */

(function (global) {
    'use strict';

    /**
     * AI Actions Integration Example
     */
    class AIActionsIntegrationExample {
        constructor() {
            this.panel = null;
            this.zonesContainer = null;
            this.isInitialized = false;
        }

        /**
         * Инициализация интеграции
         */
        async init() {
            try {
                // Дождаться загрузки всех зависимостей
                await this.waitForDependencies();
                
                // Создать контейнер для зон
                this.createZonesContainer();
                
                // Создать и инициализировать панель
                this.createPanel();
                
                // Настроить обработчики событий
                this.setupEventHandlers();
                
                // Создать примеры сессий
                this.createExampleSessions();
                
                this.isInitialized = true;
                console.log('✅ AI Actions Integration initialized');
                
            } catch (error) {
                console.error('❌ AI Actions Integration failed:', error);
            }
        }

        /**
         * Дождаться загрузки всех зависимостей
         */
        async waitForDependencies() {
            return new Promise((resolve, reject) => {
                const checkDependencies = () => {
                    if (typeof global.AIActionsSessionPanel === 'undefined') {
                        console.log('⏳ Waiting for AIActionsSessionPanel...');
                        setTimeout(checkDependencies, 100);
                        return;
                    }
                    
                    if (typeof global.PanelDock === 'undefined') {
                        console.log('⏳ Waiting for PanelDock...');
                        setTimeout(checkDependencies, 100);
                        return;
                    }
                    
                    if (typeof global.createAIActionsPanelDOM === 'undefined') {
                        console.log('⏳ Waiting for createAIActionsPanelDOM...');
                        setTimeout(checkDependencies, 100);
                        return;
                    }
                    
                    resolve();
                };
                
                checkDependencies();
            });
        }

        /**
         * Создать контейнер для зон
         */
        createZonesContainer() {
            // Проверяем, есть ли уже контейнер
            let container = document.getElementById('puiDockZones');
            if (!container) {
                container = global.createDockContainerDOM();
                document.body.appendChild(container);
            }
            
            this.zonesContainer = container;
        }

        /**
         * Создать панель
         */
        createPanel() {
            // Создаем DOM элемент панели
            const panelDOM = global.createAIActionsPanelDOM({
                id: 'ai-actions-session-panel',
                title: 'AI Actions Sessions',
                slot: 'right',
                critical: false
            });

            // Добавляем в DOM
            document.body.appendChild(panelDOM);

            // Создаем экземпляр панели
            this.panel = new global.AIActionsSessionPanel(panelDOM, {
                id: 'ai-actions-session-panel',
                slot: 'right',
                critical: false,
                onClose: (panel) => {
                    console.log('Panel closed:', panel.id);
                },
                onStateChange: (state) => {
                    console.log('Panel state changed:', state);
                },
                zonesContainer: this.zonesContainer
            });

            // Делаем панель доступной глобально для отладки
            global.aiActionsPanel = this.panel;
        }

        /**
         * Настроить обработчики событий
         */
        setupEventHandlers() {
            // Обработка событий от веб-клиента
            if (typeof global.WebApiClient !== 'undefined') {
                this.setupWebApiClientEvents();
            }

            // Обработка событий от сессий
            this.setupSessionEvents();

            // Обработка событий от AI actions
            this.setupAIActionsEvents();
        }

        /**
         * Настроить обработчики событий веб-клиента
         */
        setupWebApiClientEvents() {
            // Пример: обработка новых сессий
            document.addEventListener('session-created', (event) => {
                const { sessionId, sessionData } = event.detail;
                this.handleNewSession(sessionId, sessionData);
            });

            // Пример: обработка новых действий
            document.addEventListener('action-added', (event) => {
                const { sessionId, action } = event.detail;
                this.handleNewAction(sessionId, action);
            });
        }

        /**
         * Настроить обработчики событий сессий
         */
        setupSessionEvents() {
            // Пример: переключение сессий
            document.addEventListener('session-switch', (event) => {
                const { sessionId } = event.detail;
                this.panel.switchToSession(sessionId);
            });

            // Пример: обновление статуса сессии
            document.addEventListener('session-status-update', (event) => {
                const { sessionId, status } = event.detail;
                this.panel.updateSessionStatus(sessionId, status);
            });
        }

        /**
         * Настроить обработчики событий AI actions
         */
        setupAIActionsEvents() {
            // Пример: обработка новых AI actions
            document.addEventListener('ai-action-executed', (event) => {
                const { sessionId, action, result } = event.detail;
                this.handleAIActionExecuted(sessionId, action, result);
            });

            // Пример: обработка ошибок AI actions
            document.addEventListener('ai-action-error', (event) => {
                const { sessionId, action, error } = event.detail;
                this.handleAIActionError(sessionId, action, error);
            });
        }

        /**
         * Обработка новой сессии
         */
        handleNewSession(sessionId, sessionData) {
            console.log('New session created:', sessionId);
            
            // Создаем сессию в панели
            this.panel.createSession(sessionId);
            
            // Добавляем начальное действие
            this.panel.addActionToSession(sessionId, {
                type: 'message',
                content: 'Session started',
                status: 'completed'
            });
        }

        /**
         * Обработка нового действия
         */
        handleNewAction(sessionId, action) {
            console.log('New action in session:', sessionId, action);
            this.panel.addActionToSession(sessionId, action);
        }

        /**
         * Обработка выполненного AI action
         */
        handleAIActionExecuted(sessionId, action, result) {
            console.log('AI action executed:', sessionId, action, result);
            
            // Добавляем действие в сессию
            this.panel.addActionToSession(sessionId, {
                ...action,
                result: result,
                status: 'completed'
            });
        }

        /**
         * Обработка ошибки AI action
         */
        handleAIActionError(sessionId, action, error) {
            console.error('AI action error:', sessionId, action, error);
            
            // Добавляем действие с ошибкой
            this.panel.addActionToSession(sessionId, {
                ...action,
                error: error,
                status: 'failed'
            });
        }

        /**
         * Создать примеры сессий
         */
        createExampleSessions() {
            // Создаем несколько примеров сессий
            const session1 = this.panel.createSession('example-session-1');
            const session2 = this.panel.createSession('example-session-2');

            // Добавляем примеры действий в первую сессию
            this.panel.addActionToSession(session1, {
                type: 'form',
                title: 'Choose action',
                choices: [
                    { id: 'option1', label: 'Option 1' },
                    { id: 'option2', label: 'Option 2' }
                ],
                status: 'completed'
            });

            this.panel.addActionToSession(session1, {
                type: 'message',
                content: 'Processing user choice...',
                status: 'completed'
            });

            this.panel.addActionToSession(session1, {
                type: 'script',
                input: { data: 'test' },
                output: 'Script executed successfully',
                code: 'console.log("Hello World");',
                status: 'completed'
            });

            // Добавляем примеры действий во вторую сессию
            this.panel.addActionToSession(session2, {
                type: 'rag-search',
                query: 'How to use AI actions?',
                results: [
                    { title: 'Documentation', content: '...' },
                    { title: 'Examples', content: '...' }
                ],
                status: 'completed'
            });

            this.panel.addActionToSession(session2, {
                type: 'read-file',
                path: '/path/to/file.txt',
                content: 'File content here...',
                status: 'completed'
            });

            this.panel.addActionToSession(session2, {
                type: 'execute-command',
                command: 'npm install',
                output: 'Dependencies installed successfully',
                error: null,
                status: 'completed'
            });

            console.log('✅ Example sessions created');
        }

        /**
         * Пример использования API панели
         */
        demonstrateAPI() {
            if (!this.panel) return;

            console.log('=== AI Actions Panel API Demo ===');

            // Получить все сессии
            const allSessions = this.panel.getAllSessions();
            console.log('All sessions:', allSessions);

            // Получить текущую сессию
            const currentSession = this.panel.getCurrentSession();
            console.log('Current session:', currentSession);

            // Создать новую сессию
            const newSessionId = this.panel.createSession();
            console.log('New session created:', newSessionId);

            // Переключиться на сессию
            this.panel.switchToSession(newSessionId);

            // Добавить действие
            this.panel.addActionToSession(newSessionId, {
                type: 'message',
                content: 'Hello from API demo!',
                status: 'completed'
            });

            // Обновить статус сессии
            this.panel.updateSessionStatus(newSessionId, 'completed');

            // Экспортировать сессию
            this.panel.exportSession(newSessionId);

            console.log('=== API Demo Complete ===');
        }

        /**
         * Пример обработки различных типов AI actions
         */
        demonstrateActionTypes() {
            if (!this.panel) return;

            const currentSession = this.panel.getCurrentSession();
            if (!currentSession) return;

            const sessionId = currentSession.id;

            // Пример form action
            this.panel.addActionToSession(sessionId, {
                type: 'form',
                title: 'Select options',
                choices: [
                    { id: 'start', label: 'Start Process' },
                    { id: 'stop', label: 'Stop Process' },
                    { id: 'pause', label: 'Pause Process' }
                ],
                input: 'user input here',
                status: 'completed'
            });

            // Пример message action
            this.panel.addActionToSession(sessionId, {
                type: 'message',
                content: 'Process started successfully',
                status: 'completed'
            });

            // Пример script action
            this.panel.addActionToSession(sessionId, {
                type: 'script',
                input: { parameters: ['param1', 'param2'] },
                output: 'Script executed with parameters',
                code: 'function process(params) { return "Processed: " + params.join(", "); }',
                status: 'completed'
            });

            // Пример rag-search action
            this.panel.addActionToSession(sessionId, {
                type: 'rag-search',
                query: 'Find documentation about AI actions',
                results: [
                    { title: 'AI Actions Guide', content: 'Complete guide to using AI actions' },
                    { title: 'API Reference', content: 'Detailed API documentation' }
                ],
                status: 'completed'
            });

            // Пример read-file action
            this.panel.addActionToSession(sessionId, {
                type: 'read-file',
                path: '/docs/ai-actions.md',
                content: '# AI Actions Documentation\n\nThis is the content of the file...',
                status: 'completed'
            });

            // Пример write-file action
            this.panel.addActionToSession(sessionId, {
                type: 'write-file',
                path: '/output/results.txt',
                content: 'Results of AI action processing',
                status: 'completed'
            });

            // Пример execute-command action
            this.panel.addActionToSession(sessionId, {
                type: 'execute-command',
                command: 'git status',
                output: 'On branch main\nYour branch is up to date with origin/main.\n\nnothing to commit, working tree clean',
                error: null,
                status: 'completed'
            });

            console.log('✅ Demonstrated all AI action types');
        }

        /**
         * Очистить все сессии
         */
        clearAllSessions() {
            if (!this.panel) return;

            const sessions = this.panel.getAllSessions();
            sessions.forEach(session => {
                this.panel.removeSession(session.id);
            });

            console.log('✅ All sessions cleared');
        }

        /**
         * Уничтожить интеграцию
         */
        destroy() {
            if (this.panel) {
                this.panel.destroy();
                this.panel = null;
            }

            if (this.zonesContainer) {
                this.zonesContainer.remove();
                this.zonesContainer = null;
            }

            this.isInitialized = false;
            console.log('❌ AI Actions Integration destroyed');
        }
    }

    /**
     * Глобальные функции для отладки и тестирования
     */
    global.aiActionsExample = {
        init: async () => {
            const example = new AIActionsIntegrationExample();
            await example.init();
            return example;
        },

        demonstrateAPI: () => {
            if (global.aiActionsPanel) {
                global.aiActionsPanel.demonstrateAPI();
            }
        },

        demonstrateActionTypes: () => {
            if (global.aiActionsPanel) {
                global.aiActionsPanel.demonstrateActionTypes();
            }
        },

        clearSessions: () => {
            if (global.aiActionsPanel) {
                global.aiActionsPanel.clearAllSessions();
            }
        },

        createExample: () => {
            if (global.aiActionsPanel) {
                global.aiActionsPanel.createExampleSessions();
            }
        }
    };

    // Автоматическая инициализация при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof global.AIActionsSessionPanel !== 'undefined') {
                global.aiActionsExample.init();
            }
        });
    } else {
        if (typeof global.AIActionsSessionPanel !== 'undefined') {
            global.aiActionsExample.init();
        }
    }

})(typeof window !== 'undefined' ? window : globalThis);