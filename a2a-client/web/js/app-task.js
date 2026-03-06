/**
 * Minimal app init with Windows-style taskbar for sessions.
 * Taskbar shows session buttons at bottom, each opens a floating window.
 */
(function () {
    const DEFAULT_CLIENT_API_URL = '/api';
    const CLIENT_API_STORAGE_KEY = 'a2a_clientApiUrl';

    // Track opened session windows
    const sessionWindows = new Map(); // sessionId -> panel

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

    async function loadTaskbarSessions(contentEl) {
        if (!contentEl) return;

        try {
            const sessions = await window.apiIntegration?.getSessions() || [];
            if (!sessions.length) {
                contentEl.innerHTML = '<div class="taskbar-empty">No sessions</div>';
                return;
            }

            const html = sessions.map(s => {
                const id = s.id || s.sessionId || 'unknown';
                const title = s.title || s.task || `Session ${id.slice(-6)}`;
                const status = s.status || 'idle';
                const hasWindow = sessionWindows.has(id);
                const windowPanel = hasWindow ? sessionWindows.get(id) : null;
                const isVisible = windowPanel?.state === 'visible';
                const btnClass = ['taskbar-session-btn', status, isVisible ? 'active' : 'minimized'].filter(Boolean).join(' ');

                return `
                    <button class="${btnClass}" data-session-id="${id}" title="${escapeHtml(title)}">
                        <span class="session-indicator"></span>
                        <span class="session-title">${escapeHtml(title)}</span>
                        <span class="session-close" data-action="close" title="Close">×</span>
                    </button>
                `;
            }).join('');

            contentEl.innerHTML = `<div class="taskbar-sessions">${html}</div>`;

            // Click handlers
            contentEl.querySelectorAll('.taskbar-session-btn').forEach(btn => {
                const sessionId = btn.dataset.sessionId;

                // Main click - toggle window
                btn.addEventListener('click', (e) => {
                    if (e.target.dataset.action === 'close') return;
                    toggleSessionWindow(sessionId, btn);
                });

                // Close button
                btn.querySelector('[data-action="close"]')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeSessionWindow(sessionId);
                });
            });
        } catch (e) {
            contentEl.innerHTML = '<div class="taskbar-empty">Error loading sessions</div>';
        }
    }

    async function toggleSessionWindow(sessionId, btnEl) {
        const pm = window.PanelManager;
        if (!pm) return;

        // If window exists, toggle minimize/restore
        if (sessionWindows.has(sessionId)) {
            const panel = sessionWindows.get(sessionId);
            if (panel.state === 'visible') {
                panel.minimize();
                btnEl?.classList.remove('active');
                btnEl?.classList.add('minimized');
            } else {
                panel.restore();
                btnEl?.classList.add('active');
                btnEl?.classList.remove('minimized');
            }
            return;
        }

        // Create new floating window for session
        try {
            const session = await window.apiIntegration?.getSession(sessionId);
            const title = session?.title || session?.task || `Session ${sessionId.slice(-6)}`;

            const panel = pm.open('task', {
                id: `session-win-${sessionId}`,
                title: title,
                x: 100 + (sessionWindows.size * 30),
                y: 100 + (sessionWindows.size * 30),
                width: 500,
                height: 400,
                onClose: () => {
                    sessionWindows.delete(sessionId);
                    refreshTaskbar();
                },
                onStateChange: (state) => {
                    refreshTaskbar();
                }
            });

            // Load session content
            renderSessionContent(panel.getContentEl(), session);

            // Store reference
            sessionWindows.set(sessionId, panel);

            // Update button state
            btnEl?.classList.add('active');
            btnEl?.classList.remove('minimized');

        } catch (e) {
            window.addNotification?.('Failed to open session', 'error');
        }
    }

    function closeSessionWindow(sessionId) {
        const panel = sessionWindows.get(sessionId);
        if (panel) {
            panel.close();
            sessionWindows.delete(sessionId);
        }
        refreshTaskbar();
    }

    function renderSessionContent(contentEl, session) {
        const context = session?.context || {};
        const execute = context?.execute || session?.execute || {};
        const messages = context?.history || session?.messages || [];

        let messagesHtml = '';
        if (messages.length) {
            messagesHtml = messages.slice(-10).map(m => {
                const role = m.role || 'assistant';
                const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
                return `<div class="session-msg ${role}"><strong>${role}:</strong> ${escapeHtml(content.slice(0, 200))}${content.length > 200 ? '...' : ''}</div>`;
            }).join('');
        }

        contentEl.innerHTML = `
            <div class="session-window-content">
                <div class="session-info">
                    <div><strong>ID:</strong> <code>${session.id}</code></div>
                    <div><strong>Status:</strong> ${session.status || 'idle'}</div>
                    <div><strong>Step:</strong> ${context?.execution?.step || 'none'}</div>
                </div>
                <div class="session-messages">
                    ${messagesHtml || '<em>No messages</em>'}
                </div>
            </div>
        `;
    }

    function refreshTaskbar() {
        const pm = window.PanelManager;
        const taskbar = pm?.getByType('taskbar')[0];
        if (taskbar) {
            loadTaskbarSessions(taskbar.getContentEl());
        }
    }

    function ensureTaskbar() {
        const pm = window.PanelManager;
        if (!pm) return;

        // Check if taskbar already exists
        const existing = pm.getByType('taskbar')[0];
        if (existing) {
            loadTaskbarSessions(existing.getContentEl());
            return;
        }

        // Create taskbar panel
        const panel = pm.open('taskbar', {
            id: 'taskbar-panel',
            title: 'Sessions',
            critical: true
        });

        // Load sessions
        loadTaskbarSessions(panel.getContentEl());

        // Refresh periodically
        setInterval(() => refreshTaskbar(), 5000);
    }

    function escapeHtml(s) {
        const el = document.createElement('div');
        el.textContent = s;
        return el.innerHTML;
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
        ensureTaskbar();

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

                if (window.TaskFlow?.sendMessageResult) {
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
