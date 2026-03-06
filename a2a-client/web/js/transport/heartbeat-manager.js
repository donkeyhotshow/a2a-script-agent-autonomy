/**
 * Heartbeat Manager - Monitors connection health
 */
(function (global) {
    'use strict';

    class HeartbeatManager {
        constructor(manager) {
            this.manager = manager;
            this.interval = null;
            this.lastPong = null;
            this.heartbeatInterval = 30000; // 30 seconds
            this.timeoutThreshold = 90000; // 90 seconds
        }

        /**
         * Start heartbeat monitoring
         */
        start() {
            this.lastPong = Date.now();

            this.interval = setInterval(() => {
                this._checkHealth();
            }, this.heartbeatInterval);
        }

        /**
         * Stop heartbeat monitoring
         */
        stop() {
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
        }

        /**
         * Update last pong timestamp
         */
        updateLastPong() {
            this.lastPong = Date.now();
        }

        /**
         * Check connection health
         */
        _checkHealth() {
            const elapsed = Date.now() - this.lastPong;
            if (elapsed > this.timeoutThreshold) {
                console.warn('[HeartbeatManager] Timeout, reconnecting...');
                this.manager._handleTransportError(this.manager.activeTransport, { reason: 'heartbeat_timeout' });
                return;
            }

            // Send ping through WebSocket if active
            if (this.manager.activeTransport === 'websocket') {
                this.manager.send('ping', { timestamp: Date.now() });
            }
        }
    }

    // Export
    global.HeartbeatManager = HeartbeatManager;

})(typeof window !== 'undefined' ? window : globalThis);