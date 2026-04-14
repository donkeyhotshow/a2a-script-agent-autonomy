/**
 * TaskFlow Tasks - Task display and management
 */

(function() {
    'use strict';

    window.TaskFlow = window.TaskFlow || {};

    window.TaskFlow.tasks = {
        /**
         * Render a task in the DOM
         * @param {object} task - Task data
         * @returns {HTMLElement} Task element
         */
        render(task) {
            const element = document.createElement('div');
            element.className = 'task-flow-task';
            element.dataset.taskId = task.id || '';
            element.dataset.status = task.status || 'pending';
            
            const title = document.createElement('div');
            title.className = 'task-title';
            title.textContent = task.title || 'Untitled Task';
            element.appendChild(title);

            const status = document.createElement('div');
            status.className = 'task-status';
            status.textContent = task.status || 'pending';
            element.appendChild(status);

            return element;
        },

        /**
         * Get all tasks from the current session
         * @returns {object[]} List of tasks
         */
        getAll() {
            return window.TaskFlow._tasks || [];
        },

        /**
         * Set tasks for the current session
         * @param {object[]} tasks - List of tasks
         */
        setAll(tasks) {
            window.TaskFlow._tasks = tasks;
        },

        /**
         * Update a specific task
         * @param {string} taskId - Task ID
         * @param {object} updates - Task updates
         */
        update(taskId, updates) {
            const tasks = window.TaskFlow._tasks || [];
            const index = tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                tasks[index] = { ...tasks[index], ...updates };
                window.TaskFlow._tasks = tasks;
            }
        }
    };
})();
