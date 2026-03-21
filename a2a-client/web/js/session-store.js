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
        options = options || {};
        
        // Инициализация ядра
        this.core = createSessionStoreCore();
        
        // Инициализация хранилища
        this.storage = createSessionStorageAPI(
            options.storageBase || '/api/a2a/sessions', 
            options.storageMode || 'storage'
        );
        this._storageMode = options.storageMode || 'storage';

        // === Proxy методы ядра ===
        
        // Получение состояния
        this.getState = function() { 
            return this.core.getState(); 
        };

        // Управление сессией
        this.setSession = function() { 
            return this.core.setSession.apply(this.core, arguments); 
        };
        
        this.reset = function() { 
            return this.core.reset.apply(this.core, arguments); 
        };

        // Execute
        this.setExecute = function() { 
            return this.core.setExecute.apply(this.core, arguments); 
        };

        // Сообщения
        this.pushMessage = function() { 
            return this.core.pushMessage.apply(this.core, arguments); 
        };

        this.setError = function() {
            return this.core.setError.apply(this.core, arguments);
        };

        this.clearLastError = function() {
            return this.core.clearLastError.apply(this.core, arguments);
        };

        // События
        this.on = function() { 
            return this.core.on.apply(this.core, arguments); 
        };

        // Promise
        this.setPromisePending = function() { 
            return this.core.setPromisePending.apply(this.core, arguments); 
        };

        // Проверка состояния ввода
        this.isWaitingForInput = function() { 
            return this.core.isWaitingForInput(); 
        };
        
        this.isInputBlocked = function() { 
            return this.core.isInputBlocked(); 
        };

        // === Loader management - proxy to core ===
        this.startLoader = function() { 
            return this.core.startLoader.apply(this.core, arguments); 
        };
        
        this.stopLoader = function() { 
            return this.core.stopLoader.apply(this.core, arguments); 
        };
        
        this.getLoaderState = function() { 
            return this.core.getLoaderState(); 
        };

        // === Promise management - proxy to core ===
        this.setPromiseId = function() { 
            return this.core.setPromiseId.apply(this.core, arguments); 
        };
        
        this.startPromisePolling = function() { 
            return this.core.startPromisePolling.apply(this.core, arguments); 
        };
        
        this.stopPromisePolling = function() { 
            return this.core.stopPromisePolling.apply(this.core, arguments); 
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

    // Глобальная константа
    global.PROMISE_POLL_INTERVAL = global.__a2aDaemons.timingMs('PROMISE_POLL_INTERVAL');

    // === Global exports - BACKWARD COMPATIBLE ===
    global.SessionStoreClass = SessionStore;
    global.SessionStore = new SessionStore();

    // Add init method for compatibility with index.html
    global.SessionStore.init = function() {
        // Initialize storage connection
        if (global.SessionStore._storage) {
            global.SessionStore._storage.init && global.SessionStore._storage.init();
        }
        return global.SessionStore;
    };

})(typeof window !== 'undefined' ? window : globalThis);
