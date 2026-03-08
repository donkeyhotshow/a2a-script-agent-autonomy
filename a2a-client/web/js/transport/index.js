/**
 * Transport Module Index
 * Load all transport-related modules
 */

// Load in dependency order
(function (global) {
    'use strict';

    // Base transport first
    if (!document.querySelector('script[src*="base-transport.js"]')) {
        const script = document.createElement('script');
        script.src = '/js/transport/base-transport.js';
        script.onload = () => {
            console.log('[TransportIndex] BaseTransport loaded');
            loadSSETransport();
        };
        document.head.appendChild(script);
    } else {
        loadSSETransport();
    }

    function loadSSETransport() {
        if (!document.querySelector('script[src*="sse-transport.js"]')) {
            const script = document.createElement('script');
            script.src = '/js/transport/sse-transport.js';
            script.onload = () => {
                console.log('[TransportIndex] SSETransport loaded');
                loadWebSocketTransport();
            };
            document.head.appendChild(script);
        } else {
            loadWebSocketTransport();
        }
    }

    function loadWebSocketTransport() {
        if (!document.querySelector('script[src*="websocket-transport.js"]')) {
            const script = document.createElement('script');
            script.src = '/js/transport/websocket-transport.js';
            script.onload = () => {
                console.log('[TransportIndex] WebSocketTransport loaded');
                loadHeartbeatManager();
            };
            document.head.appendChild(script);
        } else {
            loadHeartbeatManager();
        }
    }

    function loadHeartbeatManager() {
        if (!document.querySelector('script[src*="heartbeat-manager.js"]')) {
            const script = document.createElement('script');
            script.src = '/js/transport/heartbeat-manager.js';
            script.onload = () => {
                console.log('[TransportIndex] HeartbeatManager loaded');
                loadTransportManager();
            };
            document.head.appendChild(script);
        } else {
            loadTransportManager();
        }
    }

    function loadTransportManager() {
        if (!document.querySelector('script[src*="transport/transport-manager.js"]')) {
            const script = document.createElement('script');
            script.src = '/js/transport/transport-manager.js';
            script.onload = () => {
                console.log('[TransportIndex] TransportManager loaded');
                global._transportModulesLoaded = true;
            };
            document.head.appendChild(script);
        } else {
            global._transportModulesLoaded = true;
        }
    }

})(typeof window !== 'undefined' ? window : globalThis);