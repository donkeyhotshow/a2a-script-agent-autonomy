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
         * Get stored client API URL
         */
        async getStoredClientApiUrl() {
            try {
                const stored = await StorageAPI.config.getItem(CLIENT_API_STORAGE_KEY);
                return stored || DEFAULT_CLIENT_API_URL;
            } catch {
                return DEFAULT_CLIENT_API_URL;
            }
        },

        /**
         * Set stored client API URL
         */
        async setStoredClientApiUrl(url) {
            try {
                await StorageAPI.config.setItem(CLIENT_API_STORAGE_KEY, url || DEFAULT_CLIENT_API_URL);
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
                if (e.target.matches('#project-select')) {
                    const projectId = e.target.value;
                    this.setSelectedProjectId(projectId);
                    console.log('[ProjectManager] Project changed:', projectId);
                }
            });

            // Listen for project creation/deletion
            document.addEventListener('click', (e) => {
                if (e.target.matches('#create-project-btn')) {
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
                // This would normally call an API
                console.log('[ProjectManager] Creating project:', projectName);
                // Refresh project list would happen here
            } catch (error) {
                console.error('[ProjectManager] Failed to create project:', error);
                alert('Failed to create project');
            }
        },

        /**
         * Handle project deletion
         */
        async handleDeleteProject(projectId) {
            if (!confirm('Are you sure you want to delete this project?')) return;

            try {
                // This would normally call an API
                console.log('[ProjectManager] Deleting project:', projectId);
                // Refresh project list would happen here
            } catch (error) {
                console.error('[ProjectManager] Failed to delete project:', error);
                alert('Failed to delete project');
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