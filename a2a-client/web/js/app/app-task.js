/**
 * App Task - Main application entry point with modular managers
 * Taskbar shows session buttons at bottom, each opens a floating window.
 * 
 * This file serves as an entry point that loads and integrates all modular components:
 * - initialization.js - Application initialization and module loading
 * - event-handlers.js - UI event handlers and keyboard shortcuts
 * - ui-managers.js - UI management (projects, headers, grids)
 * - state-managers.js - Session state management
 */
(function (global) {
    'use strict';

    /**
     * Load modular components dynamically
     */
    async function loadModules() {
        const modules = [
            'js/app/initialization.js',
            'js/app/event-handlers.js',
            'js/app/ui-managers.js',
            'js/app/state-managers.js'
        ];

        const loadPromises = modules.map((rel) => {
            return new Promise((resolve, reject) => {
                if (global.isWebScriptInjected?.(rel)) {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = global.resolveWebScriptUrl(rel);
                script.onload = () => {
                    console.log(`[AppTask] Loaded module: ${rel}`);
                    resolve();
                };
                script.onerror = () => reject(new Error(`Failed to load ${rel}`));
                document.head.appendChild(script);
            });
        });

        await Promise.all(loadPromises);
    }

    /**
     * Unified AppTask interface that combines all modules
     */
    const AppTask = {
        /**
         * Initialize application
         */
        async init() {
            console.log('[AppTask] Initializing...');

            try {
                // Load all module files
                await loadModules();

                // Delegate to AppInitialization module
                await global.AppInitialization?.init();

                console.log('[AppTask] Initialization complete');
            } catch (error) {
                console.error('[AppTask] Initialization failed:', error);
            }
        },

        /**
         * Load all modular components (called internally)
         */
        async loadModules() {
            return loadModules();
        },

        /**
         * Setup UI event handlers (delegates to AppEventHandlers)
         */
        setupUI() {
            global.AppEventHandlers?.setupUI?.();
        },

        /**
         * Setup modal buttons (delegates to AppEventHandlers)
         */
        setupModalButtons() {
            global.AppEventHandlers?.setupModalButtons?.();
        },

        /**
         * Setup storage mode toggle (delegates to AppEventHandlers)
         */
        setupStorageModeToggle() {
            global.AppEventHandlers?.setupStorageModeToggle?.();
        },

        /**
         * Setup loader indicator (delegates to AppEventHandlers)
         */
        setupLoaderIndicator() {
            global.AppEventHandlers?.setupLoaderIndicator?.();
        },

        /**
         * Wire modal content (delegates to AppEventHandlers)
         */
        _wireModalContent(type, panel) {
            global.AppEventHandlers?._wireModalContent?.(type, panel);
        },

        /**
         * Refresh projects UI (delegates to AppUIManagers)
         */
        async refreshProjectsUI() {
            return global.AppUIManagers?.refreshProjectsUI?.();
        },

        /**
         * Populate header project select (delegates to AppUIManagers)
         */
        async _populateHeaderProjectSelect() {
            return global.AppUIManagers?._populateHeaderProjectSelect?.();
        },

        /**
         * Load projects into grid (delegates to AppUIManagers)
         */
        async _loadProjectsIntoGrid(gridEl) {
            return global.AppUIManagers?._loadProjectsIntoGrid?.(gridEl);
        },

        /**
         * Restore application state (delegates to AppInitialization)
         */
        async restoreState() {
            return global.AppInitialization?.restoreState?.();
        },

        /**
         * Create new session (delegates to AppStateManagers)
         */
        async createNewSession() {
            return global.AppStateManagers?.createNewSession?.();
        },

        /**
         * Close active session (delegates to AppStateManagers)
         */
        closeActiveSession() {
            global.AppStateManagers?.closeActiveSession?.();
        }
    };

    // Export
    global.AppTask = AppTask;

    // Auto-initialize when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AppTask.init());
    } else {
        AppTask.init();
    }

})(typeof window !== 'undefined' ? window : globalThis);
