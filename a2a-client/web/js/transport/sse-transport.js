/**
 * SSE (Server-Sent Events) Transport
 */
(function (global) {
    'use strict';

    class SSETransport extends global.BaseTransport {
        constructor(manager, sessionId) {
            super(manager, sessionId);
            this.eventSource = null;
        }

        /**
         * Connect via SSE
         */
        async connect() {
            return new Promise((resolve) => {
                const token = global.apiIntegration?.token;
                const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
                const url = `${this.manager.apiBase}/sse/${this.sessionId}${tokenQuery}`;

                console.log('[SSETransport] Connecting:', url);

                let connected = false;

                // Timeout for connection attempt
                const timeout = setTimeout(() => {
                    if (!connected && this.eventSource) {
                        console.log('[SSETransport] Connection timeout');
                        this.eventSource.close();
                        resolve(false);
                    }
                }, 10000);

                try {
                    this.eventSource = new EventSource(url);

                    this.eventSource.onopen = () => {
                        clearTimeout(timeout);
                        connected = true;
                        this.connected = true;
                        console.log('[SSETransport] Connected');
                        resolve(true);
                    };

                    this.eventSource.onerror = (error) => {
                        clearTimeout(timeout);
                        if (!connected) {
                            console.log('[SSETransport] Connection failed:', error);
                            resolve(false);
                        } else {
                            // Connection was established but now errored
                            this.manager._handleTransportError('sse', error);
                        }
                    };

                } catch (e) {
                    clearTimeout(timeout);
                    console.error('[SSETransport] Creation failed:', e);
                    resolve(false);
                }
            });
        }

        /**
         * Disconnect SSE
         */
        disconnect() {
            if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = null;
            }
            super.disconnect();
        }

        /**
         * Bind SSE events to forward through manager
         */
        bindEvents() {
            if (!this.eventSource) return;

            const events = [
                'connected', 'message', 'log', 'progress', 'status',
                'task_response', 'session_update', 'action_proposal',
                'action_executing', 'step_result', 'complete', 'error',
                'node_added', 'node_updated', 'edge_added',
                'tester_command', 'tester_broadcast'
            ];

            events.forEach(eventName => {
                this.eventSource.addEventListener(eventName, (event) => {
                    try {
                        const data = event.data ? JSON.parse(event.data) : {};
                        this._emit(eventName, data);

                        // Also emit as generic message for catch-all handlers
                        if (eventName !== 'message') {
                            this._emit('message', { type: eventName, data });
                        }
                    } catch (e) {
                        console.error(`[SSETransport] Failed to parse ${eventName}:`, e);
                    }
                });
            });

            // Generic onmessage handler
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this._emit('message', { type: 'generic', data });
                } catch (e) {
                    console.error('[SSETransport] Failed to parse generic message:', e);
                }
            };
        }
    }

    // Export
    global.SSETransport = SSETransport;

})(typeof window !== 'undefined' ? window : globalThis);