/**
 * App Modules Index
 * Load all application modules
 */

// Load in dependency order
(function (global) {
    'use strict';

    // Load modules sequentially
    let loadedCount = 0;
    const modules = [
        'js/app/project-manager.js',
        'js/app/session-manager.js',
        'js/app/window-manager.js',
        'js/app/taskbar-manager.js',
        'js/app/app-task.js'
    ];

    function loadNextModule() {
        if (loadedCount >= modules.length) {
            console.log('[AppIndex] All app modules loaded');
            global._appModulesLoaded = true;
            return;
        }

        const src = modules[loadedCount];
        if (!document.querySelector(`script[src*="${src}"]`)) {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log(`[AppIndex] Module loaded: ${src} (${loadedCount + 1}/${modules.length})`);
                loadedCount++;
                loadNextModule();
            };
            script.onerror = () => {
                console.error(`[AppIndex] Failed to load module: ${src}`);
            };
            document.head.appendChild(script);
        } else {
            loadedCount++;
            loadNextModule();
        }
    }

    // Start loading
    loadNextModule();

})(typeof window !== 'undefined' ? window : globalThis);