/**
 * TaskFlow Messages Module
 * Отправка выборов и сообщений
 * Использует общую функцию submitAndHandle из tasks.js
 */

(function (global) {
    'use strict';

    // Get modules
    const API = global.TaskFlowAPI;
    const getChoiceLabel = API?.getChoiceLabel;
    const submitAndHandle = global.TaskFlowSubmitAndHandle;
    const resolveStore = global.resolveStore;

    /**
     * Отправить выбор
     * @param {Object} TaskFlow - Main TaskFlow instance
     * @param {string} choiceId - ID выбора
     * @param {HTMLElement} contentEl - элемент контента
     */
    async function sendChoice(TaskFlow, choiceId, contentEl) {
        const displayText = getChoiceLabel ? getChoiceLabel(choiceId) : choiceId;
        
        // Add message to history
        const store = resolveStore(TaskFlow._sessionId);
        if (store?.pushMessage) {
            store.pushMessage({ content: displayText, choiceId }, 'user');
        }
        
        // Используем общую функцию
        await submitAndHandle(TaskFlow, { choice: choiceId }, contentEl, displayText);
    }

    /**
     * Отправить результат сообщения
     * @param {Object} TaskFlow - Main TaskFlow instance
     * @param {string} messageText - текст сообщения
     * @param {HTMLElement} contentEl - элемент контента
     */
    async function sendMessageResult(TaskFlow, messageText, contentEl) {
        const displayText = (messageText || '').trim() || 'continue';

        // Add message to history
        const store = resolveStore(TaskFlow._sessionId);
        if (store?.pushMessage) {
            store.pushMessage({ content: displayText }, 'user');
        }
        
        // Используем общую функцию
        await submitAndHandle(TaskFlow, { message: messageText }, contentEl, displayText);
    }

    // Export
    global.TaskFlowMessages = {
        sendChoice,
        sendMessageResult
    };

})(typeof window !== 'undefined' ? window : globalThis);
