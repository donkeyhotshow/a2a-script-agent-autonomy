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
                // Apply stored Client API URL for operations requiring Client API server
                let apiUrl = await global.ProjectManager?.getStoredClientApiUrl?.();
                // Handle case where StorageAPI returns an object instead of string
                if (apiUrl && typeof apiUrl === 'object') {
                    apiUrl = apiUrl.url || apiUrl.apiBase || apiUrl.toString?.() || null;
                }
                if (apiUrl && String(apiUrl).trim() && String(apiUrl).trim() !== '[object Object]') {
                    const base = String(apiUrl).trim().replace(/\/?$/, '');
                    if (global.apiIntegration) global.apiIntegration.configure({ apiBase: base });
                }
                await global.SessionManager?.init();
                await global.WindowManager?.init();
                global.TaskbarManager?.init();

                // Setup UI
                this.setupUI();

                // Populate header project select (header is ready, API is set)
                await this._populateHeaderProjectSelect();

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
                '/js/session-store.js',  // Load FIRST for global.SessionStore
                '/js/app/project-manager.js',
                '/js/app/session-manager.js',
                '/js/app/window-manager.js',
                '/js/app/taskbar-manager.js'
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

            // Setup storage mode toggle and loader
            this.setupStorageModeToggle();
            this.setupLoaderIndicator();

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
            document.getElementById('newTaskBtn')?.addEventListener('click', () => this.createNewSession());
        },

        /**
         * Setup storage mode toggle in header
         */
        setupStorageModeToggle() {
            const storageSelect = document.getElementById('storageModeSelect');
            if (!storageSelect) return;

            // Load saved storage mode: project (.a2a/sessions) vs storage (a2a-client/storage/sessions or A2A_CLIENT_STORAGE_DIR)
            const savedMode = localStorage.getItem('a2a_storage_mode') || 'storage';
            const valid = ['project', 'storage'].includes(savedMode);
            storageSelect.value = valid ? savedMode : 'storage';

            if (global.SessionStore && typeof global.SessionStore.setStorageMode === 'function') {
                global.SessionStore.setStorageMode(storageSelect.value);
            } else {
                console.warn('[AppTask] SessionStore.setStorageMode not available yet');
            }

            storageSelect.addEventListener('change', (e) => {
                const mode = e.target.value;
                localStorage.setItem('a2a_storage_mode', mode);
                if (global.SessionStore && typeof global.SessionStore.setStorageMode === 'function') {
                    global.SessionStore.setStorageMode(mode);
                } else {
                    console.warn('[AppTask] SessionStore.setStorageMode not available on mode change');
                }
                // Refresh taskbar and projects UI
                this.refreshProjectsUI();
                console.log('[AppTask] Storage mode changed to:', mode);
            });
        },

        /**
         * Setup loader indicator for waiting server responses
         * Note: Global loader is disabled - wait is now shown in each dialog panel
         */
        setupLoaderIndicator() {
            // Global loader indicator is disabled - wait is now shown in each dialog panel
            // This function is kept for backward compatibility but does nothing
            console.log('[AppTask] Global loader indicator disabled - using panel-based wait elements');
        },

        _wireModalContent(type, panel) {
            const content = panel.getContentEl();
            if (!content) return;

            if (type === 'settings') {
                global.ProjectManager?.getStoredClientApiUrl?.().then((url) => {
                    // Handle case where StorageAPI returns an object
                    if (url && typeof url === 'object') {
                        url = url.url || url.apiBase || '/api';
                    }
                    const input = content.querySelector('#settingsApiUrl');
                    if (input) input.value = (typeof url === 'string' ? url : '/api');
                });
                content.querySelector('#cancelSettings')?.addEventListener('click', () => panel.close());
                content.querySelector('#saveSettings')?.addEventListener('click', () => {
                    const input = content.querySelector('#settingsApiUrl');
                    const url = input?.value?.trim() || '/api';
                    const base = url ? String(url).replace(/\/?$/, '') : '/api';
                    global.ProjectManager?.setStoredClientApiUrl(url).then(() => {
                        if (global.apiIntegration) global.apiIntegration.configure({ apiBase: base });
                        panel.close();
                    });
                });
            }
            if (type === 'projects') {
                content.querySelector('#cancelProjects')?.addEventListener('click', () => panel.close());
                const grid = content.querySelector('#projectsGrid');
                if (grid) this._loadProjectsIntoGrid(grid);
                content.addEventListener('click', (e) => {
                    const card = e.target.closest('.project-card');
                    if (!card) return;
                    const projectId = card.dataset.projectId;
                    if (!projectId) return;
                    global.ProjectManager?.setSelectedProjectId(projectId);
                    const sel = document.getElementById('projectSelect');
                    if (sel) {
                        if (!sel.querySelector(`option[value="${projectId}"]`)) {
                            const opt = document.createElement('option');
                            opt.value = projectId;
                            opt.textContent = card.querySelector('.project-name')?.textContent || projectId;
                            sel.appendChild(opt);
                        }
                        sel.value = projectId;
                    }
                    panel.close();
                });
            }
        },

        /**
         * Refresh projects UI: header select, taskbar, and projects panel grid. Call after create/delete project.
         */
        async refreshProjectsUI() {
            const sel = document.getElementById('projectSelect');
            if (sel) {
                const saved = await global.ProjectManager?.getSelectedProjectId?.() || global.ProjectManager?.getLastSelectedProjectId?.();
                sel.innerHTML = '<option value="">Select Project...</option>';
                try {
                    const list = await (global.apiIntegration?.getProjects?.() ?? Promise.resolve([]));
                    (Array.isArray(list) ? list : []).forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.id;
                        opt.textContent = p.name || p.id;
                        sel.appendChild(opt);
                    });
                    if (saved && Array.from(sel.options).some(o => o.value === saved)) sel.value = saved;
                } catch (e) {
                    console.warn('[AppTask] Could not load projects for header:', e);
                    if (saved) {
                        const opt = document.createElement('option');
                        opt.value = saved;
                        opt.textContent = saved;
                        sel.appendChild(opt);
                        sel.value = saved;
                    }
                }
            }
            const taskbarContent = document.querySelector('.taskbar-content');
            if (taskbarContent && global.TaskbarManager) await global.TaskbarManager.refreshTaskbar(taskbarContent);
            const grid = document.getElementById('projectsGrid');
            if (grid) await this._loadProjectsIntoGrid(grid);
        },

        /**
         * Populate header #projectSelect with projects (called after init when header and API are ready)
         */
        async _populateHeaderProjectSelect() {
            const sel = document.getElementById('projectSelect');
            if (!sel || sel.options.length > 1) return;
            let saved = await global.ProjectManager?.getSelectedProjectId?.();
            if (!saved && global.ProjectManager?.getLastSelectedProjectId) saved = global.ProjectManager.getLastSelectedProjectId();
            try {
                const list = await (global.apiIntegration?.getProjects?.() ?? Promise.resolve([]));
                (Array.isArray(list) ? list : []).forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.name || p.id;
                    sel.appendChild(opt);
                });
                if (saved) {
                    const hasOption = Array.from(sel.options).some(o => o.value === saved);
                    if (!hasOption) {
                        const opt = document.createElement('option');
                        opt.value = saved;
                        opt.textContent = saved;
                        sel.appendChild(opt);
                    }
                    sel.value = saved;
                }
            } catch (e) {
                console.warn('[AppTask] Could not load projects for header:', e);
                if (saved) {
                    const opt = document.createElement('option');
                    opt.value = saved;
                    opt.textContent = saved;
                    sel.appendChild(opt);
                    sel.value = saved;
                }
            }
        },

        /**
         * Fetch projects from API and render into grid
         */
        async _loadProjectsIntoGrid(gridEl) {
            gridEl.innerHTML = '<div class="loading-indicator">Loading...</div>';
            try {
                const list = await (global.apiIntegration?.getProjects?.() ?? Promise.resolve([]));
                const projects = Array.isArray(list) ? list : [];
                if (projects.length === 0) {
                    gridEl.innerHTML = '<p class="projects-empty">No projects yet.</p>';
                    return;
                }
                gridEl.innerHTML = projects.map(p => {
                    const id = (p.id || '').replace(/"/g, '&quot;');
                    const name = (p.name || p.id || '').replace(/</g, '&lt;');
                    return `<div class="project-card" data-project-id="${id}"><span class="project-name">${name}</span></div>`;
                }).join('');
            } catch (e) {
                console.warn('[AppTask] Failed to load projects:', e);
                gridEl.innerHTML = '<p class="projects-error">Could not load projects. Check API URL in Settings.</p>';
            }
        },

        /**
         * Restore application state
         */
        async restoreState() {
            // Restore session windows
            await global.WindowManager?.restoreSessionWindows();

            // Restore pending promises if any
            await global.SessionStore?.restorePendingPromises?.();

            // Ensure taskbar is visible
            global.TaskbarManager?.ensureTaskbar();
        },

        /**
         * Create new session
         */
        async createNewSession() {
            try {
                // Check if using persistent storage mode
                const usePersistentStorage = global.SessionStore?.isPersistentStorage?.() || false;
                
                if (usePersistentStorage && global.SessionStore?.createSessionWithForm) {
                    try {
                        // Use new session storage API with numbered folders
                        const title = `Session ${new Date().toLocaleTimeString()}`;
                        const session = await global.SessionStore.createSessionWithForm(title);
                        
                        if (session?.id) {
                            // Set active session
                            if (global.SessionManager?.setActiveSession) {
                                global.SessionManager.setActiveSession(session.id);
                            }
                            
                            // Refresh taskbar
                            const taskbarContent = global.SessionManager?.getTaskbarContentEl?.() || document.querySelector('.taskbar-content');
                            if (taskbarContent && global.TaskbarManager) {
                                await global.TaskbarManager.refreshTaskbar(taskbarContent);
                            }
                            
                            // Auto-open the new session
                            setTimeout(() => {
                                const btn = document.querySelector(`[data-session-id="${session.id}"]`);
                                if (btn && global.WindowManager) {
                                    global.WindowManager.toggleSessionWindow(session.id, btn);
                                }
                            }, 100);
                            
                            console.log('[AppTask] Created new persistent session:', session.id);
                            return;
                        }
                    } catch (error) {
                        console.warn('[AppTask] Persistent storage failed, falling back to old API:', error);
                        // Fall through to old API
                    }
                }
                
                // Fallback to old API (memory mode or if new API fails)
                const projectId = await global.ProjectManager?.getSelectedProjectId();
                if (!global.apiIntegration?.createSession) throw new Error('API not available');
                const session = await global.apiIntegration.createSession({
                    projectId,
                    title: `Session ${new Date().toLocaleTimeString()}`
                });
                const sessionId = session?.id || session?.sessionId;
                if (sessionId) {
                    if (global.SessionStore?.createSession) global.SessionStore.createSession(session);
                    if (global.SessionManager?.setActiveSession) global.SessionManager.setActiveSession(sessionId);
                }

                // Refresh taskbar to show new session
                const taskbarContent = global.SessionManager?.getTaskbarContentEl?.() || document.querySelector('.taskbar-content');
                if (taskbarContent && global.TaskbarManager) {
                    await global.TaskbarManager.refreshTaskbar(taskbarContent);
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
