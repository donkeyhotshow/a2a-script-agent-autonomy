/**
 * TaskFlow Loader Module
 * Логика управления лоадером (индикатор загрузки)
 */

(function (global) {
    'use strict';

    const MIN_LOADER_MS = global.__a2aDaemons.timingMs('MIN_LOADER_MS');

    // Get modules
    const resolveStore = global.resolveStore;

    /**
     * Setup loader event listener - subscribes to SessionStore 'loader' events
     * and shows/hides the session-specific loader indicator
     * Uses SessionStore for unified loader management
     * FIXED: Now passes sessionId to loader UI for per-session display
     * @param {Object} TaskFlow - Main TaskFlow instance
     * @param {string|null} sessionId - Session ID
     */
    function setupLoaderListener(TaskFlow, sessionId = null) {
        const targetSessionId = sessionId || TaskFlow._sessionId;
        const store = resolveStore(targetSessionId);
        if (!store || typeof store.on !== 'function') {
            return;
        }

        // Subscribe to loader events from SessionStore
        const unsubscribe = store.on('loader', (data) => {
            const dataWithSession = { ...data, sessionId: targetSessionId };
            TaskFlow._updateLoaderUI(dataWithSession);
        });

        // Store unsubscribe function for cleanup if needed
        TaskFlow._loaderUnsubscribe = unsubscribe;
    }

    /**
     * Show loader immediately - called before any server request
     * Uses SessionStore for unified loader management
     * FIXED: Now uses per-session loader element
     * @param {Object} TaskFlow - Main TaskFlow instance
     * @param {string|null} sessionId - Session ID
     */
    function showLoader(TaskFlow, sessionId = null) {
        const targetSessionId = sessionId || TaskFlow._sessionId || 'global';
        
        // Try to use SessionStore for loader management
        const store = resolveStore(TaskFlow._sessionId);
        if (store && typeof store.startLoader === 'function') {
            store.startLoader();
            return;
        }
        
        const loaderId = 'session-loader-' + targetSessionId;
        const loaderEl = global.ensureSessionInlineLoader(targetSessionId);

        const minEndTime = Date.now() + MIN_LOADER_MS;
        loaderEl.classList.add('active');
        loaderEl.dataset.minEndTime = minEndTime;
        
        // Store in component state for later use
        TaskFlow._loaderMinEndTime = minEndTime;
    }

    /**
     * Hide loader - called when server responds
     * Uses SessionStore for unified loader management
     * FIXED: Now uses per-session loader element
     * @param {Object} TaskFlow - Main TaskFlow instance
     * @param {string|null} sessionId - Session ID
     */
    function hideLoader(TaskFlow, sessionId = null) {
        const targetSessionId = sessionId || TaskFlow._sessionId || 'global';
        
        // Try to use SessionStore for loader management
        const store = resolveStore(TaskFlow._sessionId);
        if (store && typeof store.stopLoader === 'function') {
            store.stopLoader();
            return;
        }
        
        // Fallback: Handle hiding session-specific DOM element
        const loaderId = 'session-loader-' + targetSessionId;
        const loaderEl = document.getElementById(loaderId);
        if (!loaderEl) {
            // Try global fallback for backward compatibility
            const globalLoaderEl = document.getElementById('global-task-loader');
            if (globalLoaderEl) {
                globalLoaderEl.classList.remove('active');
            }
            return;
        }
        
        // Check if minimum time has passed
        const minEndTime = parseInt(loaderEl.dataset.minEndTime) || 0;
        const now = Date.now();
        
        if (now >= minEndTime) {
            // Minimum time passed, hide immediately
            loaderEl.classList.remove('active');
            TaskFlow._loaderMinEndTime = null;
        } else {
            // Wait for minimum time
            const remaining = minEndTime - now;
            setTimeout(() => {
                loaderEl.classList.remove('active');
                TaskFlow._loaderMinEndTime = null;
            }, remaining);
        }
    }

    /**
     * Update loader UI based on loader state
     * FIXED: Now uses per-session loader element
     * @param {Object} TaskFlow - Main TaskFlow instance
     * @param {Object} data - { active: boolean, minEndTime?: number, sessionId?: string }
     */
    function updateLoaderUI(TaskFlow, data) {
        if (!data) return;
        
        // Get session ID from data or use current session
        const sessionId = data.sessionId || TaskFlow._sessionId || 'global';
        const loaderId = 'session-loader-' + sessionId;
        
        let loaderEl = document.getElementById(loaderId);
        if (!loaderEl && data.active) {
            loaderEl = global.ensureSessionInlineLoader(sessionId);
        }
        
        if (loaderEl) {
            if (data.active) {
                loaderEl.classList.add('active');
                // Calculate remaining time for minimum display
                if (data.minEndTime) {
                    const remaining = Math.max(0, data.minEndTime - Date.now());
                    loaderEl.dataset.minRemaining = remaining;
                }
            } else {
                loaderEl.classList.remove('active');
            }
        }
    }

    // Export
    global.TaskFlowLoader = {
        setupLoaderListener,
        showLoader,
        hideLoader,
        updateLoaderUI
    };

})(typeof window !== 'undefined' ? window : global);
