/**
 * Command Handler - Processes CLI commands sent via SSE
 *
 * Handles commands from the tester CLI that control the web client remotely.
 * Integrates with PanelManager, SessionStore, and other UI components.
 */

(function (global) {
    'use strict';

    const CommandHandler = {
        // Command registry
        _commands: new Map(),

        // Command history
        _history: [],

        /**
         * Initialize command handler
         */
        init() {
            console.log('[CommandHandler] Initializing...');

            // Register built-in commands
            this._registerCommands();

            // Listen for tester commands from TransportManager
            if (global.TransportManager) {
                global.TransportManager.on('tester_command', (data) => {
                    this._handleCommand(data);
                });

                global.TransportManager.on('tester_broadcast', (data) => {
                    this._handleBroadcast(data);
                });
            }

            console.log('[CommandHandler] Initialized with', this._commands.size, 'commands');
            return this;
        },

        /**
         * Register built-in commands
         */
        _registerCommands() {
            // Panel commands
            this.registerCommand('panel_control', this._handlePanelCommand.bind(this));
            this.registerCommand('show_panel', this._handleShowPanel.bind(this));
            this.registerCommand('hide_panel', this._handleHidePanel.bind(this));
            this.registerCommand('move_panel', this._handleMovePanel.bind(this));
            this.registerCommand('resize_panel', this._handleResizePanel.bind(this));

            // Session commands
            this.registerCommand('session_control', this._handleSessionCommand.bind(this));
            this.registerCommand('create_session', this._handleCreateSession.bind(this));
            this.registerCommand('switch_session', this._handleSwitchSession.bind(this));

            // Utility commands
            this.registerCommand('ping', this._handlePing.bind(this));
            this.registerCommand('echo', this._handleEcho.bind(this));
            this.registerCommand('get_status', this._handleGetStatus.bind(this));
            this.registerCommand('get_timestamp', this._handleGetTimestamp.bind(this));

            // Debug commands
            this.registerCommand('debug_info', this._handleDebugInfo.bind(this));
            this.registerCommand('reload_page', this._handleReloadPage.bind(this));
        },

        /**
         * Register a command handler
         */
        registerCommand(commandName, handler) {
            if (typeof handler !== 'function') {
                console.error('[CommandHandler] Handler must be a function for command:', commandName);
                return false;
            }

            this._commands.set(commandName, handler);
            return true;
        },

        /**
         * Unregister a command
         */
        unregisterCommand(commandName) {
            return this._commands.delete(commandName);
        },

        /**
         * Handle incoming command from CLI
         */
        async _handleCommand(commandData) {
            const { commandId, command, data, sessionId, timestamp } = commandData;

            console.log('[CommandHandler] Received command:', command, 'ID:', commandId);

            // Add to history
            this._history.push({
                commandId,
                command,
                data,
                sessionId,
                timestamp: timestamp || new Date().toISOString(),
                receivedAt: new Date().toISOString()
            });

            // Keep history limited
            if (this._history.length > 100) {
                this._history.shift();
            }

            // Find and execute command handler
            const handler = this._commands.get(command);
            if (!handler) {
                console.warn('[CommandHandler] Unknown command:', command);
                this._sendResponse(commandId, {
                    success: false,
                    error: `Unknown command: ${command}`
                });
                return;
            }

            try {
                const result = await handler(data, commandData);
                this._sendResponse(commandId, {
                    success: true,
                    result
                });
            } catch (error) {
                console.error('[CommandHandler] Command execution failed:', error);
                this._sendResponse(commandId, {
                    success: false,
                    error: error.message || 'Command execution failed'
                });
            }
        },

        /**
         * Handle broadcast command
         */
        _handleBroadcast(broadcastData) {
            const { commandId, command, data, timestamp } = broadcastData;

            console.log('[CommandHandler] Received broadcast:', command, 'ID:', commandId);

            // Handle broadcast commands (similar to regular commands but don't respond)
            const handler = this._commands.get(command);
            if (handler) {
                try {
                    handler(data, broadcastData);
                } catch (error) {
                    console.error('[CommandHandler] Broadcast command execution failed:', error);
                }
            } else {
                console.warn('[CommandHandler] Unknown broadcast command:', command);
            }
        },

        /**
         * Send response back to CLI via WebSocket
         */
        _sendResponse(commandId, response) {
            if (global.TransportManager && global.TransportManager.send) {
                global.TransportManager.send('tester_response', {
                    commandId,
                    response,
                    timestamp: new Date().toISOString()
                });
            }
        },

        // ===== PANEL COMMAND HANDLERS =====

        /**
         * Handle panel control commands
         */
        async _handlePanelCommand(data, commandData) {
            const { action, panelId, position, size } = data;

            if (!global.PanelManager) {
                throw new Error('PanelManager not available');
            }

            switch (action) {
                case 'show':
                    return this._handleShowPanel({ panelId }, commandData);

                case 'hide':
                    return this._handleHidePanel({ panelId }, commandData);

                case 'move':
                    return this._handleMovePanel({ panelId, position }, commandData);

                case 'resize':
                    return this._handleResizePanel({ panelId, size }, commandData);

                case 'minimize':
                    return this._handleMinimizePanel({ panelId }, commandData);

                case 'maximize':
                    return this._handleMaximizePanel({ panelId }, commandData);

                case 'close':
                    return this._handleClosePanel({ panelId }, commandData);

                default:
                    throw new Error(`Unknown panel action: ${action}`);
            }
        },

        async _handleShowPanel(data, commandData) {
            const { panelId } = data;
            if (!panelId) throw new Error('panelId required');

            const panel = global.PanelManager.getPanel(panelId);
            if (!panel) {
                // Try to create panel if it doesn't exist
                const success = global.PanelManager.createPanel(panelId);
                if (!success) throw new Error(`Cannot create panel: ${panelId}`);
            }

            global.PanelManager.showPanel(panelId);
            return { panelId, action: 'shown' };
        },

        async _handleHidePanel(data, commandData) {
            const { panelId } = data;
            if (!panelId) throw new Error('panelId required');

            global.PanelManager.hidePanel(panelId);
            return { panelId, action: 'hidden' };
        },

        async _handleMovePanel(data, commandData) {
            const { panelId, position } = data;
            if (!panelId) throw new Error('panelId required');
            if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
                throw new Error('Valid position {x, y} required');
            }

            global.PanelManager.movePanel(panelId, position.x, position.y);
            return { panelId, action: 'moved', position };
        },

        async _handleResizePanel(data, commandData) {
            const { panelId, size } = data;
            if (!panelId) throw new Error('panelId required');
            if (!size || typeof size.width !== 'number' || typeof size.height !== 'number') {
                throw new Error('Valid size {width, height} required');
            }

            global.PanelManager.resizePanel(panelId, size.width, size.height);
            return { panelId, action: 'resized', size };
        },

        async _handleMinimizePanel(data, commandData) {
            const { panelId } = data;
            if (!panelId) throw new Error('panelId required');

            global.PanelManager.minimizePanel(panelId);
            return { panelId, action: 'minimized' };
        },

        async _handleMaximizePanel(data, commandData) {
            const { panelId } = data;
            if (!panelId) throw new Error('panelId required');

            global.PanelManager.maximizePanel(panelId);
            return { panelId, action: 'maximized' };
        },

        async _handleClosePanel(data, commandData) {
            const { panelId } = data;
            if (!panelId) throw new Error('panelId required');

            global.PanelManager.closePanel(panelId);
            return { panelId, action: 'closed' };
        },

        // ===== SESSION COMMAND HANDLERS =====

        /**
         * Handle session control commands
         */
        async _handleSessionCommand(data, commandData) {
            const { action } = data;

            switch (action) {
                case 'create':
                    return this._handleCreateSession(data, commandData);

                case 'list':
                    return this._handleListSessions(data, commandData);

                case 'switch':
                    return this._handleSwitchSession(data, commandData);

                case 'delete':
                    return this._handleDeleteSession(data, commandData);

                case 'status':
                    return this._handleSessionStatus(data, commandData);

                default:
                    throw new Error(`Unknown session action: ${action}`);
            }
        },

        async _handleCreateSession(data, commandData) {
            const { title } = data;

            if (!global.SessionStore) {
                throw new Error('SessionStore not available');
            }

            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const session = {
                id: sessionId,
                title: title || 'CLI Created Session',
                createdAt: new Date().toISOString()
            };

            // Add to session store
            global.SessionStore.createSession(session);

            return { sessionId, title: session.title, action: 'created' };
        },

        async _handleListSessions(data, commandData) {
            if (!global.SessionStore) {
                throw new Error('SessionStore not available');
            }

            const sessions = global.SessionStore.getAllSessions();
            return {
                sessions: sessions.map(s => ({
                    id: s.id,
                    title: s.title,
                    active: s.active,
                    createdAt: s.createdAt
                })),
                count: sessions.length
            };
        },

        async _handleSwitchSession(data, commandData) {
            const { sessionId } = data;
            if (!sessionId) throw new Error('sessionId required');

            if (!global.SessionStore) {
                throw new Error('SessionStore not available');
            }

            global.SessionStore.switchToSession(sessionId);
            return { sessionId, action: 'switched' };
        },

        async _handleDeleteSession(data, commandData) {
            const { sessionId } = data;
            if (!sessionId) throw new Error('sessionId required');

            if (!global.SessionStore) {
                throw new Error('SessionStore not available');
            }

            global.SessionStore.deleteSession(sessionId);
            return { sessionId, action: 'deleted' };
        },

        async _handleSessionStatus(data, commandData) {
            const { sessionId } = data;

            if (!global.SessionStore) {
                throw new Error('SessionStore not available');
            }

            const session = sessionId ?
                global.SessionStore.getSession(sessionId) :
                global.SessionStore.getCurrentSession();

            if (!session) {
                throw new Error(`Session not found: ${sessionId || 'current'}`);
            }

            return {
                session: {
                    id: session.id,
                    title: session.title,
                    active: session.active,
                    createdAt: session.createdAt,
                    lastActivity: session.lastActivity
                }
            };
        },

        // ===== UTILITY COMMAND HANDLERS =====

        async _handlePing(data, commandData) {
            return {
                pong: true,
                timestamp: new Date().toISOString(),
                sessionId: commandData.sessionId
            };
        },

        async _handleEcho(data, commandData) {
            return {
                echoed: data,
                timestamp: new Date().toISOString()
            };
        },

        async _handleGetStatus(data, commandData) {
            return {
                status: 'online',
                timestamp: new Date().toISOString(),
                sessionId: commandData.sessionId,
                userAgent: navigator.userAgent,
                url: window.location.href,
                panels: global.PanelManager ? global.PanelManager.getPanelStates() : [],
                sessions: global.SessionStore ? global.SessionStore.getAllSessions().length : 0
            };
        },

        async _handleGetTimestamp(data, commandData) {
            return {
                timestamp: new Date().toISOString(),
                unix: Date.now()
            };
        },

        // ===== DEBUG COMMAND HANDLERS =====

        async _handleDebugInfo(data, commandData) {
            const debugInfo = {
                timestamp: new Date().toISOString(),
                location: window.location.href,
                userAgent: navigator.userAgent,
                screen: {
                    width: screen.width,
                    height: screen.height,
                    availWidth: screen.availWidth,
                    availHeight: screen.availHeight
                },
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                sessionStore: global.SessionStore ? {
                    currentSession: global.SessionStore.getCurrentSession()?.id,
                    totalSessions: global.SessionStore.getAllSessions().length
                } : null,
                panelManager: global.PanelManager ? {
                    panels: Object.keys(global.PanelManager._panels || {}),
                    visiblePanels: global.PanelManager.getVisiblePanels?.() || []
                } : null,
                transportManager: global.TransportManager ? {
                    state: global.TransportManager.getState(),
                    connected: global.TransportManager.isConnected()
                } : null,
                commandHistory: this._history.slice(-10) // Last 10 commands
            };

            return debugInfo;
        },

        async _handleReloadPage(data, commandData) {
            const { delay = 1000 } = data;

            setTimeout(() => {
                window.location.reload();
            }, delay);

            return {
                action: 'reload_scheduled',
                delay,
                timestamp: new Date().toISOString()
            };
        },

        /**
         * Get command history
         */
        getHistory(limit = 50) {
            return this._history.slice(-limit);
        },

        /**
         * Clear command history
         */
        clearHistory() {
            this._history = [];
        },

        /**
         * Get registered commands
         */
        getCommands() {
            return Array.from(this._commands.keys());
        }
    };

    // Export
    global.CommandHandler = CommandHandler;

})(typeof window !== 'undefined' ? window : globalThis);