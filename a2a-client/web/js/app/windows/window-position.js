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
                
                // Return default window state if not found
                const defaultPosition = this.getDefaultWindowPosition(sessionId);
                return {
                    position: defaultPosition,
                    size: { width: 800, height: 600 },
                    timestamp: Date.now()
                };
            } catch (e) {
                console.warn('[WindowPosition] Failed to load window state:', e);
                const defaultPosition = this.getDefaultWindowPosition(sessionId);
                return {
                    position: defaultPosition,
                    size: { width: 800, height: 600 },
                    timestamp: Date.now()
                };
            }
        },

        /**
         * Get default window position
         */
        getDefaultWindowPosition(sessionId) {
            // Get registry module for access to sessionWindows
            const registry = global.WindowRegistry;
            const sessionWindows = registry?.getSessionWindows();
            
            // Calculate position based on existing windows to avoid overlap
            const existingPositions = sessionWindows 
                ? Array.from(sessionWindows.values())
                    .map(panel => panel.position)
                : [];

            let x = 50 + (existingPositions.length * 30);
            let y = 50 + (existingPositions.length * 30);

            // Ensure within viewport bounds
            const maxX = window.innerWidth - 400;
            const maxY = window.innerHeight - 300;

            return {
                x: Math.min(x, maxX),
                y: Math.min(y, maxY)
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
