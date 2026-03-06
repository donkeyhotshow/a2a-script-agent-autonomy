/**
 * Base Transport Class - Abstract base for all transport implementations
 */
(function (global) {
    'use strict';

    class BaseTransport {
        constructor(manager, sessionId) {
            this.manager = manager;
            this.sessionId = sessionId;
            this.connected = false;
            this.connection = null;
        }

        /**
         * Connect to transport
         * @returns {Promise<boolean>} success
         */
        async connect() {
            throw new Error('connect() must be implemented by subclass');
        }

        /**
         * Disconnect transport
         */
        disconnect() {
            this.connected = false;
            this.connection = null;
        }

        /**
         * Send message (WebSocket only - SSE is receive-only)
         */
        send(type, payload) {
            throw new Error('send() not supported by this transport');
        }

        /**
         * Bind transport events to forward through manager
         */
        bindEvents() {
            throw new Error('bindEvents() must be implemented by subclass');
        }

        /**
         * Check if transport is connected
         */
        isConnected() {
            return this.connected;
        }

        /**
         * Emit event through manager
         */
        _emit(event, data) {
            this.manager._emit(event, data);
        }
    }

    // Export
    global.BaseTransport = BaseTransport;

})(typeof window !== 'undefined' ? window : globalThis);