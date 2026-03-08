/**
 * Window Manager - Handles session windows, positioning and state
 * 
 * DEPRECATED: This file is now a shim that loads modules from windows/ directory.
 * Please use the new modular structure:
 * - a2a-client/web/js/app/windows/window-registry.js
 * - a2a-client/web/js/app/windows/window-position.js
 * - a2a-client/web/js/app/windows/window-events.js
 * - a2a-client/web/js/app/windows/window-state.js
 * - a2a-client/web/js/app/windows/window-manager.js
 * 
 * This file is kept for backward compatibility and loads the new modules.
 */
(function (global) {
    'use strict';

    // The new modular window manager is now in windows/ directory
    // This shim maintains backward compatibility
    const SESSION_WINDOWS_KEY = 'a2a_session_windows';

    // Re-export from modular implementation
    const WindowManager = global.WindowManager || {};

    // Ensure compatibility by copying over any missing methods
    if (global.WindowModules) {
        const modules = global.WindowModules.getModules();
        
        // Copy from registry if available
        if (modules.registry) {
            if (!WindowManager.getSessionWindows) {
                WindowManager.getSessionWindows = modules.registry.getSessionWindows.bind(modules.registry);
            }
        }
        
        // Copy from position if available  
        if (modules.position) {
            if (!WindowManager.saveWindowState) {
                WindowManager.saveWindowState = modules.position.saveWindowState.bind(modules.position);
            }
            if (!WindowManager.loadWindowState) {
                WindowManager.loadWindowState = modules.position.loadWindowState.bind(modules.position);
            }
            if (!WindowManager.getDefaultWindowPosition) {
                WindowManager.getDefaultWindowPosition = modules.position.getDefaultWindowPosition.bind(modules.position);
            }
        }
        
        // Copy from state if available
        if (modules.state) {
            if (!WindowManager.toggleSessionWindow) {
                WindowManager.toggleSessionWindow = modules.state.toggleSessionWindow.bind(modules.state);
            }
            if (!WindowManager.createSessionWindow) {
                WindowManager.createSessionWindow = modules.state.createSessionWindow.bind(modules.state);
            }
            if (!WindowManager.closeSessionWindow) {
                WindowManager.closeSessionWindow = modules.state.closeSessionWindow.bind(modules.state);
            }
            if (!WindowManager.closeAllSessionWindows) {
                WindowManager.closeAllSessionWindows = modules.state.closeAllSessionWindows.bind(modules.state);
            }
            if (!WindowManager.restoreSessionWindows) {
                WindowManager.restoreSessionWindows = modules.state.restoreSessionWindows.bind(modules.state);
            }
            if (!WindowManager.checkSessionExists) {
                WindowManager.checkSessionExists = modules.state.checkSessionExists.bind(modules.state);
            }
        }
        
        // Copy from events if available
        if (modules.events) {
            if (!WindowManager.renderSessionContent) {
                WindowManager.renderSessionContent = modules.events.renderSessionContent.bind(modules.events);
            }
            if (!WindowManager.sendMessage) {
                WindowManager.sendMessage = modules.events.sendMessage.bind(modules.events);
            }
            if (!WindowManager.sendChoice) {
                WindowManager.sendChoice = modules.events.sendChoice.bind(modules.events);
            }
        }
        
        // Copy from manager if available
        if (modules.manager) {
            if (!WindowManager.saveSessionWindowsState) {
                WindowManager.saveSessionWindowsState = modules.manager.saveSessionWindowsState.bind(modules.manager);
            }
            if (!WindowManager.loadSessionWindowsState) {
                WindowManager.loadSessionWindowsState = modules.manager.loadSessionWindowsState.bind(modules.manager);
            }
            if (!WindowManager.clearSessionWindowsState) {
                WindowManager.clearSessionWindowsState = modules.manager.clearSessionWindowsState.bind(modules.manager);
            }
            if (!WindowManager.init) {
                WindowManager.init = modules.manager.init.bind(modules.manager);
            }
        }
    }

    // Keep the original SESSION_WINDOWS_KEY for compatibility
    WindowManager.SESSION_WINDOWS_KEY = SESSION_WINDOWS_KEY;

    // Export
    global.WindowManager = WindowManager;

})(typeof window !== 'undefined' ? window : globalThis);