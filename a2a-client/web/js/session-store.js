/**
 * SessionStore - Главное хранилище состояния сессии
 * 
 * Иерархия классов:
 * EventEmitter (abstract)
 * └── SessionStoreCore extends EventEmitter
 *     └── SessionStore extends SessionStoreCore
 * 
 * Использует:
 * - DialogState - управление состоянием диалога
 * - DialogLoader / DialogPromise — web/js/daemons/* (load before this script)
 * 
 * Обратная совместимость: window.SessionStore работает как раньше
 */

(function (global) {
    'use strict';

    const D = global.__a2aDaemons;
    if (!D || typeof D.createDialogLoader !== 'function' || typeof D.createDialogPromise !== 'function') {
        throw new Error('[SessionStore] Load js/daemons/emitter.js, dialog-loader.js, dialog-promise-poll.js before session-store.js');
    }
    const createDialogLoader = D.createDialogLoader;
    const createDialogPromise = D.createDialogPromise;

    // normalizeMessage (inline)
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

    const MAX_MESSAGES = 100;

    // === SessionStoreCore (inline) - SINGLETON PER ACTIVE SESSION
    function createSessionStoreCore(sessionId = null) {
        const state = {
            sessionId,
            projectId: null,
            messages: [],
            execute: null,
            context: null,
            status: sessionId ? 'created' : 'idle',
            pendingForm: null,
            lastError: null,
            promisePending: false,
            _waitIndicatorActive: false
        };
        const listeners = {};
        
        // Per-instance promise
        const promise = createDialogPromise();
        
        // Per-instance loaders map - sessionId -> DialogLoader
        const sessionLoaders = new Map();
        
        function getLoader(sid = null) {
            const id = sid || state.sessionId;
            if (!id) return null;
            if (!sessionLoaders.has(id)) {
                const loader = createDialogLoader();
                // Forward per-session loader events
                loader.on('loader', (data) => {
                    if (data.active) {
                        emit(`loader:start/${id}`, { sessionId: id, active: true });
                    } else {
                        emit(`loader:stop/${id}`, { sessionId: id, active: false });
                    }
                });
                sessionLoaders.set(id, loader);
            }
            return sessionLoaders.get(id);
        }
        
        function emit(event, payload) {
            const handlers = listeners[event];
            if (!handlers) return;
            handlers.forEach(handler => {
                try { handler(payload); }
                catch (err) { 
                    console.error('[SessionStore] Handler failed:', event, err);
                    // FIX: Emit error event instead of silently suppressing it
                    emit('error', { event, payload, error: err });
                }
            });
        }

        return {
            getState: function(sid = null) { 
                const loaderActive = getLoader(sid)?.isActive || false;
                return { 
                    ...state, 
                    loaderActive,
                    promisePending: promise.isPending,
                    sessionLoaders: Array.from(sessionLoaders.keys())
                }; 
            },
            
            on: function(event, handler) {
                if (!listeners[event]) listeners[event] = [];
                listeners[event].push(handler);
                return () => this.off(event, handler);
            },
            
            off: function(event, handler) {
                if (!listeners[event]) return;
                const idx = listeners[event].indexOf(handler);
                if (idx >= 0) listeners[event].splice(idx, 1);
            },

            emit: emit,

            get sessionId() { return state.sessionId; },
            get projectId() { return state.projectId; },
            get execute() { return state.execute; },
            get pendingForm() { return state.pendingForm; },
            get context() { return state.context; },
            set context(value) { state.context = value; },
            get messages() { return state.messages.slice(); },

            isWaitingForInput: function() {
                return state.status === 'waiting' || state.pendingForm || 
                       (state.execute && state.execute.form && (state.execute.form.choices?.length > 0 || state.execute.form.input));
            },

            /** True while async work blocks new input (LLM / promise / loader). */
            isInputBlocked: function () {
                return (
                    promise.isPending ||
                    state.promisePending ||
                    state.status === 'processing' ||
                    !!getLoader(null)?.isActive
                );
            },

            // Loader - per-session
            startLoader: function(sid = null) { 
                const l = getLoader(sid);
                if (l) l.start();
                return this; 
            },
            stopLoader: function(sid = null) { 
                const l = getLoader(sid);
                if (l) l.stop();
                return this; 
            },
            getLoaderState: function(sid = null) { 
                const l = getLoader(sid);
                return l ? l.getState() : { active: false }; 
            },

            // Promise (setPromisePending defined below with state + emit)
            setPromiseId: function(promiseId) { promise.setPromiseId(promiseId); return this; },
            startPromisePolling: function(checkFn) { promise.startPolling(checkFn); return this; },
            stopPromisePolling: function() { promise.stopPolling(); return this; },

            reset: function(sessionId, projectId) {
                // Clear loaders for previous session
                sessionLoaders.clear();
                
                state.sessionId = sessionId || null;
                state.projectId = projectId || null;
                state.messages = [];
                state.execute = null;
                state.context = null;
                state.status = sessionId ? 'created' : 'idle';
                state.pendingForm = null;
                state.lastError = null;
                state.promisePending = false;
                state._waitIndicatorActive = false;
                promise.reset();
                emit('reset', this.getState());
                return this;
            },

            setSession: function(sessionId, projectId) {
                state.sessionId = sessionId;
                if (projectId) state.projectId = projectId;
                emit('session', sessionId);
                return this;
            },

            setExecute: function(execute) {
                // Wait indicator
                if (state._waitIndicatorActive && execute && !execute.wait) {
                    state._waitIndicatorActive = false;
                }

                state.execute = execute || null;
                state.promisePending = false;
                promise.setPending(false);
                
                emit('execute', state.execute);
                emit('promisePending', false);

                if (execute && execute.wait) {
                    state._waitIndicatorActive = true;
                    state.status = 'processing';
                    state.pendingForm = null;
                    emit('pendingForm', null);
                    emit('wait', typeof execute.wait === 'object' ? execute.wait : { message: String(execute.wait) });
                } else {
                    emit('wait', null);
                    
                    var hasForm = execute && execute.form && ((execute.form.choices && execute.form.choices.length > 0) || execute.form.input);
                    if (hasForm) {
                        state.pendingForm = execute.form;
                        state.status = 'waiting';
                        emit('pendingForm', execute.form);
                    } else {
                        state.pendingForm = null;
                        emit('pendingForm', null);
                    }
                }

                return this;
            },

            pushMessage: function(message, role) {
                var normalized = normalizeMessage(message, role);
                state.messages = state.messages.concat([normalized]).slice(-MAX_MESSAGES);
                emit('messages', state.messages.slice());
                emit('message', normalized);
                return this;
            },

            setPromisePending: function(pending) {
                state.promisePending = pending;
                promise.setPending(pending);
                emit('promisePending', pending);
                return this;
            },

            setError: function(error) {
                state.lastError = error;
                state.status = 'error';
                emit('error', error);
                this.pushMessage(error && error.message || String(error), 'system');
                return this;
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

    // SessionStorageAPI (inline)
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
            this.core?.emit?.('storageMode', mode);
            return this;
        };

        // Proxy core methods
        this.getState = function() { return this.core.getState(); };
        this.setSession = function() { return this.core.setSession.apply(this.core, arguments); };
        this.setExecute = function() { 
            return this.core.setExecute.apply(this.core, arguments); 
        };
        this.pushMessage = function() { return this.core.pushMessage.apply(this.core, arguments); };
        this.on = function() { return this.core.on.apply(this.core, arguments); };
        this.reset = function() { return this.core.reset.apply(this.core, arguments); };
        this.setPromisePending = function() { return this.core.setPromisePending.apply(this.core, arguments); };
        this.isWaitingForInput = function() { return this.core.isWaitingForInput(); };
        this.isInputBlocked = function () { return this.core.isInputBlocked(); };

        // Loader management - proxy to core
        this.startLoader = function() { return this.core.startLoader(); };
        this.stopLoader = function() { return this.core.stopLoader(); };
        this.getLoaderState = function() { return this.core.getLoaderState(); };

        // Promise management - proxy to core
        this.setPromiseId = function() { return this.core.setPromiseId.apply(this.core, arguments); };
        this.startPromisePolling = function() { return this.core.startPromisePolling.apply(this.core, arguments); };
        this.stopPromisePolling = function() { return this.core.stopPromisePolling.apply(this.core, arguments); };

        // Expose core properties for window-events.js compatibility
        Object.defineProperty(this, 'execute', {
            get: function() { return this.core ? this.core.execute : null; },
            configurable: true
        });
        Object.defineProperty(this, '_state', {
            get: function() { 
                if (!this.core) {
                    console.warn('[SessionStore] _state: core not initialized, returning null');
                    return null; 
                }
                return this.core.getState(); 
            },
            configurable: true
        });
        Object.defineProperty(this, 'pendingForm', {
            get: function() { return this.core ? this.core.pendingForm : null; },
            configurable: true
        });

        // Legacy API for window-state.js compatibility
        this.setMessages = function(messages) {
            if (!this.core) return;
            const currentMessages = this.core.messages;
            if (currentMessages && currentMessages.length > 0) return;
            if (Array.isArray(messages)) {
                messages.forEach(msg => this.pushMessage(msg, msg.role || 'user'));
            }
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
            // Could add title to state if needed
        };

        this.createSessionWithForm = function(title) { 
            return this.storage.createSessionWithForm(title).then(function(session) {
                this.core.setSession(session.id, session.projectId);
                this.core.setExecute(session.execute || null);
                this.core.emit('sessionCreated', session);
                return session;
            }.bind(this));
        }.bind(this);

        this.isPersistentStorage = function() {
            return this._storageMode === 'storage';
        };

        this.debug = function() {
            // Debug logging disabled
        };
    }

    global.PROMISE_POLL_INTERVAL = global.__a2aDaemons?.PROMISE_POLL_INTERVAL || 5000;

    // Global exports - BACKWARD COMPATIBLE
    global.SessionStoreClass = SessionStore;
    global.SessionStore = new SessionStore();

})(typeof window !== 'undefined' ? window : globalThis);
