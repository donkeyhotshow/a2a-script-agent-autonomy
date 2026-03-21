/**
 * App Event Handlers Module
 * Contains UI setup and event handlers for the application.
 */
(function (global) {
    'use strict';

    const AppEventHandlers = {
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
                            global.AppTask?.createNewSession?.();
                            break;
                        case 'w':
                            e.preventDefault();
                            global.AppTask?.closeActiveSession?.();
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
            this.setupStorageModeToggle?.();
            this.setupLoaderIndicator?.();

            // Modals (Settings, Projects) via PanelManager – same hierarchy as panels
            this.setupModalButtons?.();
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
                    this._wireModalContent?.(type, panel);
                }
            };

            document.getElementById('settingsBtn')?.addEventListener('click', () => openModal('settings', 'settingsModal'));
            document.getElementById('projectsBtn')?.addEventListener('click', () => openModal('projects', 'projectsModal'));
            document.getElementById('newTaskBtn')?.addEventListener('click', () => global.AppTask?.createNewSession?.());
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
                global.AppTask?.refreshProjectsUI?.();
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

        /**
         * Wire modal content with event handlers
         */
        _wireModalContent(type, panel) {
            const content = panel.getContentEl();
            if (!content) return;

            if (type === 'settings') {
                global.ProjectManager?.getStoredClientApiUrl?.().then((url) => {
                    const normalized = global.normalizeStoredClientApiUrl?.(url) || '/api';
                    const input = content.querySelector('#settingsApiUrl');
                    if (input) input.value = normalized;
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
                if (grid) global.AppUIManagers?._loadProjectsIntoGrid?.(grid);
                content.addEventListener('click', (e) => {
                    const card = e.target.closest('.project-card');
                    if (!card) return;
                    const projectId = card.dataset.projectId;
                    if (!projectId) return;
                    global.ProjectManager?.setSelectedProjectId(projectId);
                    const sel = document.getElementById('projectSelect');
                    if (sel) {
                        if (!Array.from(sel.options).some((o) => o.value === projectId)) {
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
        }
    };

    // Export
    global.AppEventHandlers = AppEventHandlers;

})(typeof window !== 'undefined' ? window : globalThis);
