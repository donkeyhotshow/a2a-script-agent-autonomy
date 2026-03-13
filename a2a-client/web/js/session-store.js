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
            get projectId() { return state.projectId; },
            get execute() { return state.execute; },
            get pendingForm() { return state.pendingForm; },
            get context() { return state.context; },
            set context(value) { state.context = value; },
            get messages() { return state.messages.slice(); },

            isWaitingForInput: function() {
                return state.status === 'waiting' || state.pendingForm || (state.execute && state.execute.form && (state.execute.form.choices?.length > 0 || state.execute.form.input));
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

                // Поддержка формы с choices или input полями
                var hasForm = execute && execute.form && (execute.form.choices?.length || execute.form.input);
                if (hasForm) {
                    state.pendingForm = execute.form;
                    state.status = 'waiting';
                    emit('pendingForm', execute.form);
                } else {
                    state.pendingForm = null;
                    emit('pendingForm', null);
                }

                // Don't add message to history here - UI will display it from execute.message
                // This prevents duplicates with messages from API

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
            },

            // Expose emit for external use (e.g., setContext, setStatus)
            emit: emit
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
            console.log('[SessionStore] core check:', !!this.core, typeof this.core?.emit);
            if (this.core && typeof this.core.emit === 'function') {
                this.core.emit('storageMode', mode);
            } else {
                console.warn('[SessionStore] Cannot emit storageMode: core missing or invalid');
            }
        };

// Proxy core methods
        this.getState = function() { return this.core.getState(); };
        this.setSession = function() { return this.core.setSession.apply(this.core, arguments); };
        this.setExecute = function() { 
            console.log('[SessionStore] setExecute called with:', arguments[0]);
            // Don't add message to history here - it's handled by the UI layer
            // This prevents duplicates with messages from API
            return this.core.setExecute.apply(this.core, arguments); 
        };
        this.pushMessage = function() { return this.core.pushMessage.apply(this.core, arguments); };
        this.on = function() { return this.core.on.apply(this.core, arguments); };
        this.reset = function() { return this.core.reset.apply(this.core, arguments); };
        this.setPromisePending = function() { return this.core.setPromisePending.apply(this.core, arguments); };
        this.isWaitingForInput = function() { return this.core.isWaitingForInput(); };

        // Expose core properties for window-events.js compatibility
        Object.defineProperty(this, 'execute', {
            get: function() { return this.core ? this.core.execute : null; },
            configurable: true
        });
        Object.defineProperty(this, '_state', {
            get: function() { return this.core ? this.core.getState() : {}; },
            configurable: true
        });
        Object.defineProperty(this, 'pendingForm', {
            get: function() { return this.core ? this.core.pendingForm : null; },
            configurable: true
        });

        // Legacy API for window-state.js compatibility
        this.setMessages = function(messages) {
            if (!this.core) {
                console.warn('[SessionStore] setMessages: core missing');
                return;
            }
            
            // Check if messages are already set to avoid duplicates
            const currentMessages = this.core.messages;
            if (currentMessages && currentMessages.length > 0) {
                console.log('[SessionStore] Messages already set, skipping');
                return;
            }
            
            // Just add new messages without resetting
            if (Array.isArray(messages)) {
                messages.forEach(msg => this.pushMessage(msg, msg.role || 'user'));
            }
            console.log('[SessionStore] Set', messages?.length || 0, 'messages');
        };

        this.setContext = function(context) {
            if (this.core) {
                this.core.context = context;
                this.core.emit('context', context);
            }
        };

        this.setStatus = function(status) {
            if (this.core) {
                this.core.status = status;
                this.core.emit('status', status);
            }
        };

        this.renameSession = function(sessionId, newName) {
            console.log('[SessionStore] renameSession:', sessionId, newName);
            // Could add title to state if needed
        };

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

