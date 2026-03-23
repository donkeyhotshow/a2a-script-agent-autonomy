/**
 * Session Manager - Handles session creation, management and state
 */
(function (global) {
    'use strict';

    // Unified function for finding taskbar button by sessionId (also used in state-managers.js)
    function findTaskbarBtnBySessionId(sessionId) {
        if (sessionId == null || sessionId === '') return null;
        return Array.from(document.querySelectorAll('.taskbar-session-btn')).find(
                (b) => b.dataset.sessionId === String(sessionId)
            ) || null;
   }
   
        /**
         * Center active button in taskbar
         */
        function centerActiveButton(container) {
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
        };
   
    let activeSessionId = null;
    let taskbarContentEl = null;

    // Use async storage only
    async function writeActiveSessionId(sessionId) {
        await StorageAPI.sessions.setItem('active-session', sessionId);
    }

    async function readActiveSessionId() {
        return (await StorageAPI.sessions.getItem('active-session')) || null;
    }

    const SessionManager = {
        /**
         * Set active session
         */
        async setActiveSession(sessionId) {
            activeSessionId = sessionId;
            await writeActiveSessionId(sessionId);

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
                const activeBtn = findTaskbarBtnBySessionId(sessionId);
                if (activeBtn) {
                    activeBtn.classList.add('active');
                    // Scroll to center the active button
                    centerActiveButton(activeBtn.parentElement);
                }
            }
        },



        /**
         * Reusable context menu element (created once, hidden/shown)
         */
        _contextMenu: null,
        _contextMenuCloseItem: null,
        _contextMenuRenameItem: null,

        /**
         * Create context menu markup once
         */
        _createContextMenuMarkup() {
            const menu = document.createElement('div');
            menu.className = 'session-context-menu';

            // Create Close item
            const closeItem = document.createElement('div');
            closeItem.className = 'context-menu-item';
            closeItem.innerHTML = '✕ Close';
            menu.appendChild(closeItem);

            // Create Rename item
            const renameItem = document.createElement('div');
            renameItem.className = 'context-menu-item';
            renameItem.innerHTML = '✏️ Rename';
            menu.appendChild(renameItem);

            document.body.appendChild(menu);

            this._contextMenu = menu;
            this._contextMenuCloseItem = closeItem;
            this._contextMenuRenameItem = renameItem;
        },

        /**
         * Show context menu for session (reuses DOM element)
         */
        showContextMenu(e, sessionId, btnEl) {
            e.preventDefault();

            // Create menu markup once if not exists
            if (!this._contextMenu) {
                this._createContextMenuMarkup();
            }

            const menu = this._contextMenu;
            menu.classList.add('visible');
            menu.style.left = `${e.clientX}px`;
            menu.style.top = `${e.clientY}px`;

            // Update click handlers with current sessionId and btnEl
            this._contextMenuCloseItem.onclick = () => {
                menu.classList.remove('visible');
                if (confirm('Close this session?')) {
                    global.WindowState?.closeSessionWindow(sessionId);
                }
            };

            this._contextMenuRenameItem.onclick = () => {
                menu.classList.remove('visible');
                const newName = prompt('Enter new session name:');
                if (newName?.trim()) {
                    this.renameSession(sessionId, newName.trim());
                }
            };

            // Close menu when clicking elsewhere
            const closeHandler = (ev) => {
                if (!menu.contains(ev.target)) {
                    menu.classList.remove('visible');
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 0);
        },



        /**
         * Rename session
         */
        renameSession(sessionId, newName) {
            // Update button text using findTaskbarBtnBySessionId
            const sessionBtn = findTaskbarBtnBySessionId(sessionId);
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
            activeSessionId = await readActiveSessionId();
            console.log('[SessionManager] Initialized, active session:', activeSessionId);
        }
    };

     // Export
     global.SessionManager = SessionManager;
     global.findTaskbarBtnBySessionId = findTaskbarBtnBySessionId;
     global.centerActiveButton = centerActiveButton;

})(typeof window !== 'undefined' ? window : globalThis);