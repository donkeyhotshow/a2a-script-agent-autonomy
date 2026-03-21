/**
 * App Task - Main application entry point with modular architecture
 * Taskbar shows session buttons at bottom, each opens a floating window.
 *
 * This file now loads modular app components.
 * Original monolithic code moved to js/app/ directory.
 */

(function (global) {
    'use strict';

    function loadAppModules() {
        if (typeof global.appendWebScriptOnce !== 'function') {
            console.error('[AppTask] Expected js/resolve-web-script-url.js before js/app-task.js');
            global._appModulesLoaded = true;
            return;
        }
        const modules = [
            'js/app/project-manager.js',
            'js/app/session-manager.js',
            'js/app/windows/window-registry.js',
            'js/app/windows/window-position.js',
            'js/app/windows/window-events.js',
            'js/app/windows/window-state.js',
            'js/app/windows/window-manager.js',
            'js/app/windows/index.js',
            'js/app/taskbar-manager.js',
            'js/app/app-task.js'
        ];
        const n = modules.length;
        global._appModuleLoadErrors = [];
        Promise.all(
            modules.map(function (rel) {
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

})(typeof window !== 'undefined' ? window : globalThis);