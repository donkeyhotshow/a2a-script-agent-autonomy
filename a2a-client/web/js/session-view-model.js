(function (global) {
    'use strict';

    const MAX_MESSAGES = 200;

    function normalizeMessage(value, defaultRole = 'system') {
        if (!value) return null;
        const role = value.role || defaultRole;
        const content = typeof value === 'string'
            ? value
            : (value.content || value.message || value.text || '');
        if (!content) return null;
        return {
            id: value.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            role,
            content: String(content),
            timestamp: value.timestamp || new Date().toISOString(),
            metadata: value.metadata ? {...value.metadata} : {}
        };
    }

    const SessionViewModel = {
        sessionId: null,
        projectId: null,
        messages: [],
        execute: null,
        _listeners: new Map(),

        reset(sessionId = null, projectId = null) {
            this.sessionId = sessionId;
            this.projectId = projectId;
            this.messages = [];
            this.execute = null;
            this.emit('reset', {sessionId, projectId});
            this.emit('messages', []);
            this.emit('execute', null);
            return this;
        },

        setSession(sessionId) {
            if (!sessionId) return this;
            this.sessionId = sessionId;
            this.emit('session', sessionId);
            return this;
        },

        setProject(projectId) {
            if (!projectId) return this;
            this.projectId = projectId;
            this.emit('project', projectId);
            return this;
        },

        setMessages(messages = []) {
            if (!Array.isArray(messages)) return this;
            this.messages = messages
                .map((msg) => normalizeMessage(msg, 'assistant'))
                .filter(Boolean)
                .slice(-MAX_MESSAGES);
            this.emit('messages', [...this.messages]);
            return this;
        },

        pushMessage(message, role = 'assistant') {
            const normalized = normalizeMessage(message, role);
            if (!normalized) return this;
            const next = [...this.messages, normalized].slice(-MAX_MESSAGES);
            this.messages = next;
            this.emit('message', normalized);
            this.emit('messages', [...this.messages]);
            return this;
        },

        setExecute(execute) {
            this.execute = execute || null;
            this.emit('execute', this.execute);
            return this;
        },

        getState() {
            return {
                sessionId: this.sessionId,
                projectId: this.projectId,
                messages: [...this.messages],
                execute: this.execute
            };
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

        emit(event, payload) {
            const handlers = this._listeners.get(event);
            if (!handlers) return;
            handlers.forEach((handler) => {
                try {
                    handler(payload);
                } catch (err) {
                    console.error('[SessionViewModel] Handler failed for', event, err);
                }
            });
        }
    };

    global.SessionViewModel = SessionViewModel;
})(typeof window !== 'undefined' ? window : globalThis);
