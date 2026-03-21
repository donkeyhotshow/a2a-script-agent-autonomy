/**
 * App Task - Main application entry point with modular architecture
 * Taskbar shows session buttons at bottom, each opens a floating window.
 *
 * This file now loads modular app components.
 * Original monolithic code moved to js/app/ directory.
 */

(function (global) {
    'use strict';

    function resolveWebScriptUrl(relativePath) {
        var baseEl = document.getElementById('app-base');
        var baseHref = (baseEl && baseEl.href) ? baseEl.href : document.baseURI;
        var path = relativePath.replace(/^\//, '');
        try {
            return new URL(path, baseHref).href;
        } catch (e) {
            return '/' + path;
        }
    }

    // Load app modules
    function loadAppModules() {
        const modules = [
            'js/app/project-manager.js',
            'js/app/session-manager.js',
            'js/app/windows/window-registry.js',
            'js/app/windows/window-position.js',
            'js/app/windows/window-events.js',
            'js/app/windows/window-state.js',
            'js/app/windows/window-manager.js',
            'js/app/windows/index.js',
            'js/app/window-manager.js',
            'js/app/taskbar-manager.js',
            'js/app/app-task.js'
        ];

        let loadedCount = 0;

        function tryComplete() {
            if (loadedCount === modules.length) {
                var errs = global._appModuleLoadErrors;
                if (errs && errs.length) {
                    console.error('[AppTask] Module load finished with errors:', errs);
                } else {
                    console.log('[AppTask] All app modules loaded');
                }
                global._appModulesLoaded = true;
            }
        }

        modules.forEach(function (rel) {
            var resolved = resolveWebScriptUrl(rel);
            // Match either relative path or full resolved URL (avoids duplicate injects under subpath base)
            var already = document.querySelector('script[src*="' + rel.replace(/"/g, '') + '"]')
                || document.querySelector('script[src="' + resolved.replace(/"/g, '') + '"]');
            if (!already) {
                const script = document.createElement('script');
                script.src = resolved;
                script.onload = function () {
                    loadedCount++;
                    console.log('[AppTask] Module loaded: ' + rel + ' (' + loadedCount + '/' + modules.length + ')');
                    tryComplete();
                };
                script.onerror = function () {
                    console.error('[AppTask] Failed to load module: ' + rel);
                    loadedCount++;
                    global._appModuleLoadErrors = global._appModuleLoadErrors || [];
                    global._appModuleLoadErrors.push(rel);
                    tryComplete();
                };
                document.head.appendChild(script);
            } else {
                loadedCount++;
                tryComplete();
            }
        });
    }

    // Auto-load modules when DOM ready or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAppModules);
    } else {
        loadAppModules();
    }

})(typeof window !== 'undefined' ? window : globalThis);