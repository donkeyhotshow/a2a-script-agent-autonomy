/**
 * Window Manager Index - Loads all window management modules
 * 
 * This file must be loaded AFTER the individual modules.
 * The modules are loaded in order of dependencies:
 * 1. window-registry.js - Base registry (no dependencies)
 * 2. window-position.js - Position management (depends on WindowRegistry)
 * 3. window-events.js - Event handling (no dependencies)
 * 4. window-state.js - State management (depends on WindowRegistry, WindowPosition, WindowEvents)
 * 5. window-manager.js - Main facade (depends on all above)
 */
(function (global) {
    'use strict';

    const WindowModules = {
        /**
         * Get all loaded modules
         */
        getModules() {
            return {
                registry: global.WindowRegistry,
                position: global.WindowPosition,
                events: global.WindowEvents,
                state: global.WindowState,
                manager: global.WindowManager
            };
        },

        /**
         * Check if all modules are loaded
         */
        isReady() {
            return !!(
                global.WindowRegistry &&
                global.WindowPosition &&
                global.WindowEvents &&
                global.WindowState &&
                global.WindowManager
            );
        },

        /**
         * Initialize all modules
         */
        async init() {
            console.log('[WindowModules] All modules loaded');
            
            if (global.WindowManager?.init) {
                await global.WindowManager.init();
            }
        }
    };

    // Export
    global.WindowModules = WindowModules;

})(typeof window !== 'undefined' ? window : globalThis);
