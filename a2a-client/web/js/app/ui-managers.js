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
                 const saved = await global.getCurrentProjectId();
                 await global.AppInitialization._populateProjectSelect(sel, saved);
             }
            const taskbarContent = global.resolveTaskbarContentEl?.();
            if (taskbarContent && global.TaskbarManager) await global.TaskbarManager.refreshTaskbar(taskbarContent);
            const grid = document.getElementById('projectsGrid');
            if (grid) await this._loadProjectsIntoGrid(grid);
        },



        /**
         * Fetch projects from API and render into grid
         */
        async _loadProjectsIntoGrid(gridEl) {
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
                    const id = global.escapeHtmlAttr(p.id || '');
                    const name = global.escapeHtml(p.name || p.id || '');
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
