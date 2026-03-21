/**
 * App State Managers Module
 * Contains functions for session management: creating, closing, and managing application state.
 */
(function (global) {
    'use strict';

    /**
     * Get current project ID with fallback to last selected.
     * Unified function to avoid duplicating the pattern across files.
     * @returns {Promise<string|null>} The current project ID or null.
     */
    async function getCurrentProjectId() {
        // Try selected project first, then fall back to last selected
        const selectedId = await global.ProjectManager?.getSelectedProjectId?.();
        if (selectedId) return selectedId;
        
        // Fallback to last selected project
        const lastSelectedId = global.ProjectManager?.getLastSelectedProjectId?.();
        if (lastSelectedId) return lastSelectedId;
        
        return null;
    }

    /**
     * Let taskbar DOM paint after refresh, then open the session window.
     * Simplified: single rAF + single retry timeout
     */
    function scheduleOpenSessionWindow(sessionId, delayMs) {
        var sid = sessionId;
        var ms = delayMs == null ? 120 : delayMs;
        function tryOpen() {
            var btn = global.findTaskbarBtnBySessionId?.(sid);
            if (btn && global.WindowState) {
                global.WindowState.toggleSessionWindow(sid, btn);
                return true;
            }
            return false;
        }
        // Single rAF to wait for DOM paint, then try once with fallback
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(function () {
                if (!tryOpen()) {
                    setTimeout(tryOpen, ms);
                }
            });
        } else {
            setTimeout(tryOpen, 0);
        }
    }

    const AppStateManagers = {
        /**
         * Create new session
         */
        async createNewSession() {
            try {
                // Check if using persistent storage mode
                const usePersistentStorage = global.SessionStore?.isPersistentStorage?.() || false;
                let sessionId = null;

                if (usePersistentStorage && global.SessionStore?.createSessionWithForm) {
                    try {
                        // Use new session storage API with numbered folders
                        const title = `Session ${new Date().toLocaleTimeString()}`;
                        const session = await global.SessionStore.createSessionWithForm(title);
                        sessionId = session?.id || session?.sessionId;
                        console.log('[AppTask] Created new persistent session:', sessionId);
                    } catch (error) {
                        console.warn('[AppTask] Persistent storage failed, falling back to old API:', error);
                    }
                }

                // Fallback to old API if persistent storage didn't work
                if (!sessionId) {
                    const projectId = await global.getCurrentProjectId();
                    if (!global.apiIntegration?.createSession) throw new Error('API not available');
                    const session = await global.apiIntegration.createSession({
                        projectId,
                        title: `Session ${new Date().toLocaleTimeString()}`
                    });
                    sessionId = session?.id || session?.sessionId;
                    console.log('[AppTask] Created new session:', sessionId);
                }

                // Common operations after getting sessionId
                if (sessionId) {
                    if (global.SessionStore?.createSession) global.SessionStore.createSession(sessionId);
                    if (global.SessionManager?.setActiveSession) global.SessionManager.setActiveSession(sessionId);

                    // Refresh taskbar to show new session
                    const taskbarContent = global.SessionManager?.getTaskbarContentEl?.() || document.querySelector('.taskbar-content');
                    if (taskbarContent && global.TaskbarManager) {
                        await global.TaskbarManager.refreshTaskbar(taskbarContent);
                    }

                    // Auto-open the new session
                    scheduleOpenSessionWindow(sessionId);
                }
            } catch (error) {
                console.error('[AppTask] Failed to create session:', error);
                window.ErrorHandler?.handle(new Error('Failed to create new session'), { action: 'createSession' });
            }
        },

        /**
         * Close active session
         */
        closeActiveSession() {
            const activeSessionId = global.SessionManager?.getActiveSessionId();
            if (activeSessionId && global.WindowState) {
                global.WindowState.closeSessionWindow(activeSessionId);
            }
        }
    };

    // Export
    global.AppStateManagers = AppStateManagers;
    global.getCurrentProjectId = getCurrentProjectId;

})(typeof window !== 'undefined' ? window : globalThis);
