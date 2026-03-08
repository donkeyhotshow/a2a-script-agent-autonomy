/**
 * API Request Module - построение и отправка запросов
 */

(function (global) {
    'use strict';

    /**
     * Добавить методы построения запросов к классу
     * @param {Function} PanelClass - класс AIActionsSessionPanel
     */
    function mixinApiRequest(PanelClass) {

        /**
         * Отправить результат на сервер
         * @private
         * @param {string} sessionId - ID сессии
         * @param {Object} result - Результат для отправки
         */
        PanelClass.prototype._sendResultToServer = async function(sessionId, result) {
            // Clear execute to hide form immediately after sending
            const store = global.SessionStore;
            if (store?.setExecute) store.setExecute(null);
            if (store?.clearPendingForm) store.clearPendingForm();

            try {
                const api = global.apiIntegration;
                const projectId = store?.projectId ?? await (global.ProjectManager?.getSelectedProjectId?.()) ?? null;
                const body = { projectId, sessionId, result };
                const response = api?.sendResult
                    ? await api.sendResult(sessionId, result, projectId)
                    : await this._request('POST', `/sessions/${sessionId}/result`, body);

                if (response?.execute) this.processExecute(response.execute, response.context);
                if (response?.finalResult) this.processExecute({ finalResult: response.finalResult }, response.context);
                if (response?.context?.execution?.status === 'completed') this.updateSessionStatus(sessionId, 'completed');
                this.emit('resultSent', { sessionId, response });
                console.log('[AIActionsSessionPanel] Result sent to server:', result);
            } catch (error) {
                console.error('[AIActionsSessionPanel] Failed to send result to server:', error);
                this.emit('error', error);
            }
        };

        /**
         * Выбрать вариант из формы выбора (execute.form.choices)
         * @param {string} sessionId - ID сессии
         * @param {string} choiceId - ID выбранного варианта
         * @param {HTMLElement} buttonElement - Кнопка (опционально)
         */
        PanelClass.prototype.selectChoice = function(sessionId, choiceId, buttonElement = null) {
            const session = this.sessions.get(sessionId);
            if (!session) {
                console.warn(`[AIActionsSessionPanel] Session ${sessionId} not found`);
                return;
            }

            // Mark button as selected if provided
            if (buttonElement) {
                const allButtons = this.container.querySelectorAll('.choice-button');
                allButtons.forEach(btn => btn.classList.remove('selected'));
                buttonElement.classList.add('selected');
            }

            // Создаем result в формате action-key shape: { choice: "..." }
            // Это соответствует протоколу A2A
            const result = { choice: choiceId };

            // Add action to session
            this.addActionToSession(sessionId, {
                type: 'choice-selection',
                choiceId: choiceId,
                result: result,
                status: 'completed',
                timestamp: new Date().toISOString()
            });

            // Emit event for external handlers (e.g., SessionManager)
            this.emit('choiceSelected', {
                sessionId,
                choiceId,
                result,
                action: session.metadata?.selectedAction
            });

            // Отправляем результат на сервер
            this._sendResultToServer(sessionId, result);

            console.log(`[AIActionsSessionPanel] Choice selected: ${choiceId}`);
        };

        /**
         * Отправить данные формы (execute.form.input)
         * @param {string} sessionId - ID сессии
         * @param {HTMLElement} buttonElement - Кнопка Submit
         */
        PanelClass.prototype.submitFormInput = function(sessionId, buttonElement = null) {
            const session = this.sessions.get(sessionId);
            if (!session) {
                console.warn(`[AIActionsSessionPanel] Session ${sessionId} not found`);
                return;
            }

            // Collect form data
            const formInputs = this.container.querySelectorAll('.form-inputs input');
            const inputData = {};
            formInputs.forEach(input => {
                inputData[input.name] = input.value;
            });

            // Создаем result в формате action-key shape: { input: {...} }
            const result = { input: inputData };

            // Add action to session
            this.addActionToSession(sessionId, {
                type: 'form-submission',
                input: inputData,
                result: result,
                status: 'completed',
                timestamp: new Date().toISOString()
            });

            // Emit event for external handlers
            this.emit('formSubmitted', {
                sessionId,
                input: inputData,
                result
            });

            // Отправляем результат на сервер
            this._sendResultToServer(sessionId, result);

            console.log(`[AIActionsSessionPanel] Form submitted:`, inputData);
        };

        return PanelClass;
    }

    // Export
    global.mixinApiRequest = mixinApiRequest;

})(typeof window !== 'undefined' ? window : globalThis);
