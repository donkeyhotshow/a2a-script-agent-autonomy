/**
 * App Task - Main application initialization with modular managers
 * Taskbar shows session buttons at bottom, each opens a floating window.
 */
(function (global) {
    'use strict';

    const AppTask = {
        /**
         * Initialize application
         */
        async init() {
            console.log('[AppTask] Initializing...');

            try {
                // Load all modules first
                await this.loadModules();

                // Initialize managers
                await global.ProjectManager?.init();
                await global.SessionManager?.init();
                await global.WindowManager?.init();
                global.TaskbarManager?.init();

                // Setup UI
                this.setupUI();

                // Restore previous state
                await this.restoreState();

                console.log('[AppTask] Initialization complete');
            } catch (error) {
                console.error('[AppTask] Initialization failed:', error);
            }
        },

        /**
         * Load required modules
         */
        async loadModules() {
            const modules = [
                'js/app/project-manager.js',
                'js/app/session-manager.js',
                'js/app/window-manager.js',
                'js/app/taskbar-manager.js'
            ];

            const loadPromises = modules.map(src => {
                return new Promise((resolve, reject) => {
                    if (document.querySelector(`script[src*="${src}"]`)) {
                        resolve();
                        return;
                    }

                    const script = document.createElement('script');
                    script.src = src;
                    script.onload = () => {
                        console.log(`[AppTask] Loaded module: ${src}`);
                        resolve();
                    };
                    script.onerror = () => reject(new Error(`Failed to load ${src}`));
                    document.head.appendChild(script);
                });
            });

            await Promise.all(loadPromises);
        },

        /**
         * Setup UI event handlers
         */
        setupUI() {
            // Global keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    switch (e.key) {
                        case 'n':
                            e.preventDefault();
                            this.createNewSession();
                            break;
                        case 'w':
                            e.preventDefault();
                            this.closeActiveSession();
                            break;
                    }
                }
            });

            // Window resize handler
            window.addEventListener('resize', () => {
                // Update off-screen indicators
                global.TaskbarManager?.updateOffScreenIndicators();
            });
        },

        /**
         * Restore application state
         */
        async restoreState() {
            // Restore session windows
            await global.WindowManager?.restoreSessionWindows();

            // Ensure taskbar is visible
            global.TaskbarManager?.ensureTaskbar();
        },

        /**
         * Create new session
         */
        async createNewSession() {
            try {
                const projectId = await global.ProjectManager?.getSelectedProjectId();
                const response = await fetch('/api/sessions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${global.apiIntegration?.token || ''}`
                    },
                    body: JSON.stringify({
                        projectId,
                        name: `Session ${new Date().toLocaleTimeString()}`
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const session = await response.json();

                // Refresh taskbar to show new session
                const taskbarContent = global.SessionManager?.getTaskbarContentEl();
                if (taskbarContent) {
                    await global.TaskbarManager?.refreshTaskbar(taskbarContent);
                }

                // Auto-open the new session
                setTimeout(() => {
                    const btn = document.querySelector(`[data-session-id="${session.id}"]`);
                    if (btn && global.WindowManager) {
                        global.WindowManager.toggleSessionWindow(session.id, btn);
                    }
                }, 100);

                console.log('[AppTask] Created new session:', session.id);
            } catch (error) {
                console.error('[AppTask] Failed to create session:', error);
                alert('Failed to create new session');
            }
        },

        /**
         * Close active session
         */
        closeActiveSession() {
            const activeSessionId = global.SessionManager?.getActiveSessionId();
            if (activeSessionId && global.WindowManager) {
                global.WindowManager.closeSessionWindow(activeSessionId);
            }
        }
    };

    // Export
    global.AppTask = AppTask;

    // Auto-initialize when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AppTask.init());
    } else {
        AppTask.init();
    }

})(typeof window !== 'undefined' ? window : globalThis);