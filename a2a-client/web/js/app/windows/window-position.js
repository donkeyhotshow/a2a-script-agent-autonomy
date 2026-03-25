/**
 * Window Position - Manages window position and size
 */
(function (global) {
    'use strict';

    // Per-device key: screen resolution + pixel ratio as fingerprint (safe characters only)
    function _deviceKey() {
        return `${screen.width}x${screen.height}_${Math.round((devicePixelRatio || 1) * 100)}`;
    }

    const WindowPosition = {
        /**
         * Save window state
         */
        async saveWindowState(sessionId, position, size) {
            try {
                const key = `window_state_${sessionId}_${_deviceKey()}`;
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
                const key = `window_state_${sessionId}_${_deviceKey()}`;
                const saved = await StorageAPI.ui.getItem(key);
                if (saved) {
                    // saved can be either a string (JSON) or already-parsed object
                    return typeof saved === 'string' ? JSON.parse(saved) : saved;
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
         * Ensure position is within viewport.
         * - Vertical: top of window (y) must stay >= 0 and <= innerHeight - HEADER_H
         *   so the header is always reachable.
         * - Horizontal: window can slide off-screen by at most half its width.
         */
        clampToViewport(position, size) {
            const HEADER_H = 44; // px — minimum visible header strip
            const w = size?.width  || 400;
            const h = size?.height || 300;
            const halfW = Math.floor(w / 2);

            return {
                x: Math.max(-halfW, Math.min(position.x, window.innerWidth  - halfW)),
                y: Math.max(0,      Math.min(position.y, window.innerHeight - HEADER_H))
            };
        }
    };

    // Export
    global.WindowPosition = WindowPosition;

})(typeof window !== 'undefined' ? window : globalThis);
