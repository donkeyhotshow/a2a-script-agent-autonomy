/**
 * App Task - Main application entry point with modular architecture
 * Taskbar shows session buttons at bottom, each opens a floating window.
 *
 * This file now loads modular app components.
 * Original monolithic code moved to js/app/ directory.
 */

(function (global) {
    'use strict';

    // Load app modules
    function loadAppModules() {
        const modules = [
            '/js/app/project-manager.js',
            '/js/app/session-manager.js',
            '/js/app/windows/window-registry.js',
            '/js/app/windows/window-position.js',
            '/js/app/windows/window-events.js',
            '/js/app/windows/window-state.js',
            '/js/app/windows/window-manager.js',
            '/js/app/windows/index.js',
            '/js/app/window-manager.js',
            '/js/app/taskbar-manager.js',
            '/js/app/app-task.js'
        ];

        let loadedCount = 0;

        modules.forEach(src => {
            if (!document.querySelector(`script[src*="${src}"]`)) {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    loadedCount++;
                    console.log(`[AppTask] Module loaded: ${src} (${loadedCount}/${modules.length})`);
                    if (loadedCount === modules.length) {
                        console.log('[AppTask] All app modules loaded');
                        global._appModulesLoaded = true;
                    }
                };
                script.onerror = () => {
                    console.error(`[AppTask] Failed to load module: ${src}`);
                };
                document.head.appendChild(script);
            } else {
                loadedCount++;
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