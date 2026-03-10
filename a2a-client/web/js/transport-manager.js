/**
 * Transport Manager - Unified real-time communication
 * Primary: HTTP polling
 * Fallback: None (HTTP is the only transport)
 *
 * This file now loads modular transport components.
 * Original monolithic code moved to js/transport/ directory.
 */

(function (global) {
    'use strict';

    // Load transport modules
    function loadTransportModules() {
        const modules = [
            '/js/transport/base-transport.js',
            '/js/transport/heartbeat-manager.js'
        ];

        let loadedCount = 0;

        modules.forEach(src => {
            if (!document.querySelector(`script[src*="${src}"]`)) {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    loadedCount++;
                    console.log(`[TransportManager] Module loaded: ${src} (${loadedCount}/${modules.length})`);
                    if (loadedCount === modules.length) {
                        console.log('[TransportManager] All transport modules loaded');
                        global._transportModulesLoaded = true;
                    }
                };
                script.onerror = () => {
                    console.error(`[TransportManager] Failed to load module: ${src}`);
                };
                document.head.appendChild(script);
            } else {
                loadedCount++;
            }
        });
    }

    // Auto-load modules when DOM ready or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadTransportModules);
    } else {
        loadTransportModules();
    }

})(typeof window !== 'undefined' ? window : globalThis);
