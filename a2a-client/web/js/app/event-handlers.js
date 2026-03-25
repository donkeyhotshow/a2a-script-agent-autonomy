/**
 * App Event Handlers Module
 * Contains UI setup and event handlers for the application.
 */
(function (global) {
    'use strict';

    const CHAIN_STATUS_ITEMS = [
        {
            label: 'Panel Manager',
            getter: () => global.PanelManager ? 'ready' : 'not loaded',
            state: (value) => (value === 'ready' ? 'ok' : 'alert'),
            note: () => {
                const pm = global.PanelManager;
                if (!pm) return 'PanelManager unavailable';
                const visible = typeof pm.getVisible === 'function' ? pm.getVisible() : [];
                const count = Array.isArray(visible) ? visible.length : 'n/a';
                return `Visible panels: ${count}`;
            }
        },
        {
            label: 'Session Store',
            getter: () => {
                const store = global.SessionStore;
                if (!store) return 'missing';
                const status = store.core?.status;
                return status ? status : 'initialized';
            },
            state: (value) => {
                const normalized = String(value || '').toLowerCase();
                if (/error|fail|missing/.test(normalized)) return 'alert';
                return 'ok';
            },
            note: () => {
                const store = global.SessionStore;
                if (!store) return 'SessionStore not initialized';
                return `Storage mode: ${store.getStorageMode?.() ?? 'unknown'}`;
            }
        },
        {
            label: 'Client API',
            getter: () => {
                const api = global.apiIntegration;
                if (!api) return 'not configured';
                return api.apiBase ? api.apiBase : '(default /api/a2a)';
            },
            state: (value) => (value === 'not configured' ? 'alert' : 'ok'),
            note: () => (global.apiIntegration?.token ? 'Authorization token set' : 'Token not configured')
        },
        {
            label: 'Task Flow Engine',
            getter: () => (global.TaskFlow ? 'loaded' : 'not available'),
            state: (value) => (value === 'loaded' ? 'ok' : 'warn'),
            note: () => {
                const tf = global.TaskFlow;
                if (!tf) return 'TaskFlow not initialized';
                return tf.panelId ? `Panel: ${tf.panelId}` : 'Waiting for execution panel';
            }
        },
        {
            label: 'Snapshot',
            getter: () => new Date().toLocaleTimeString(),
            state: () => 'ok',
            note: () => 'Refreshed on demand'
        }
    ];

    const CHAIN_STATE_LABELS = {
        ok: 'OK',
        warn: 'Warning',
        alert: 'Attention',
        unknown: 'Pending'
    };

    function normalizeChainState(value) {
        const normalized = String(value || '').toLowerCase();
        if (!normalized) return 'unknown';
        if (/ready|ok|loaded|connected|initialized|active/.test(normalized)) return 'ok';
        if (/warn|pending|idle|waiting|disabled|paused/.test(normalized)) return 'warn';
        if (/missing|not|error|fail|down|unavailable|inactive/.test(normalized)) return 'alert';
        return 'ok';
    }

    function escapeChainText(value) {
        const safe = value == null ? '' : String(value);
        return typeof global.escapeHtml === 'function' ? global.escapeHtml(safe) : safe;
    }

    function buildChainStatusItem(entry) {
        let value = 'unknown';
        let note = '';
        try {
            value = typeof entry.getter === 'function' ? entry.getter() : 'unknown';
        } catch (err) {
            console.error('[ChainStatus] getter failed for', entry.label, err);
            value = 'error';
        }
        try {
            note = typeof entry.note === 'function' ? entry.note(value) : '';
        } catch (err) {
            console.error('[ChainStatus] note generator failed for', entry.label, err);
            note = '';
        }
        const stateKey = typeof entry.state === 'function' ? entry.state(value) : normalizeChainState(value);
        const badgeText = CHAIN_STATE_LABELS[stateKey] || CHAIN_STATE_LABELS.unknown;
        const safeLabel = escapeChainText(entry.label);
        const safeValue = escapeChainText(value);
        const safeNote = note ? `<p class="chain-status-note">${escapeChainText(note)}</p>` : '';
        const badgeClass = `chain-status-badge--${stateKey}`;
        return `
            <article class="chain-status-item">
                <div class="chain-status-label">${safeLabel}</div>
                <div class="chain-status-value-group">
                    <span class="chain-status-value">${safeValue}</span>
                    <span class="chain-status-badge ${badgeClass}">${badgeText}</span>
                </div>
                ${safeNote}
            </article>
        `;
    }

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
                            global.AppStateManagers?.createNewSession?.();
                            break;
                        case 'w':
                            e.preventDefault();
                            global.AppStateManagers?.closeActiveSession?.();
                            break;
                    }
                }
            });

            // Window resize handler
            window.addEventListener('resize', () => {
                // Update off-screen indicators
                global.TaskbarManager?.updateOffScreenIndicators();
            });

            // Setup storage mode toggle
            this.setupStorageModeToggle?.();

            // Modals (Settings, Projects) via PanelManager – same hierarchy as panels
            this.setupModalButtons?.();
        },

        /**
         * Open modal panels via PanelManager.
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
            document.getElementById('chainStatusBtn')?.addEventListener('click', () => this._openChainStatusModal());
            document.getElementById('newTaskBtn')?.addEventListener('click', () => global.AppStateManagers?.createNewSession?.());
        },

        /**
         * Setup storage mode toggle in header
         */
        setupStorageModeToggle() {
            const storageSelect = document.getElementById('storageModeSelect');
            if (!storageSelect) return;

            // Load saved storage mode: project (.a2a/sessions) vs storage (a2a-client/storage/sessions or A2A_CLIENT_STORAGE_DIR)
            let savedMode = null;
            try {
                savedMode = localStorage.getItem('a2a_storage_mode');
            } catch (e) {
                console.warn('[AppTask] localStorage unavailable for storage mode:', e);
            }
            const validModes = ['project', 'storage'];
            if (savedMode && validModes.includes(savedMode)) {
                storageSelect.value = savedMode;
            } else {
                if (savedMode) {
                    console.warn('[AppTask] Invalid stored storage mode, using storage:', savedMode);
                }
                storageSelect.value = 'storage';
            }

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
                global.AppUIManagers?.refreshProjectsUI?.();
                console.log('[AppTask] Storage mode changed to:', mode);
            });
        },



        /**
         * Wire modal content with event handlers
         */
        _wireModalContent(type, panel) {

            const content = panel.getContentEl();

            if (!content) return;



            if (type === 'settings') {

                global.ProjectManager?.getStoredClientApiUrl?.().then((url) => {

                    const normalized = global.normalizeStoredClientApiUrl?.(url);

                    const input = content.querySelector('#settingsApiUrl');

                    if (input) input.value = normalized != null && normalized !== '' ? String(normalized) : '';

                });

                content.querySelector('#cancelSettings')?.addEventListener('click', () => panel.close());

                content.querySelector('#saveSettings')?.addEventListener('click', () => {

                    const input = content.querySelector('#settingsApiUrl');

                    const url = input?.value?.trim();

                    if (!url) {

                        console.error('[AppTask] Settings: Client API URL is required');

                        return;

                    }

                    const base = String(url).replace(/\/?$/, '');

                    if (!base) {

                        console.error('[AppTask] Settings: invalid Client API URL');

                        return;

                    }

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
        },


        _bindChainStatusControls(modal) {
            if (this._chainStatusControlsBound) return;
            if (!modal) return;
            const closeButtons = modal.querySelectorAll('#closeChainStatusModal, #cancelChainStatus');
            closeButtons.forEach((btn) => {
                btn.addEventListener('click', () => this._closeChainStatusModal());
            });
            modal.querySelector('#refreshChainStatus')?.addEventListener('click', () => this._renderChainStatusPanel(modal));
            modal.addEventListener('click', (event) => {
                if (event.target === modal) this._closeChainStatusModal();
            });
            this._chainStatusControlsBound = true;
        },

        _openChainStatusModal() {
            const modal = document.getElementById('chainStatusModal');
            if (!modal) return;
            this._bindChainStatusControls(modal);
            this._renderChainStatusPanel(modal);
            modal.classList.add('active');
        },

        _closeChainStatusModal() {
            const modal = document.getElementById('chainStatusModal');
            if (!modal) return;
            modal.classList.remove('active');
        },

        _renderChainStatusPanel(source) {
            const container = source?.getContentEl?.()?.querySelector('#chainStatusList') ?? source?.querySelector?.('#chainStatusList');
            if (!container) return;
            container.innerHTML = CHAIN_STATUS_ITEMS.map(buildChainStatusItem).join('');
        }
    };
    // Export
    global.AppEventHandlers = AppEventHandlers;

})(typeof window !== 'undefined' ? window : globalThis);
