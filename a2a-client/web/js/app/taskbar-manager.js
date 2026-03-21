/**
 * Taskbar Manager - Handles taskbar UI and scrolling
 */
(function (global) {
    'use strict';

    const TaskbarManager = {
        /**
         * Load taskbar sessions
         */
        async loadTaskbarSessions(contentEl) {
            if (!contentEl) return;

            if (global.SessionManager) {
                global.SessionManager.setTaskbarContentEl(contentEl);
            }

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
                leftBtn.addEventListener('click', () => this.scrollTaskbar(-1, sessionsWrapper, leftBtn, rightBtn));
                rightBtn.addEventListener('click', () => this.scrollTaskbar(1, sessionsWrapper, leftBtn, rightBtn));

                // Update scroll buttons on scroll
                sessionsWrapper.addEventListener('scroll', () => {
                    this.updateScrollButtons(sessionsWrapper, leftBtn, rightBtn);
                });

                // Wheel scroll - horizontal scrolling with mouse wheel
                sessionsWrapper.addEventListener('wheel', (e) => {
                    if (e.deltaY !== 0) {
                        e.preventDefault();
                        sessionsWrapper.scrollBy({ left: e.deltaY, behavior: 'smooth' });
                        // Update buttons after scroll animation
                        setTimeout(() => this.updateScrollButtons(sessionsWrapper, leftBtn, rightBtn), 150);
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
                    const deltaY = Math.abs(touchStartY - touchY);

                    // Only handle horizontal swipes
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                        e.preventDefault();
                        sessionsWrapper.scrollBy({ left: deltaX, behavior: 'smooth' });
                        touchStartX = touchX;
                    }
                }, { passive: false });
            }

            // Initial scroll button state
            const sessionsWrapper = container.querySelector('.taskbar-sessions-wrapper');
            const leftBtn = container.querySelector('.taskbar-scroll-left');
            const rightBtn = container.querySelector('.taskbar-scroll-right');
            this.updateScrollButtons(sessionsWrapper, leftBtn, rightBtn);

            // Load sessions from API
            await this.refreshTaskbar(contentEl);
        },

        /**
         * Update scroll buttons visibility
         */
        updateScrollButtons(contentEl, leftBtn, rightBtn) {
            if (!contentEl || !leftBtn || !rightBtn) return;

            const hasOverflow = contentEl.scrollWidth > contentEl.clientWidth;
            const atStart = contentEl.scrollLeft <= 0;
            const atEnd = contentEl.scrollLeft >= contentEl.scrollWidth - contentEl.clientWidth - 1;

            leftBtn.style.display = hasOverflow && !atStart ? 'block' : 'none';
            rightBtn.style.display = hasOverflow && !atEnd ? 'block' : 'none';
        },

        /**
         * Scroll taskbar
         */
        scrollTaskbar(direction, contentEl, leftBtn, rightBtn) {
            const scrollAmount = contentEl.clientWidth * 0.8;
            contentEl.scrollBy({
                left: direction * scrollAmount,
                behavior: 'smooth'
            });

            // Update buttons after animation
            setTimeout(() => this.updateScrollButtons(contentEl, leftBtn, rightBtn), 300);
        },

        /**
         * Refresh taskbar with current sessions
         */
        async refreshTaskbar(contentEl) {
            try {
                // Get sessions from API
                const sessions = await this.fetchSessions();

                const sessionsWrapper = contentEl.querySelector('.taskbar-sessions-wrapper');
                if (!sessionsWrapper) return;

                // Clear existing buttons
                sessionsWrapper.innerHTML = '';

                // Add session buttons
                for (const session of sessions) {
                    const btn = this.createSessionButton(session);
                    sessionsWrapper.appendChild(btn);
                }

                // Update scroll buttons
                const container = contentEl.querySelector('.taskbar-container');
                if (container) {
                    const leftBtn = container.querySelector('.taskbar-scroll-left');
                    const rightBtn = container.querySelector('.taskbar-scroll-right');
                    this.updateScrollButtons(sessionsWrapper, leftBtn, rightBtn);
                }

                this.updateOffScreenIndicators();
            } catch (error) {
                console.error('[TaskbarManager] Failed to refresh taskbar:', error);
            }
        },

        /**
         * Fetch sessions from API for current project
         */
        async fetchSessions() {
            const g = typeof window !== 'undefined' ? window : globalThis;
            if (!g.apiIntegration || typeof g.apiIntegration.getSessions !== 'function') {
                throw new Error('[TaskbarManager] apiIntegration.getSessions required');
            }
            const sessions = await g.apiIntegration.getSessions();
            if (!Array.isArray(sessions)) {
                throw new Error('[TaskbarManager] getSessions must return an array');
            }
            return sessions;
        },

        /**
         * Create session button
         */
        createSessionButton(session) {
            const sessionId = session && (session.id || session.sessionId);
            const btn = document.createElement('button');
            btn.className = 'taskbar-session-btn';
            btn.dataset.sessionId = sessionId || '';
            const sessionLabel = session.title || `Session ${(sessionId || '').slice(-8)}`;
            btn.title = `Session: ${sessionLabel}`;

            btn.innerHTML = `
                <div class="taskbar-session-icon">💬</div>
                <div class="taskbar-session-title">${this.escapeHtml(sessionLabel)}</div>
                <div class="taskbar-session-status"></div>
            `;

            // Click handler
            btn.addEventListener('click', (e) => {
                if (global.WindowState && sessionId) {
                    global.WindowState.toggleSessionWindow(sessionId, btn);
                }
            });

            // Context menu
            btn.addEventListener('contextmenu', (e) => {
                if (global.SessionManager && sessionId) {
                    global.SessionManager.showContextMenu(e, sessionId, btn);
                }
            });

            // Double-click to maximize
            btn.addEventListener('dblclick', (e) => {
                if (global.WindowRegistry && sessionId) {
                    const panel = global.WindowRegistry.getSessionWindows().get(sessionId);
                    if (panel) {
                        panel.maximize();
                    }
                }
            });

            return btn;
        },

        /**
         * Update off-screen indicators
         */
        updateOffScreenIndicators() {
            const taskbar = document.querySelector('.taskbar-content');
            if (!taskbar) return;

            // Remove existing indicators
            document.querySelectorAll('.offscreen-indicator').forEach(ind => ind.remove());

            const sessionsWrapper = taskbar.querySelector('.taskbar-sessions-wrapper');
            if (!sessionsWrapper) return;

            const buttons = sessionsWrapper.querySelectorAll('.taskbar-session-btn');
            const containerRect = sessionsWrapper.getBoundingClientRect();

            buttons.forEach((btn, index) => {
                const btnRect = btn.getBoundingClientRect();
                const sessionId = btn.dataset.sessionId;

                if (btnRect.right < containerRect.left) {
                    // Off-screen to the left
                    this.createOffScreenIndicator(sessionId, 'left', index, btn);
                } else if (btnRect.left > containerRect.right) {
                    // Off-screen to the right
                    this.createOffScreenIndicator(sessionId, 'right', index, btn);
                }
            });
        },

        /**
         * Create off-screen indicator
         */
        createOffScreenIndicator(sessionId, direction, position, originalBtn) {
            const indicator = document.createElement('div');
            indicator.className = `offscreen-indicator offscreen-${direction}`;
            indicator.dataset.sessionId = sessionId;
            indicator.innerHTML = '⋯';
            indicator.title = `Session ${sessionId.slice(-8)} (${direction})`;

            // Position indicator
            if (direction === 'left') {
                indicator.style.left = '0px';
            } else {
                indicator.style.right = '0px';
            }

            // Click handler to bring into view
            indicator.addEventListener('click', () => {
                this.bringPanelIntoView(originalBtn, sessionId);
            });

            // Insert before taskbar
            const taskbar = document.querySelector('.taskbar');
            if (taskbar) {
                taskbar.parentNode.insertBefore(indicator, taskbar);
            }
        },

        /**
         * Bring panel into view
         */
        bringPanelIntoView(btn, sessionId) {
            const sessionsWrapper = btn.closest('.taskbar-sessions-wrapper');
            if (!sessionsWrapper) return;

            const btnRect = btn.getBoundingClientRect();
            const containerRect = sessionsWrapper.getBoundingClientRect();

            if (btnRect.left < containerRect.left) {
                // Scroll left to show button
                const scrollLeft = sessionsWrapper.scrollLeft + (btnRect.left - containerRect.left) - 20;
                sessionsWrapper.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
            } else if (btnRect.right > containerRect.right) {
                // Scroll right to show button
                const scrollRight = sessionsWrapper.scrollLeft + (btnRect.right - containerRect.right) + 20;
                sessionsWrapper.scrollTo({ left: scrollRight, behavior: 'smooth' });
            }

            if (global.WindowState) {
                global.WindowState.toggleSessionWindow(sessionId, btn);
            }
        },

        /**
         * Ensure taskbar exists
         */
        ensureTaskbar() {
            let taskbar = document.querySelector('.taskbar');
            if (!taskbar) {
                taskbar = document.createElement('div');
                taskbar.className = 'taskbar';
                taskbar.innerHTML = `
                    <div class="taskbar-right">
                        <button class="taskbar-btn-new-task" title="New Task (Ctrl+K)">+</button>
                    </div>
                    <div class="taskbar-content"></div>
                `;
                document.body.appendChild(taskbar);

                // Bind New Task button
                const newTaskBtn = taskbar.querySelector('.taskbar-btn-new-task');
                if (newTaskBtn) {
                    newTaskBtn.addEventListener('click', () => {
                        if (global.AppTask?.createNewSession) {
                            global.AppTask.createNewSession();
                        } else {
                            console.warn('[TaskbarManager] AppTask.createNewSession not available');
                        }
                    });
                }
            }

            const contentEl = taskbar.querySelector('.taskbar-content');
            if (contentEl && !contentEl.dataset.loaded) {
                contentEl.dataset.loaded = 'true';
                this.loadTaskbarSessions(contentEl);
            }
        },

        /**
         * Escape HTML
         */
        escapeHtml(s) {
            return global.escapeHtml(s);
        },

        /**
         * Initialize taskbar manager
         */
        init() {}
    };

    // Export
    global.TaskbarManager = TaskbarManager;

})(typeof window !== 'undefined' ? window : globalThis);
