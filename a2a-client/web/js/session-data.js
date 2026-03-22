/**
 * SessionData - Управление данными сессий
 * 
 * Содержит:
 * - createSessionStoreCore() — ядро состояния сессии (рантайм; не класс из js/core/SessionStoreCore.js)
 *
 * Зависит от:
 * - global.__a2aDaemons (dialog-loader, dialog-promise)
 * - global.Normalizers (normalizeMessage, MAX_MESSAGES)
 * - global.executeHasActionableForm (html-utils.js)
 */

(function (global) {
    'use strict';

    const D = global.__a2aDaemons;
    if (!D || typeof D.createDialogLoader !== 'function' || typeof D.createDialogPromise !== 'function' || typeof D.createEventEmitter !== 'function') {
        throw new Error('[SessionData] Load js/daemons/emitter.js, dialog-loader.js, dialog-promise-poll.js before session-data.js');
    }
    if (typeof global.executeHasActionableForm !== 'function') {
        throw new Error('[SessionData] Load js/html-utils.js before session-data.js');
    }
    const createDialogLoader = D.createDialogLoader;
    const createDialogPromise = D.createDialogPromise;
    const createEventEmitter = D.createEventEmitter;

    function maxMessagesFromNormalizers() {
        const n = global.Normalizers && global.Normalizers.MAX_MESSAGES;
        if (typeof n !== 'number' || n <= 0) {
            throw new Error('[SessionData] Normalizers.MAX_MESSAGES must be a positive number');
        }
        return n;
    }

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
        // Use centralized event emitter from daemons
        const emitter = createEventEmitter();
         
        // Per-instance promise (poll daemon) — forward to store so UI / ActionExecutor can subscribe
        const promise = createDialogPromise();
        promise.on('resolved', function (data) {
            emitter.emit('promiseResolved', data);
        });
        promise.on('rejected', function (data) {
            emitter.emit('promiseError', data);
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
                        emitter.emit('loader:start/' + id, { sessionId: id, active: true });
                    } else {
                        emitter.emit('loader:stop/' + id, { sessionId: id, active: false });
                    }
                });
                sessionLoaders.set(id, loader);
            }
            return sessionLoaders.get(id);
        }

        if (!global.Normalizers || typeof global.Normalizers.normalizeMessage !== 'function') {
            throw new Error(
                '[SessionData] global.Normalizers.normalizeMessage required (load js/install-normalizers.mjs before createSessionStoreCore)'
            );
        }
        const normalizeMessage = global.Normalizers.normalizeMessage;
        const MAX_MESSAGES = maxMessagesFromNormalizers();

        // Provide direct field access for efficiency (avoid creating new object on each call)
        const getLoaderState = function(sid) {
            return {
                active: getLoader(sid)?.isActive || false,
                promisePending: promise.isPending
            };
        };
        
        return {
            // Optimized: Returns new object only when called, but with direct field access pattern
            getState: function(sid) { 
                const loaderState = getLoaderState(sid);
                const nullLoader = getLoader(null);
                return { 
                    sessionId: state.sessionId,
                    projectId: state.projectId,
                    messages: state.messages.slice(),
                    execute: state.execute,
                    context: state.context,
                    status: state.status,
                    pendingForm: state.pendingForm,
                    lastError: state.lastError,
                    promisePending: loaderState.promisePending,
                    loaderActive: loaderState.active,
                    isInputBlocked: state.promisePending || state.status === 'processing' || !!nullLoader?.isActive
                }; 
            },
            
            // Direct access methods for efficiency
            getLoaderState: getLoaderState,
            
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
                    global.executeHasActionableForm(state.execute);
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
            startPromisePolling: function(checkFn, opts) { promise.startPolling(checkFn, opts); return this; },
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
                    
                    hasForm = global.executeHasActionableForm(execute);
                    if (hasForm) {
                        state.pendingForm = execute.form;
                        state.status = 'waiting';
                        emit('pendingForm', execute.form);
                    } else {
                        state.pendingForm = null;
                        emit('pendingForm', null);
                    }
                }

                // Form replaces loader: user must see inputs immediately — bypass loader min-time delay
                if (execute && !execute.wait && hasForm) {
                    var l = getLoader(state.sessionId);
                    if (l) l.stop(true);
                    sessionLoaders.forEach(function (loader) {
                        if (loader && typeof loader.stop === 'function') loader.stop(true);
                    });
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
                    var n = normalizeMessage(msg, msg.role || 'user');
                    if (n) next.push(n);
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
        get MAX_MESSAGES() {
            return maxMessagesFromNormalizers();
        }
    };

})(typeof window !== 'undefined' ? window : globalThis);
