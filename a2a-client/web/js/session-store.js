/**
 * SessionStore - Главное хранилище состояния сессии
 * 
 * Иерархия модулей (снизу вверх):
 * ├── utils/normalizers.js + install-normalizers.mjs — window.Normalizers (лимиты и normalizeMessage)
 * ├── js/daemons/* — DialogLoader / DialogPromise (рантайм UI)
 * ├── session-data.js — createSessionStoreCore() (плоское состояние + даемоны; не ESM core/*)
 * ├── project-manager.js — проекты (в app/)
 * └── session-store.js — точка входа (делегатор)
 *
 * Рантажится через SessionData + daemons (js/core/ сейчас не используется).
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
 * 7. js/app/project-manager.js
 * 9. js/session-store.js (этот файл)
 */

(function (global) {
    'use strict';

    /** Same values must be used for `new SessionStoreClass(...)` in window-state.js */
    var WEB_SESSION_STORE_OPTIONS = Object.freeze({
        storageBase: '/api/a2a/sessions',
        storageMode: 'storage'
    });

    var ActiveSessionStorage = global.ActiveSessionStorage;

    async function readSavedSessionId() {
        if (!ActiveSessionStorage?.readActiveSessionId) {
            return null;
        }
        return await ActiveSessionStorage.readActiveSessionId();
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

    // Note: apiIntegration is loaded later via defer script, not required at init time

    const createSessionStoreCore = global.SessionData.createSessionStoreCore;

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
          
          // Direct apiIntegration - no intermediate storage layer
          this._storageMode = mode;

         // Delegate methods defined on prototype for efficiency

         // === Expose core properties for window-events.js compatibility ===
         
         Object.defineProperty(this, 'execute', {
             get: function() { return this.core ? this.core.execute : null; },
             configurable: true
         });
         

         
         Object.defineProperty(this, 'pendingForm', {
             get: function() { return this.core ? this.core.pendingForm : null; },
             configurable: true
         });

    }

     SessionStore.prototype.hasSavedSession = async function() {
         var sessionId = await readSavedSessionId();
         return !!sessionId;
     };

     // === Methods moved from constructor to prototype for efficiency ===
     SessionStore.prototype.getStorageMode = function() {
         return this._storageMode;
     };

      SessionStore.prototype.initMessages = function(messages) {
          if (!this.core) return;
          var currentMessages = this.core.messages;
          if (currentMessages && currentMessages.length > 0) return;
          if (Array.isArray(messages)) {
              messages.forEach(function(msg) {
                  this.pushMessage(msg, msg.role || 'user');
              }.bind(this));
          }
      };

     SessionStore.prototype.applyServerMessages = function(messages) {
         if (!this.core) return this;
         return this.core.applyServerMessages.apply(this.core, arguments);
     };

     SessionStore.prototype.setContext = function(context) {
         if (this.core) {
             this.core.context = context;
             this.core.emit('context', context);
         }
     };

     SessionStore.prototype.setStatus = function(status) {
         if (this.core) {
             this.core.status = status;
             this.core.emit('status', status);
         }
     };

      SessionStore.prototype.createSessionWithForm = function(title) {
          const self = this;
          // Use apiIntegration directly instead of storage layer
          const api = typeof window !== 'undefined' ? window.apiIntegration : globalThis.apiIntegration;
          if (!api?.createSession) {
              return Promise.reject(new Error('[SessionStore] apiIntegration.createSession not available'));
          }
          return api.createSession({ title }).then(function(session) {
              var sid = session && (session.id || session.sessionId);
              if (sid) self.core.setSession(sid, session.projectId);
              self.core.setExecute(session.execute || null);
              self.core.emit('sessionCreated', session);
              return session;
          });
      };

     SessionStore.prototype.isPersistentStorage = function() {
         return this._storageMode === 'storage';
     };

     // Storage mode
     SessionStore.prototype.setStorageMode = function(mode) {
         this._storageMode = mode;
         this.core?.emit?.('storageMode', mode);
         return this;
     };

    // Delegate methods on prototype - defined once, shared across all instances
    var coreDelegateMethods = [
        'getState', 'setSession', 'reset', 'setExecute', 'pushMessage', 'setError', 'clearLastError',
        'on', 'setPromisePending', 'isWaitingForInput', 'isInputBlocked',
        'startLoader', 'stopLoader', 'getLoaderState',
        'setPromiseId', 'startPromisePolling', 'stopPromisePolling'
    ];

    coreDelegateMethods.forEach(function (m) {
        SessionStore.prototype[m] = function () {
            var fn = this.core[m];
            return fn.apply(this.core, arguments);
        };
    });

    SessionStore.prototype.restoreAndReconnect = async function() {
        var sessionId = await readSavedSessionId();
        if (!sessionId) {
            return false;
        }

        var api = global.apiIntegration;
        if (!api || typeof api.getSession !== 'function') {
            var apiErr = new Error('[SessionStore] apiIntegration.getSession unavailable, cannot restore session');
            this.setError?.(apiErr);
            throw apiErr;
        }

        var sessionData;
        try {
            sessionData = await api.getSession(sessionId, { includeContext: true });
        } catch (err) {
            var fetchErr = new Error('[SessionStore] restoreAndReconnect failed to fetch saved session');
            fetchErr.cause = err;
            this.setError?.(fetchErr);
            throw fetchErr;
        }

        var sid = sessionData?.id || sessionData?.sessionId;
        if (!sid) {
            var sidErr = new Error('[SessionStore] restoreAndReconnect: missing session id in response');
            this.setError?.(sidErr);
            throw sidErr;
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

})(typeof window !== 'undefined' ? window : globalThis);
