/**
 * Project Manager - Handles project selection and storage
 */
(function (global) {
    'use strict';

    const DEFAULT_CLIENT_API_URL = '/api';
    const CLIENT_API_STORAGE_KEY = 'a2a_clientApiUrl';
    const SELECTED_PROJECT_KEY = 'a2a_selected_project';

    let lastSelectedProjectId = null;

    const ProjectManager = {
        /**
         * Get stored client API URL - uses file-based storage only
         */
        async getStoredClientApiUrl() {
            try {
                let stored = await StorageAPI.config.getItem(CLIENT_API_STORAGE_KEY);
                // Handle case where StorageAPI returns an object
                if (stored && typeof stored === 'object') {
                    stored = stored.url || stored.apiBase || null;
                }
                return (typeof stored === 'string' ? stored : null) || DEFAULT_CLIENT_API_URL;
            } catch {
                return DEFAULT_CLIENT_API_URL;
            }
        },

        /** Stored URL after `normalizeStoredClientApiUrl` (html-utils.js). */
        async getNormalizedStoredClientApiUrl() {
            const raw = await this.getStoredClientApiUrl();
            if (typeof global.normalizeStoredClientApiUrl === 'function') {
                return global.normalizeStoredClientApiUrl(raw);
            }
            return String(raw || '').replace(/\/?$/, '');
        },

        /** Apply stored Client API base to `apiIntegration` when non-empty. */
        async applyStoredClientApiToIntegration() {
            const base = await this.getNormalizedStoredClientApiUrl();
            if (base && global.apiIntegration) {
                global.apiIntegration.configure({ apiBase: base });
            }
        },

        /**
         * Set stored client API URL - uses file-based storage only
         */
        async setStoredClientApiUrl(url) {
            const value = (typeof url === 'string' && url.trim()) ? url.trim() : DEFAULT_CLIENT_API_URL;
            try {
                await StorageAPI.config.setItem(CLIENT_API_STORAGE_KEY, value);
            } catch (error) {
                console.warn('[ProjectManager] Failed to save client API URL:', error);
            }
        },

        /**
         * Get selected project ID
         */
        async getSelectedProjectId() {
            try {
                const stored = await StorageAPI.config.getItem(SELECTED_PROJECT_KEY);
                return stored || null;
            } catch {
                return null;
            }
        },

        /**
         * Set selected project ID
         */
        async setSelectedProjectId(projectId) {
            try {
                if (projectId) {
                    await StorageAPI.config.setItem(SELECTED_PROJECT_KEY, projectId);
                    lastSelectedProjectId = projectId;
                } else {
                    await StorageAPI.config.removeItem(SELECTED_PROJECT_KEY);
                    lastSelectedProjectId = null;
                }
            } catch (error) {
                console.warn('[ProjectManager] Failed to save selected project:', error);
            }
        },

        /**
         * Get last selected project ID
         */
        getLastSelectedProjectId() {
            return lastSelectedProjectId;
        },

        /**
         * Setup project select handler
         */
        setupProjectSelectHandler() {
            // Listen for project selection changes
            document.addEventListener('change', (e) => {
                if (e.target.matches('#projectSelect')) {
                    const projectId = e.target.value;
                    this.setSelectedProjectId(projectId);
                    console.log('[ProjectManager] Project changed:', projectId);
                    // Close active session and all session panels when switching project
                    if (global.WindowState) global.WindowState.closeAllSessionWindows();
                    if (global.PanelManager) global.PanelManager.close('task-flow-panel');
                    if (global.SessionStore?.reset) global.SessionStore.reset();
                    // Refresh taskbar for new project (direct call after reset completes)
                    const taskbarContent = global.resolveTaskbarContentEl?.();
                    if (taskbarContent && global.TaskbarManager) {
                        global.TaskbarManager.refreshTaskbar(taskbarContent);
                    }
                }
            });

            // Listen for project creation/deletion
            document.addEventListener('click', (e) => {
                if (e.target.matches('#create-project-btn, #newProjectBtn')) {
                    this.handleCreateProject();
                } else if (e.target.matches('.delete-project-btn')) {
                    const projectId = e.target.dataset.projectId;
                    this.handleDeleteProject(projectId);
                }
            });
        },

        /**
         * Handle project creation
         */
        async handleCreateProject() {
            const projectName = prompt('Enter project name:');
            if (!projectName?.trim()) return;

            try {
                const project = await global.apiIntegration?.createProject?.({ name: projectName.trim() });
                if (project?.id) {
                    await this.setSelectedProjectId(project.id);
                    await global.AppUIManagers?.refreshProjectsUI?.();
                }
            } catch (error) {
                console.error('[ProjectManager] Failed to create project:', error);
                global.ErrorHandler?.handle?.(error, { action: 'createProject' });
            }
        },

        /**
         * Handle project deletion
         */
        async handleDeleteProject(projectId) {
            if (!projectId || !confirm('Are you sure you want to delete this project?')) return;

            try {
                await global.apiIntegration?.deleteProject?.(projectId);
                const current = await this.getSelectedProjectId();
                if (current === projectId) await this.setSelectedProjectId(null);
                await global.AppUIManagers?.refreshProjectsUI?.();
            } catch (error) {
                console.error('[ProjectManager] Failed to delete project:', error);
                global.ErrorHandler?.handle?.(error, { action: 'deleteProject' });
            }
        },

        /**
         * Initialize project manager
         */
        async init() {
            this.setupProjectSelectHandler();
            lastSelectedProjectId = await this.getSelectedProjectId();
            console.log('[ProjectManager] Initialized');
        }
    };

    // Export
    global.ProjectManager = ProjectManager;

})(typeof window !== 'undefined' ? window : globalThis);