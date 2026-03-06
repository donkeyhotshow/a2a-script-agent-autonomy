(function (global) {
    'use strict';

    class SessionPanelManager {
        constructor() {
            this.sessionManager = null;
            this.pui = null;
            this.panels = new Map(); // panelId -> { panel, sessionId }
            this.currentProjectId = null;
            this._initializing = false;
            this._setup();
        }

        _setup() {
            if (this._initializing) return;
            this._initializing = true;
            this.sessionManager = global.SessionManager;
            if (!this.sessionManager) {
                // retry once DOM APIs have set it up
                setTimeout(() => {
                    this._initializing = false;
                    this._setup();
                }, 300);
                return;
            }

            this.sessionManager.on('sessionsLoaded', (sessions) => {
                this._handleSessionsLoaded(Array.isArray(sessions) ? sessions : []);
            });
            this.sessionManager.on('sessionCreated', (session) => this._addOrUpdatePanel(session));
            this.sessionManager.on('sessionDeleted', (sessionId) => this._removePanel(sessionId));
            this.sessionManager.on('sessionChanged', (sessionId) => this._focusPanel(sessionId));

            document.addEventListener('DOMContentLoaded', () => {
                this._waitForProjectSelect();
            });
        }

        _waitForProjectSelect() {
            const select = document.getElementById('projectSelect');
            if (!select) {
                requestAnimationFrame(() => this._waitForProjectSelect());
                return;
            }
            select.addEventListener('change', () => {
                this.setProject(select.value || null);
            });
            if (select.value) {
                this.setProject(select.value);
            }
        }

        setProject(projectId) {
            if (!this.sessionManager) return;
            const normalized = projectId || null;
            if (this.currentProjectId === normalized) return;
            this.currentProjectId = normalized;
            this._clearPanels();
            if (normalized) {
                this.sessionManager.loadSessions(normalized);
            }
        }

        async _handleSessionsLoaded(sessions) {
            if (!sessions.length) return;
            for (const session of sessions) {
                await this._addOrUpdatePanel(session);
            }
        }

        async _addOrUpdatePanel(sessionSummary) {
            const sessionId = sessionSummary?.id || sessionSummary?.sessionId;
            if (!sessionId) return;

            const detail = await this._fetchSessionDetail(sessionSummary);
            const panelId = `session-panel-${sessionId}`;

            let entry = this.panels.get(panelId);
            if (!entry) {
                await this._ensurePui();
                if (!this.pui) return;
                
                // Получаем layout из context
                const panelLayout = detail.context?.panelLayout || {};
                const title = detail.title || panelLayout.title || detail.task || detail.context?.task || `Session ${sessionId.slice(-6)}`;
                const panel = this.pui.addPanel({
                    id: panelId,
                    title,
                    slot: panelLayout.slot || detail.context?.panelSlot || 'floating',
                    critical: detail.status === 'active',
                    contentHTML: '<div class="session-card"></div>',
                    onClose: () => this._removePanel(sessionId),
                    onStateChange: (state) => {
                        // Сохраняем panelLayout при изменении состояния
                        this._savePanelLayout(sessionId, panel, state);
                    },
                    onDragEnd: (panel) => {
                        // Сохраняем позицию после перетаскивания
                        this._savePanelLayout(sessionId, panel, panel.state);
                    },
                    onCubeDrop: (sourcePanelId, targetPanelId) => {
                        // Cube перетащили на панель - сохраняем target
                        console.log('[SessionPanelManager] Cube dropped:', sourcePanelId, '->', targetPanelId);
                        
                        // Получаем target sessionId из targetPanelId
                        const targetSessionId = targetPanelId.replace('session-panel-', '');
                        
                        // Сохраняем связь в panelLayout
                        this._savePanelLayout(sessionId, panel, panel.state);
                        
                        // Также обновляем target панель если она существует
                        const targetEntry = this.panels.get(targetPanelId);
                        if (targetEntry) {
                            // Можно сохранить информацию о том, откуда пришёл cube
                            console.log('[SessionPanelManager] Target panel found:', targetPanelId);
                        }
                    },
                });
                entry = { panel, sessionId };
                this.panels.set(panelId, entry);
            }
            this._renderPanel(entry.panel, detail);
        }

        async _fetchSessionDetail(sessionSummary) {
            const sessionId = sessionSummary?.id || sessionSummary?.sessionId;
            if (!sessionId) return sessionSummary;
            if (sessionSummary?.context && sessionSummary?.execute) {
                return sessionSummary;
            }
            try {
                const detail = await this.sessionManager.getSession(sessionId);
                return detail || sessionSummary;
            } catch (_) {
                return sessionSummary;
            }
        }

        _renderPanel(panel, session = {}) {
            const panelId = panel.id;
            const contentEl = this.pui.getContentEl(panelId);
            if (!contentEl) return;
            const context = session.context || {};
            const execute = context.execute || session.execute || {};
            const status = session.status || execute.status || 'idle';
            const step = (context.execution?.step || execute.step || '').replace(/[^a-zA-Z0-9_-]/g, '');
            const action = context.execution?.action || execute.action || session.task || 'task';
            const updatedAt = session.updatedAt || session.context?.updatedAt;
            const displayDate = updatedAt ? new Date(updatedAt).toLocaleString() : '';
            const progress = typeof execute.progress === 'number' ? Math.max(0, Math.min(100, execute.progress)) : null;
            const summary = session.summary || session.context?.summary || '';
            const btnId = `session-focus-${panelId}`;

            contentEl.innerHTML = `
                <div class="session-card" data-session-id="${session.id}">
                    <header class="session-card-header">
                        <div>
                            <strong>${this._escapeHtml(action)}</strong>
                            <span class="session-card-step">${step ? `· ${this._escapeHtml(step)}` : ''}</span>
                        </div>
                        <span class="session-card-status">${this._escapeHtml(status)}</span>
                    </header>
                    <div class="session-card-body">
                        <div class="session-card-row">
                            <span class="session-card-label">Session</span>
                            <code class="session-card-id">${this._escapeHtml(session.id)}</code>
                        </div>
                        ${displayDate ? `<div class="session-card-row"><span class="session-card-label">Updated</span><span>${this._escapeHtml(displayDate)}</span></div>` : ''}
                        ${progress !== null ? `<div class="session-card-row"><span class="session-card-label">Progress</span><span class="session-card-progress"><span style="width:${progress}%"></span></span><span>${progress}%</span></div>` : ''}
                        ${summary ? `<div class="session-card-row"><span class="session-card-label">Summary</span><span>${this._escapeHtml(summary)}</span></div>` : ''}
                    </div>
                    <footer class="session-card-footer">
                        <button class="session-card-btn focus" id="${btnId}">Focus</button>
                    </footer>
                </div>
            `;

            const focusBtn = document.getElementById(btnId);
            if (focusBtn) {
                focusBtn.addEventListener('click', () => {
                    this.sessionManager.setActiveSession(session.id);
                    this._focusPanel(session.id);
                });
            }

            const layout = context.panelLayout || session.panelLayout || {};
            this._applyLayout(panel, layout);
        }

        _applyLayout(panel, layout) {
            if (!layout || typeof layout !== 'object') return;
            
            console.log('[SessionPanelManager] Applying layout:', layout);
            
            // Восстанавливаем title если есть
            if (layout.title) {
                const titleEl = panel.container?.querySelector?.('.pui-panel-title');
                if (titleEl) titleEl.textContent = layout.title;
            }
            
            // Применяем state
            if (layout.state) {
                panel.setState(layout.state);
            }
            
            // Применяем slot
            if (layout.slot) {
                panel.container.classList.remove(...Object.values(global.PlasticineSLOTS || {}));
                panel.container.classList.add(global.PlasticineSLOTS?.[layout.slot] || global.PlasticineSLOTS?.floating || '');
            }
            
            // Применяем position
            const styles = panel.container.style;
            if (layout.left) styles.left = layout.left;
            if (layout.top) styles.top = layout.top;
            if (layout.width) styles.width = layout.width;
            if (layout.height) styles.height = layout.height;
        }

        _focusPanel(sessionId) {
            const entry = Array.from(this.panels.values()).find(e => e.sessionId === sessionId);
            if (entry && this.pui) {
                this.pui.bringToFront?.(entry.panel.id);
                entry.panel.container?.classList.add('pui-panel-focus');
                setTimeout(() => entry.panel.container?.classList.remove?.('pui-panel-focus'), 400);
            }
        }

        _removePanel(sessionId) {
            const panelId = `session-panel-${sessionId}`;
            const entry = this.panels.get(panelId);
            if (!entry) return;
            this.pui?.removePanel(panelId);
            this.panels.delete(panelId);
        }

        /**
         * Сохранить layout панели на сервере
         * @param {string} sessionId
         * @param {Object} panel
         * @param {string} state
         * @private
         */
        _savePanelLayout(sessionId, panel, state) {
            if (!sessionId || !this.sessionManager) return;
            
            // Определяем slot на основе позиции панели
            let slot = 'floating';
            if (panel.container.classList.contains('pui-slot-left')) slot = 'left';
            else if (panel.container.classList.contains('pui-slot-right')) slot = 'right';
            else if (panel.container.classList.contains('pui-slot-bottom')) slot = 'bottom';
            
            // Получаем position из стилей
            const styles = panel.container.style;
            const left = styles.left || panel.container.offsetLeft + 'px';
            const top = styles.top || panel.container.offsetTop + 'px';
            const width = styles.width || panel.container.offsetWidth + 'px';
            const height = styles.height || panel.container.offsetHeight + 'px';
            
            // Получаем title из заголовка панели
            const title = panel.container.querySelector('.pui-panel-title')?.textContent || panel.id || '';
            
            const panelLayout = {
                id: panel.id,
                type: panel.type,
                state: state,
                slot: slot,
                title: title,
                left: left,
                top: top,
                width: width,
                height: height
            };
            
            console.log('[SessionPanelManager] Saving panelLayout:', panelLayout);
            
            // Отправляем на сервер
            this.sessionManager.updateSession(sessionId, { context: { panelLayout } }).catch(err => {
                console.warn('[SessionPanelManager] Failed to save panelLayout:', err);
            });
        }

        _clearPanels() {
            if (!this.pui) return;
            for (const panelId of Array.from(this.panels.keys())) {
                this.pui.removePanel(panelId);
            }
            this.panels.clear();
        }

        async _ensurePui() {
            if (this.pui) return this.pui;
            if (global.PlasticineUI) {
                this.pui = new global.PlasticineUI({ mount: document.body });
                return this.pui;
            }
            await new Promise((resolve) => setTimeout(resolve, 200));
            return this._ensurePui();
        }

        _escapeHtml(value) {
            if (value == null) return '';
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
    }

    global.SessionPanelManager = new SessionPanelManager();

})(typeof window !== 'undefined' ? window : globalThis);
