/**
 * Panel Types and States - Constants for panel system
 */
(function (global) {
    'use strict';

    const PANEL_TYPES = {
        task: { slot: 'floating', title: 'Task', critical: true },
        chat: { slot: 'floating', title: 'Chat', critical: false },
        logs: { slot: 'bottom', title: 'Logs', critical: false },
        taskbar: { slot: 'taskbar', title: 'Sessions', critical: true },
        settings: { slot: 'modal', title: 'Settings', critical: false },
        projects: { slot: 'modal', title: 'Projects', critical: false },
        debug: { slot: 'floating', title: 'Debug', critical: false }
    };

    const PANEL_STATES = {
        CREATED: 'created',
        VISIBLE: 'visible',
        MINIMIZED: 'minimized',
        MAXIMIZED: 'maximized',
        DOCKED: 'docked',
        CLOSED: 'closed'
    };

    // Export
    global.PANEL_TYPES = PANEL_TYPES;
    global.PANEL_STATES = PANEL_STATES;

})(typeof window !== 'undefined' ? window : globalThis);