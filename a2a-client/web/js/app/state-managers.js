/**
 * App State Managers Module
 * Contains functions for session management: creating, closing, and managing application state.
 */
(function (global) {
    'use strict';

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
                
                if (usePersistentStorage && global.SessionStore?.createSessionWithForm) {
                    try {
                        // Use new session storage API with numbered folders
                        const title = `Session ${new Date().toLocaleTimeString()}`;
                        const session = await global.SessionStore.createSessionWithForm(title);
                        
                        const sid = session?.id || session?.sessionId;
                        if (sid) {
                            // Set active session
                            if (global.SessionManager?.setActiveSession) {
                                global.SessionManager.setActiveSession(sid);
                            }
                            
                            // Refresh taskbar
                            const taskbarContent = global.SessionManager?.getTaskbarContentEl?.() || document.querySelector('.taskbar-content');
                            if (taskbarContent && global.TaskbarManager) {
                                await global.TaskbarManager.refreshTaskbar(taskbarContent);
                            }
                            
                            scheduleOpenSessionWindow(sid);
                            
                            console.log('[AppTask] Created new persistent session:', sid);
                            return;
                        }
                    } catch (error) {
                        console.warn('[AppTask] Persistent storage failed, falling back to old API:', error);
                        // Fall through to old API
                    }
                }
                
                // Fallback to old API (memory mode or if new API fails)
                const projectId = await global.ProjectManager?.getSelectedProjectId();
                if (!global.apiIntegration?.createSession) throw new Error('API not available');
                const session = await global.apiIntegration.createSession({
                    projectId,
                    title: `Session ${new Date().toLocaleTimeString()}`
                });
                const sessionId = session?.id || session?.sessionId;
                if (sessionId) {
                    if (global.SessionStore?.createSession) global.SessionStore.createSession(session);
                    if (global.SessionManager?.setActiveSession) global.SessionManager.setActiveSession(sessionId);
                }

                // Refresh taskbar to show new session
                const taskbarContent = global.SessionManager?.getTaskbarContentEl?.() || document.querySelector('.taskbar-content');
                if (taskbarContent && global.TaskbarManager) {
                    await global.TaskbarManager.refreshTaskbar(taskbarContent);
                }

                // Auto-open the new session (use sessionId — API may return sessionId without .id)
                if (sessionId) {
                    scheduleOpenSessionWindow(sessionId);
                }

                console.log('[AppTask] Created new session:', sessionId);
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

})(typeof window !== 'undefined' ? window : globalThis);
