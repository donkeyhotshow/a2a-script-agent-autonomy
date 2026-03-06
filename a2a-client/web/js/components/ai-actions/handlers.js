/**
 * AI Actions Session Panel - Handlers Module
 * Обработчики пользовательских действий
 */

(function (global) {
    'use strict';

    /**
     * Модуль обработчиков
     */
    const Handlers = {
        /**
         * Выбрать вариант из формы
         * @param {string} sessionId - ID сессии
         * @param {string} choiceId - ID выбора
         * @param {HTMLElement} buttonElement - элемент кнопки
         */
        async selectChoice(sessionId, choiceId, buttonElement = null) {
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

            // Это соответствует протоколу new-request-flow
            const result = { form: { choice: choiceId } };

            // Emit event for WebApiClient
            this.emit('choiceSelected', { sessionId, result });

            // Also emit for global listener
            if (global.webApiClient) {
                global.webApiClient.emit('choiceSelected', { sessionId, result });
            }

            // Find and update the form action status
            const action = [...session.actions].reverse().find(a =>
                a.type === 'form' && (a.status === 'pending' || a.status === 'active')
            );

            if (action) {
                action.status = 'completed';
                action.result = result;
                action.completedAt = new Date().toISOString();
                
                if (this.currentSessionId === sessionId) {
                    this._renderSessionContent(sessionId);
                }
            }

            // Send to server
            try {
                await this._sendResultToServer(sessionId, result);
            } catch (e) {
                console.error('[AIActionsSessionPanel] Failed to send choice:', e);
            }
        },

        /**
         * Отправить данные формы
         * @param {string} sessionId - ID сессии
         * @param {HTMLElement} buttonElement - элемент кнопки
         */
        async submitFormInput(sessionId, buttonElement = null) {
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

            // Создаем result в формате action-key shape: { form: { input: {...} } }
            const result = { form: { input: inputData } };

            // Emit event for WebApiClient
            this.emit('formSubmitted', { sessionId, result });

            // Also emit for global listener
            if (global.webApiClient) {
                global.webApiClient.emit('formSubmitted', { sessionId, result });
            }

            // Find and update the form action status
            const action = [...session.actions].reverse().find(a =>
                a.type === 'form' && (a.status === 'pending' || a.status === 'active')
            );

            if (action) {
                action.status = 'completed';
                action.result = result;
                action.completedAt = new Date().toISOString();
                
                if (this.currentSessionId === sessionId) {
                    this._renderSessionContent(sessionId);
                }
            }

            // Send to server
            try {
                await this._sendResultToServer(sessionId, result);
            } catch (e) {
                console.error('[AIActionsSessionPanel] Failed to submit form:', e);
            }
        },

        /**
         * Показать форму добавления действия
         * @param {string} sessionId - ID сессии
         */
        showAddActionForm(sessionId) {
            // Простая реализация - в реальной системе можно использовать модальное окно
            const actionType = prompt('Enter action type (form, message, script, rag-search, read-file, write-file, execute-command):');
            if (!actionType) return;

            const action = { type: actionType, timestamp: new Date().toISOString() };
            this.addActionToSession(sessionId, action);
        },

        /**
         * Привязать обработчики событий для контента
         * @private
         */
        _bindContentEvents() {
            const contentEl = this.container.querySelector('#sessionContent');
            if (!contentEl) return;

            // Handle choice buttons
            contentEl.addEventListener('click', (e) => {
                const choiceBtn = e.target.closest('.choice-button');
                if (choiceBtn) {
                    e.preventDefault();
                    const sessionId = this.currentSessionId;
                    const choiceId = choiceBtn.dataset.choiceId;
                    this.selectChoice(sessionId, choiceId, choiceBtn);
                }

                // Handle form submit
                const submitBtn = e.target.closest('.form-submit');
                if (submitBtn) {
                    e.preventDefault();
                    const sessionId = this.currentSessionId;
                    this.submitFormInput(sessionId, submitBtn);
                }
            });

            // Handle input field changes
            contentEl.addEventListener('change', (e) => {
                if (e.target.matches('.form-inputs input')) {
                    // Handle input changes if needed
                }
            });
        }
    };

    // Export
    global.AIActionsSessionPanelHandlers = Handlers;

})(typeof window !== 'undefined' ? window : global);
