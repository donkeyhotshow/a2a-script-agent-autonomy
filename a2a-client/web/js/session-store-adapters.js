/**
 * Session Store Adapters - Backward compatibility layer
 * Wraps SessionStore to provide legacy SessionManager/SessionViewModel APIs
 * Allows gradual migration without breaking existing code
 * 
 * This file now re-exports from modular components:
 * - adapters/session-viewmodel-adapter.js
 * - adapters/session-manager-adapter.js
 * - adapters/ai-actions-integration.js
 */

(function (global) {
    'use strict';

    // RETRY LOGIC: Wait for SessionStore if not ready
    function waitForSessionStore(maxRetries) {
        maxRetries = maxRetries || 50; // ~5s timeout
        var retries = 0;
        
        function checkStore() {
            var store = global.SessionStore;
            if (store) {
                console.log('[SessionStore Adapters] SessionStore ready, installing...');
                installAdapters(store);
                return true;
            }
            retries++;
            if (retries >= maxRetries) {
                console.error('[SessionStore Adapters] Timeout waiting for SessionStore');
                return false;
            }
            setTimeout(checkStore, 100);
            return false;
        }
        
        return checkStore();
    }

    function installAdapters(store) {
        // === Install Adapters ===
        if (!global.SessionViewModel || global.FORCE_SESSION_STORE) {
            if (global.SessionViewModelAdapter) {
                global.SessionViewModelAdapter.init();
                global.SessionViewModel = global.SessionViewModelAdapter;
                console.log('[SessionStore Adapters] SessionViewModel installed');
            }
        }

        if (!global.SessionManager || global.FORCE_SESSION_STORE) {
            if (global.SessionManagerAdapter) {
                global.SessionManagerAdapter.init();
                global.SessionManager = global.SessionManagerAdapter;
                console.log('[SessionStore Adapters] SessionManager installed');
            }
        }

        global.SessionStoreAdapters = {
            get SessionViewModelAdapter() { return global.SessionViewModelAdapter; },
            get SessionManagerAdapter() { return global.SessionManagerAdapter; },
            install: () => {
                if (global.SessionViewModelAdapter) {
                    global.SessionViewModelAdapter.init();
                    global.SessionViewModel = global.SessionViewModelAdapter;
                }
                if (global.SessionManagerAdapter) {
                    global.SessionManagerAdapter.init();
                    global.SessionManager = global.SessionManagerAdapter;
                }
            }
        };
    }

    // Start retry logic
    waitForSessionStore();
  
})(typeof window !== 'undefined' ? window : globalThis);
