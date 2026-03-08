/**
 * AIActionsSessionPanel Integration
 * Bridge SessionStore events to AIActionsSessionPanel.processExecute
 */

(function (global) {
    'use strict';

    let _panelConnectionLogThrottled = false;

    function connectAIActionsPanel() {
        const store = global.SessionStore;
        const panel = global.aiActionsPanel;

        if (!store || !panel) {
            if (!_panelConnectionLogThrottled) {
                console.log('[SessionStore Adapters] AIActionsSessionPanel connection: waiting for both Store and Panel');
                _panelConnectionLogThrottled = true;
                // Reset throttle after 10 seconds
                setTimeout(() => { _panelConnectionLogThrottled = false; }, 10000);
            }
            return false;
        }

        // Already connected?
        if (panel._storeConnected) return true;

        // Listen for execute events and forward to panel
        store.on('execute', (execute) => {
            if (!execute) return;
            try {
                panel.processExecute(execute, store.context);
            } catch (err) {
                console.error('[SessionStore Adapters] Failed to process execute:', err);
            }
        });

        // Listen for completed status
        store.on('completed', (data) => {
            const sessionId = panel.currentSessionId || store.sessionId;
            if (sessionId) {
                panel.updateSessionStatus(sessionId, 'completed');
            }
        });

        // Listen for status changes
        store.on('status', (status) => {
            const sessionId = panel.currentSessionId || store.sessionId;
            if (sessionId && ['active', 'waiting', 'error', 'cancelled'].includes(status)) {
                panel.updateSessionStatus(sessionId, status);
            }
        });

        panel._storeConnected = true;
        console.log('[SessionStore Adapters] AIActionsSessionPanel connected to SessionStore');
        return true;
    }

    // Try to connect immediately if both exist
    if (!connectAIActionsPanel()) {
        // Retry when AIActionsSessionPanel is created
        const checkInterval = setInterval(() => {
            if (connectAIActionsPanel()) {
                clearInterval(checkInterval);
            }
        }, 500);

        // Stop checking after 30 seconds
        setTimeout(() => clearInterval(checkInterval), 30000);
    }

    // Export connection function for manual reconnection
    global.connectAIActionsPanel = connectAIActionsPanel;

})(typeof window !== 'undefined' ? window : globalThis);
