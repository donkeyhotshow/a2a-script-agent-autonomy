/**
 * TaskFlow Messages - Message display and management
 */

(function() {
    'use strict';

    window.TaskFlow = window.TaskFlow || {};

    window.TaskFlow.messages = {
        /**
         * Render a message in the DOM
         * @param {object} message - Message data
         * @returns {HTMLElement} Message element
         */
        render(message) {
            const element = document.createElement('div');
            element.className = 'task-flow-message';
            element.dataset.messageId = message.id || '';
            element.dataset.role = message.role || 'assistant';
            
            const content = document.createElement('div');
            content.className = 'message-content';
            content.textContent = message.content || '';
            element.appendChild(content);

            const timestamp = document.createElement('div');
            timestamp.className = 'message-timestamp';
            timestamp.textContent = message.timestamp || new Date().toISOString();
            element.appendChild(timestamp);

            return element;
        },

        /**
         * Get all messages from the current session
         * @returns {object[]} List of messages
         */
        getAll() {
            return window.TaskFlow._messages || [];
        },

        /**
         * Set messages for the current session
         * @param {object[]} messages - List of messages
         */
        setAll(messages) {
            window.TaskFlow._messages = messages;
        },

        /**
         * Add a new message
         * @param {object} message - Message to add
         */
        add(message) {
            const messages = window.TaskFlow._messages || [];
            messages.push(message);
            window.TaskFlow._messages = messages;
        },

        /**
         * Clear all messages
         */
        clear() {
            window.TaskFlow._messages = [];
        }
    };
})();
