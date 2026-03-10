/**
 * Poll Transport - Pull model
 * @deprecated HTTP polling is disabled in the new A2A protocol.
 * Use SSE Transport (sse-transport.js) or WebSocket Transport (websocket-transport.js) instead.
 * This stub remains for backwards compatibility.
 *
 * Web requests updates via GET /api/sessions/updates?sessionIds=...
 * No SSE/WebSocket - simple fetch polling
 */
(function (global) {
    'use strict';

    class PollTransport {
        constructor(manager, sessionId) {
            this.manager = manager;
            this.sessionId = sessionId;
            this.intervalId = null;
            this.pollIntervalMs = 2000;
        }

        async connect() {
            this.connected = true;
            this._startPolling();
            return true;
        }

        disconnect() {
            this._stopPolling();
            this.connected = false;
        }

        _startPolling() {
            if (this.intervalId) return;
            this.intervalId = setInterval(() => this._poll(), this.pollIntervalMs);
        }

        _stopPolling() {
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
        }

        async _poll() {
            if (!this.connected || !this.sessionId) return;
            try {
                // HTTP polling for async requests is disabled in the new protocol.
                // PollTransport remains as a no-op stub for backwards compatibility.
                console.warn('[PollTransport] _poll called but HTTP polling is disabled in the new protocol.');
            } catch (e) {
                console.warn('[PollTransport] Poll error:', e);
            }
        }

        _emit(event, data) {
            this.manager?._emit?.(event, data);
        }

        bindEvents() {
            // Poll transport emits from _poll - no event binding needed
        }
    }

    global.PollTransport = PollTransport;
})(typeof window !== 'undefined' ? window : globalThis);
