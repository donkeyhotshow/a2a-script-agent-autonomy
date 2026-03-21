/**
 * SessionData - Управление данными сессий
 * 
 * Содержит:
 * - SessionStoreCore - ядро управления состоянием сессии
 * 
 * Зависит от:
 * - global.__a2aDaemons (dialog-loader, dialog-promise)
 * - global.Normalizers (normalizeMessage)
 */

(function (global) {
    'use strict';

    const D = global.__a2aDaemons;
    if (!D || typeof D.createDialogLoader !== 'function' || typeof D.createDialogPromise !== 'function') {
        throw new Error('[SessionData] Load js/daemons/emitter.js, dialog-loader.js, dialog-promise-poll.js before session-data.js');
    }
    const createDialogLoader = D.createDialogLoader;
    const createDialogPromise = D.createDialogPromise;

    const MAX_MESSAGES = 100;

    /**
     * Создать ядро хранилища сессии
     * @param {string|null} sessionId - ID сессии
     * @returns {Object} Ядро хранилища
     */
    function createSessionStoreCore(sessionId) {
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
        
        // Per-instance promise (poll daemon) — forward to store so UI / ActionExecutor can subscribe
        const promise = createDialogPromise();
        promise.on('resolved', function (data) {
            emit('promiseResolved', data);
        });
        promise.on('rejected', function (data) {
            emit('promiseError', data);
        });
        
        // Per-instance loaders map - sessionId -> DialogLoader
        const sessionLoaders = new Map();
        
        function getLoader(sid) {
            const id = sid || state.sessionId;
            if (!id) return null;
            if (!sessionLoaders.has(id)) {
                const loader = createDialogLoader();
                // Forward per-session loader events
                loader.on('loader', (data) => {
                    if (data.active) {
                        emit('loader:start/' + id, { sessionId: id, active: true });
                    } else {
                        emit('loader:stop/' + id, { sessionId: id, active: false });
                    }
                });
                sessionLoaders.set(id, loader);
            }
            return sessionLoaders.get(id);
        }
        
        function emit(event, payload) {
            const handlers = listeners[event];
            if (!handlers) return;
            handlers.forEach(function(handler) {
                try { handler(payload); }
                catch (err) { 
                    console.error('[SessionData] Handler failed:', event, err);
                    emit('error', { event: event, payload: payload, error: err });
                }
            });
        }

        // Используем нормализатор если доступен
        const normalizeMessage = global.Normalizers?.normalizeMessage || function(msg, role) {
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
        };

        return {
            getState: function(sid) { 
                const loaderActive = getLoader(sid)?.isActive || false;
                return { 
                    ...state, 
                    loaderActive: loaderActive,
                    promisePending: promise.isPending,
                    sessionLoaders: Array.from(sessionLoaders.keys())
                }; 
            },
            
            on: function(event, handler) {
                if (!listeners[event]) listeners[event] = [];
                listeners[event].push(handler);
                return function() { return this.off(event, handler); }.bind(this);
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
            isInputBlocked: function() {
                return (
                    promise.isPending ||
                    state.promisePending ||
                    state.status === 'processing' ||
                    !!getLoader(null)?.isActive
                );
            },

            // Loader - per-session
            startLoader: function(sid) { 
                var l = getLoader(sid);
                if (l) l.start();
                return this; 
            },
            stopLoader: function(sid) { 
                var l = getLoader(sid);
                if (l) l.stop();
                return this; 
            },
            getLoaderState: function(sid) { 
                var l = getLoader(sid);
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
                if (execute) {
                    state.lastError = null;
                    if (state.status === 'error') {
                        state.status = 'idle';
                    }
                }

                // Wait indicator
                if (state._waitIndicatorActive && execute && !execute.wait) {
                    state._waitIndicatorActive = false;
                }

                state.execute = execute || null;
                state.promisePending = false;
                promise.setPending(false);
                
                emit('execute', state.execute);
                emit('promisePending', false);

                var hasForm = false;
                if (execute && execute.wait) {
                    state._waitIndicatorActive = true;
                    state.status = 'processing';
                    state.pendingForm = null;
                    emit('pendingForm', null);
                    emit('wait', typeof execute.wait === 'object' ? execute.wait : { message: String(execute.wait) });
                } else {
                    emit('wait', null);
                    
                    hasForm = !!(execute && execute.form && ((execute.form.choices && execute.form.choices.length > 0) || execute.form.input));
                    if (hasForm) {
                        state.pendingForm = execute.form;
                        state.status = 'waiting';
                        emit('pendingForm', execute.form);
                    } else {
                        state.pendingForm = null;
                        emit('pendingForm', null);
                    }
                }

                // Form replaces loader: user fills form first; loader only after submit (promisePending)
                if (execute && !execute.wait && hasForm) {
                    var l = getLoader(state.sessionId);
                    if (l) l.stop();
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

            /** Replace chat from `GET /sessions/:id` `messages` (source of truth). */
            applyServerMessages: function(messages) {
                if (!Array.isArray(messages) || messages.length === 0) return this;
                var next = [];
                for (var i = 0; i < messages.length; i++) {
                    var msg = messages[i];
                    next.push(normalizeMessage(msg, msg.role || 'user'));
                }
                state.messages = next.slice(-MAX_MESSAGES);
                emit('messages', state.messages.slice());
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
                return this;
            },

            clearLastError: function() {
                state.lastError = null;
                if (state.status === 'error') {
                    state.status = state.pendingForm ? 'waiting' : (state.execute ? 'active' : 'idle');
                }
                emit('error', null);
                return this;
            },

            createSession: function(session) {
                var sid = session.id || session.sessionId;
                if (!sid) {
                    console.error('[SessionData] createSession: No session ID');
                    return;
                }
                this.reset(sid, session.projectId || null);
                emit('sessionCreated', { id: sid });
            }
        };
    }

    // Экспорт
    global.SessionData = {
        createSessionStoreCore: createSessionStoreCore,
        MAX_MESSAGES: MAX_MESSAGES
    };

})(typeof window !== 'undefined' ? window : globalThis);
