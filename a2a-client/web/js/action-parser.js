/**
 * ActionParser - Парсинг параметров действий из execute объекта
 * 
 * Извлекает и нормализует параметры действий из ответа сервера:
 * - Формы (form)
 * - Сообщения (message)
 * - Скрипты (script)
 * - Выборы (choices)
 * 
 * Используется в action-executor.js для подготовки данных перед выполнением
 */

(function (global) {
    'use strict';

    /**
     * Парсит форму из execute объекта
     * @param {Object} execute - объект выполнения от сервера
     * @returns {Object|null} нормализованная форма или null
     */
    function parseForm(execute) {
        if (!execute || !execute.form) {
            return null;
        }
        
        const form = execute.form;
        return {
            id: form.id || 'form_' + Date.now(),
            title: form.title || form.heading || '',
            description: form.description || form.subheading || '',
            input: form.input || null,
            choices: parseChoices(form.choices),
            submitLabel: form.submitLabel || form.submit || 'Submit',
            cancelLabel: form.cancelLabel || 'Cancel',
            metadata: form.metadata || {}
        };
    }

    /**
     * Парсит выборы из формы
     * @param {Array} choices - массив выборов
     * @returns {Array} нормализованные выборы
     */
    function parseChoices(choices) {
        if (!choices || !Array.isArray(choices)) {
            return [];
        }
        
        return choices.map((choice, index) => {
            if (typeof choice === 'string') {
                return {
                    id: 'choice_' + index,
                    label: choice,
                    value: choice
                };
            }
            
            if (typeof choice === 'object') {
                return {
                    id: choice.id || choice.value || 'choice_' + index,
                    label: choice.label || choice.text || choice.value || String(choice),
                    value: choice.value || choice.id || choice.label || String(choice),
                    description: choice.description || '',
                    icon: choice.icon || null,
                    metadata: choice.metadata || {}
                };
            }
            
            return {
                id: 'choice_' + index,
                label: String(choice),
                value: String(choice)
            };
        });
    }

    /**
     * Парсит сообщение из execute объекта
     * @param {Object} execute - объект выполнения от сервера
     * @returns {Object|null} нормализованное сообщение или null
     */
    function parseMessage(execute) {
        if (!execute || !execute.message) {
            return null;
        }
        
        const msg = execute.message;
        return {
            id: msg.id || 'msg_' + Date.now(),
            content: msg.content || msg.text || String(msg),
            type: msg.type || 'text',
            role: msg.role || 'assistant',
            timestamp: msg.timestamp || Date.now(),
            metadata: msg.metadata || {}
        };
    }

    /**
     * Парсит скрипт из execute объекта
     * @param {Object} execute - объект выполнения от сервера
     * @returns {Object|null} нормализованный скрипт или null
     */
    function parseScript(execute) {
        if (!execute || !execute.script) {
            return null;
        }
        
        const script = execute.script;
        return {
            id: script.id || 'script_' + Date.now(),
            code: script.code || script.script || '',
            language: script.language || script.lang || 'javascript',
            input: script.input || null,
            output: script.output || null,
            runLabel: script.runLabel || script.run || 'Run',
            stopLabel: script.stopLabel || script.stop || 'Stop',
            metadata: script.metadata || {}
        };
    }

    /**
     * Парсит команду выполнения из execute объекта
     * @param {Object} execute - объект выполнения от сервера
     * @returns {Object|null} нормализованная команда или null
     */
    function parseCommand(execute) {
        if (!execute || !execute['execute-command']) {
            return null;
        }
        
        const cmd = execute['execute-command'];
        return {
            id: cmd.id || 'cmd_' + Date.now(),
            command: cmd.command || cmd.cmd || '',
            workingDir: cmd.workingDir || cmd.cwd || null,
            env: cmd.env || {},
            timeout: cmd.timeout || 30000,
            metadata: cmd.metadata || {}
        };
    }

    /**
     * Парсит wait состояние из execute объекта
     * @param {Object} execute - объект выполнения от сервера
     * @returns {Object|null} нормализованное wait состояние или null
     */
    function parseWait(execute) {
        if (!execute || !execute.wait) {
            return null;
        }
        
        const wait = execute.wait;
        if (typeof wait === 'boolean') {
            return wait ? { message: 'Processing...', progress: null } : null;
        }
        
        if (typeof wait === 'string') {
            return { message: wait, progress: null };
        }
        
        if (typeof wait === 'object') {
            return {
                message: wait.message || wait.msg || 'Processing...',
                progress: wait.progress || wait.percent || null,
                total: wait.total || null,
                current: wait.current || null,
                metadata: wait.metadata || {}
            };
        }
        
        return null;
    }

    /**
     * Парсит full объект execute и возвращает все извлеченные компоненты
     * @param {Object} execute - объект выполнения от сервера
     * @returns {Object} объект с всеми извлеченными компонентами
     */
    function parseExecute(execute) {
        if (!execute) {
            return {
                form: null,
                message: null,
                script: null,
                command: null,
                wait: null,
                raw: null
            };
        }
        
        return {
            form: parseForm(execute),
            message: parseMessage(execute),
            script: parseScript(execute),
            command: parseCommand(execute),
            wait: parseWait(execute),
            raw: execute
        };
    }

    /**
     * Парсит результат от сервера (response)
     * @param {Object} response - ответ от сервера
     * @returns {Object} нормализованный результат
     */
    function parseResponse(response) {
        if (!response) {
            return {
                execute: null,
                context: null,
                promiseId: null,
                asyncPending: false,
                session: null,
                error: null
            };
        }
        
        return {
            execute: response.execute ? parseExecute(response.execute) : null,
            context: response.context || null,
            promiseId: response.promiseId || null,
            asyncPending: !!(response.asyncPending || response.promiseId),
            session: response.session || null,
            error: response.error || null,
            sync: response.sync || false,
            loader: response.loader || null
        };
    }

    /**
     * Парсит результат (result) от пользователя
     * @param {Object} result - результат от пользователя
     * @returns {Object} нормализованный результат
     */
    function parseResult(result) {
        if (!result) {
            return {
                message: null,
                choice: null,
                form: null,
                raw: null
            };
        }
        
        return {
            message: result.message ? String(result.message) : null,
            choice: result.choice || result.choiceId || null,
            form: result.form || null,
            raw: result
        };
    }

    // Экспорт модуля
    const ActionParser = {
        parseForm,
        parseChoices,
        parseMessage,
        parseScript,
        parseCommand,
        parseWait,
        parseExecute,
        parseResponse,
        parseResult
    };

    if (typeof window !== 'undefined') {
        window.ActionParser = ActionParser;
    }
    global.ActionParser = ActionParser;

})(typeof window !== 'undefined' ? window : globalThis);
