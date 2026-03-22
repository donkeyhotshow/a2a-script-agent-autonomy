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
            const sel = document.getElementById('projectSelect');
            if (sel) {
                this._ensureProjectSelect();
                this._restoreProjectSelection();
            }
            this._setupPanelAutoOpen();
            this._setupLoaderListener();
        },
        
        _setupLoaderListener(sessionId = null) {
            global.TaskFlowLoader.setupLoaderListener(this, sessionId);
        },
        
        _showLoader(sessionId = null) {
            global.TaskFlowLoader.showLoader(this, sessionId);
        },
        
        _hideLoader(sessionId = null) {
            global.TaskFlowLoader.hideLoader(this, sessionId);
        },
        
        _updateLoaderUI(data) {
            global.TaskFlowLoader.updateLoaderUI(this, data);
        },
        
        async _ensureProjectSelect() {
            await global.TaskFlowInit.ensureProjectSelect(this);
        },
        
        _restoreProjectSelection() {
            global.TaskFlowInit.restoreProjectSelection(this);
        },
        
        async run(task, projectId) {
            await global.TaskFlowTasks.run(this, task, projectId);
        },
        
        async _doRun(task, projectId, contentEl) {
            await global.TaskFlowTasks.doRun(this, task, projectId, contentEl);
        },
        
        async sendChoice(choiceId, contentEl) {
            await global.TaskFlowMessages.sendChoice(this, choiceId, contentEl);
        },
        
        async sendMessageResult(messageText, contentEl) {
            await global.TaskFlowMessages.sendMessageResult(this, messageText, contentEl);
        },
        
        _setupPanelAutoOpen() {
            global.TaskFlowInit.setupPanelAutoOpen(this);
        }
    };
    
    // Export
    global.TaskFlow = TaskFlow;
    
    // Auto-initialize when DOM is ready
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', function() {
            const tryInit = () => {
                if (global.TaskFlow && typeof global.TaskFlow.init === 'function') {
                    global.TaskFlow.init();
                } else {
                    requestAnimationFrame(tryInit);
                }
            };
            requestAnimationFrame(tryInit);
        });
    }
    
})(typeof window !== 'undefined' ? window : globalThis);
