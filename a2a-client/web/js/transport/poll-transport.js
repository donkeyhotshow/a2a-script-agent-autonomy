/**
 * Poll Transport - Pull model
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
                // FIX: Use correct server endpoint - batch status by promiseIds
                // Note: This requires session to track promiseId, not just sessionId
                const url = `/api/v1/requests/status?ids=${encodeURIComponent(this.sessionId)}`;
                console.log('[PollTransport] Polling URL (FIXED):', url);
                const res = await fetch(url);
                const data = await res.json().catch(() => ({}));
                const updates = data?.data?.updates ?? [];
                for (const u of updates) {
                    if (u.sessionId !== this.sessionId) continue;
                    this._emit('task_response', u);
                    this._emit('message', { type: 'task_response', data: u });
                    if (u.execute) this._emit('execute', u.execute);
                    if (u.context) this._emit('context', u.context);
                    if (u.messages?.length) this._emit('messages', u.messages);
                }
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
