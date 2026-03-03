/**
 * WebSocket Client for Real-time Communication
 * Provides WebSocket-based real-time updates in addition to SSE
 */

(function (global) {
    'use strict';

    const WebSocketClient = {
        // Configuration
        wsUrl: null,
        apiBase: '/api/v1',
        socket: null,
        sessionId: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        reconnectDelay: 3000,
        isConnecting: false,
        _listeners: new Map(),
        _heartbeatInterval: null,
        _messageQueue: [],
        _connectionState: 'disconnected', // disconnected, connecting, connected

        /**
         * Configure WebSocket client
         */
        configure(options = {}) {
            if (options.apiBase) this.apiBase = options.apiBase.replace(/\/?$/, '');
            if (options.wsUrl) this.wsUrl = options.wsUrl;
            return this;
        },

        /**
         * Connect to WebSocket server
         */
        connect(sessionId, options = {}) {
            const sid = sessionId || this.sessionId;
            
            // Determine WebSocket URL
            let wsUrl = this.wsUrl;
            if (!wsUrl) {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.host;
                wsUrl = `${protocol}//${host}${this.apiBase}/ws/${encodeURIComponent(sid)}`;
            }

            this.sessionId = sid;
            this._connectionState = 'connecting';
            this.emit('connecting', { sessionId: sid });

            if (this.socket) {
                this.disconnect();
            }

            console.log('[WebSocket] Connecting to:', wsUrl);
            this.isConnecting = true;

            try {
                this.socket = new WebSocket(wsUrl);

                this.socket.onopen = (event) => {
                    console.log('[WebSocket] Connected!');
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    this._connectionState = 'connected';
                    
                    // Send queued messages
                    this._flushMessageQueue();
                    
                    // Start heartbeat
                    this._startHeartbeat();
                    
                    this.emit('connected', { sessionId: sid, event });
                };

                this.socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('[WebSocket] Message:', data);
                        this._handleMessage(data);
                    } catch (e) {
                        console.error('[WebSocket] Failed to parse message:', e);
                    }
                };

                this.socket.onerror = (error) => {
                    console.error('[WebSocket] Error:', error);
                    this._connectionState = 'error';
                    this.emit('error', { error, sessionId: sid });
                };

                this.socket.onclose = (event) => {
                    console.log('[WebSocket] Closed:', event.code, event.reason);
                    this.isConnecting = false;
                    this._connectionState = 'disconnected';
                    this._stopHeartbeat();
                    
                    this.emit('disconnected', { 
                        sessionId: sid, 
                        code: event.code, 
                        reason: event.reason 
                    });

                    // Auto-reconnect if not a clean close
                    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this._scheduleReconnect();
                    }
                };

            } catch (e) {
                console.error('[WebSocket] Failed to create WebSocket:', e);
                this.isConnecting = false;
                this._connectionState = 'error';
                this.emit('error', { error: e, sessionId: sid });
            }
        },

        /**
         * Disconnect from WebSocket server
         */
        disconnect() {
            this._stopHeartbeat();
            
            if (this.socket) {
                this.socket.close(1000, 'Client disconnect');
                this.socket = null;
            }
            
            this._connectionState = 'disconnected';
            this.sessionId = null;
            this.reconnectAttempts = 0;
        },

        /**
         * Send message through WebSocket
         */
        send(type, payload = {}) {
            const message = {
                type,
                payload,
                sessionId: this.sessionId,
                timestamp: new Date().toISOString()
            };

            if (this._connectionState === 'connected' && this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify(message));
            } else {
                // Queue message for later
                this._messageQueue.push(message);
                console.log('[WebSocket] Queued message:', type);
            }
        },

        /**
         * Send task message
         */
        sendTask(task, options = {}) {
            this.send('task', {
                message: task,
                context: options.context || {},
                projectId: options.projectId || null
            });
        },

        /**
         * Send action approval
         */
        sendActionApproval(actionId, approved) {
            this.send('action_approval', {
                actionId,
                approved,
                sessionId: this.sessionId
            });
        },

        /**
         * Send step result
         */
        sendStepResult(stepId, result) {
            this.send('step_result', {
                stepId,
                result,
                sessionId: this.sessionId
            });
        },

        /**
         * Subscribe to event type
         */
        on(event, callback) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        },

        /**
         * Unsubscribe from event
         */
        off(event, callback) {
            this._listeners.get(event)?.delete(callback);
        },

        /**
         * Emit event to listeners
         */
        emit(event, data) {
            this._listeners.get(event)?.forEach(cb => {
                try { cb(data); } catch (e) { console.error('[WebSocket] Event handler error:', e); }
            });
        },

        /**
         * Check if connected
         */
        isConnected() {
            return this._connectionState === 'connected' && 
                   this.socket?.readyState === WebSocket.OPEN;
        },

        /**
         * Get connection state
         */
        getState() {
            return this._connectionState;
        },

        // Private methods
        
        _handleMessage(data) {
            const type = data.type || data.event || 'message';
            const payload = data.payload || data.data || data;
            
            // Emit specific event
            this.emit(type, payload);
            
            // Also emit generic message event
            this.emit('message', { type, payload });
        },

        _flushMessageQueue() {
            while (this._messageQueue.length > 0) {
                const msg = this._messageQueue.shift();
                if (this.socket?.readyState === WebSocket.OPEN) {
                    this.socket.send(JSON.stringify(msg));
                }
            }
        },

        _startHeartbeat() {
            this._heartbeatInterval = setInterval(() => {
                if (this.isConnected()) {
                    this.send('ping', { timestamp: Date.now() });
                }
            }, 30000);
        },

        _stopHeartbeat() {
            if (this._heartbeatInterval) {
                clearInterval(this._heartbeatInterval);
                this._heartbeatInterval = null;
            }
        },

        _scheduleReconnect() {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.emit('reconnecting', { 
                attempt: this.reconnectAttempts, 
                maxAttempts: this.maxReconnectAttempts,
                delay 
            });

            setTimeout(() => {
                if (this.sessionId) {
                    this.connect(this.sessionId);
                }
            }, delay);
        }
    };

    // Export
    global.WebSocketClient = WebSocketClient;

})(typeof window !== 'undefined' ? window : globalThis);
