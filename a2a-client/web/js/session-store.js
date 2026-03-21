/**
 * SessionStore - Главное хранилище состояния сессии
 * 
 * Иерархия модулей (снизу вверх):
 * ├── utils/normalizers.js + install-normalizers.mjs — window.Normalizers (лимиты и normalizeMessage)
 * ├── js/daemons/* — DialogLoader / DialogPromise (рантайм UI)
 * ├── session-data.js — createSessionStoreCore() (плоское состояние + даемоны; не ESM core/*)
 * ├── session-storage.js — API хранилища
 * ├── project-store.js — проекты
 * └── session-store.js — точка входа (делегатор)
 *
 * ESM в js/core/* (DialogState, SessionStoreCore, …) — для тестов/импорта; рантайм страницы идёт через SessionData + daemons.
 * 
 * Обратная совместимость: window.SessionStore работает как раньше
 * 
 * Порядок загрузки скриптов:
 * 1. js/daemons/emitter.js
 * 2. js/daemons/dialog-loader.js
 * 3. js/daemons/dialog-promise-poll.js
 * 4. js/html-utils.js (executeHasActionableForm)
 * 5. js/install-normalizers.mjs (module, before deferred session-store.js)
 * 6. js/session-data.js
 * 7. js/session-storage.js
 * 8. js/project-store.js
 * 9. js/session-store.js (этот файл)
 */

(function (global) {
    'use strict';

    /** Same values must be used for `new SessionStoreClass(...)` in window-state.js */
    var WEB_SESSION_STORE_OPTIONS = Object.freeze({
        storageBase: '/api/a2a/sessions',
        storageMode: 'storage'
    });

    var ACTIVE_SESSION_KEY = 'active-session';

    async function readSavedSessionId() {
        var storage = global.StorageAPI?.sessions;
        if (!storage) {
            return null;
        }

        try {
            if (typeof storage.getItem === 'function') {
                var stored = await storage.getItem(ACTIVE_SESSION_KEY);
                if (stored) {
                    return stored;
                }
            }
        } catch (err) {
            console.warn('[SessionStore] Failed to read saved session (async):', err);
        }

        try {
            if (typeof storage.getItemSync === 'function') {
                var syncValue = storage.getItemSync(ACTIVE_SESSION_KEY);
                if (syncValue) {
                    return syncValue;
                }
            }
        } catch (err) {
            console.warn('[SessionStore] Failed to read saved session (sync):', err);
        }

        return null;
    }

    // Проверка зависимостей
    const D = global.__a2aDaemons;
    if (!D || typeof D.createDialogLoader !== 'function' || typeof D.createDialogPromise !== 'function') {
        throw new Error('[SessionStore] Load js/daemons/emitter.js, dialog-loader.js, dialog-promise-poll.js before session-store.js');
    }

    // Проверка модулей
    if (!global.SessionData || !global.SessionData.createSessionStoreCore) {
        throw new Error('[SessionStore] Load js/session-data.js before session-store.js');
    }

    if (!global.SessionStorageAPI || !global.SessionStorageAPI.create) {
        throw new Error('[SessionStore] Load js/session-storage.js before session-store.js');
    }

    const createSessionStoreCore = global.SessionData.createSessionStoreCore;
    const createSessionStorageAPI = global.SessionStorageAPI.create;

    // === Main SessionStore constructor ===
    function SessionStore(options) {
        if (!options || typeof options !== 'object') {
            throw new Error('[SessionStore] options object required (storageBase, storageMode)');
        }
        if (typeof options.storageBase !== 'string' || options.storageBase.length === 0) {
            throw new Error('[SessionStore] options.storageBase must be a non-empty string');
        }
        var mode = options.storageMode;
        if (mode !== 'storage' && mode !== 'project') {
            throw new Error('[SessionStore] options.storageMode must be "storage" or "project"');
        }

        // Инициализация ядра
        this.core = createSessionStoreCore();
        
        // Инициализация хранилища
        this.storage = createSessionStorageAPI(options.storageBase, mode);
        this._storageMode = mode;

        var coreDelegateMethods = [
            'getState', 'setSession', 'reset', 'setExecute', 'pushMessage', 'setError', 'clearLastError',
            'on', 'setPromisePending', 'isWaitingForInput', 'isInputBlocked',
            'startLoader', 'stopLoader', 'getLoaderState',
            'setPromiseId', 'startPromisePolling', 'stopPromisePolling'
        ];
        var self = this;
        coreDelegateMethods.forEach(function (m) {
            self[m] = function () {
                var fn = self.core[m];
                return fn.apply(self.core, arguments);
            };
        });

        this.getStorageMode = function() {
            return this.storage.getStorageMode();
        };

        // === Expose core properties for window-events.js compatibility ===
        
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

        // === Legacy API for window-state.js compatibility ===
        
        this.setMessages = function(messages) {
            if (!this.core) return;
            var currentMessages = this.core.messages;
            if (currentMessages && currentMessages.length > 0) return;
            if (Array.isArray(messages)) {
                messages.forEach(function(msg) {
                    this.pushMessage(msg, msg.role || 'user');
                }.bind(this));
            }
        };

        this.applyServerMessages = function(messages) {
            if (!this.core) return this;
            return this.core.applyServerMessages.apply(this.core, arguments);
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
            const self = this;
            return this.storage.createSessionWithForm(title).then(function(session) {
                var sid = session && (session.id || session.sessionId);
                if (sid) self.core.setSession(sid, session.projectId);
                self.core.setExecute(session.execute || null);
                self.core.emit('sessionCreated', session);
                return session;
            });
        };

        this.isPersistentStorage = function() {
            return this._storageMode === 'storage';
        };

        // Storage mode
        this.setStorageMode = function(mode) {
            this._storageMode = mode;
            this.storage.setStorageMode(mode);
            this.core?.emit?.('storageMode', mode);
            return this;
        };

        // Debug
        this.debug = function() {
            // Debug logging disabled
        };
    }

    SessionStore.prototype.hasSavedSession = async function() {
        var sessionId = await readSavedSessionId();
        return !!sessionId;
    };

    SessionStore.prototype.restoreAndReconnect = async function() {
        var sessionId = await readSavedSessionId();
        if (!sessionId) {
            return false;
        }

        var api = global.apiIntegration;
        if (!api || typeof api.getSession !== 'function') {
            console.warn('[SessionStore] apiIntegration unavailable, cannot restore session');
            return false;
        }

        var sessionData;
        try {
            sessionData = await api.getSession(sessionId, { includeContext: true });
        } catch (err) {
            console.warn('[SessionStore] restoreAndReconnect failed to fetch session:', sessionId, err);
            return false;
        }

        var sid = sessionData?.id || sessionData?.sessionId;
        if (!sid) {
            console.warn('[SessionStore] restoreAndReconnect: missing session id in response');
            return false;
        }

        this.reset(sid, sessionData.projectId || null);
        this.setSession(sid, sessionData.projectId || null);
        if (sessionData.status) {
            this.setStatus(sessionData.status);
        }
        if (sessionData.context) {
            this.setContext(sessionData.context);
        }
        if (Array.isArray(sessionData.messages) && sessionData.messages.length) {
            this.applyServerMessages(sessionData.messages);
        }
        if (sessionData.execute) {
            this.setExecute(sessionData.execute);
        }
        return true;
    };

    // Глобальная константа
    global.PROMISE_POLL_INTERVAL = global.__a2aDaemons.timingMs('PROMISE_POLL_INTERVAL');

    // === Global exports - BACKWARD COMPATIBLE ===
    global.SessionStoreWebDefaults = WEB_SESSION_STORE_OPTIONS;
    global.SessionStoreClass = SessionStore;
    global.SessionStore = new SessionStore({
        storageBase: WEB_SESSION_STORE_OPTIONS.storageBase,
        storageMode: WEB_SESSION_STORE_OPTIONS.storageMode
    });

    // Add init method for compatibility with index.html
    global.SessionStore.init = function() {
        // Initialize storage connection
        if (global.SessionStore._storage) {
            global.SessionStore._storage.init && global.SessionStore._storage.init();
        }
        return global.SessionStore;
    };

})(typeof window !== 'undefined' ? window : globalThis);
