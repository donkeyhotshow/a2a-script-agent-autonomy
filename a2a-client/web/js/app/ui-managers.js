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
                    // Direct call to apiIntegration.getProjects()
                    const list = await global.apiIntegration.getProjects();
                    if (!Array.isArray(list)) {
                        throw new Error('[AppUIManagers] getProjects must return an array');
                    }
                    list.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.id;
                        opt.textContent = p.name || p.id;
                        sel.appendChild(opt);
                    });
                    if (saved && Array.from(sel.options).some(o => o.value === saved)) sel.value = saved;
                } catch (e) {
                    console.error('[AppTask] Could not load projects for header:', e);
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
         * Populate header #projectSelect with projects (delegates to AppInitialization)
         */
        async _populateHeaderProjectSelect() {
            // Delegate to AppInitialization
            return global.AppInitialization?._populateHeaderProjectSelect?.();
        },

        /**
         * Fetch projects from API and render into grid
         */
        async _loadProjectsIntoGrid(gridEl) {
            function escAttr(s) {
                return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
            }
            function escText(s) {
                return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }
            // No loading indicator - show empty while fetching
            try {
                // Direct call to apiIntegration.getProjects()
                const list = await global.apiIntegration.getProjects();
                const projects = Array.isArray(list) ? list : null;
                if (!projects) {
                    throw new Error('[AppUIManagers] getProjects must return an array');
                }
                if (projects.length === 0) {
                    gridEl.innerHTML = '<p class="projects-empty">No projects yet.</p>';
                    return;
                }
                gridEl.innerHTML = projects.map(p => {
                    const id = escAttr(p.id || '');
                    const name = escText(p.name || p.id || '');
                    return `<div class="project-card" data-project-id="${id}"><span class="project-name">${name}</span></div>`;
                }).join('');
            } catch (e) {
                console.error('[AppTask] Failed to load projects:', e);
                gridEl.innerHTML = '<p class="projects-error">Could not load projects. Check API URL in Settings.</p>';
            }
        }
    };

    // Export
    global.AppUIManagers = AppUIManagers;

})(typeof window !== 'undefined' ? window : globalThis);
