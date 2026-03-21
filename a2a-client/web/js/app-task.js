/**
 * App Task - Main application entry point with modular architecture
 * Taskbar shows session buttons at bottom, each opens a floating window.
 *
 * This file now loads modular app components.
 * Original monolithic code moved to js/app/ directory.
 * 
 * Configuration:
 * - window.APP_CONFIG = { loadAppModules: false } to disable app modules loading
 *   (useful for minimal dialog-only version)
 */

(function (global) {
    'use strict';

    // Default config - load all app modules
    const APP_CONFIG = global.APP_CONFIG || { loadAppModules: true };

    function loadAppModules() {
        // Check if we should skip loading app modules (for minimal dialog version)
        if (APP_CONFIG.loadAppModules === false) {
            console.log('[AppTask] Skipping app modules loading (minimal mode)');
            global._appModulesLoaded = true;
            return;
        }

        if (typeof global.appendWebScriptOnce !== 'function') {
            console.error('[AppTask] Expected js/resolve-web-script-url.js before js/app-task.js');
            global._appModulesLoaded = true;
            return;
        }
        
        // Core modules (needed for window management)
        const coreModules = [
            'js/app/windows/window-registry.js',
            'js/app/windows/window-position.js',
            'js/app/windows/window-events.js',
            'js/app/windows/window-state.js',
            'js/app/windows/window-manager.js',
            'js/app/windows/index.js'
        ];

        // App modules (project/session management, taskbar)
        const appModules = [
            'js/app/project-manager.js',
            'js/app/session-manager.js',
            'js/app/taskbar-manager.js',
            'js/app/app-task.js'
        ];

        const allModules = [...coreModules, ...appModules];
        const n = allModules.length;
        
        global._appModuleLoadErrors = [];
        
        Promise.all(
            allModules.map(function (rel) {
                return global.appendWebScriptOnce(rel, {
                    onload: function () {
                        console.log('[AppTask] Module loaded: ' + rel);
                    }
                }).catch(function (err) {
                    console.error('[AppTask] Failed to load module: ' + rel, err);
                    global._appModuleLoadErrors.push(rel);
                });
            })
        ).then(function () {
            if (global._appModuleLoadErrors.length) {
                console.error('[AppTask] Module load finished with errors:', global._appModuleLoadErrors);
            } else {
                console.log('[AppTask] All app modules loaded (' + n + ')');
            }
            global._appModulesLoaded = true;
        });
    }

    // Auto-load modules when DOM ready or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAppModules);
    } else {
        loadAppModules();
    }

    // Export config for external control
    global.APP_CONFIG = APP_CONFIG;

})(typeof window !== 'undefined' ? window : globalThis);
