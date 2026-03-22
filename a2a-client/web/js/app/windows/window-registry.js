/**
 * Window Registry - Manages the registry of open session windows
 */
(function (global) {
    'use strict';

    const SESSION_WINDOWS_KEY = 'a2a_session_windows';

    // Track opened session windows
    const sessionWindows = new Map(); // sessionId -> panel

    const WindowRegistry = {
        /**
         * Get session windows map
         */
        getSessionWindows() {
            return sessionWindows;
        },

        /**
         * Get window by session ID
         */
        getWindow(sessionId) {
            return sessionWindows.get(sessionId);
        },

        /**
         * Get SessionStore instance associated with a window
         */
        getSessionStore(sessionId) {
            const panel = sessionWindows.get(sessionId);
            return panel?._sessionStore || null;
        },

        /**
         * Check if window exists
         */
        hasWindow(sessionId) {
            return sessionWindows.has(sessionId);
        },

        /**
         * Get all session IDs
         */
        getAllSessionIds() {
            return Array.from(sessionWindows.keys());
        },

        /**
         * Save session windows state
         */
        async saveSessionWindowsState() {
            try {
                const state = {
                    windows: Array.from(sessionWindows.keys()),
                    active: global.SessionManager?.getActiveSessionId(),
                    timestamp: Date.now()
                };
                await StorageAPI.ui.setItem(SESSION_WINDOWS_KEY, JSON.stringify(state));
            } catch (e) {
                console.error('[WindowRegistry] Failed to save session windows state:', e);
            }
        },

        /**
         * Load session windows state
         */
        async loadSessionWindowsState() {
            try {
                const saved = await StorageAPI.ui.getItem(SESSION_WINDOWS_KEY);
                if (!saved) return [];
                const state = typeof saved === 'string' ? JSON.parse(saved) : saved;
                if (global.SessionManager) {
                    global.SessionManager.setActiveSession(state.active != null ? state.active : null);
                }
                const windows = state.windows;
                if (!Array.isArray(windows)) {
                    throw new Error('[WindowRegistry] saved state missing windows array');
                }
                return windows;
            } catch (e) {
                console.error('[WindowRegistry] Failed to load session windows state:', e);
                return [];
            }
        },

        /**
         * Clear session windows state
         */
        async clearSessionWindowsState() {
            try {
                await StorageAPI.ui.removeItem(SESSION_WINDOWS_KEY);
            } catch (e) {
                console.error('[WindowRegistry] Failed to clear session windows state:', e);
            }
        }
    };

    // Export
    global.WindowRegistry = WindowRegistry;

})(typeof window !== 'undefined' ? window : globalThis);
