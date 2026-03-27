/**
 * Session Background Registry - Manages background processes per project/session.
 * 
 * Tracks pollers, timers, and status checkers that run in background for each session.
 * Keyed by `projectId + sessionId` to enable explicit lifecycle management.
 * 
 * Part of SC-04 (Session Clarity) - SCR-2 rollout.
 */
(function (global) {
    'use strict';

    /**
     * Generate registry key from projectId and sessionId
     * @param {string} projectId 
     * @param {string} sessionId 
     * @returns {string}
     */
    function makeKey(projectId, sessionId) {
        return `${String(projectId || '')}::${String(sessionId || '')}`;
    }

    /**
     * Session Background Registry
     * Manages all background processes for a specific project/session combination.
     */
    const SessionBackgroundRegistry = {
        /** @type {Map<string, Map<string, Object>>} - key -> process type -> process instance */
        _processes: new Map(),

        /**
         * Get all processes for a specific project/session
         * @param {string} projectId 
         * @param {string} sessionId 
         * @returns {Map<string, Object>}
         */
        _getProcessMap(projectId, sessionId) {
            const key = makeKey(projectId, sessionId);
            if (!this._processes.has(key)) {
                this._processes.set(key, new Map());
            }
            return this._processes.get(key);
        },

        /**
         * Register a background process (poller, timer, status checker)
         * @param {string} projectId 
         * @param {string} sessionId 
         * @param {string} processType - e.g., 'poller', 'timer', 'statusChecker', 'promisePoller'
         * @param {string} processId - unique identifier within the type
         * @param {Object} process - the process instance (must have destroy/stop method)
         * @returns {boolean} success
         */
        register(projectId, sessionId, processType, processId, process) {
            if (!projectId || !sessionId) {
                console.warn('[SessionBackgroundRegistry] Missing projectId or sessionId:', projectId, sessionId);
                return false;
            }
            if (!processType || !processId || !process) {
                console.warn('[SessionBackgroundRegistry] Missing required registration params');
                return false;
            }

            const processes = this._getProcessMap(projectId, sessionId);
            const typeKey = `${processType}:${processId}`;

            // Store with metadata
            const entry = {
                instance: process,
                type: processType,
                id: processId,
                registeredAt: Date.now(),
                // Extract destroy/stop method if available
                destroy: process.destroy || process.stop || process.stopPolling || null
            };

            processes.set(typeKey, entry);
            console.log('[SessionBackgroundRegistry] Registered:', typeKey, 'for', makeKey(projectId, sessionId));
            return true;
        },

        /**
         * Unregister a specific background process
         * @param {string} projectId 
         * @param {string} sessionId 
         * @param {string} processType 
         * @param {string} processId 
         * @returns {boolean} success
         */
        unregister(projectId, sessionId, processType, processId) {
            const processes = this._getProcessMap(projectId, sessionId);
            const typeKey = `${processType}:${processId}`;
            const entry = processes.get(typeKey);

            if (entry) {
                // Call destroy if available
                if (typeof entry.destroy === 'function') {
                    try {
                        entry.destroy.call(entry.instance);
                    } catch (e) {
                        console.warn('[SessionBackgroundRegistry] Error destroying process:', typeKey, e);
                    }
                }
                processes.delete(typeKey);
                console.log('[SessionBackgroundRegistry] Unregistered:', typeKey);
                return true;
            }
            return false;
        },

        /**
         * Get a specific background process
         * @param {string} projectId 
         * @param {string} sessionId 
         * @param {string} processType 
         * @param {string} processId 
         * @returns {Object|null}
         */
        get(projectId, sessionId, processType, processId) {
            const processes = this._getProcessMap(projectId, sessionId);
            const entry = processes.get(`${processType}:${processId}`);
            return entry ? entry.instance : null;
        },

        /**
         * Get all processes for a session
         * @param {string} projectId 
         * @param {string} sessionId 
         * @returns {Array<{type: string, id: string, instance: Object}>}
         */
        getAll(projectId, sessionId) {
            const processes = this._getProcessMap(projectId, sessionId);
            return Array.from(processes.values()).map(entry => ({
                type: entry.type,
                id: entry.id,
                instance: entry.instance
            }));
        },

        /**
         * Get count of active processes for a session
         * @param {string} projectId 
         * @param {string} sessionId 
         * @returns {number}
         */
        getCount(projectId, sessionId) {
            const processes = this._getProcessMap(projectId, sessionId);
            return processes.size;
        },

        /**
         * Check if session has active processes
         * @param {string} projectId 
         * @param {string} sessionId 
         * @returns {boolean}
         */
        hasActiveProcesses(projectId, sessionId) {
            return this.getCount(projectId, sessionId) > 0;
        },

        /**
         * Clean up all processes for a session (call when session closes)
         * @param {string} projectId 
         * @param {string} sessionId 
         * @returns {number} count of cleaned up processes
         */
        cleanupSession(projectId, sessionId) {
            const key = makeKey(projectId, sessionId);
            const processes = this._processes.get(key);

            if (!processes || processes.size === 0) {
                return 0;
            }

            let cleaned = 0;
            for (const [typeKey, entry] of processes) {
                if (typeof entry.destroy === 'function') {
                    try {
                        entry.destroy.call(entry.instance);
                    } catch (e) {
                        console.warn('[SessionBackgroundRegistry] Error cleaning up:', typeKey, e);
                    }
                }
                cleaned++;
            }

            this._processes.delete(key);
            console.log('[SessionBackgroundRegistry] Cleaned up', cleaned, 'processes for', key);
            return cleaned;
        },

        /**
         * Clean up all processes for a project (call when project changes/closes)
         * @param {string} projectId 
         * @returns {number} count of cleaned up sessions
         */
        cleanupProject(projectId) {
            let cleanedSessions = 0;
            let cleanedProcesses = 0;

            for (const [key, processes] of this._processes) {
                if (key.startsWith(`${String(projectId || '')}::`)) {
                    for (const [typeKey, entry] of processes) {
                        if (typeof entry.destroy === 'function') {
                            try {
                                entry.destroy.call(entry.instance);
                            } catch (e) {
                                console.warn('[SessionBackgroundRegistry] Error cleaning up:', typeKey, e);
                            }
                        }
                        cleanedProcesses++;
                    }
                    cleanedSessions++;
                    this._processes.delete(key);
                }
            }

            console.log('[SessionBackgroundRegistry] Cleaned up', cleanedSessions, 'sessions,', cleanedProcesses, 'processes for project', projectId);
            return cleanedSessions;
        },

        /**
         * Clean up all processes (global cleanup)
         * @returns {number} count of cleaned up sessions
         */
        cleanupAll() {
            let cleanedSessions = 0;
            let cleanedProcesses = 0;

            for (const [key, processes] of this._processes) {
                for (const [typeKey, entry] of processes) {
                    if (typeof entry.destroy === 'function') {
                        try {
                            entry.destroy.call(entry.instance);
                        } catch (e) {
                            console.warn('[SessionBackgroundRegistry] Error cleaning up:', typeKey, e);
                        }
                    }
                    cleanedProcesses++;
                }
                cleanedSessions++;
            }

            this._processes.clear();
            console.log('[SessionBackgroundRegistry] Global cleanup:', cleanedSessions, 'sessions,', cleanedProcesses, 'processes');
            return cleanedSessions;
        },

        /**
         * Get debug info for all tracked sessions/processes
         * @returns {Object}
         */
        getDebugInfo() {
            const info = {};
            for (const [key, processes] of this._processes) {
                info[key] = {
                    processCount: processes.size,
                    processes: Array.from(processes.keys())
                };
            }
            return info;
        }
    };

    // Export to global
    global.SessionBackgroundRegistry = SessionBackgroundRegistry;

})(typeof window !== 'undefined' ? window : globalThis);