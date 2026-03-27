/**
 * SessionData - Управление данными сессий
 * 
 * Содержит:
 * - createSessionStoreCore() — ядро состояния сессии (рантайм; не класс из js/core/SessionStoreCore.js)
 *
 * Зависит от:
 * - global.__a2aDaemons (dialog-loader, dialog-promise)
 * - global.Normalizers (normalizeMessage, MAX_MESSAGES)
 * - global.executeHasActionableForm, global.resolveSessionIdFromPayload (html-utils.js)
 */

(function (global) {
    'use strict';
    let listeners = {};

    const D = global.__a2aDaemons;
    if (!D || typeof D.createDialogLoader !== 'function' || typeof D.createDialogPromise !== 'function' || typeof D.createEventEmitter !== 'function') {
        throw new Error('[SessionData] Load js/daemons/emitter.js, dialog-loader.js, dialog-promise-poll.js before session-data.js');
    }
    if (typeof global.executeHasActionableForm !== 'function' || typeof global.resolveSessionIdFromPayload !== 'function') {
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
            /** True until GET .../async bootstrap finishes (reload: hide form until poll). */
            awaitingSessionVerify: false,
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
                    awaitingSessionVerify: state.awaitingSessionVerify,
                    promisePending: !!(loaderState.promisePending || state.promisePending),
                    loaderActive: loaderState.active,
                    isInputBlocked:
                        loaderState.promisePending ||
                        state.promisePending ||
                        state.status === 'processing' ||
                        !!nullLoader?.isActive ||
                        state.awaitingSessionVerify
                }; 
            },
            
            // Direct access methods for efficiency
            getLoaderState: getLoaderState,
            
             on: function(event, handler) {
                 return emitter.on(event, handler);
             },
             
             off: function(event, handler) {
                 return emitter.off(event, handler);
             },

             emit: emitter.emit,

            get sessionId() { return state.sessionId; },
            get projectId() { return state.projectId; },
            get execute() { return state.execute; },
            get pendingForm() { return state.pendingForm; },
            get context() { return state.context; },
            set context(value) {
                // Применяем workbench_ops если они есть
                if (value && value.workbench_ops) {
                    this.applyWorkbenchOps(value);
                }
                state.context = value;
            },
            get messages() { return state.messages.slice(); },
            
            /** Применяет workbench_ops к контексту (set/append/remove операции) */
            applyWorkbenchOps: function(context) {
                const ops = context?.workbench_ops;
                if (!ops) return;
                
                // Инициализируем workbench если его нет
                let workbench = context.workbench || {};
                context.workbench = workbench;
                
                // Обрабатываем set операции
                if (ops.set) {
                    Object.assign(workbench, ops.set);
                }
                
                // Обрабатываем append операции
                if (ops.append) {
                    for (const [key, valueToAppend] of Object.entries(ops.append)) {
                        if (Array.isArray(workbench[key])) {
                            workbench[key] = [...workbench[key], ...valueToAppend];
                        } else {
                            workbench[key] = valueToAppend;
                        }
                    }
                }
                
                // Обрабатываем remove операции
                if (ops.remove) {
                    for (const key of ops.remove) {
                        delete workbench[key];
                    }
                }
            },
            
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
                    !!getLoader(null)?.isActive ||
                    state.awaitingSessionVerify
                );
            },

            setAwaitingSessionVerify: function(v) {
                state.awaitingSessionVerify = !!v;
                emitter.emit('awaitingSessionVerify', state.awaitingSessionVerify);
                return this;
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
                 state.awaitingSessionVerify = false;
                 state._waitIndicatorActive = false;
                 promise.reset();
                 emitter.emit('reset', this.getState());
                 return this;
             },

             setSession: function(sessionId, projectId) {
                state.sessionId = sessionId;
                if (projectId) state.projectId = projectId;
                emitter.emit('session', sessionId);
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
                
                emitter.emit('execute', state.execute);
                emitter.emit('promisePending', false);

                var hasForm = false;
                if (execute && execute.wait) {
                    state._waitIndicatorActive = true;
                    state.status = 'processing';
                    state.pendingForm = null;
                    emitter.emit('pendingForm', null);
                    emitter.emit('wait', typeof execute.wait === 'object' ? execute.wait : { message: String(execute.wait) });
                } else {
                    emitter.emit('wait', null);
                    
                    hasForm = global.executeHasActionableForm(execute);
                    if (hasForm) {
                        state.pendingForm = execute.form;
                        state.status = 'waiting';
                        emitter.emit('pendingForm', execute.form);
                    } else {
                        state.pendingForm = null;
                        emitter.emit('pendingForm', null);
                    }
                }

                // Form replaces loader: show inputs immediately but respect min loader time
                // Using stop() without force=true allows loader to hide only after MIN_LOADER_MS expires
                // while inputs can render immediately (form display is independent of loader state)
                if (execute && !execute.wait && hasForm) {
                    var l = getLoader(state.sessionId);
                    if (l) l.stop();
                    sessionLoaders.forEach(function (loader) {
                        if (loader && typeof loader.stop === 'function') loader.stop();
                    });
                }

                return this;
            },

            pushMessage: function(message, role) {
                var normalized = normalizeMessage(message, role);
                state.messages = state.messages.concat([normalized]).slice(-MAX_MESSAGES);
                emitter.emit('messages', state.messages.slice());
                emitter.emit('message', normalized);
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
                emitter.emit('messages', state.messages.slice());
                return this;
            },

            setPromisePending: function(pending) {
                state.promisePending = pending;
                promise.setPending(pending);
                emitter.emit('promisePending', pending);
                return this;
            },

            setError: function(error) {
                state.lastError = error;
                state.status = 'error';
                emitter.emit('error', error);
                return this;
            },

            clearLastError: function() {
                state.lastError = null;
                if (state.status === 'error') {
                    state.status = state.pendingForm ? 'waiting' : (state.execute ? 'active' : 'idle');
                }
                emitter.emit('error', null);
                return this;
            },

            createSession: function(session) {
                var sid = global.resolveSessionIdFromPayload?.(session);
                if (!sid) {
                    console.error('[SessionData] createSession: No session ID');
                    return;
                }
                this.reset(sid, session.projectId || null);
                emitter.emit('sessionCreated', { id: sid });
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
