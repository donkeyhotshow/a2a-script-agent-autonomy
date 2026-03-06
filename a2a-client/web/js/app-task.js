/**
 * Minimal app init with Windows-style taskbar for sessions.
 * Taskbar shows session buttons at bottom, each opens a floating window.
 */
(function () {
    const DEFAULT_CLIENT_API_URL = '/api';
    const CLIENT_API_STORAGE_KEY = 'a2a_clientApiUrl';
    const SESSION_WINDOWS_KEY = 'a2a_session_windows';
    const ACTIVE_SESSION_KEY = 'a2a_active_session';
    const SELECTED_PROJECT_KEY = 'a2a_selected_project';

    // Track opened session windows
    const sessionWindows = new Map(); // sessionId -> panel
    let activeSessionId = null;
    let taskbarContentEl = null;
    let lastSelectedProjectId = null;

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

    function getSelectedProjectId() {
        try {
            return localStorage.getItem(SELECTED_PROJECT_KEY) || null;
        } catch {
            return null;
        }
    }

    function setSelectedProjectId(projectId) {
        try {
            if (projectId) {
                localStorage.setItem(SELECTED_PROJECT_KEY, projectId);
                lastSelectedProjectId = projectId;
            } else {
                localStorage.removeItem(SELECTED_PROJECT_KEY);
                lastSelectedProjectId = null;
            }
        } catch (_) {}
    }

    function setupProjectSelectHandler() {
        const sel = document.getElementById('projectSelect');
        if (!sel) return;

        // Save on change
        sel.addEventListener('change', () => {
            const projectId = sel.value;
            if (projectId) {
                setSelectedProjectId(projectId);
            }
        });
    }

    function updateScrollButtons(contentEl, leftBtn, rightBtn) {
        if (!contentEl || !leftBtn || !rightBtn) return;
        const canScrollLeft = contentEl.scrollLeft > 0;
        const canScrollRight = contentEl.scrollLeft < (contentEl.scrollWidth - contentEl.clientWidth - 1);
        leftBtn.classList.toggle('visible', canScrollLeft);
        rightBtn.classList.toggle('visible', canScrollRight);
        leftBtn.disabled = !canScrollLeft;
        rightBtn.disabled = !canScrollRight;
    }

    function scrollTaskbar(direction, contentEl, leftBtn, rightBtn) {
        if (!contentEl) return;
        const scrollAmount = 200;
        contentEl.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
        setTimeout(() => updateScrollButtons(contentEl, leftBtn, rightBtn), 300);
    }

    function centerActiveButton(contentEl) {
        if (!contentEl || !activeSessionId) return;
        const activeBtn = contentEl.querySelector(`[data-session-id="${activeSessionId}"]`);
        if (!activeBtn) return;
        const btnRect = activeBtn.getBoundingClientRect();
        const containerRect = contentEl.getBoundingClientRect();
        const scrollLeft = activeBtn.offsetLeft - (containerRect.width / 2) + (btnRect.width / 2);
        contentEl.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
    }

    function saveSessionWindowsState() {
        try {
            const state = {
                windows: Array.from(sessionWindows.keys()),
                active: activeSessionId,
                timestamp: Date.now()
            };
            localStorage.setItem(SESSION_WINDOWS_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('[AppTask] Failed to save session windows state:', e);
        }
    }

    function loadSessionWindowsState() {
        try {
            const saved = localStorage.getItem(SESSION_WINDOWS_KEY);
            if (!saved) return [];
            const state = JSON.parse(saved);
            activeSessionId = state.active || null;
            return state.windows || [];
        } catch (e) {
            console.warn('[AppTask] Failed to load session windows state:', e);
            return [];
        }
    }

    function clearSessionWindowsState() {
        try {
            localStorage.removeItem(SESSION_WINDOWS_KEY);
            localStorage.removeItem(ACTIVE_SESSION_KEY);
        } catch (e) {}
    }

    async function loadTaskbarSessions(contentEl) {
        if (!contentEl) return;
        taskbarContentEl = contentEl;

        // Check if already has scroll buttons wrapper
        let container = contentEl.querySelector('.taskbar-container');
        if (!container) {
            // Create wrapper structure with scroll buttons
            container = document.createElement('div');
            container.className = 'taskbar-container';
            container.style.cssText = 'display:flex;align-items:center;width:100%;height:100%;gap:4px;';
            
            const leftBtn = document.createElement('button');
            leftBtn.className = 'taskbar-scroll-btn taskbar-scroll-left';
            leftBtn.innerHTML = '◀';
            leftBtn.title = 'Scroll left';
            
            const rightBtn = document.createElement('button');
            rightBtn.className = 'taskbar-scroll-btn taskbar-scroll-right';
            rightBtn.innerHTML = '▶';
            rightBtn.title = 'Scroll right';
            
            const sessionsWrapper = document.createElement('div');
            sessionsWrapper.className = 'taskbar-sessions-wrapper';
            sessionsWrapper.style.cssText = 'flex:1;overflow:hidden;height:100%;';
            
            // Move original content to wrapper
            const originalContent = contentEl.innerHTML;
            sessionsWrapper.innerHTML = originalContent;
            
            container.appendChild(leftBtn);
            container.appendChild(sessionsWrapper);
            container.appendChild(rightBtn);
            contentEl.innerHTML = '';
            contentEl.appendChild(container);
            
            // Scroll handlers
            leftBtn.addEventListener('click', () => scrollTaskbar(-1, sessionsWrapper, leftBtn, rightBtn));
            rightBtn.addEventListener('click', () => scrollTaskbar(1, sessionsWrapper, leftBtn, rightBtn));
            
            // Update scroll buttons on scroll
            sessionsWrapper.addEventListener('scroll', () => {
                updateScrollButtons(sessionsWrapper, leftBtn, rightBtn);
            });

            // Wheel scroll - horizontal scrolling with mouse wheel
            sessionsWrapper.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    sessionsWrapper.scrollBy({ left: e.deltaY, behavior: 'smooth' });
                    // Update buttons after scroll animation
                    setTimeout(() => updateScrollButtons(sessionsWrapper, leftBtn, rightBtn), 150);
                }
            }, { passive: false });

            // Touch swipe support for mobile
            let touchStartX = 0;
            let touchStartY = 0;
            sessionsWrapper.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }, { passive: true });

            sessionsWrapper.addEventListener('touchmove', (e) => {
                const touchX = e.touches[0].clientX;
                const touchY = e.touches[0].clientY;
                const deltaX = touchStartX - touchX;
                const deltaY = touchStartY - touchY;

                // Horizontal swipe detected
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                    e.preventDefault();
                    sessionsWrapper.scrollLeft += deltaX;
                    touchStartX = touchX;
                }
            }, { passive: false });

            sessionsWrapper.addEventListener('touchend', () => {
                updateScrollButtons(sessionsWrapper, leftBtn, rightBtn);
            });

            // Initial check
            setTimeout(() => updateScrollButtons(sessionsWrapper, leftBtn, rightBtn), 100);
        }

        const sessionsWrapper = contentEl.querySelector('.taskbar-sessions-wrapper') || contentEl;
        const leftBtn = contentEl.querySelector('.taskbar-scroll-left');
        const rightBtn = contentEl.querySelector('.taskbar-scroll-right');

        try {
            const sessions = await window.apiIntegration?.getSessions() || [];
            if (!sessions.length) {
                sessionsWrapper.innerHTML = '<div class="taskbar-empty">No sessions</div>';
                updateScrollButtons(sessionsWrapper, leftBtn, rightBtn);
                return;
            }

            const html = sessions.map(s => {
                const id = s.id || s.sessionId || 'unknown';
                const title = s.title || s.task || `Session ${id.slice(-6)}`;
                const status = s.status || 'idle';
                const hasWindow = sessionWindows.has(id);
                const windowPanel = hasWindow ? sessionWindows.get(id) : null;
                const isVisible = windowPanel?.state === 'visible';
                const isActive = id === activeSessionId;
                const btnClass = ['taskbar-session-btn', status, isVisible ? 'active' : 'minimized', isActive ? 'current' : ''].filter(Boolean).join(' ');

                return `
                    <button class="${btnClass}" data-session-id="${id}" title="${escapeHtml(title)}">
                        <span class="session-indicator"></span>
                        <span class="session-title">${escapeHtml(title)}</span>
                        <span class="session-close" data-action="close" title="Close window">×</span>
                    </button>
                `;
            }).join('');

            sessionsWrapper.innerHTML = `<div class="taskbar-sessions">${html}</div>`;

            // Click handlers
            sessionsWrapper.querySelectorAll('.taskbar-session-btn').forEach(btn => {
                const sessionId = btn.dataset.sessionId;

                // Main click - toggle window
                btn.addEventListener('click', (e) => {
                    if (e.target.dataset.action === 'close') return;
                    setActiveSession(sessionId);
                    toggleSessionWindow(sessionId, btn);
                });

                // Close button
                btn.querySelector('[data-action="close"]')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeSessionWindow(sessionId);
                });

                // Context menu (right-click)
                btn.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    showContextMenu(e, sessionId, btn);
                });
            });

            // Center active button if needed
            if (activeSessionId) {
                setTimeout(() => centerActiveButton(sessionsWrapper), 100);
            }

            updateScrollButtons(sessionsWrapper, leftBtn, rightBtn);
        } catch (e) {
            sessionsWrapper.innerHTML = '<div class="taskbar-empty">Error loading sessions</div>';
        }
    }

    function setActiveSession(sessionId) {
        activeSessionId = sessionId;
        try {
            localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
        } catch (e) {}
        
        // Update button styles
        if (taskbarContentEl) {
            taskbarContentEl.querySelectorAll('.taskbar-session-btn').forEach(btn => {
                const isCurrent = btn.dataset.sessionId === sessionId;
                btn.classList.toggle('current', isCurrent);
            });
            
            const sessionsWrapper = taskbarContentEl.querySelector('.taskbar-sessions-wrapper');
            if (sessionsWrapper) {
                centerActiveButton(sessionsWrapper);
            }
        }

        // Update off-screen indicators
        updateOffScreenIndicators();
    }

    // === Context Menu ===

    function showContextMenu(e, sessionId, btnEl) {
        // Remove existing menu
        const existingMenu = document.querySelector('.taskbar-context-menu');
        if (existingMenu) existingMenu.remove();

        const panel = sessionWindows.get(sessionId);
        const isVisible = panel?.state === 'visible';
        const isMaximized = panel?.state === 'maximized';
        const hasWindow = !!panel;

        const menu = document.createElement('div');
        menu.className = 'taskbar-context-menu';
        menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;z-index:10000;`;
        
        menu.innerHTML = `
            <div class="context-menu-item ${!hasWindow ? 'disabled' : ''}" data-action="restore">
                <span class="context-menu-icon">↗</span> Restore
            </div>
            <div class="context-menu-item ${!isVisible ? 'disabled' : ''}" data-action="minimize">
                <span class="context-menu-icon">−</span> Minimize
            </div>
            <div class="context-menu-item ${!isVisible ? 'disabled' : ''}" data-action="maximize">
                <span class="context-menu-icon">□</span> ${isMaximized ? 'Restore' : 'Maximize'}
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item ${!hasWindow ? 'disabled' : ''}" data-action="bring-to-front">
                <span class="context-menu-icon">⇡</span> Bring to Front
            </div>
            <div class="context-menu-item" data-action="close-window">
                <span class="context-menu-icon">×</span> Close Window
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="close-all-others">
                <span class="context-menu-icon">⌁</span> Close All Others
            </div>
        `;

        document.body.appendChild(menu);

        // Click handlers
        menu.querySelectorAll('.context-menu-item:not(.disabled)').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                handleContextMenuAction(action, sessionId, btnEl);
                menu.remove();
            });
        });

        // Close menu on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 10);
    }

    function handleContextMenuAction(action, sessionId, btnEl) {
        const pm = window.PanelManager;
        const panel = sessionWindows.get(sessionId);

        switch (action) {
            case 'restore':
                if (panel) {
                    panel.restore();
                    pm.bringToFront(panel.id);
                    btnEl?.classList.add('active');
                    btnEl?.classList.remove('minimized');
                    saveSessionWindowsState();
                } else {
                    toggleSessionWindow(sessionId, btnEl);
                }
                break;
            case 'minimize':
                if (panel && panel.state === 'visible') {
                    panel.minimize();
                    btnEl?.classList.remove('active');
                    btnEl?.classList.add('minimized');
                    saveSessionWindowsState();
                }
                break;
            case 'maximize':
                if (panel) {
                    if (panel.state === 'maximized') {
                        panel.unmaximize();
                    } else {
                        panel.restore();
                        panel.maximize();
                    }
                    btnEl?.classList.add('active');
                    btnEl?.classList.remove('minimized');
                    saveSessionWindowsState();
                } else {
                    toggleSessionWindow(sessionId, btnEl).then(() => {
                        const newPanel = sessionWindows.get(sessionId);
                        if (newPanel) newPanel.maximize();
                    });
                }
                break;
            case 'bring-to-front':
                if (panel) {
                    panel.restore();
                    pm.bringToFront(panel.id);
                    setActiveSession(sessionId);
                }
                break;
            case 'close-window':
                closeSessionWindow(sessionId);
                break;
            case 'close-all-others':
                sessionWindows.forEach((p, sid) => {
                    if (sid !== sessionId) {
                        p.close();
                    }
                });
                // Remove all from map except current
                const currentPanel = sessionWindows.get(sessionId);
                sessionWindows.clear();
                if (currentPanel) sessionWindows.set(sessionId, currentPanel);
                saveSessionWindowsState();
                refreshTaskbar();
                break;
        }
    }

    // === Off-Screen Panel Indicators ===

    function updateOffScreenIndicators() {
        // Remove existing indicators
        document.querySelectorAll('.taskbar-offscreen-indicator').forEach(el => el.remove());

        const pm = window.PanelManager;
        if (!pm || !taskbarContentEl) return;

        const viewportWidth = window.innerWidth;
        const taskbarHeight = 48;
        const taskbarTop = window.innerHeight - taskbarHeight;

        sessionWindows.forEach((panel, sessionId) => {
            if (panel.state !== 'visible' && panel.state !== 'maximized') return;

            const rect = panel.container.getBoundingClientRect();
            let direction = null;
            let position = 0;

            // Check if panel is off-screen
            if (rect.right < 0) {
                direction = 'left';
                position = 0;
            } else if (rect.left > viewportWidth) {
                direction = 'right';
                position = viewportWidth - 40;
            } else if (rect.bottom < 0) {
                direction = 'top';
                position = rect.left + rect.width / 2;
            } else if (rect.top > taskbarTop) {
                direction = 'bottom';
                position = rect.left + rect.width / 2;
            }

            if (direction) {
                createOffScreenIndicator(sessionId, direction, position, panel);
            }
        });
    }

    function createOffScreenIndicator(sessionId, direction, position, panel) {
        const indicator = document.createElement('button');
        indicator.className = `taskbar-offscreen-indicator taskbar-offscreen-${direction}`;
        indicator.dataset.sessionId = sessionId;
        
        const arrow = direction === 'left' ? '◀' : 
                      direction === 'right' ? '▶' : 
                      direction === 'top' ? '▲' : '▼';
        
        indicator.innerHTML = arrow;
        indicator.title = 'Bring panel into view';

        // Position on taskbar edge
        if (direction === 'left' || direction === 'right') {
            indicator.style.cssText = `
                position: fixed;
                bottom: 12px;
                ${direction}: 4px;
                width: 32px;
                height: 32px;
                background: var(--primary, #6366f1);
                color: white;
                border: none;
                border-radius: 50%;
                font-size: 14px;
                cursor: pointer;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                animation: taskbar-indicator-pulse 1.5s infinite;
            `;
        } else {
            indicator.style.cssText = `
                position: fixed;
                left: ${Math.max(20, Math.min(window.innerWidth - 40, position - 20))}px;
                ${direction === 'top' ? 'top: 4px;' : 'bottom: 52px;'}
                width: 32px;
                height: 32px;
                background: var(--primary, #6366f1);
                color: white;
                border: none;
                border-radius: 50%;
                font-size: 14px;
                cursor: pointer;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                animation: taskbar-indicator-pulse 1.5s infinite;
            `;
        }

        indicator.addEventListener('click', () => {
            bringPanelIntoView(panel, sessionId);
        });

        document.body.appendChild(indicator);
    }

    function bringPanelIntoView(panel, sessionId) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const taskbarHeight = 48;
        const margin = 20;

        // Calculate new position to bring panel into view
        const rect = panel.container.getBoundingClientRect();
        let newX = panel.position.x;
        let newY = panel.position.y;

        if (rect.right < 0) {
            newX = margin;
        } else if (rect.left > viewportWidth) {
            newX = viewportWidth - rect.width - margin;
        }

        if (rect.bottom < 0) {
            newY = margin;
        } else if (rect.top > viewportHeight - taskbarHeight) {
            newY = viewportHeight - taskbarHeight - rect.height - margin;
        }

        // Apply new position
        panel.position.x = Math.max(margin, newX);
        panel.position.y = Math.max(margin, newY);
        panel.container.style.left = `${panel.position.x}px`;
        panel.container.style.top = `${panel.position.y}px`;

        // Bring to front and set active
        window.PanelManager.bringToFront(panel.id);
        setActiveSession(sessionId);

        // Remove indicator
        updateOffScreenIndicators();

        // Save state
        saveWindowState(sessionId, panel.position, panel.size);
    }

    // Check off-screen panels periodically
    setInterval(updateOffScreenIndicators, 1000);

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
                pm.bringToFront(panel.id);
                btnEl?.classList.add('active');
                btnEl?.classList.remove('minimized');
            }
            saveSessionWindowsState();
            return;
        }

        // Create new floating window for session
        try {
            const session = await window.apiIntegration?.getSession(sessionId);
            const title = session?.title || session?.task || `Session ${sessionId.slice(-6)}`;

            // Load saved position from state if available
            const savedState = await loadWindowState(sessionId);
            const x = savedState?.x ?? (100 + (sessionWindows.size * 30));
            const y = savedState?.y ?? (100 + (sessionWindows.size * 30));
            const width = savedState?.width ?? 500;
            const height = savedState?.height ?? 400;

            const panel = pm.open('task', {
                id: `session-win-${sessionId}`,
                title: title,
                x: x,
                y: y,
                width: width,
                height: height,
                onClose: () => {
                    saveWindowState(sessionId, panel.position, panel.size);
                    sessionWindows.delete(sessionId);
                    if (activeSessionId === sessionId) {
                        activeSessionId = null;
                    }
                    saveSessionWindowsState();
                    refreshTaskbar();
                },
                onStateChange: (state) => {
                    saveSessionWindowsState();
                    refreshTaskbar();
                }
            });

            // Load session content
            renderSessionContent(panel.getContentEl(), session);

            // Store reference
            sessionWindows.set(sessionId, panel);
            setActiveSession(sessionId);

            // Bring to front and update button
            pm.bringToFront(panel.id);
            btnEl?.classList.add('active');
            btnEl?.classList.remove('minimized');
            
            saveSessionWindowsState();

        } catch (e) {
            window.addNotification?.('Failed to open session', 'error');
        }
    }

    function closeSessionWindow(sessionId) {
        const panel = sessionWindows.get(sessionId);
        if (panel) {
            saveWindowState(sessionId, panel.position, panel.size);
            panel.close();
            sessionWindows.delete(sessionId);
            if (activeSessionId === sessionId) {
                activeSessionId = null;
            }
            saveSessionWindowsState();
        }
        refreshTaskbar();
    }

    function saveWindowState(sessionId, position, size) {
        try {
            const key = `a2a_win_state_${sessionId}`;
            const state = { position, size, timestamp: Date.now() };
            localStorage.setItem(key, JSON.stringify(state));
        } catch (e) {}
    }

    function loadWindowState(sessionId) {
        try {
            const key = `a2a_win_state_${sessionId}`;
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
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

    async function restoreSessionWindows() {
        const pm = window.PanelManager;
        if (!pm) return;

        const savedSessions = loadSessionWindowsState();
        if (!savedSessions.length) return;

        // Restore each saved session window
        for (const sessionId of savedSessions) {
            try {
                const session = await window.apiIntegration?.getSession(sessionId);
                if (!session) continue;

                const title = session?.title || session?.task || `Session ${sessionId.slice(-6)}`;
                const savedState = loadWindowState(sessionId);
                const x = savedState?.position?.x ?? (100 + (sessionWindows.size * 30));
                const y = savedState?.position?.y ?? (100 + (sessionWindows.size * 30));
                const width = savedState?.size?.width ?? 500;
                const height = savedState?.size?.height ?? 400;

                const panel = pm.open('task', {
                    id: `session-win-${sessionId}`,
                    title: title,
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    onClose: () => {
                        saveWindowState(sessionId, panel.position, panel.size);
                        sessionWindows.delete(sessionId);
                        if (activeSessionId === sessionId) {
                            activeSessionId = null;
                        }
                        saveSessionWindowsState();
                        refreshTaskbar();
                    },
                    onStateChange: (state) => {
                        saveSessionWindowsState();
                        refreshTaskbar();
                    }
                });

                renderSessionContent(panel.getContentEl(), session);
                sessionWindows.set(sessionId, panel);

                // Restore minimized state
                if (activeSessionId === sessionId) {
                    panel.restore();
                    pm.bringToFront(panel.id);
                }
            } catch (e) {
                console.warn('[AppTask] Failed to restore session window:', sessionId, e);
            }
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

        // Restore saved session windows
        restoreSessionWindows();

        // Refresh periodically
        setInterval(() => refreshTaskbar(), 5000);

        // Handle window resize to update scroll buttons and off-screen indicators
        window.addEventListener('resize', () => {
            if (taskbarContentEl) {
                const wrapper = taskbarContentEl.querySelector('.taskbar-sessions-wrapper');
                const leftBtn = taskbarContentEl.querySelector('.taskbar-scroll-left');
                const rightBtn = taskbarContentEl.querySelector('.taskbar-scroll-right');
                if (wrapper) updateScrollButtons(wrapper, leftBtn, rightBtn);
            }
            // Update off-screen indicators on resize
            updateOffScreenIndicators();
        });

        // Initial check for off-screen panels
        setTimeout(updateOffScreenIndicators, 500);
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

        // Setup project selection persistence
        setupProjectSelectHandler();

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

                    // Auto-select if this matches the saved project
                    const savedProjectId = getSelectedProjectId();
                    if (savedProjectId && savedProjectId === project.id) {
                        sel.value = project.id;
                    }
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
