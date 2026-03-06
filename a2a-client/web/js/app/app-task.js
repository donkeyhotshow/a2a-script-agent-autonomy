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
                // Ensure header template is loaded (for Settings/Projects buttons)
                if (global.TemplateLoader && !document.getElementById('header-container')?.innerHTML?.trim()) {
                    await global.TemplateLoader.initTaskOnly();
                }

                // Load all modules first
                await this.loadModules();

                // Initialize managers
                await global.ProjectManager?.init();
                // Apply stored Client API URL so /api/tasks/analyze and /api/sessions hit the right host
                const apiUrl = await global.ProjectManager?.getStoredClientApiUrl?.();
                if (apiUrl && String(apiUrl).trim()) {
                    const base = String(apiUrl).trim().replace(/\/?$/, '');
                    if (global.apiIntegration) global.apiIntegration.configure({ apiBase: base });
                    if (global.TransportManager) global.TransportManager.apiBase = base;
                }
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

            // Modals (Settings, Projects) via PanelManager – same hierarchy as panels
            this.setupModalButtons();
        },

        /**
         * Open Settings/Projects as PanelManager modals; inject content from legacy modal markup on first open.
         */
        setupModalButtons() {
            const pm = global.PanelManager;
            if (!pm) return;

            const openModal = (type, sourceId) => {
                const id = type;
                let panel = pm.get(id);
                if (panel && panel.state === global.PANEL_STATES.VISIBLE) {
                    pm.bringToFront(id);
                    return;
                }
                panel = pm.open(type, { id });
                if (!panel) return;
                const contentEl = panel.getContentEl();
                if (!contentEl || !contentEl.innerHTML.trim()) {
                    const src = document.getElementById(sourceId);
                    const body = src?.querySelector('.modal-body');
                    const footer = src?.querySelector('.modal-footer');
                    if (body || footer) {
                        panel.setContent((body?.innerHTML ?? '') + (footer?.innerHTML ?? ''));
                    }
                    this._wireModalContent(type, panel);
                }
            };

            document.getElementById('settingsBtn')?.addEventListener('click', () => openModal('settings', 'settingsModal'));
            document.getElementById('projectsBtn')?.addEventListener('click', () => openModal('projects', 'projectsModal'));
            document.getElementById('newTaskBtn')?.addEventListener('click', () => global.TaskCreator?.open());
        },

        _wireModalContent(type, panel) {
            const content = panel.getContentEl();
            if (!content) return;

            if (type === 'settings') {
                global.ProjectManager?.getStoredClientApiUrl?.().then((url) => {
                    const input = content.querySelector('#settingsApiUrl');
                    if (input) input.value = url || '/api';
                });
                content.querySelector('#cancelSettings')?.addEventListener('click', () => panel.close());
                content.querySelector('#saveSettings')?.addEventListener('click', () => {
                    const input = content.querySelector('#settingsApiUrl');
                    const url = input?.value?.trim() || '/api';
                    const base = url ? String(url).replace(/\/?$/, '') : '/api';
                    global.ProjectManager?.setStoredClientApiUrl(url).then(() => {
                        if (global.apiIntegration) global.apiIntegration.configure({ apiBase: base });
                        if (global.TransportManager) global.TransportManager.apiBase = base;
                        panel.close();
                    });
                });
            }
            if (type === 'projects') {
                content.querySelector('#cancelProjects')?.addEventListener('click', () => panel.close());
            }
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
                const base = (global.apiIntegration?.apiBase || '/api').replace(/\/?$/, '');
                const response = await fetch(`${base}/sessions`, {
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
                window.ErrorHandler?.handle(new Error('Failed to create new session'), { action: 'createSession' });
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