/**
 * WebSocket Transport
 */
(function (global) {
    'use strict';

    class WebSocketTransport extends global.BaseTransport {
        constructor(manager, sessionId) {
            super(manager, sessionId);
            this.socket = null;
        }

        /**
         * Connect via WebSocket
         */
        async connect() {
            return new Promise((resolve) => {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.host;
                const url = `${protocol}//${host}${this.manager.apiBase}/ws/${encodeURIComponent(this.sessionId)}`;

                console.log('[WebSocketTransport] Connecting:', url);

                let connected = false;

                // Timeout for connection attempt
                const timeout = setTimeout(() => {
                    if (!connected && this.socket) {
                        console.log('[WebSocketTransport] Connection timeout');
                        this.socket.close();
                        resolve(false);
                    }
                }, 10000);

                try {
                    this.socket = new WebSocket(url);

                    this.socket.onopen = () => {
                        clearTimeout(timeout);
                        connected = true;
                        this.connected = true;
                        console.log('[WebSocketTransport] Connected');
                        resolve(true);
                    };

                    this.socket.onerror = () => {
                        clearTimeout(timeout);
                        if (!connected) {
                            console.log('[WebSocketTransport] Connection failed');
                            resolve(false);
                        }
                    };

                    this.socket.onclose = () => {
                        clearTimeout(timeout);
                        if (!connected) {
                            resolve(false);
                        }
                    };

                } catch (e) {
                    clearTimeout(timeout);
                    console.error('[WebSocketTransport] Creation failed:', e);
                    resolve(false);
                }
            });
        }

        /**
         * Disconnect WebSocket
         */
        disconnect() {
            if (this.socket) {
                this.socket.close(1000, 'Client disconnect');
                this.socket = null;
            }
            super.disconnect();
        }

        /**
         * Send message through WebSocket
         */
        send(type, payload = {}) {
            if (this.socket?.readyState === WebSocket.OPEN) {
                const message = {
                    type,
                    payload,
                    sessionId: this.sessionId,
                    timestamp: new Date().toISOString()
                };
                this.socket.send(JSON.stringify(message));
                return true;
            }
            return false;
        }

        /**
         * Bind WebSocket events
         */
        bindEvents() {
            if (!this.socket) return;

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const type = data.type || data.event || 'message';

                    // Handle heartbeat
                    if (type === 'pong' || data.type === 'pong') {
                        this.manager._heartbeatManager.updateLastPong();
                        return;
                    }

                    this._emit(type, data.payload || data);
                    this._emit('message', { type, data: data.payload || data });
                } catch (e) {
                    console.error('[WebSocketTransport] Message parse error:', e);
                }
            };

            this.socket.onerror = (error) => {
                console.error('[WebSocketTransport] Error:', error);
                this.manager._handleTransportError('websocket', error);
            };

            this.socket.onclose = (event) => {
                console.log('[WebSocketTransport] Closed:', event.code, event.reason);
                if (event.code !== 1000) {
                    this.manager._handleTransportError('websocket', { code: event.code, reason: event.reason });
                }
            };
        }
    }

    // Export
    global.WebSocketTransport = WebSocketTransport;

})(typeof window !== 'undefined' ? window : globalThis);