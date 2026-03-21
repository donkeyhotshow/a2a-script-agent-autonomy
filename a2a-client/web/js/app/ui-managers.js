/**
 * App UI Managers Module
 * Contains functions for UI management: project display, header elements, and grid rendering.
 */
(function (global) {
    'use strict';

    const AppUIManagers = {
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
         * This is a duplicate-safe wrapper that calls the core implementation in AppInitialization
         */
        async _populateHeaderProjectSelect() {
            // Delegate to AppInitialization if available
            if (global.AppInitialization?._populateHeaderProjectSelect) {
                return global.AppInitialization._populateHeaderProjectSelect();
            }
            
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
                    const id = (p.id || '').replace(/"/g, '"');
                    const name = (p.name || p.id || '').replace(/</g, '<');
                    return `<div class="project-card" data-project-id="${id}"><span class="project-name">${name}</span></div>`;
                }).join('');
            } catch (e) {
                console.warn('[AppTask] Failed to load projects:', e);
                gridEl.innerHTML = '<p class="projects-error">Could not load projects. Check API URL in Settings.</p>';
            }
        }
    };

    // Export
    global.AppUIManagers = AppUIManagers;

})(typeof window !== 'undefined' ? window : globalThis);
