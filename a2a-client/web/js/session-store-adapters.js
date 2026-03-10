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

    const store = global.SessionStore;
    if (!store) {
        console.error('[SessionStore Adapters] SessionStore not found');
        return;
    }

    // === Install Adapters ===
    // Only install if legacy objects don't exist or if force flag set

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

  
})(typeof window !== 'undefined' ? window : globalThis);
