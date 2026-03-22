/**
 * App Initialization Module
 * Contains functions for application initialization, module loading, and state restoration.
 */
(function (global) {
    'use strict';

    const AppInitialization = {
        // Module readiness timeout
        _moduleWaitTimeout: 5000,
        _moduleWaitPollInterval: 50,


        /**
         * Initialize application
         */
        async init() {
            console.log('[AppInitialization] Starting init...');

            try {
                // Ensure header template is loaded (for Settings/Projects buttons)
                if (global.TemplateLoader && !document.getElementById('header-container')?.innerHTML?.trim()) {
                    await global.TemplateLoader.initTaskOnly();
                }

                // Load all modules first
                console.log('[AppInitialization] Calling loadModules()...');
                await this.loadModules();
                console.log('[AppInitialization] loadModules() completed');

                // Initialize managers
                await global.ProjectManager?.init();
                // Apply stored Client API URL for operations requiring Client API server
                const base = global.normalizeStoredClientApiUrl?.(
                    await global.ProjectManager?.getStoredClientApiUrl?.()
                );
                if (base && global.apiIntegration) global.apiIntegration.configure({ apiBase: base });
                await global.SessionManager?.init();
                global.TaskbarManager?.init();

                // Setup UI (handlers live on AppEventHandlers, not this object)
                global.AppEventHandlers?.setupUI?.();

                // Populate header project select (header is ready, API is set)
                await this._populateHeaderProjectSelect?.();

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
            // resolve-web-script-url.js is loaded via HTML (index.html line 136)

            // Normalizers module - load if available
            if (typeof global.appendWebModuleOnce === 'function') {
                await global.appendWebModuleOnce('js/install-normalizers.mjs', {
                    onload: () => console.log('[AppTask] Loaded module: js/install-normalizers.mjs')
                });
            } else {
                console.warn('[AppTask] appendWebModuleOnce missing; Normalizers may be unavailable');
            }
        },

        /**
         * Restore application state
         */
        async restoreState() {
            // Restore session windows
            await global.WindowState?.restoreSessionWindows();

            // Ensure taskbar is visible
            global.TaskbarManager?.ensureTaskbar();
        },

        /**
         * Build <option> elements for project select
         * @param {HTMLSelectElement} sel - Select element
         * @param {Array} list - Array of project objects {id, name}
         * @param {string} [savedId] - Previously selected project ID
         */
        _buildProjectOptions(sel, list, savedId) {
            list.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name || p.id;
                sel.appendChild(opt);
            });
            if (savedId) {
                const hasOption = Array.from(sel.options).some(o => o.value === savedId);
                if (!hasOption) {
                    const opt = document.createElement('option');
                    opt.value = savedId;
                    opt.textContent = savedId;
                    sel.appendChild(opt);
                }
                sel.value = savedId;
            }
        },

        /**
         * Populate header #projectSelect with projects (called after init when header and API are ready)
         */
        async _populateHeaderProjectSelect() {
            const sel = document.getElementById('projectSelect');
            if (!sel || sel.options.length > 1) return;
            const saved = await global.getCurrentProjectId();
            try {
                if (!global.apiIntegration || typeof global.apiIntegration.getProjects !== 'function') {
                    throw new Error('[AppInitialization] apiIntegration.getProjects required');
                }
                const list = await global.apiIntegration.getProjects();
                if (!Array.isArray(list)) {
                    throw new Error('[AppInitialization] getProjects must return an array');
                }
                this._buildProjectOptions(sel, list, saved);
            } catch (e) {
                console.error('[AppTask] Could not load projects for header:', e);
                if (saved) this._buildProjectOptions(sel, [], saved);
            }
        }
    };

    // Export
    global.AppInitialization = AppInitialization;

})(typeof window !== 'undefined' ? window : globalThis);
