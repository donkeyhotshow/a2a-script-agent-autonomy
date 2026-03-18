/**
 * SessionStore - Refactored thin wrapper
 * Composes SessionStoreCore + SessionStorageAPI
 * Backward compatible global exports
 */

// DISABLED: session-store-refactored.js - conflicting with inline session-store.js
// Module imports removed to prevent loading broken SessionStoreCore
// Fixed by using primary session-store.js inline implementation

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
         'setError', 'applyServerResponse', 'renameSession', 'restorePendingPromises'].forEach(method => {
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
            this.core._emit('storageMode', mode);
            return this;
        };

        this.getStorageMode = () => this._storageMode;
        this.isPersistentStorage = () => this._storageMode === 'storage';

        // Init compatibility
        this.init = (opts) => {
            this._apiBase = opts.apiBase || this._apiBase;
            return this;
        };

        // Restore pending promises on session load
        this.restorePendingPromises = async () => {
            if (!this.core.sessionId) return;
            try {
                const currentStep = await this.storage.getCurrentStepNumber(this.core.sessionId);
                if (currentStep > 0) {
                    const stepPath = `${this.storage._storageBase}/${this.core.sessionId}/${currentStep}/server-promise.json`;
                    const response = await fetch(stepPath);
                    if (response.ok) {
                        const promiseData = await response.json();
                        if (promiseData.status === 'pending' && promiseData.promiseId) {
                            console.log('[SessionStore] Restoring pending promise:', promiseData.promiseId);
                            // Mark as waiting for input
                            this.core.setPromisePending(true);
                            // Trigger promise polling via global ActionHandler if available
                            if (global.ActionHandler?.startPromisePolling) {
                                global.ActionHandler.startPromisePolling(this.core.sessionId, promiseData.promiseId);
                            }
                            // Force UI refresh to show waiting state
                            if (global.WindowManager?.refreshAll) {
                                global.WindowManager.refreshAll();
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('[SessionStore] Error restoring pending promises:', e);
            }
        };

        // Debug
        this.debug = () => {
            // Debug logging disabled
        };
    }

    // Global exports for backward compatibility
    global.SessionStoreClass = SessionStore;
    global.SessionStore = new SessionStore();

})(typeof window !== 'undefined' ? window : globalThis);

