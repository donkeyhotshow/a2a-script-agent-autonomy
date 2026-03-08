/**
 * SessionViewModel Adapter
 * Proxies to SessionStore with identical API for backward compatibility
 */

(function (global) {
    'use strict';

    const store = global.SessionStore;
    if (!store) {
        console.error('[SessionViewModel Adapter] SessionStore not found');
        return;
    }

    const SessionViewModelAdapter = {
        sessionId: null,
        projectId: null,
        messages: [],
        execute: null,
        _listeners: new Map(),

        init() {
            // Sync from store
            this.sessionId = store.sessionId;
            this.projectId = store.projectId;
            this.messages = store.messages;
            this.execute = store.execute;

            // Subscribe to store changes
            store.on('reset', () => this._forward('reset', store.getState()));
            store.on('session', (id) => { this.sessionId = id; this._forward('session', id); });
            store.on('project', (id) => { this.projectId = id; this._forward('project', id); });
            store.on('messages', (msgs) => { this.messages = msgs; this._forward('messages', msgs); });
            store.on('message', (msg) => this._forward('message', msg));
            store.on('execute', (exec) => { this.execute = exec; this._forward('execute', exec); });

            return this;
        },

        reset(sessionId = null, projectId = null) {
            store.reset(sessionId, projectId);
            return this;
        },

        setSession(sessionId) {
            store.setSession(sessionId);
            return this;
        },

        setProject(projectId) {
            store.setProject(projectId);
            return this;
        },

        setMessages(messages) {
            store.setMessages(messages);
            return this;
        },

        pushMessage(message, role = 'assistant') {
            store.pushMessage(message, role);
            return this;
        },

        setExecute(execute) {
            store.setExecute(execute);
            return this;
        },

        getState() {
            return store.getState();
        },

        on(event, callback) {
            if (typeof callback !== 'function') return () => {};
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        },

        off(event, callback) {
            this._listeners.get(event)?.delete(callback);
        },

        _forward(event, payload) {
            const handlers = this._listeners.get(event);
            if (!handlers) return;
            handlers.forEach(handler => {
                try {
                    handler(payload);
                } catch (err) {
                    console.error('[SessionViewModelAdapter] Handler failed:', err);
                }
            });
        }
    };

    // Export
    global.SessionViewModelAdapter = SessionViewModelAdapter;

})(typeof window !== 'undefined' ? window : globalThis);
