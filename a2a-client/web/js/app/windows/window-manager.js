/**
 * Window Manager - Main entry point for window management functionality
 * 
 * This module combines all window-related functionality:
 * - WindowRegistry: Registry of open windows
 * - WindowPosition: Position and size management
 * - WindowState: Window state operations (open, close, minimize)
 * - WindowEvents: Event handling and rendering
 */
(function (global) {
    'use strict';

    // Ensure dependencies are loaded
    const checkDependencies = () => {
        const deps = ['WindowRegistry', 'WindowPosition', 'WindowState', 'WindowEvents'];
        const missing = deps.filter(d => !global[d]);
        
        if (missing.length > 0) {
            console.warn('[WindowManager] Missing dependencies:', missing.join(', '));
            return false;
        }
        return true;
    };

    // Main WindowManager facade
    const WindowManager = {
        /**
         * Get session windows map (delegates to WindowRegistry)
         */
        getSessionWindows() {
            return global.WindowRegistry?.getSessionWindows();
        },

        /**
         * Save session windows state (delegates to WindowRegistry)
         */
        async saveSessionWindowsState() {
            return global.WindowRegistry?.saveSessionWindowsState();
        },

        /**
         * Load session windows state (delegates to WindowRegistry)
         */
        async loadSessionWindowsState() {
            return global.WindowRegistry?.loadSessionWindowsState() || [];
        },

        /**
         * Clear session windows state (delegates to WindowRegistry)
         */
        async clearSessionWindowsState() {
            return global.WindowRegistry?.clearSessionWindowsState();
        },

        /**
         * Toggle session window (delegates to WindowState)
         */
        async toggleSessionWindow(sessionId, btnEl) {
            return global.WindowState?.toggleSessionWindow(sessionId, btnEl);
        },

        /**
         * Create new session window (delegates to WindowState)
         */
        async createSessionWindow(sessionId, btnEl) {
            return global.WindowState?.createSessionWindow(sessionId, btnEl);
        },

        /**
         * Close session window (delegates to WindowState)
         */
        closeSessionWindow(sessionId) {
            return global.WindowState?.closeSessionWindow(sessionId);
        },

        /**
         * Close all session windows (delegates to WindowState)
         */
        closeAllSessionWindows() {
            return global.WindowState?.closeAllSessionWindows();
        },

        /**
         * Save window state (delegates to WindowPosition)
         */
        async saveWindowState(sessionId, position, size) {
            return global.WindowPosition?.saveWindowState(sessionId, position, size);
        },

        /**
         * Load window state (delegates to WindowPosition)
         */
        async loadWindowState(sessionId) {
            return global.WindowPosition?.loadWindowState(sessionId);
        },

        /**
         * Get default window position (delegates to WindowPosition)
         */
        getDefaultWindowPosition(sessionId) {
            return global.WindowPosition?.getDefaultWindowPosition(sessionId);
        },

        /**
         * Render session content (delegates to WindowEvents)
         */
        renderSessionContent(contentEl, sessionId, store = null) {
            return global.WindowEvents?.renderSessionContent(contentEl, sessionId, store);
        },

        /**
         * Send message to session (delegates to WindowEvents)
         */
        async sendMessage(sessionId, message) {
            return global.WindowEvents?.sendMessage(sessionId, message);
        },

        /**
         * Send choice to session (delegates to WindowEvents)
         */
        async sendChoice(sessionId, choiceId) {
            return global.WindowEvents?.sendChoice(sessionId, choiceId);
        },

        /**
         * Restore session windows (delegates to WindowState)
         */
        async restoreSessionWindows() {
            return global.WindowState?.restoreSessionWindows();
        },

        /**
         * Check if session exists (delegates to WindowState)
         */
        async checkSessionExists(sessionId) {
            return global.WindowState?.checkSessionExists(sessionId);
        },

        /**
         * Initialize window manager
         */
        async init() {
            console.log('[WindowManager] Initialized');
            
            if (!checkDependencies()) {
                console.warn('[WindowManager] Initializing with missing dependencies');
            }
            
            // Additional initialization if needed
        }
    };

    // Export
    global.WindowManager = WindowManager;

})(typeof window !== 'undefined' ? window : globalThis);
