/**
 * Panels Module Index
 * Load all panel-related modules
 */

// Load in dependency order
(function (global) {
    'use strict';

    // Panel types first
    if (!document.querySelector('script[src*="panels/panel-types.js"]')) {
        const script = document.createElement('script');
        script.src = '/js/panels/panel-types.js';
        script.onload = () => {
            console.log('[PanelsIndex] PanelTypes loaded');
            loadPanelClass();
        };
        document.head.appendChild(script);
    } else {
        loadPanelClass();
    }

    function loadPanelClass() {
        if (!document.querySelector('script[src*="panels/panel.js"]')) {
            const script = document.createElement('script');
            script.src = '/js/panels/panel.js';
            script.onload = () => {
                console.log('[PanelsIndex] Panel class loaded');
                loadPanelManager();
            };
            document.head.appendChild(script);
        } else {
            loadPanelManager();
        }
    }

    function loadPanelManager() {
        if (!document.querySelector('script[src*="panels/panel-manager.js"]')) {
            const script = document.createElement('script');
            script.src = '/js/panels/panel-manager.js';
            script.onload = () => {
                console.log('[PanelsIndex] PanelManager loaded');
                global._panelModulesLoaded = true;
            };
            document.head.appendChild(script);
        } else {
            global._panelModulesLoaded = true;
        }
    }

})(typeof window !== 'undefined' ? window : globalThis);