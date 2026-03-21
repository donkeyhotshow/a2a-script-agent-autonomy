/**
 * TaskFlow - Main Entry Point
 * Объединяет все модули TaskFlow в единый объект
 */

(function (global) {
    'use strict';

    /**
     * Единый объект TaskFlow
     * Объединяет функциональность из init, loader, tasks, messages
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

        _setupLoaderListener(sessionId = null) {
            const TaskFlowLoader = global.TaskFlowLoader;
            if (TaskFlowLoader?.setupLoaderListener) {
                TaskFlowLoader.setupLoaderListener(this, sessionId);
            }
        },

        _showLoader(sessionId = null) {
            const TaskFlowLoader = global.TaskFlowLoader;
            if (TaskFlowLoader?.showLoader) {
                TaskFlowLoader.showLoader(this, sessionId);
            }
        },

        _hideLoader(sessionId = null) {
            const TaskFlowLoader = global.TaskFlowLoader;
            if (TaskFlowLoader?.hideLoader) {
                TaskFlowLoader.hideLoader(this, sessionId);
            }
        },

        _updateLoaderUI(data) {
            const TaskFlowLoader = global.TaskFlowLoader;
            if (TaskFlowLoader?.updateLoaderUI) {
                TaskFlowLoader.updateLoaderUI(this, data);
            }
        },

        async _ensureProjectSelect() {
            const TaskFlowInit = global.TaskFlowInit;
            if (TaskFlowInit?.ensureProjectSelect) {
                await TaskFlowInit.ensureProjectSelect(this);
            }
        },

        _restoreProjectSelection() {
            const TaskFlowInit = global.TaskFlowInit;
            if (TaskFlowInit?.restoreProjectSelection) {
                TaskFlowInit.restoreProjectSelection(this);
            }
        },

        async run(task, projectId) {
            const TaskFlowTasks = global.TaskFlowTasks;
            if (TaskFlowTasks?.run) {
                await TaskFlowTasks.run(this, task, projectId);
            }
        },

        async _doRun(task, projectId, contentEl) {
            const TaskFlowTasks = global.TaskFlowTasks;
            if (TaskFlowTasks?.doRun) {
                await TaskFlowTasks.doRun(this, task, projectId, contentEl);
            }
        },

        async sendChoice(choiceId, contentEl) {
            const TaskFlowMessages = global.TaskFlowMessages;
            if (TaskFlowMessages?.sendChoice) {
                await TaskFlowMessages.sendChoice(this, choiceId, contentEl);
            }
        },

        async sendMessageResult(messageText, contentEl) {
            const TaskFlowMessages = global.TaskFlowMessages;
            if (TaskFlowMessages?.sendMessageResult) {
                await TaskFlowMessages.sendMessageResult(this, messageText, contentEl);
            }
        },

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

    // Auto-initialize when DOM is ready
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', function() {
            const checkAndInit = () => {
                if (global.TaskFlow && typeof global.TaskFlow.init === 'function') {
                    global.TaskFlow.init();
                } else {
                    setTimeout(checkAndInit, 100);
                }
            };
            checkAndInit();
        });
    }

    // Convenience functions
    global.startTask = function(task, projectId) {
        if (global.TaskFlow) {
            global.TaskFlow.run(task, projectId);
        }
    };

    global.sendTaskChoice = function(choiceId) {
        if (global.TaskFlow && global.TaskFlow.panel) {
            const content = global.TaskFlow.panel.getContentEl();
            if (content) {
                global.TaskFlow.sendChoice(choiceId, content);
            }
        }
    };

    global.sendTaskMessage = function(message) {
        if (global.TaskFlow && global.TaskFlow.panel) {
            const content = global.TaskFlow.panel.getContentEl();
            if (content) {
                global.TaskFlow.sendMessageResult(message, content);
            }
        }
    };

})(typeof window !== 'undefined' ? window : globalThis);
