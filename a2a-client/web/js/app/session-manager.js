/**
 * Session Manager - Handles session creation, management and state
 */
(function (global) {
    'use strict';

    function findTaskbarSessionBtn(root, sessionId) {
        if (!root || sessionId == null || sessionId === '') return null;
        return Array.from(root.querySelectorAll('.taskbar-session-btn')).find(
            (b) => b.dataset.sessionId === String(sessionId)
        ) || null;
    }

    const ACTIVE_SESSION_KEY = 'a2a_active_session';

    let activeSessionId = null;
    let taskbarContentEl = null;

    const SessionManager = {
        /**
         * Set active session
         */
        async setActiveSession(sessionId) {
            activeSessionId = sessionId;
            try {
                // Try async storage first, fallback to sync
                await StorageAPI.sessions.setItem('active-session', sessionId);
            } catch (asyncError) {
                console.warn('[SessionManager] Async storage failed, using sync fallback:', asyncError);
                StorageAPI.sessions.setItemSync('active-session', sessionId);
            }

            // Update UI indicators
            this.updateActiveSessionUI(sessionId);

            console.log('[SessionManager] Active session changed:', sessionId);
        },

        /**
         * Get active session ID
         */
        getActiveSessionId() {
            return activeSessionId;
        },

        /**
         * Update active session UI indicators
         */
        updateActiveSessionUI(sessionId) {
            if (!taskbarContentEl) return;

            // Remove active class from all buttons
            taskbarContentEl.querySelectorAll('.taskbar-session-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // Add active class to current session button
            if (sessionId) {
                const activeBtn = findTaskbarSessionBtn(taskbarContentEl, sessionId);
                if (activeBtn) {
                    activeBtn.classList.add('active');
                    // Scroll to center the active button
                    this.centerActiveButton(activeBtn.parentElement);
                }
            }
        },

        /**
         * Center active button in taskbar
         */
        centerActiveButton(container) {
            if (!container) return;

            const activeBtn = container.querySelector('.taskbar-session-btn.active');
            if (!activeBtn) return;

            const containerRect = container.getBoundingClientRect();
            const btnRect = activeBtn.getBoundingClientRect();
            const scrollLeft = container.scrollLeft;
            const centerOffset = (containerRect.width - btnRect.width) / 2;
            const targetScroll = scrollLeft + btnRect.left - containerRect.left - centerOffset;

            container.scrollTo({
                left: Math.max(0, targetScroll),
                behavior: 'smooth'
            });
        },

        /**
         * Show context menu for session
         */
        showContextMenu(e, sessionId, btnEl) {
            e.preventDefault();

            // Remove existing context menu
            document.querySelectorAll('.session-context-menu').forEach(menu => menu.remove());

            const menu = document.createElement('div');
            menu.className = 'session-context-menu';
            menu.style.cssText = `
                position: fixed;
                left: ${e.clientX}px;
                top: ${e.clientY}px;
                background: var(--surface, #1e1e2e);
                border: 1px solid var(--border, #313244);
                border-radius: 4px;
                padding: 4px 0;
                z-index: 10000;
                min-width: 120px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            `;

            const actions = [
                { label: 'Close', action: 'close', icon: '✕' },
                { label: 'Duplicate', action: 'duplicate', icon: '📋' },
                { label: 'Rename', action: 'rename', icon: '✏️' },
                { label: 'Export', action: 'export', icon: '📤' }
            ];

            actions.forEach(({ label, action, icon }) => {
                const item = document.createElement('div');
                item.className = 'context-menu-item';
                item.style.cssText = `
                    padding: 8px 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--text-primary, #cdd6f4);
                `;
                item.innerHTML = `${icon} ${label}`;
                item.addEventListener('click', () => {
                    this.handleContextMenuAction(action, sessionId, btnEl);
                    menu.remove();
                });
                item.addEventListener('mouseenter', () => {
                    item.style.background = 'var(--surface-light, #252536)';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.background = 'transparent';
                });
                menu.appendChild(item);
            });

            document.body.appendChild(menu);

            // Close menu when clicking elsewhere
            const closeHandler = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 0);
        },

        /**
         * Handle context menu action
         */
        handleContextMenuAction(action, sessionId, btnEl) {
            switch (action) {
                case 'close':
                    if (confirm('Close this session?')) {
                        global.WindowManager?.closeSessionWindow(sessionId);
                    }
                    break;
                case 'duplicate':
                    console.log('[SessionManager] Duplicating session:', sessionId);
                    // Implementation would go here
                    break;
                case 'rename':
                    const newName = prompt('Enter new session name:');
                    if (newName?.trim()) {
                        this.renameSession(sessionId, newName.trim());
                    }
                    break;
                case 'export':
                    console.log('[SessionManager] Exporting session:', sessionId);
                    // Implementation would go here
                    break;
            }
        },

        /**
         * Rename session
         */
        renameSession(sessionId, newName) {
            // Update button text
            const sessionBtn = Array.from(document.querySelectorAll('.taskbar-session-btn')).find(
                (b) => b.dataset.sessionId === String(sessionId)
            );
            const titleEl = sessionBtn?.querySelector('.taskbar-session-title');
            if (titleEl) {
                titleEl.textContent = newName;
            }

            // Update session data
            if (global.SessionStore?.renameSession) {
                global.SessionStore.renameSession(sessionId, newName);
            }

            console.log('[SessionManager] Renamed session:', sessionId, newName);
        },

        /**
         * Set taskbar content element
         */
        setTaskbarContentEl(el) {
            taskbarContentEl = el;
        },

        /**
         * Get taskbar content element
         */
        getTaskbarContentEl() {
            return taskbarContentEl;
        },

        /**
         * Initialize session manager
         */
        async init() {
            // Load active session from storage
            try {
                // Try async storage first, fallback to sync
                const stored = await StorageAPI.sessions.getItem('active-session');
                activeSessionId = stored || null;
            } catch (asyncError) {
                console.warn('[SessionManager] Async storage failed, using sync fallback:', asyncError);
                activeSessionId = StorageAPI.sessions.getItemSync('active-session') || null;
            }

            console.log('[SessionManager] Initialized, active session:', activeSessionId);
        }
    };

    // Export
    global.SessionManager = SessionManager;

})(typeof window !== 'undefined' ? window : globalThis);