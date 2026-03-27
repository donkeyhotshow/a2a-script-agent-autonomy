/**
 * Client Action Runner - Выполнение client-only actions в браузере
 * 
 * Обрабатывает actions, которые были переданы через web-execute-dto:
 * - script: выполнение JavaScript кода в sandbox (Web Worker)
 * - execute-command: выполнение команд (ограниченный набор)
 * - run-script: запуск предопределенных скриптов
 * - rag-search: поиск по базе знаний (имитация)
 * 
 * Безопасность:
 * - Script выполняется в Web Worker с изоляцией
 * - Команды ограничены безопасным набором
 * - Предопределенные скрипты имеют белый список
 */

(function (global) {
    'use strict';

    // Белый список разрешенных команд (только чтение, keine опасные операции)
    const ALLOWED_COMMANDS = new Set([
        'echo',
        'pwd',
        'ls',
        'date',
        'whoami',
        'uptime',
        'cat', // только для чтения файлов
        'head',
        'tail',
        'wc',
    ]);

    // Предопределенные скрипты (белый список)
    const PREDEFINED_SCRIPTS = {
        'list-files': {
            name: 'List Files',
            description: 'Показать список файлов в текущей директории',
            code: `() => {
                return {
                    type: 'result',
                    results: [' Файлы доступны через list-directory action']
                };
            }`
        },
        'system-info': {
            name: 'System Info',
            description: 'Информация о системе',
            code: `() => {
                return {
                    type: 'result',
                    results: [{
                        platform: navigator.platform,
                        userAgent: navigator.userAgent,
                        language: navigator.language
                    }]
                };
            }`
        },
        'test-api': {
            name: 'Test API',
            description: 'Проверить доступность API',
            code: `() => {
                return fetch('/api/a2a/projects', { method: 'GET' })
                    .then(r => r.json())
                    .then(d => ({ type: 'result', results: [{ status: 'ok', data: d }] }))
                    .catch(e => ({ type: 'error', error: e.message }));
            }`
        }
    };

    /**
     * Выполнение скрипта в Web Worker (sandbox)
     * @param {string} code - JavaScript код
     * @param {Object} input - входные данные
     * @returns {Promise<Object>} результат выполнения
     */
    async function executeScript(code, input = {}) {
        return new Promise((resolve, reject) => {
            try {
                // Создаем blob с кодом скрипта
                const workerCode = `
                    self.onmessage = function(e) {
                        try {
                            const input = e.data.input || {};
                            const result = eval('(' + e.data.code + ')')(input);
                            self.postMessage({ success: true, result: result });
                        } catch (err) {
                            self.postMessage({ success: false, error: err.message });
                        }
                    };
                `;
                
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);
                const worker = new Worker(workerUrl);

                const timeout = setTimeout(() => {
                    worker.terminate();
                    reject(new Error('Script execution timeout (30s)'));
                }, 30000);

                worker.onmessage = function(e) {
                    clearTimeout(timeout);
                    URL.revokeObjectURL(workerUrl);
                    worker.terminate();
                    
                    if (e.data.success) {
                        resolve(e.data.result);
                    } else {
                        reject(new Error(e.data.error || 'Script execution failed'));
                    }
                };

                worker.onerror = function(err) {
                    clearTimeout(timeout);
                    URL.revokeObjectURL(workerUrl);
                    worker.terminate();
                    reject(new Error('Worker error: ' + err.message));
                };

                worker.postMessage({ code, input });

            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Выполнение команды (ограниченный набор)
     * @param {string} command - команда для выполнения
     * @returns {Promise<Object>} результат
     */
    async function executeCommand(command) {
        // Проверка безопасности - только разрешенные команды
        const cmdParts = command.trim().split(/\s+/);
        const baseCmd = cmdParts[0].toLowerCase();
        
        if (!ALLOWED_COMMANDS.has(baseCmd)) {
            return {
                type: 'error',
                error: `Command not allowed: ${baseCmd}. Allowed: ${[...ALLOWED_COMMANDS].join(', ')}`
            };
        }

        // Имитация выполнения команды (реальное выполнение требует backend)
        // В реальном сценарии это будет вызов API
        const result = {
            type: 'result',
            command: command,
            output: `[Client-side simulation] Would execute: ${command}`,
            note: 'Command execution requires server-side implementation'
        };

        return result;
    }

    /**
     * Выполнение предопределенного скрипта
     * @param {string} scriptId - ID скрипта
     * @returns {Promise<Object>} результат
     */
    async function executeRunScript(scriptId) {
        const script = PREDEFINED_SCRIPTS[scriptId];
        
        if (!script) {
            return {
                type: 'error',
                error: `Unknown script: ${scriptId}. Available: ${Object.keys(PREDEFINED_SCRIPTS).join(', ')}`
            };
        }

        try {
            // Создаем функцию из кода
            const fn = new Function('return ' + script.code)();
            const result = await fn();
            return {
                type: 'result',
                script: scriptId,
                scriptName: script.name,
                ...result
            };
        } catch (err) {
            return {
                type: 'error',
                error: `Script execution failed: ${err.message}`
            };
        }
    }

    /**
     * Выполнение RAG поиска (имитация)
     * @param {string} query - поисковый запрос
     * @returns {Promise<Object>} результат
     */
    async function executeRagSearch(query) {
        if (!query || typeof query !== 'string') {
            return {
                type: 'error',
                error: 'Invalid query'
            };
        }

        // Имитация RAG поиска
        // В реальном сценарии используется API для поиска по базе знаний
        return {
            type: 'result',
            query: query,
            results: [
                {
                    title: 'RAG Search Result (simulated)',
                    content: `Results for query: "${query}"`,
                    score: 0.95
                }
            ],
            note: 'RAG search requires server-side implementation with vector database'
        };
    }

    /**
     * Основной метод выполнения action на основе типа
     * @param {string} actionType - тип action ('script', 'execute-command', 'run-script', 'rag-search')
     * @param {Object} params - параметры action
     * @returns {Promise<Object>} результат выполнения
     */
    async function executeClientAction(actionType, params = {}) {
        console.log('[ClientActionRunner] Executing:', actionType, params);
        
        switch (actionType) {
            case 'script':
                return executeScript(params.code, params.input);
            
            case 'execute-command':
                return executeCommand(params.command);
            
            case 'run-script':
                return executeRunScript(params.scriptId);
            
            case 'rag-search':
                return executeRagSearch(params.query);
            
            default:
                return {
                    type: 'error',
                    error: `Unknown action type: ${actionType}`
                };
        }
    }

    /**
     * Проверка возможности выполнения action
     * @param {string} actionType - тип action
     * @returns {boolean} можно ли выполнить
     */
    function canExecute(actionType) {
        return ['script', 'execute-command', 'run-script', 'rag-search'].includes(actionType);
    }

    // Экспорт модуля
    const ClientActionRunner = {
        executeClientAction,
        canExecute,
        executeScript,
        executeCommand,
        executeRunScript,
        executeRagSearch,
        PREDEFINED_SCRIPTS,
        ALLOWED_COMMANDS
    };

    if (typeof window !== 'undefined') {
        window.ClientActionRunner = ClientActionRunner;
    }
    global.ClientActionRunner = ClientActionRunner;

})(typeof window !== 'undefined' ? window : globalThis);