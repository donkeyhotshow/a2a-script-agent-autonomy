/**
 * Transport Manager - Unified real-time communication
 * Primary: SSE (Server-Sent Events)
 * Fallback: WebSocket (when SSE blocked/fails)
 * No HTTP polling for async requests (removed)
 */
(function (global) {
    'use strict';

    const TransportManager = {
        // Configuration
        apiBase: '/api',
        sessionId: null,

        // Transport state
        primaryTransport: 'sse',      // 'sse' | 'websocket'
        activeTransport: null,          // 'sse' | 'websocket' | null
        currentTransportInstance: null,

        // Connection state
        connectionState: 'disconnected', // disconnected, connecting, connected
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        baseReconnectDelay: 3000,

        // Managers
        _heartbeatManager: null,

        // Event handlers
        _listeners: new Map(),

        /**
         * Initialize transport manager
         */
        init(options = {}) {
            // Load dependencies
            this._loadDependencies();

            this.apiBase = options.apiBase || this.apiBase;
            this.primaryTransport = options.primaryTransport || 'sse';
            this._heartbeatManager = new global.HeartbeatManager(this);

            console.log(`[TransportManager] Initialized (primary: ${this.primaryTransport})`);
            return this;
        },

        /**
         * Load transport dependencies
         */
        _loadDependencies() {
            // These should be loaded via script tags or module system
            if (!global.BaseTransport) {
                console.error('[TransportManager] BaseTransport not loaded');
            }
            if (!global.SSETransport) {
                console.error('[TransportManager] SSETransport not loaded');
            }
            if (!global.WebSocketTransport) {
                console.error('[TransportManager] WebSocketTransport not loaded');
            }
            if (!global.HeartbeatManager) {
                console.error('[TransportManager] HeartbeatManager not loaded');
            }
        },

        /**
         * Connect to session - tries SSE first, falls back to WebSocket
         */
        async connect(sessionId, options = {}) {
            const sid = sessionId || this.sessionId;
            if (!sid) {
                throw new Error('Session ID required');
            }

            this.sessionId = sid;
            this.connectionState = 'connecting';
            this._emit('connecting', { sessionId: sid });

            // Disconnect any existing transport
            this.disconnect();

            // Try primary transport first
            if (this.primaryTransport === 'sse') {
                const sseSuccess = await this._tryTransport(global.SSETransport, sid);
                if (sseSuccess) {
                    this.activeTransport = 'sse';
                    this.connectionState = 'connected';
                    this.reconnectAttempts = 0;
                    this._emit('connected', { sessionId: sid, transport: 'sse' });
                    this._heartbeatManager.start();
                    return true;
                }

                // SSE failed - try WebSocket fallback
                console.log('[TransportManager] SSE failed, trying WebSocket fallback...');
                const wsSuccess = await this._tryTransport(global.WebSocketTransport, sid);
                if (wsSuccess) {
                    this.activeTransport = 'websocket';
                    this.connectionState = 'connected';
                    this.reconnectAttempts = 0;
                    this._emit('connected', { sessionId: sid, transport: 'websocket', fallback: true });
                    this._heartbeatManager.start();
                    return true;
                }
            } else {
                // WebSocket as primary (not typical)
                const wsSuccess = await this._tryTransport(global.WebSocketTransport, sid);
                if (wsSuccess) {
                    this.activeTransport = 'websocket';
                    this.connectionState = 'connected';
                    this.reconnectAttempts = 0;
                    this._emit('connected', { sessionId: sid, transport: 'websocket' });
                    this._heartbeatManager.start();
                    return true;
                }
            }

            // Both failed
            this.connectionState = 'disconnected';
            this._emit('error', {
                message: 'All transports failed',
                sessionId: sid,
                attempts: this.reconnectAttempts
            });

            return false;
        },

        /**
         * Try specific transport
         */
        async _tryTransport(TransportClass, sessionId) {
            try {
                this.currentTransportInstance = new TransportClass(this, sessionId);
                const success = await this.currentTransportInstance.connect();
                if (success) {
                    this.currentTransportInstance.bindEvents();
                }
                return success;
            } catch (e) {
                console.error(`[TransportManager] ${TransportClass.name} failed:`, e);
                return false;
            }
        },

        /**
         * Handle transport errors and attempt reconnection/fallback
         */
        _handleTransportError(transport, error) {
            this._emit('transportError', { transport, error, sessionId: this.sessionId });

            if (this.connectionState !== 'connected') return;

            this.connectionState = 'connecting';
            this._emit('reconnecting', {
                transport,
                attempt: this.reconnectAttempts + 1,
                maxAttempts: this.maxReconnectAttempts
            });

            // Try to reconnect with same transport first
            this._scheduleReconnect();
        },

        /**
         * Schedule reconnection with exponential backoff
         */
        _scheduleReconnect() {
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('[TransportManager] Max reconnection attempts reached');
                this.connectionState = 'disconnected';
                this._emit('disconnected', { sessionId: this.sessionId, reason: 'max_attempts' });
                return;
            }

            this.reconnectAttempts++;
            const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

            console.log(`[TransportManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
                this.connect(this.sessionId);
            }, delay);
        },

        /**
         * Disconnect all transports
         */
        disconnect() {
            this._heartbeatManager?.stop();

            if (this.currentTransportInstance) {
                this.currentTransportInstance.disconnect();
                this.currentTransportInstance = null;
            }

            this.activeTransport = null;
            this.connectionState = 'disconnected';
            this._emit('disconnected', { sessionId: this.sessionId });
        },

        /**
         * Send message through active transport
         */
        send(type, payload = {}) {
            if (this.currentTransportInstance?.send) {
                return this.currentTransportInstance.send(type, payload);
            }

            // For transports without send capability, use HTTP POST
            console.log('[TransportManager] Using HTTP POST for message');
            return this._sendViaHttp(type, payload);
        },

        /**
         * Send via HTTP when transport send unavailable
         */
        async _sendViaHttp(type, payload) {
            try {
                const response = await fetch(`${this.apiBase}/sessions/${this.sessionId}/message`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${global.apiIntegration?.token || ''}`
                    },
                    body: JSON.stringify({ type, payload })
                });
                return response.ok;
            } catch (e) {
                console.error('[TransportManager] HTTP send failed:', e);
                return false;
            }
        },

        /**
         * Subscribe to events
         */
        on(event, callback) {
            if (typeof callback !== 'function') return () => {};
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        },

        /**
         * Unsubscribe from events
         */
        off(event, callback) {
            this._listeners.get(event)?.delete(callback);
        },

        /**
         * Emit event
         */
        _emit(event, data) {
            const handlers = this._listeners.get(event);
            if (!handlers) return;
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (e) {
                    console.error(`[TransportManager] Handler error for ${event}:`, e);
                }
            });
        },

        /**
         * Get current connection state
         */
        getState() {
            return {
                connectionState: this.connectionState,
                activeTransport: this.activeTransport,
                sessionId: this.sessionId,
                reconnectAttempts: this.reconnectAttempts
            };
        },

        /**
         * Check if connected
         */
        isConnected() {
            return this.connectionState === 'connected';
        }
    };

    // Export
    global.TransportManager = TransportManager;

})(typeof window !== 'undefined' ? window : globalThis);