/**
 * Window Position - Manages window position and size
 */
(function (global) {
    'use strict';

    const WindowPosition = {
        /**
         * Save window state
         */
        async saveWindowState(sessionId, position, size) {
            try {
                const key = `window_state_${sessionId}`;
                const state = { position, size, timestamp: Date.now() };
                await StorageAPI.ui.setItem(key, JSON.stringify(state));
            } catch (e) {
                console.warn('[WindowPosition] Failed to save window state:', e);
            }
        },

        /**
         * Load window state
         */
        async loadWindowState(sessionId) {
            try {
                const key = `window_state_${sessionId}`;
                const saved = await StorageAPI.ui.getItem(key);
                if (saved) {
                    return JSON.parse(saved);
                }
            } catch (e) {
                console.warn('[WindowPosition] Failed to load window state:', e);
            }
            return this._defaultSavedState(sessionId);
        },

        _defaultSavedState(sessionId) {
            return {
                position: this.getDefaultWindowPosition(sessionId),
                size: { width: 800, height: 600 }
            };
        },

        /**
         * Get default window position
         */
        getDefaultWindowPosition(sessionId) {
            const registry = global.WindowRegistry;
            const sessionWindows = registry?.getSessionWindows();
            const n = sessionWindows ? sessionWindows.size : 0;
            const pos = this.calculateCascadePosition(n);
            const maxX = window.innerWidth - 400;
            const maxY = window.innerHeight - 300;
            return {
                x: Math.min(pos.x, maxX),
                y: Math.min(pos.y, maxY)
            };
        },

        /**
         * Calculate cascade position for new window
         */
        calculateCascadePosition(existingWindowCount) {
            const offset = existingWindowCount * 30;
            return {
                x: 50 + offset,
                y: 50 + offset
            };
        },

        /**
         * Ensure position is within viewport
         */
        clampToViewport(position, size) {
            const maxX = window.innerWidth - (size?.width || 400);
            const maxY = window.innerHeight - (size?.height || 300);
            
            return {
                x: Math.max(0, Math.min(position.x, maxX)),
                y: Math.max(0, Math.min(position.y, maxY))
            };
        }
    };

    // Export
    global.WindowPosition = WindowPosition;

})(typeof window !== 'undefined' ? window : globalThis);
