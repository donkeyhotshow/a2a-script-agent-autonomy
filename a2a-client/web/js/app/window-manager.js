/**
 * Window Manager - Handles session windows, positioning and state
 */
(function (global) {
    'use strict';

    const SESSION_WINDOWS_KEY = 'a2a_session_windows';

    // Track opened session windows
    const sessionWindows = new Map(); // sessionId -> panel

    const WindowManager = {
        /**
         * Get session windows map
         */
        getSessionWindows() {
            return sessionWindows;
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
                console.warn('[WindowManager] Failed to save session windows state:', e);
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
                    global.SessionManager.setActiveSession(state.active || null);
                }
                return state.windows || [];
            } catch (e) {
                console.warn('[WindowManager] Failed to load session windows state:', e);
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
                console.warn('[WindowManager] Failed to clear session windows state:', e);
            }
        },

        /**
         * Toggle session window
         */
        async toggleSessionWindow(sessionId, btnEl) {
            const existingPanel = sessionWindows.get(sessionId);

            if (existingPanel) {
                // Window exists - toggle visibility
                if (existingPanel.state === 'visible') {
                    existingPanel.minimize();
                } else {
                    existingPanel.restore();
                    global.PanelManager?.bringToFront(existingPanel.id);
                }
            } else {
                // Create new window
                await this.createSessionWindow(sessionId, btnEl);
            }

            // Update active session
            if (global.SessionManager) {
                global.SessionManager.setActiveSession(sessionId);
            }
        },

        /**
         * Create new session window
         */
        async createSessionWindow(sessionId, btnEl) {
            try {
                // Load saved window state
                const savedState = await this.loadWindowState(sessionId);
                const position = savedState?.position || this.getDefaultWindowPosition(sessionId);
                const size = savedState?.size || { width: 800, height: 600 };

                // Create panel
                const panel = global.PanelManager?.open('chat', {
                    id: `session-${sessionId}`,
                    title: `Session ${sessionId.slice(-8)}`,
                    x: position.x,
                    y: position.y,
                    width: size.width,
                    height: size.height
                });

                if (panel) {
                    sessionWindows.set(sessionId, panel);

                    // Setup panel event handlers
                    panel.container.addEventListener('mousedown', () => {
                        if (global.SessionManager) {
                            global.SessionManager.setActiveSession(sessionId);
                        }
                    });

                    // Listen for panel state changes to save position/size
                    panel._onStateChange = (state) => {
                        if (state === 'closed') {
                            sessionWindows.delete(sessionId);
                            this.saveSessionWindowsState();
                        }
                        // Save position/size on any state change
                        this.saveWindowState(sessionId, panel.position, panel.size);
                    };

                    // Listen for drag end to save position
                    let dragTimeout;
                    panel.container.addEventListener('mouseup', () => {
                        if (panel.container.classList.contains('pm-dragging')) {
                            clearTimeout(dragTimeout);
                            dragTimeout = setTimeout(() => {
                                this.saveWindowState(sessionId, panel.position, panel.size);
                            }, 100);
                        }
                    });

                    // Render session content
                    this.renderSessionContent(panel.getContentEl(), sessionId);

                    // Save state
                    await this.saveSessionWindowsState();

                    console.log('[WindowManager] Created session window:', sessionId);
                }
            } catch (error) {
                console.error('[WindowManager] Failed to create session window:', error);
            }
        },

        /**
         * Close session window
         */
        closeSessionWindow(sessionId) {
            const panel = sessionWindows.get(sessionId);
            if (panel) {
                panel.close();
                sessionWindows.delete(sessionId);
                this.saveSessionWindowsState();
            }
        },

        /**
         * Save window state
         */
        async saveWindowState(sessionId, position, size) {
            try {
                const key = `window_state_${sessionId}`;
                const state = { position, size, timestamp: Date.now() };
                await StorageAPI.ui.setItem(key, JSON.stringify(state));
            } catch (e) {
                console.warn('[WindowManager] Failed to save window state:', e);
            }
        },

        /**
         * Load window state
         */
        async loadWindowState(sessionId) {
            try {
                const key = `window_state_${sessionId}`;
                const saved = await StorageAPI.ui.getItem(key);
                
                if (saved) {
                    return JSON.parse(saved);
                }
                
                // Return default window state if not found
                const defaultPosition = this.getDefaultWindowPosition(sessionId);
                return {
                    position: defaultPosition,
                    size: { width: 800, height: 600 },
                    timestamp: Date.now()
                };
            } catch (e) {
                console.warn('[WindowManager] Failed to load window state:', e);
                const defaultPosition = this.getDefaultWindowPosition(sessionId);
                return {
                    position: defaultPosition,
                    size: { width: 800, height: 600 },
                    timestamp: Date.now()
                };
            }
        },

        /**
         * Get default window position
         */
        getDefaultWindowPosition(sessionId) {
            // Calculate position based on existing windows to avoid overlap
            const existingPositions = Array.from(sessionWindows.values())
                .map(panel => panel.position);

            let x = 50 + (existingPositions.length * 30);
            let y = 50 + (existingPositions.length * 30);

            // Ensure within viewport bounds
            const maxX = window.innerWidth - 400;
            const maxY = window.innerHeight - 300;

            return {
                x: Math.min(x, maxX),
                y: Math.min(y, maxY)
            };
        },

        /**
         * Render session content in panel
         */
        renderSessionContent(contentEl, sessionId) {
            contentEl.innerHTML = `
                <div class="session-content">
                    <div class="session-header">
                        <div class="session-info">
                            <span class="session-id">ID: ${sessionId}</span>
                            <span class="session-status">Active</span>
                        </div>
                    </div>
                    <div class="session-messages" id="messages-${sessionId}">
                        <div class="message system">
                            Session initialized
                        </div>
                    </div>
                    <div class="session-input">
                        <textarea placeholder="Type your message..." rows="3"></textarea>
                        <button class="send-btn">Send</button>
                    </div>
                </div>
            `;

            // Setup message input handler
            const textarea = contentEl.querySelector('textarea');
            const sendBtn = contentEl.querySelector('.send-btn');

            const sendMessage = () => {
                const message = textarea.value.trim();
                if (message) {
                    this.sendMessage(sessionId, message);
                    textarea.value = '';
                }
            };

            sendBtn.addEventListener('click', sendMessage);
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        },

        /**
         * Send message to session
         */
        sendMessage(sessionId, message) {
            // Add message to UI
            const messagesEl = document.getElementById(`messages-${sessionId}`);
            if (messagesEl) {
                const messageEl = document.createElement('div');
                messageEl.className = 'message user';
                messageEl.textContent = message;
                messagesEl.appendChild(messageEl);
                messagesEl.scrollTop = messagesEl.scrollHeight;
            }

            // Send via API
            if (global.apiIntegration?.sendMessage) {
                global.apiIntegration.sendMessage(sessionId, message);
            }

            console.log('[WindowManager] Sent message:', sessionId, message);
        },

        /**
         * Restore session windows from saved state
         */
        async restoreSessionWindows() {
            const savedWindows = await this.loadSessionWindowsState();

            for (const sessionId of savedWindows) {
                try {
                    // Check if session still exists
                    const sessionExists = await this.checkSessionExists(sessionId);
                    if (sessionExists) {
                        await this.createSessionWindow(sessionId);
                    }
                } catch (error) {
                    console.warn('[WindowManager] Failed to restore window:', sessionId, error);
                }
            }
        },

        /**
         * Check if session exists
         */
        async checkSessionExists(sessionId) {
            // This would normally check with the API
            return true; // Placeholder
        },

        /**
         * Initialize window manager
         */
        async init() {
            console.log('[WindowManager] Initialized');
        }
    };

    // Export
    global.WindowManager = WindowManager;

})(typeof window !== 'undefined' ? window : globalThis);