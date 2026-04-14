/**
 * Web daemon — minimal event emitter (shared by dialog-loader and dialog-promise-poll).
 */
(function (global) {
    'use strict';

    const root = global.__a2aDaemons || (global.__a2aDaemons = {});

    // Fallback defaults if config not available
    root.timingMs = root.timingMs || function(key) {
        const defaults = {
            MIN_LOADER_MS: 5000,
            PROMISE_POLL_INTERVAL: 5000
        };
        var v = defaults[key];
        return typeof v === 'number' && v > 0 ? v : 5000;
    };

    root.createEventEmitter = function createEventEmitter() {
        const listeners = new Map();

        return {
            on: function (event, callback) {
                if (!listeners.has(event)) listeners.set(event, new Set());
                listeners.get(event).add(callback);
                return () => this.off(event, callback);
            },
            once: function (event, callback) {
                const wrapper = (...args) => {
                    this.off(event, wrapper);
                    callback.apply(this, args);
                };
                return this.on(event, wrapper);
            },
            off: function (event, callback) {
                const handlers = listeners.get(event);
                if (handlers) {
                    handlers.delete(callback);
                    if (handlers.size === 0) listeners.delete(event);
                }
            },
            emit: function (event, payload) {
                const handlers = listeners.get(event);
                if (!handlers) return;
                handlers.forEach((handler) => {
                    try {
                        handler(payload);
                    } catch (err) {
                        console.error('[EventEmitter] Handler failed:', event, err);
                        this.emit('error', { event, payload, error: err });
                    }
                });
            },
        };
    };
})(typeof window !== 'undefined' ? window : globalThis);
