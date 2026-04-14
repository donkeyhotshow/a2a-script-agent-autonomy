/**
 * TaskFlow Loader - Session loading utilities
 */

(function() {
    'use strict';

    window.TaskFlow = window.TaskFlow || {};

    window.TaskFlow.loader = {
        /**
         * Load session data from the server
         * @param {string} sessionId - The session ID
         * @returns {Promise<object>} Session data
         */
        async loadSession(sessionId) {
            const response = await fetch(`/api/a2a/sessions/${sessionId}`);
            if (!response.ok) {
                throw new Error(`Failed to load session: ${response.status}`);
            }
            return response.json();
        },

        /**
         * Load all sessions
         * @returns {Promise<object[]>} List of sessions
         */
        async loadSessions() {
            const response = await fetch('/api/a2a/sessions');
            if (!response.ok) {
                throw new Error(`Failed to load sessions: ${response.status}`);
            }
            return response.json();
        },

        /**
         * Load step data for a session
         * @param {string} sessionId - The session ID
         * @param {number} step - The step number
         * @returns {Promise<object>} Step data
         */
        async loadStep(sessionId, step) {
            const response = await fetch(`/api/a2a/sessions/${sessionId}/steps/${step}`);
            if (!response.ok) {
                throw new Error(`Failed to load step: ${response.status}`);
            }
            return response.json();
        }
    };
})();
