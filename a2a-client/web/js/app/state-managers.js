/**
 * App State Managers Module
 * Contains functions for session management: creating, closing, and managing application state.
 */
(function (global) {
    'use strict';

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
                        
                        if (session?.id) {
                            // Set active session
                            if (global.SessionManager?.setActiveSession) {
                                global.SessionManager.setActiveSession(session.id);
                            }
                            
                            // Refresh taskbar
                            const taskbarContent = global.SessionManager?.getTaskbarContentEl?.() || document.querySelector('.taskbar-content');
                            if (taskbarContent && global.TaskbarManager) {
                                await global.TaskbarManager.refreshTaskbar(taskbarContent);
                            }
                            
                            // Auto-open the new session
                            setTimeout(() => {
                                const btn = document.querySelector(`[data-session-id="${session.id}"]`);
                                if (btn && global.WindowManager) {
                                    global.WindowManager.toggleSessionWindow(session.id, btn);
                                }
                            }, 100);
                            
                            console.log('[AppTask] Created new persistent session:', session.id);
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

                // Auto-open the new session
                setTimeout(() => {
                    const btn = document.querySelector(`[data-session-id="${session.id}"]`);
                    if (btn && global.WindowManager) {
                        global.WindowManager.toggleSessionWindow(session.id, btn);
                    }
                }, 100);

                console.log('[AppTask] Created new session:', session.id);
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
            if (activeSessionId && global.WindowManager) {
                global.WindowManager.closeSessionWindow(activeSessionId);
            }
        }
    };

    // Export
    global.AppStateManagers = AppStateManagers;

})(typeof window !== 'undefined' ? window : globalThis);
