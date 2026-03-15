/**
 * SessionStore Core - State management and events
 * Single source of truth for session state
 */

import { normalizeMessage, MAX_MESSAGES } from '../utils/normalizers.js';

export class SessionStoreCore {
    constructor() {
        this._state = {
            sessionId: null,
            projectId: null,
            messages: [],
            execute: null,
            context: null,
            status: 'idle',
            pendingForm: null,
            lastError: null,
            promisePending: false,
            _waitIndicatorActive: false,
            currentStep: 0,
            steps: []
        };

        this._listeners = new Map();
    }

    getState() {
        return { ...this._state };
    }

    // Getters
    get sessionId() { return this._state.sessionId; }
    get projectId() { return this._state.projectId; }
    get messages() { return [...this._state.messages]; }
    get execute() { return this._state.execute; }
    get pendingForm() { return this._state.pendingForm; }
    get context() { return this._state.context; }
    set context(value) { this._state.context = value; }
    get status() { return this._state.status; }
    set status(value) { this._state.status = value; }

    // Computed
    isWaitingForInput() {
        return this._state.status === 'waiting' ||
               this._state.pendingForm !== null ||
               this._state.execute?.form?.choices?.length > 0 ||
               this._state.execute?.form?.input;
    }

    isActive() {
        return this._state.status === 'active' || this._state.status === 'waiting';
    }

    isInputBlocked() {
        return this._state.promisePending || this._state.status === 'loading';
    }

    setPromisePending(pending) {
        this._state.promisePending = pending;
        this._emit('promisePending', pending);
        return this;
    }

    // State modifiers
    reset(sessionId = null, projectId = null) {
        this._state = {
            sessionId,
            projectId,
            messages: [],
            execute: null,
            context: null,
            status: sessionId ? 'created' : 'idle',
            pendingForm: null,
            lastError: null,
            promisePending: false
        };
        this._emit('reset', this.getState());
        return this;
    }

    setSession(sessionId, projectId = null) {
        this._state.sessionId = sessionId;
        if (projectId) this._state.projectId = projectId;
        this._emit('session', sessionId);
        return this;
    }

    createSession(session) {
        const { id, sessionId, projectId, task, title } = session || {};
        const sid = id || sessionId;
        const pid = projectId || this._state.projectId;

        if (!sid) {
            console.error('[SessionStore] createSession: No session ID provided');
            return this;
        }

        this.reset(sid, pid);
        this._state.status = 'created';
        this._emit('sessionCreated', { id: sid, projectId: pid, task, title });
        return this;
    }

    setProject(projectId) {
        this._state.projectId = projectId;
        this._emit('project', projectId);
        return this;
    }

    setStatus(status) {
        this._state.status = status;
        this._emit('status', status);
        return this;
    }

    setExecute(execute) {
        this._state.execute = execute || null;
        this._emit('execute', this._state.execute);

        const hadWaitIndicator = this._state._waitIndicatorActive;
        if (hadWaitIndicator && execute && !execute.wait) {
            this._state._waitIndicatorActive = false;
        }

        this._state.promisePending = false;
        this._emit('promisePending', false);

        // Поддержка формы с choices или input полями
        if (execute?.form?.choices || execute?.form?.input) {
            this._state.pendingForm = execute.form;
            this._state.status = 'waiting';
            this._emit('pendingForm', execute.form);
        } else {
            this._state.pendingForm = null;
            this._emit('pendingForm', null);
        }

        if (execute?.message) {
            const msg = typeof execute.message === 'string'
                ? { content: execute.message }
                : execute.message;
            this.pushMessage(msg, 'assistant');
        }

        // Handle auto-execute, finalResult, wait etc. (simplified)
        // ... (full logic preserved in main file)

        return this;
    }

    setContext(context) {
        this._state.context = context || null;
        this._emit('context', this._state.context);
        return this;
    }

    setMessages(messages) {
        if (!Array.isArray(messages)) return this;
        
        const alreadyNormalized = messages.every(m => m.id && m.timestamp);
        if (alreadyNormalized && this._state.messages.length > 0) return this;
        
        this._state.messages = messages
            .map(m => normalizeMessage(m, 'assistant'))
            .filter(Boolean)
            .slice(-MAX_MESSAGES);

        this._emit('messages', [...this._state.messages]);
        return this;
    }

    appendMessages(messages) {
        if (!Array.isArray(messages)) return this;
        const normalized = messages.map(m => normalizeMessage(m, 'assistant')).filter(Boolean);
        this._state.messages = [...this._state.messages, ...normalized].slice(-MAX_MESSAGES);
        this._emit('messages', [...this._state.messages]);
        return this;
    }

    pushMessage(message, role = 'assistant') {
        const normalized = normalizeMessage(message, role);
        if (!normalized) return this;
        this._state.messages = [...this._state.messages, normalized].slice(-MAX_MESSAGES);
        this._emit('message', normalized);
        this._emit('messages', [...this._state.messages]);
        return this;
    }

    setError(error) {
        this._state.lastError = error;
        this._state.status = 'error';
        this._emit('error', error);
        this.pushMessage({ content: error?.message || String(error), metadata: { type: 'error' } }, 'system');
        return this;
    }

    applyServerResponse(data) {
        const { sessionId, projectId, status, context, execute, messages, finalResult } = data;

        if (projectId) this.setProject(projectId);
        if (sessionId) this.setSession(sessionId, projectId);

        if (status) this.setStatus(status);
        if (context) this.setContext(context);
        if (execute) this.setExecute(execute);
        else if (finalResult) this.setExecute({ finalResult });
        if (messages?.length) this.appendMessages(messages);

        this._emit('serverResponse', data);
        return this;
    }

    renameSession(sessionId, newName) {
        this._emit('rename', { sessionId, newName });
        return this;
    }

    // Events
    on(event, callback) {
        if (typeof callback !== 'function') return () => {};
        if (!this._listeners.has(event)) this._listeners.set(event, new Set());
        this._listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        this._listeners.get(event)?.delete(callback);
    }

    _emit(event, payload) {
        const handlers = this._listeners.get(event);
        if (!handlers) return;
        handlers.forEach(handler => {
            try {
                handler(payload);
            } catch (err) {
                console.error('[SessionStore] Handler failed for', event, err);
            }
        });
    }
}

