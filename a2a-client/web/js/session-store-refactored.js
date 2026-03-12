/**
 * SessionStore - Refactored thin wrapper
 * Composes SessionStoreCore + SessionStorageAPI
 * Backward compatible global exports
 */

import { SessionStoreCore } from './core/SessionStoreCore.js';
import { SessionStorageAPI } from './storage/SessionStorageAPI.js';
import { normalizeMessage } from './utils/normalizers.js';

(function (global) {
    'use strict';

    function SessionStore(options = {}) {
        this.core = new SessionStoreCore();
        this.storage = new SessionStorageAPI(options.storageBase || '/api/a2a/sessions', options.storageMode || 'storage');
        this._storageMode = options.storageMode || 'storage';
        this._apiBase = options.apiBase || '/api';

        // Proxy all core methods to maintain API
        ['getState', 'sessionId', 'projectId', 'messages', 'execute', 'context', 'status',
         'isWaitingForInput', 'isActive', 'isInputBlocked', 'setPromisePending',
         'reset', 'setSession', 'createSession', 'setProject', 'setStatus',
         'setExecute', 'setContext', 'setMessages', 'appendMessages', 'pushMessage',
         'setError', 'applyServerResponse'].forEach(method => {
            this[method] = (...args) => this.core[method](...args);
        });

        // Storage delegations
        ['createSessionWithForm', 'saveStep', 'loadSession', 'checkLatestStep',
         'getHistory', 'listSessions', 'getCurrentStepNumber'].forEach(method => {
            this[method] = (...args) => this.storage[method](this.core.sessionId, ...args);
        });

        // Storage mode
        this.setStorageMode = (mode) => {
            this._storageMode = mode;
            this.storage = new SessionStorageAPI(this.storage._storageBase, mode);
            console.log('[SessionStore] Storage mode:', mode);
            this.core._emit('storageMode', mode);
            return this;
        };

        this.getStorageMode = () => this._storageMode;
        this.isPersistentStorage = () => this._storageMode === 'storage';

        // Init compatibility
        this.init = (opts) => {
            this._apiBase = opts.apiBase || this._apiBase;
            console.log('[SessionStore] Initialized', this.core.sessionId ? `(session ${this.core.sessionId})` : '(no session)');
            return this;
        };

        // Debug
        this.debug = () => {
            console.log('[SessionStore] Current state:', this.toJSON());
            console.log('[SessionStore] Full state:', this.getState());
        };
    }

    // Global exports for backward compatibility
    global.SessionStoreClass = SessionStore;
    global.SessionStore = new SessionStore();

})(typeof window !== 'undefined' ? window : globalThis);

