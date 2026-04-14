/**
 * TaskFlow Render - Main rendering logic
 */

(function() {
    'use strict';

    window.TaskFlow = window.TaskFlow || {};

    const DEFAULT_CONTAINER = 'task-flow-container';

    window.TaskFlow.render = {
        /**
         * Initialize the renderer
         * @param {string} containerId - Container element ID
         */
        init(containerId = DEFAULT_CONTAINER) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`[TaskFlow] Container not found: ${containerId}`);
                return null;
            }
            return container;
        },

        /**
         * Render the tasks list
         * @param {object[]} tasks - List of tasks
         * @param {string} containerId - Container element ID
         */
        renderTasks(tasks, containerId = DEFAULT_CONTAINER) {
            const container = this.init(containerId);
            if (!container) return;

            const tasksContainer = document.createElement('div');
            tasksContainer.className = 'tasks-list';
            
            tasks.forEach(task => {
                const taskElement = window.TaskFlow.tasks.render(task);
                tasksContainer.appendChild(taskElement);
            });

            container.appendChild(tasksContainer);
        },

        /**
         * Render the messages list
         * @param {object[]} messages - List of messages
         * @param {string} containerId - Container element ID
         */
        renderMessages(messages, containerId = DEFAULT_CONTAINER) {
            const container = this.init(containerId);
            if (!container) return;

            const messagesContainer = document.createElement('div');
            messagesContainer.className = 'messages-list';
            
            messages.forEach(message => {
                const messageElement = window.TaskFlow.messages.render(message);
                messagesContainer.appendChild(messageElement);
            });

            container.appendChild(messagesContainer);
        },

        /**
         * Render the complete session view
         * @param {object} session - Session data
         */
        renderSession(session) {
            const container = this.init();
            if (!container) return;

            container.innerHTML = '';
            
            if (session.tasks) {
                window.TaskFlow.tasks.setAll(session.tasks);
                this.renderTasks(session.tasks);
            }

            if (session.messages) {
                window.TaskFlow.messages.setAll(session.messages);
                this.renderMessages(session.messages);
            }
        },

        /**
         * Clear the render container
         * @param {string} containerId - Container element ID
         */
        clear(containerId = DEFAULT_CONTAINER) {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
            }
        }
    };
})();
