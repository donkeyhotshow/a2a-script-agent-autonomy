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
        console.log('[AppTask] loadAppModules() starting...');
        
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
        
        console.log('[AppTask] appendWebScriptOnce available, loading core modules...');
        
        // Core modules (needed for window management)
        const coreModules = [
            'js/app/windows/window-registry.js',
            'js/app/windows/window-position.js',
            'js/app/windows/window-events.js',
            'js/app/windows/window-state.js'
        ];

        // App modules (initialization, event handlers, UI and state managers)
        const appModules = [
            'js/app/initialization.js',
            'js/app/event-handlers.js',
            'js/app/ui-managers.js',
            'js/app/state-managers.js',
            'js/app/project-manager.js',
            'js/app/session-manager.js',
            'js/app/taskbar-manager.js'
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
            
            // Check what's loaded
            console.log('[AppTask] After load - ProjectManager:', typeof global.ProjectManager);
            console.log('[AppTask] After load - SessionManager:', typeof global.SessionManager);
            console.log('[AppTask] After load - TaskbarManager:', typeof global.TaskbarManager);
            console.log('[AppTask] After load - WindowState:', typeof global.WindowState);
            
            // Initialize the application after modules are loaded
            console.log('[AppTask] Calling AppInitialization.init()...');
            global.AppInitialization?.init?.().then(function() {
                console.log('[AppTask] AppInitialization complete');
            }).catch(function(err) {
                console.error('[AppTask] AppInitialization failed:', err);
            });
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
