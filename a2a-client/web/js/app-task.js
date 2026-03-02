/**
 * Minimal app init for task form only: header, task input + Send, Settings, Projects, notifications.
 */
(function () {
    const DEFAULT_SERVER_URL = '/api/v1';

    function getStoredServerUrl() {
        try {
            return localStorage.getItem('a2a_serverUrl') || DEFAULT_SERVER_URL;
        } catch {
            return DEFAULT_SERVER_URL;
        }
    }

    function setStoredServerUrl(url) {
        try {
            localStorage.setItem('a2a_serverUrl', url || DEFAULT_SERVER_URL);
        } catch (_) {}
    }

    async function init() {
        const container = document.getElementById('header-container');
        if (!container) return;

        await window.TemplateLoader.render('header', 'header-container');
        const url = getStoredServerUrl();
        if (window.apiIntegration) {
            window.apiIntegration.configure({ serverUrl: url });
        }
        if (window.TaskFlow && window.TaskFlow.init) {
            window.TaskFlow.init();
        }

        const settingsModal = document.getElementById('settingsModal');
        const settingsServerUrl = document.getElementById('settingsServerUrl');
        const projectsModal = document.getElementById('projectsModal');
        const projectsGrid = document.getElementById('projectsGrid');

        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            if (settingsServerUrl) settingsServerUrl.value = window.apiIntegration?.serverUrl || DEFAULT_SERVER_URL;
            if (settingsModal) settingsModal.style.display = 'flex';
        });
        document.getElementById('closeSettingsModal')?.addEventListener('click', () => {
            if (settingsModal) settingsModal.style.display = 'none';
        });
        document.getElementById('cancelSettings')?.addEventListener('click', () => {
            if (settingsModal) settingsModal.style.display = 'none';
        });
        document.getElementById('saveSettings')?.addEventListener('click', () => {
            const v = settingsServerUrl?.value?.trim() || DEFAULT_SERVER_URL;
            if (window.apiIntegration) window.apiIntegration.configure({ serverUrl: v });
            setStoredServerUrl(v);
            if (settingsModal) settingsModal.style.display = 'none';
        });

        document.getElementById('projectsBtn')?.addEventListener('click', () => {
            if (projectsModal) projectsModal.style.display = 'flex';
            loadProjects();
        });
        document.getElementById('closeProjectsModal')?.addEventListener('click', () => {
            if (projectsModal) projectsModal.style.display = 'none';
        });
        document.getElementById('cancelProjects')?.addEventListener('click', () => {
            if (projectsModal) projectsModal.style.display = 'none';
        });
        document.getElementById('newProjectBtn')?.addEventListener('click', () => {
            const name = prompt('Project name:');
            if (!name?.trim()) return;
            createProject(name.trim());
        });

        document.getElementById('newTaskBtn')?.addEventListener('click', () => {
            document.getElementById('taskInputField')?.focus();
        });

        async function loadProjects() {
            if (!projectsGrid) return;
            projectsGrid.innerHTML = '<div class="loading-indicator">Loading...</div>';
            try {
                const base = window.apiIntegration?.serverUrl || DEFAULT_SERVER_URL;
                const res = await fetch(base.replace(/\/?$/, '') + '/projects', { headers: { 'Content-Type': 'application/json' } });
                const list = await res.json().catch(() => []);
                const arr = Array.isArray(list) ? list : (list?.projects || []);
                if (arr.length === 0) {
                    projectsGrid.innerHTML = '<p class="empty">No projects. Click + New Project.</p>';
                } else {
                    projectsGrid.innerHTML = arr.map(p => `<div class="project-card" data-id="${(p.id || '').replace(/"/g, '&quot;')}"><strong>${escapeHtml(p.name || p.id || '')}</strong> <code>${escapeHtml(p.id || '')}</code></div>`).join('');
                }
            } catch (e) {
                projectsGrid.innerHTML = '<p class="error">Failed to load projects</p>';
            }
        }

        async function createProject(name) {
            try {
                const base = window.apiIntegration?.serverUrl || DEFAULT_SERVER_URL;
                const res = await fetch(base.replace(/\/?$/, '') + '/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                if (!res.ok) throw new Error('Create failed');
                const project = await res.json();
                window.addNotification?.('Project created', 'success');
                loadProjects();
                const sel = document.getElementById('projectSelect');
                if (sel) {
                    const opt = document.createElement('option');
                    opt.value = project.id;
                    opt.textContent = project.name || project.id;
                    sel.appendChild(opt);
                }
            } catch (e) {
                window.addNotification?.(e?.message || 'Error', 'error');
            }
        }

        function escapeHtml(s) {
            const el = document.createElement('div');
            el.textContent = s;
            return el.innerHTML;
        }
    }

    window.addNotification = function (message, type) {
        const panel = document.getElementById('notificationsPanel');
        const list = document.getElementById('notificationsList');
        if (!panel || !list) return;
        panel.style.display = 'block';
        const item = document.createElement('div');
        item.className = 'notification-item notification-' + (type || 'info');
        item.innerHTML = '<span class="notification-message">' + String(message).replace(/</g, '&lt;') + '</span>';
        list.insertBefore(item, list.firstChild);
        setTimeout(() => item.remove(), 5000);
    };

    document.getElementById('clearNotifications')?.addEventListener('click', () => {
        const list = document.getElementById('notificationsList');
        if (list) list.innerHTML = '';
    });

    document.addEventListener('DOMContentLoaded', () => {
        init().catch(e => console.error('[App] Init error:', e));
    });
})();
