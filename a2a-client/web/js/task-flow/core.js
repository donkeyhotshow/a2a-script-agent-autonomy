/**
 * TaskFlow Core Module
 * Основной объект TaskFlow для управления потоком задач
 * 
 * Этот файл является оберткой над функциональными модулями:
 * - utils.js - утилиты
 * - loader.js - логика лоадера
 * - tasks.js - выполнение задач
 * - messages.js - отправка сообщений
 * - init.js - инициализация
 */

(function (global) {
    'use strict';

    // Get module references (loaded from other files)
    // These are set when the modules are loaded
    
    /**
     * Основной объект TaskFlow
     * Делегирует функции в соответствующие модули
     */
    const TaskFlow = {
        panelId: null,
        panel: null,
        fixed: false,
        _sessionId: null,
        _projectId: null,
        _lastResponse: null,

        /**
         * Инициализация
         * Task entry is via the header "+" button which now creates an empty session (handled by AppTask).
         */
        init() {
            const TaskFlowInit = global.TaskFlowInit;
            const sel = document.getElementById('projectSelect');
            if (sel) {
                this._ensureProjectSelect();
                this._restoreProjectSelection();
            }
            this._setupPanelAutoOpen();
            this._setupLoaderListener();
        },

        /**
         * Setup loader event listener
         */
        _setupLoaderListener(sessionId = null) {
            const TaskFlowLoader = global.TaskFlowLoader;
            if (TaskFlowLoader?.setupLoaderListener) {
                TaskFlowLoader.setupLoaderListener(this, sessionId);
            }
        },

        /**
         * Show loader immediately
         */
        _showLoader(sessionId = null) {
            const TaskFlowLoader = global.TaskFlowLoader;
            if (TaskFlowLoader?.showLoader) {
                TaskFlowLoader.showLoader(this, sessionId);
            }
        },

        /**
         * Hide loader
         */
        _hideLoader(sessionId = null) {
            const TaskFlowLoader = global.TaskFlowLoader;
            if (TaskFlowLoader?.hideLoader) {
                TaskFlowLoader.hideLoader(this, sessionId);
            }
        },

        /**
         * Update loader UI based on loader state
         */
        _updateLoaderUI(data) {
            const TaskFlowLoader = global.TaskFlowLoader;
            if (TaskFlowLoader?.updateLoaderUI) {
                TaskFlowLoader.updateLoaderUI(this, data);
            }
        },

        /**
         * Убедиться что есть выбор проекта
         */
        async _ensureProjectSelect() {
            const TaskFlowInit = global.TaskFlowInit;
            if (TaskFlowInit?.ensureProjectSelect) {
                await TaskFlowInit.ensureProjectSelect(this);
            }
        },

        /**
         * Восстановить выбор проекта
         */
        _restoreProjectSelection() {
            const TaskFlowInit = global.TaskFlowInit;
            if (TaskFlowInit?.restoreProjectSelection) {
                TaskFlowInit.restoreProjectSelection(this);
            }
        },

        /**
         * Запустить задачу
         * @param {string} task - текст задачи
         * @param {string} projectId - ID проекта
         */
        async run(task, projectId) {
            const TaskFlowTasks = global.TaskFlowTasks;
            if (TaskFlowTasks?.run) {
                await TaskFlowTasks.run(this, task, projectId);
            }
        },

        /**
         * Выполнить запуск задачи
         * @param {string} task - текст задачи
         * @param {string} projectId - ID проекта
         * @param {HTMLElement} contentEl - элемент контента
         */
        async _doRun(task, projectId, contentEl) {
            const TaskFlowTasks = global.TaskFlowTasks;
            if (TaskFlowTasks?.doRun) {
                await TaskFlowTasks.doRun(this, task, projectId, contentEl);
            }
        },

        /**
         * Отправить выбор
         * @param {string} choiceId - ID выбора
         * @param {HTMLElement} contentEl - элемент контента
         */
        async sendChoice(choiceId, contentEl) {
            const TaskFlowMessages = global.TaskFlowMessages;
            if (TaskFlowMessages?.sendChoice) {
                await TaskFlowMessages.sendChoice(this, choiceId, contentEl);
            }
        },

        /**
         * Отправить результат сообщения
         * @param {string} messageText - текст сообщения
         * @param {HTMLElement} contentEl - элемент контента
         */
        async sendMessageResult(messageText, contentEl) {
            const TaskFlowMessages = global.TaskFlowMessages;
            if (TaskFlowMessages?.sendMessageResult) {
                await TaskFlowMessages.sendMessageResult(this, messageText, contentEl);
            }
        },

        /**
         * Настроить автоматическое открытие панели
         */
        _setupPanelAutoOpen() {
            const TaskFlowInit = global.TaskFlowInit;
            if (TaskFlowInit?.setupPanelAutoOpen) {
                TaskFlowInit.setupPanelAutoOpen(this);
            }
        }
    };

    // Export
    global.TaskFlow = TaskFlow;
    global.getProjectId = global.getProjectId;
    global.waitForFirstResponse = global.waitForFirstResponse;
    global.applyExecuteResponse = global.applyExecuteResponse;

})(typeof window !== 'undefined' ? window : global);
