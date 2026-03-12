(function (global) {
    'use strict';

    // Inline constants
    var MAX_MESSAGES = 100;

    // Inline simple normalizeMessage (no utils dep)
    function normalizeMessage(msg, role) {
        if (!msg || typeof msg !== 'object') {
            return { content: String(msg || ''), role: role || 'user', timestamp: Date.now() };
        }
        return {
            id: msg.id || 'msg_' + Date.now(),
            content: msg.content || msg.text || String(msg),
            role: msg.role || role || 'user',
            metadata: msg.metadata || {},
            timestamp: msg.timestamp || Date.now()
        };
    }

    // Inline SessionStoreCore (simplified)
    function createSessionStoreCore() {
        var state = {
            sessionId: null,
            projectId: null,
            messages: [],
            execute: null,
            context: null,
            status: 'idle',
            pendingForm: null,
            lastError: null,
            promisePending: false
        };
        var listeners = {};

        function emit(event, payload) {
            var handlers = listeners[event];
            if (!handlers) return;
            for (var i = 0; i < handlers.length; i++) {
                try {
                    handlers[i](payload);
                } catch (err) {
                    console.error('[SessionStore] Handler failed:', event, err);
                }
            }
        }

        return {
            getState: function() { return JSON.parse(JSON.stringify(state)); },
            get sessionId() { return state.sessionId; },
            get execute() { return state.execute; },
            get messages() { return state.messages.slice(); },

            isWaitingForInput: function() {
                return state.status === 'waiting' || state.pendingForm || (state.execute && state.execute.form && state.execute.form.choices && state.execute.form.choices.length > 0);
            },

            reset: function(sessionId, projectId) {
                state = {
                    sessionId: sessionId || null,
                    projectId: projectId || null,
                    messages: [],
                    execute: null,
                    context: null,
                    status: sessionId ? 'created' : 'idle',
                    pendingForm: null,
                    promisePending: false
                };
                emit('reset', this.getState());
            },

            setSession: function(sessionId, projectId) {
                state.sessionId = sessionId;
                if (projectId) state.projectId = projectId;
                emit('session', sessionId);
            },

            setExecute: function(execute) {
                state.execute = execute || null;
                emit('execute', state.execute);
                state.promisePending = false;
                emit('promisePending', false);

                // Replace ?. ?? 
                var hasChoices = execute && execute.form && execute.form.choices && execute.form.choices.length;
                if (hasChoices) {
                    state.pendingForm = execute.form;
                    state.status = 'waiting';
                    emit('pendingForm', execute.form);
                } else {
                    state.pendingForm = null;
                    emit('pendingForm', null);
                }

                if (execute && execute.message) {
                    var msg = typeof execute.message === 'string' ? { content: execute.message } : execute.message;
                    this.pushMessage(msg, 'assistant');
                }

                return this;
            },

            pushMessage: function(message, role) {
                var normalized = normalizeMessage(message, role);
                state.messages = state.messages.concat([normalized]).slice(-MAX_MESSAGES);
                emit('messages', state.messages.slice());
                emit('message', normalized);
            },

            on: function(event, callback) {
                if (!listeners[event]) listeners[event] = [];
                listeners[event].push(callback);
                return function() { 
                    var idx = listeners[event].indexOf(callback);
                    if (idx > -1) listeners[event].splice(idx, 1);
                };
            },

            setPromisePending: function(pending) {
                state.promisePending = pending;
                emit('promisePending', pending);
            },

            setError: function(error) {
                state.lastError = error;
                state.status = 'error';
                emit('error', error);
                this.pushMessage(error && error.message || String(error), 'system');
            },

            createSession: function(session) {
                var sid = session.id || session.sessionId;
                if (!sid) {
                    console.error('[SessionStore] createSession: No session ID');
                    return;
                }
                this.reset(sid, session.projectId || null);
                emit('sessionCreated', { id: sid });
            }
        };
    }

    // Inline SessionStorageAPI (simplified fetch)
    function createSessionStorageAPI(storageBase, storageMode) {
        return {
            createSessionWithForm: function(title) {
                var headers = { 'Content-Type': 'application/json', 'X-Storage-Mode': storageMode };
                return fetch(storageBase, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ title: title || 'New Session' })
                }).then(function(resp) {
                    if (!resp.ok) throw new Error('Create session failed: ' + resp.status);
                    return resp.json();
                }).then(function(data) {
                    if (!data.session) throw new Error('No session data');
                    return data.session;
                });
            }
        };
    }

    // Main SessionStore constructor
    function SessionStore(options) {
        options = options || {};
        this.core = createSessionStoreCore();
        this.storage = createSessionStorageAPI(options.storageBase || '/api/a2a/sessions', options.storageMode || 'storage');
        this._storageMode = options.storageMode || 'storage';

        // Storage mode methods
this.setStorageMode = (mode) => {
            this._storageMode = mode;
            console.log('[SessionStore] Storage mode:', mode);
            this.core.emit('storageMode', mode);
        };

        // Proxy core methods
        this.getState = function() { return this.core.getState(); };
        this.setSession = function() { return this.core.setSession.apply(this.core, arguments); };
        this.setExecute = function() { return this.core.setExecute.apply(this.core, arguments); };
        this.pushMessage = function() { return this.core.pushMessage.apply(this.core, arguments); };
        this.on = function() { return this.core.on.apply(this.core, arguments); };
        this.reset = function() { return this.core.reset.apply(this.core, arguments); };
        this.setPromisePending = function() { return this.core.setPromisePending.apply(this.core, arguments); };
        this.isWaitingForInput = function() { return this.core.isWaitingForInput(); };

        this.createSessionWithForm = function(title) { 
            return this.storage.createSessionWithForm(title).then(function(session) {
                this.core.setSession(session.id, session.projectId);
                this.core.setExecute(session.execute || null);
                this.core.emit('sessionCreated', session);
                console.log('[SessionStore] Session created:', session.id);
                return session;
            }.bind(this));
        }.bind(this);

        this.isPersistentStorage = function() {
            return this._storageMode === 'storage';
        };

        this.debug = function() {
            console.log('[SessionStore] State:', this.getState());
        };
    }

    // Global exports - BACKWARD COMPATIBLE
    global.SessionStoreClass = SessionStore;
    global.SessionStore = new SessionStore();

    console.log('[SessionStore] ES5 Loaded - globals set');

})(typeof window !== 'undefined' ? window : globalThis);

