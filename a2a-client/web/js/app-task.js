/**
 * Minimal app init for task form only: header, task input + Send, Settings, Projects, notifications.
 */
(function () {
    const DEFAULT_CLIENT_API_URL = '/api';
    const CLIENT_API_STORAGE_KEY = 'a2a_clientApiUrl';

    function getStoredClientApiUrl() {
        try {
            return localStorage.getItem(CLIENT_API_STORAGE_KEY) || DEFAULT_CLIENT_API_URL;
        } catch {
            return DEFAULT_CLIENT_API_URL;
        }
    }

    function setStoredClientApiUrl(url) {
        try {
            localStorage.setItem(CLIENT_API_STORAGE_KEY, url || DEFAULT_CLIENT_API_URL);
        } catch (_) {}
    }

    function ensureSessionPanel() {
        // Use new PanelManager instead of archived PlasticineWorkflow
        const pm = window.PanelManager;
        if (!pm) return;
        
        // Check if sessions panel already exists
        const existing = pm.getByType('sessions')[0];
        if (existing) return;
        
        // Create sessions panel
        pm.open('sessions', {
            id: 'sessions-panel',
            title: 'Sessions',
            onClose: () => console.log('[App] Sessions panel closed')
        });
    }

    async function init() {
        const container = document.getElementById('header-container');
        if (!container) return;

        await window.TemplateLoader.render('header', 'header-container');
        const url = getStoredClientApiUrl();
        if (window.apiIntegration) {
            window.apiIntegration.configure({ apiBase: url });
        }
        if (window.TaskFlow && window.TaskFlow.init) {
            window.TaskFlow.init();
        }
        ensureSessionPanel();

        const settingsModal = document.getElementById('settingsModal');
        const settingsApiUrl = document.getElementById('settingsApiUrl');
        const projectsModal = document.getElementById('projectsModal');
        const projectsGrid = document.getElementById('projectsGrid');

        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            if (settingsApiUrl) settingsApiUrl.value = window.apiIntegration?.apiBase || DEFAULT_CLIENT_API_URL;
            if (settingsModal) settingsModal.style.display = 'flex';
        });
        document.getElementById('closeSettingsModal')?.addEventListener('click', () => {
            if (settingsModal) settingsModal.style.display = 'none';
        });
        document.getElementById('cancelSettings')?.addEventListener('click', () => {
            if (settingsModal) settingsModal.style.display = 'none';
        });
        document.getElementById('saveSettings')?.addEventListener('click', () => {
            const v = settingsApiUrl?.value?.trim() || DEFAULT_CLIENT_API_URL;
            if (window.apiIntegration) window.apiIntegration.configure({ apiBase: v });
            setStoredClientApiUrl(v);
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

        // Message input handling
        const messageInput = document.getElementById('messageInput');
        const sendMessageBtn = document.getElementById('sendMessage');
        const messageInputSection = document.getElementById('messageInputSection');

        function showMessageInput() {
            if (messageInputSection) messageInputSection.style.display = 'block';
            if (messageInput) messageInput.focus();
        }

        function hideMessageInput() {
            if (messageInputSection) messageInputSection.style.display = 'none';
            if (messageInput) messageInput.value = '';
        }

        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', () => {
                const message = (messageInput?.value || '').trim();
                if (!message) return;

                // Send message using TaskFlow if available
                if (window.TaskFlow?.sendMessageResult) {
                    // Find the active task panel content using PanelManager
                    const pm = window.PanelManager;
                    const taskPanel = pm?.get('task-flow-panel');
                    if (taskPanel) {
                        const content = taskPanel.getContentEl();
                        if (content) {
                            window.TaskFlow.sendMessageResult(message, content);
                            messageInput.value = '';
                        }
                    } else {
                        window.addNotification?.('No active task panel', 'error');
                    }
                } else {
                    window.addNotification?.('TaskFlow not available', 'error');
                }
            });
        }

        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessageBtn?.click();
                }
            });
        }

        // Expose functions globally for testing
        window.showMessageInput = showMessageInput;
        window.hideMessageInput = hideMessageInput;

        async function loadProjects() {
            if (!projectsGrid) return;
            projectsGrid.innerHTML = '<div class="loading-indicator">Loading...</div>';
            try {
                const base = window.apiIntegration?.apiBase || DEFAULT_CLIENT_API_URL;
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
                const base = window.apiIntegration?.apiBase || DEFAULT_CLIENT_API_URL;
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
