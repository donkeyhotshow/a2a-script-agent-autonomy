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
 * - DialogLoader - управление loader state  
 * - DialogPromise - управление async promise
 * 
 * Обратная совместимость: window.SessionStore работает как раньше
 */

(function (global) {
    'use strict';

    // Импорт модулей (ES6 imports для Node/Vite совместимости)
    // В браузере без сборщика модули будут недоступны - используем inline версии
    let SessionStoreCore, EventEmitter, DialogState, DialogLoader, DialogPromise;

    // ES6 imports disabled - using inline implementations
    // try { ... import.meta block removed to fix SyntaxError in classic script }

    // === INLINE DEFINITIONS (fallback) ===
    
    // EventEmitter (inline - если ES6 модули недоступны)
    const createEventEmitter = function() {
        const listeners = new Map();
        
        return {
            on: function(event, callback) {
                if (!listeners.has(event)) listeners.set(event, new Set());
                listeners.get(event).add(callback);
                return () => this.off(event, callback);
            },
            once: function(event, callback) {
                const wrapper = (...args) => {
                    this.off(event, wrapper);
                    callback.apply(this, args);
                };
                return this.on(event, wrapper);
            },
            off: function(event, callback) {
                const handlers = listeners.get(event);
                if (handlers) {
                    handlers.delete(callback);
                    if (handlers.size === 0) listeners.delete(event);
                }
            },
            emit: function(event, payload) {
                const handlers = listeners.get(event);
                if (!handlers) return;
                handlers.forEach(handler => {
                    try { handler(payload); } 
                    catch (err) { 
                        console.error('[EventEmitter] Handler failed:', event, err);
                        // FIX: Emit error event instead of silently suppressing it
                        this.emit('error', { event, payload, error: err });
                    }
                });
            }
        };
    };

    // DialogLoader (inline)
    const MINIMUM_LOADER_TIME = 5000;
    const createDialogLoader = function() {
        let active = false;
        let minEndTime = null;
        let timeoutId = null;
        const emitter = createEventEmitter();
        
        return {
            getState: () => ({ active, minEndTime, canHide: minEndTime && Date.now() >= minEndTime }),
            get isActive() { return active; },
            start: function() {
                if (active) return this;
                active = true;
                minEndTime = Date.now() + MINIMUM_LOADER_TIME;
                console.log('[DialogLoader] START - active:', active, 'minEndTime:', minEndTime);
                emitter.emit('loader', { active: true, minEndTime });
                return this;
            },
            stop: function() {
                console.log('[DialogLoader] STOP requested - active:', active, 'minEndTime:', minEndTime);
                const now = Date.now();
                const canHide = minEndTime === null || now >= minEndTime;
                if (canHide || !active) {
                    this._forceStop();
                } else {
                    if (timeoutId) clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => this._forceStop(), minEndTime - now);
                }
                return this;
            },
            _forceStop: function() {
                if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
                if (active) {
                    active = false;
                    minEndTime = null;
                    emitter.emit('loader', { active: false });
                }
            },
            reset: function() { this._forceStop(); return this; },
            on: (...args) => emitter.on(...args),
            off: (...args) => emitter.off(...args),
            destroy: function() { this._forceStop(); }
        };
    };

    // DialogPromise (inline)
    const PROMISE_POLL_INTERVAL = 5000;
    const createDialogPromise = function() {
        let promiseId = null;
        let pending = false;
        let status = null;
        let pollTimer = null;
        const emitter = createEventEmitter();
        
        return {
            getState: () => ({ promiseId, pending, status }),
            get isPending() { return pending; },
            get promiseId() { return promiseId; },
            setPending: function(p) { pending = p; emitter.emit('promisePending', p); return this; },
            setPromiseId: function(pid) {
                promiseId = pid;
                if (pid) { pending = true; status = 'pending'; }
                else { pending = false; status = null; }
                emitter.emit('promiseId', pid);
                emitter.emit('promisePending', pending);
                return this;
            },
            setStatus: function(s) { status = s; emitter.emit('status', s); return this; },
            startPolling: function(checkFn) {
                if (!promiseId) return this;
                this._stopPolling();
                pollTimer = setInterval(async () => {
                    try {
                        const result = await checkFn(promiseId);
                        if (!result) return;
                        if (result.completed || result.status === 'completed' || result.status === 'done') {
                            this._stopPolling();
                            this.setPending(false);
                            this.setStatus('completed');
                            emitter.emit('resolved', { promiseId, result: result.result, execute: result.execute });
                        }
                        if (result.status === 'failed' || result.status === 'error') {
                            this._stopPolling();
                            this.setPending(false);
                            this.setStatus('failed');
                            emitter.emit('rejected', { promiseId, error: result.error || 'Promise failed' });
                        }
                    } catch (err) { 
                        console.error('[DialogPromise] Polling error:', err);
                        // Emit error event to notify listeners
                        emitter.emit('error', { promiseId, error: err });
                    }
                }, PROMISE_POLL_INTERVAL);
                return this;
            },
            _stopPolling: function() {
                if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
                return this;
            },
            stopPolling: function() { return this._stopPolling(); },
            reset: function() {
                this._stopPolling();
                promiseId = null;
                pending = false;
                status = null;
                emitter.emit('promisePending', false);
                emitter.emit('reset');
                return this;
            },
            on: (...args) => emitter.on(...args),
            off: (...args) => emitter.off(...args),
            destroy: function() { this._stopPolling(); }
        };
    };

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
            const id = sid || sessionId;
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

            // Promise
            setPromisePending: function(pending) { promise.setPending(pending); return this; },
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

    // Export PROMISE_POLL_INTERVAL constant globally
    global.PROMISE_POLL_INTERVAL = PROMISE_POLL_INTERVAL;

    // Global exports - BACKWARD COMPATIBLE
    global.SessionStoreClass = SessionStore;
    global.SessionStore = new SessionStore();

})(typeof window !== 'undefined' ? window : globalThis);
