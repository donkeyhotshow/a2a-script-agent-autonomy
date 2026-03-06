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
        
        // Connection state
        connectionState: 'disconnected', // disconnected, connecting, connected
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        baseReconnectDelay: 3000,
        
        // Event handlers
        _listeners: new Map(),
        
        // Heartbeat
        _heartbeatInterval: null,
        _lastPong: null,

        /**
         * Initialize transport manager
         */
        init(options = {}) {
            this.apiBase = options.apiBase || this.apiBase;
            this.sessionId = options.sessionId || null;
            this.primaryTransport = options.primaryTransport || 'sse';
            
            console.log(`[TransportManager] Initialized (primary: ${this.primaryTransport})`);
            return this;
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
                const sseSuccess = await this._trySSE(sid);
                if (sseSuccess) {
                    this.activeTransport = 'sse';
                    this.connectionState = 'connected';
                    this.reconnectAttempts = 0;
                    this._emit('connected', { sessionId: sid, transport: 'sse' });
                    this._startHeartbeat();
                    return true;
                }
                
                // SSE failed - try WebSocket fallback
                console.log('[TransportManager] SSE failed, trying WebSocket fallback...');
                const wsSuccess = await this._tryWebSocket(sid);
                if (wsSuccess) {
                    this.activeTransport = 'websocket';
                    this.connectionState = 'connected';
                    this.reconnectAttempts = 0;
                    this._emit('connected', { sessionId: sid, transport: 'websocket', fallback: true });
                    this._startHeartbeat();
                    return true;
                }
            } else {
                // WebSocket as primary (not typical)
                const wsSuccess = await this._tryWebSocket(sid);
                if (wsSuccess) {
                    this.activeTransport = 'websocket';
                    this.connectionState = 'connected';
                    this.reconnectAttempts = 0;
                    this._emit('connected', { sessionId: sid, transport: 'websocket' });
                    this._startHeartbeat();
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
         * Try SSE connection
         */
        _trySSE(sessionId) {
            return new Promise((resolve) => {
                const token = global.apiIntegration?.token;
                const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
                const url = `${this.apiBase}/sse/${sessionId}${tokenQuery}`;

                console.log('[TransportManager] Trying SSE:', url);

                let eventSource = null;
                let connected = false;
                
                // Timeout for connection attempt
                const timeout = setTimeout(() => {
                    if (!connected && eventSource) {
                        console.log('[TransportManager] SSE connection timeout');
                        eventSource.close();
                        resolve(false);
                    }
                }, 10000);

                try {
                    eventSource = new EventSource(url);

                    eventSource.onopen = () => {
                        clearTimeout(timeout);
                        connected = true;
                        console.log('[TransportManager] SSE connected');
                        
                        // Store reference for later disconnect
                        this._sseConnection = eventSource;
                        
                        // Forward all SSE events through TransportManager
                        this._bindSSEEvents(eventSource);
                        
                        resolve(true);
                    };

                    eventSource.onerror = (error) => {
                        clearTimeout(timeout);
                        if (!connected) {
                            console.log('[TransportManager] SSE connection failed:', error);
                            resolve(false);
                        } else {
                            // Connection was established but now errored
                            this._handleTransportError('sse', error);
                        }
                    };

                } catch (e) {
                    clearTimeout(timeout);
                    console.error('[TransportManager] SSE creation failed:', e);
                    resolve(false);
                }
            });
        },

        /**
         * Bind SSE events to forward through TransportManager
         */
        _bindSSEEvents(eventSource) {
            const events = [
                'connected', 'message', 'log', 'progress', 'status', 
                'task_response', 'session_update', 'action_proposal', 
                'action_executing', 'step_result', 'complete', 'error',
                'node_added', 'node_updated', 'edge_added'
            ];

            events.forEach(eventName => {
                eventSource.addEventListener(eventName, (event) => {
                    try {
                        const data = event.data ? JSON.parse(event.data) : {};
                        this._emit(eventName, data);
                        
                        // Also emit as generic message for catch-all handlers
                        if (eventName !== 'message') {
                            this._emit('message', { type: eventName, data });
                        }
                    } catch (e) {
                        console.error(`[TransportManager] Failed to parse ${eventName}:`, e);
                    }
                });
            });

            // Generic onmessage handler
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this._emit('message', { type: 'generic', data });
                } catch (e) {
                    console.error('[TransportManager] Failed to parse generic message:', e);
                }
            };

            // Store for cleanup
            this._eventSource = eventSource;
        },

        /**
         * Try WebSocket connection
         */
        _tryWebSocket(sessionId) {
            return new Promise((resolve) => {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.host;
                const url = `${protocol}//${host}${this.apiBase}/ws/${encodeURIComponent(sessionId)}`;

                console.log('[TransportManager] Trying WebSocket:', url);

                let socket = null;
                let connected = false;

                // Timeout for connection attempt
                const timeout = setTimeout(() => {
                    if (!connected && socket) {
                        console.log('[TransportManager] WebSocket connection timeout');
                        socket.close();
                        resolve(false);
                    }
                }, 10000);

                try {
                    socket = new WebSocket(url);

                    socket.onopen = () => {
                        clearTimeout(timeout);
                        connected = true;
                        console.log('[TransportManager] WebSocket connected');
                        
                        this._wsConnection = socket;
                        this._bindWebSocketEvents(socket);
                        
                        resolve(true);
                    };

                    socket.onerror = () => {
                        clearTimeout(timeout);
                        if (!connected) {
                            console.log('[TransportManager] WebSocket connection failed');
                            resolve(false);
                        }
                    };

                    socket.onclose = () => {
                        clearTimeout(timeout);
                        if (!connected) {
                            resolve(false);
                        }
                    };

                } catch (e) {
                    clearTimeout(timeout);
                    console.error('[TransportManager] WebSocket creation failed:', e);
                    resolve(false);
                }
            });
        },

        /**
         * Bind WebSocket events
         */
        _bindWebSocketEvents(socket) {
            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const type = data.type || data.event || 'message';
                    
                    // Handle heartbeat
                    if (type === 'pong' || data.type === 'pong') {
                        this._lastPong = Date.now();
                        return;
                    }
                    
                    this._emit(type, data.payload || data);
                    this._emit('message', { type, data: data.payload || data });
                } catch (e) {
                    console.error('[TransportManager] WebSocket message parse error:', e);
                }
            };

            socket.onerror = (error) => {
                console.error('[TransportManager] WebSocket error:', error);
                this._handleTransportError('websocket', error);
            };

            socket.onclose = (event) => {
                console.log('[TransportManager] WebSocket closed:', event.code, event.reason);
                if (event.code !== 1000) {
                    this._handleTransportError('websocket', { code: event.code, reason: event.reason });
                }
            };

            this._webSocket = socket;
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
            this._stopHeartbeat();
            
            if (this._eventSource) {
                this._eventSource.close();
                this._eventSource = null;
            }
            
            if (this._webSocket) {
                this._webSocket.close(1000, 'Client disconnect');
                this._webSocket = null;
            }

            this.activeTransport = null;
            this.connectionState = 'disconnected';
            this._emit('disconnected', { sessionId: this.sessionId });
        },

        /**
         * Send message through active transport (WebSocket only - SSE is server-to-client only)
         */
        send(type, payload = {}) {
            if (this.activeTransport === 'websocket' && this._webSocket?.readyState === WebSocket.OPEN) {
                const message = {
                    type,
                    payload,
                    sessionId: this.sessionId,
                    timestamp: new Date().toISOString()
                };
                this._webSocket.send(JSON.stringify(message));
                return true;
            }
            
            // For SSE, use HTTP POST instead
            console.log('[TransportManager] Using HTTP POST for message (SSE is receive-only)');
            return this._sendViaHttp(type, payload);
        },

        /**
         * Send via HTTP when WebSocket unavailable
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
         * Start heartbeat for connection health monitoring
         */
        _startHeartbeat() {
            this._lastPong = Date.now();
            
            this._heartbeatInterval = setInterval(() => {
                // Check if we've received pong recently
                const elapsed = Date.now() - this._lastPong;
                if (elapsed > 90000) { // 90 seconds without pong
                    console.warn('[TransportManager] Heartbeat timeout, reconnecting...');
                    this._handleTransportError(this.activeTransport, { reason: 'heartbeat_timeout' });
                    return;
                }

                // Send ping through WebSocket if active
                if (this.activeTransport === 'websocket') {
                    this.send('ping', { timestamp: Date.now() });
                }
            }, 30000);
        },

        /**
         * Stop heartbeat
         */
        _stopHeartbeat() {
            if (this._heartbeatInterval) {
                clearInterval(this._heartbeatInterval);
                this._heartbeatInterval = null;
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
