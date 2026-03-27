/**
 * TaskFlow Panel Gateway - isolates TaskFlow from concrete panel manager.
 */
(function (global) {
    'use strict';

    function getManager() {
        return global.PanelManager || null;
    }

    function getPanel(panelId) {
        const pm = getManager();
        if (!pm || !panelId || typeof pm.get !== 'function') return null;
        return pm.get(panelId) || null;
    }

    function bringToFront(panelId) {
        const pm = getManager();
        if (!pm || !panelId || typeof pm.bringToFront !== 'function') return false;
        pm.bringToFront(panelId);
        return true;
    }

    function openTaskPanel(options) {
        const pm = getManager();
        if (!pm || typeof pm.open !== 'function') return null;
        return pm.open('task', options) || null;
    }

    const gateway = {
        getPanel,
        bringToFront,
        openTaskPanel,
    };
    global.TaskFlowPanelGateway = gateway;
})(typeof window !== 'undefined' ? window : globalThis);
