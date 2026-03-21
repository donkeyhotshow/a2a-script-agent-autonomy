/**
 * App Initialization Module
 * Contains functions for application initialization, module loading, and state restoration.
 */
(function (global) {
    'use strict';

    function resolveWebScriptUrl(relativePath) {
        var baseEl = document.getElementById('app-base');
        var baseHref = (baseEl && baseEl.href) ? baseEl.href : document.baseURI;
        var path = relativePath.replace(/^\//, '');
        try {
            return new URL(path, baseHref).href;
        } catch (e) {
            return '/' + path;
        }
    }

    const AppInitialization = {
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
            const modules = [
                'js/daemons/emitter.js',
                'js/daemons/dialog-loader.js',
                'js/daemons/dialog-promise-poll.js',
                'js/normalizers.js',
                'js/session-data.js',
                'js/session-storage.js',
                'js/project-store.js',
                'js/session-store.js',
                'js/app/project-manager.js',
                'js/app/session-manager.js',
                'js/app/window-manager.js',
                'js/app/taskbar-manager.js'
            ];

            for (const rel of modules) {
                await new Promise((resolve, reject) => {
                    if (document.querySelector('script[src*="' + rel + '"]')) {
                        resolve();
                        return;
                    }

                    const script = document.createElement('script');
                    script.src = resolveWebScriptUrl(rel);
                    script.onload = () => {
                        console.log(`[AppTask] Loaded module: ${rel}`);
                        resolve();
                    };
                    script.onerror = () => reject(new Error(`Failed to load ${rel}`));
                    document.head.appendChild(script);
                });
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
        }
    };

    // Export
    global.AppInitialization = AppInitialization;

})(typeof window !== 'undefined' ? window : globalThis);
