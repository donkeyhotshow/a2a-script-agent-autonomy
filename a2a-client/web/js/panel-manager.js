/**
 * Panel Manager - Simplified unified panel system
 * Consolidates: panels + cubes + modals into single hierarchy
 * Lifecycle: created → minimized → restored → closed
 * State centralized via SessionStore
 *
 * This file now loads modular panel components.
 * Original monolithic code moved to js/panels/ directory.
 */

(function (global) {
    'use strict';

    // Load panel modules
    function loadPanelModules() {
        const modules = [
            'js/panels/panel-types.js',
            'js/panels/panel.js',
            'js/panels/panel-manager.js'
        ];

        let loadedCount = 0;

        modules.forEach(src => {
            if (!document.querySelector(`script[src*="${src}"]`)) {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    loadedCount++;
                    console.log(`[PanelManager] Module loaded: ${src} (${loadedCount}/${modules.length})`);
                    if (loadedCount === modules.length) {
                        console.log('[PanelManager] All panel modules loaded');
                        global._panelModulesLoaded = true;
                    }
                };
                script.onerror = () => {
                    console.error(`[PanelManager] Failed to load module: ${src}`);
                };
                document.head.appendChild(script);
            } else {
                loadedCount++;
            }
        });
    }

    // Auto-load modules when DOM ready or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadPanelModules);
    } else {
        loadPanelModules();
    }

})(typeof window !== 'undefined' ? window : globalThis);
