/**
 * Session UI Module - методы рендеринга и UI для сессий
 */

(function (global) {
    'use strict';

    /**
     * Утилита экранирования HTML
     */
    function escapeHtml(s) {
        if (s == null) return '';
        const div = typeof document !== 'undefined' && document.createElement('div');
        if (div) { div.textContent = s; return div.innerHTML; }
        return String(s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
    }

    /**
     * Показать контекстное меню сессии
     */
    function showContextMenu(e, sessionId, btnEl) {
        e.preventDefault();
        document.querySelectorAll('.session-context-menu').forEach(menu => menu.remove());
        const menu = document.createElement('div');
        menu.className = 'session-context-menu';
        menu.style.cssText = 'position:fixed;left:' + e.clientX + 'px;top:' + e.clientY + 'px;background:var(--surface,#1e1e2e);border:1px solid var(--border,#313244);border-radius:4px;padding:4px 0;z-index:10000;min-width:120px;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
        
        const items = [{ label: 'Close', action: 'close', icon: '\u2715' }];
        items.forEach(({ label, action, icon }) => {
            const item = document.createElement('div');
            item.className = 'context-menu-item';
            item.style.cssText = 'padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;color:var(--text-primary,#cdd6f4);';
            item.textContent = icon + ' ' + label;
            item.addEventListener('click', () => {
                if (action === 'close' && global.confirm('Close this session?')) {
                    global.WindowManager?.closeSessionWindow(sessionId);
                }
                menu.remove();
            });
            menu.appendChild(item);
        });
        
        document.body.appendChild(menu);
        const closeHandler = (ev) => {
            if (!menu.contains(ev.target)) { 
                menu.remove(); 
                document.removeEventListener('click', closeHandler); 
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    }

    /**
     * Центрировать активную кнопку в таскбаре
     */
    function centerActiveButton(container, activeBtn) {
        if (!container || !activeBtn) return;
        const rect = container.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        const scrollLeft = container.scrollLeft;
        const centerOffset = (rect.width - btnRect.width) / 2;
        const targetScroll = scrollLeft + btnRect.left - rect.left - centerOffset;
        container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }

    /**
     * Обновить UI активной сессии в таскбаре
     */
    function updateActiveSessionUI(taskbarContentEl, sessionId) {
        if (!taskbarContentEl) return;
        const wrapper = taskbarContentEl.querySelector('.taskbar-sessions-wrapper') || taskbarContentEl;
        taskbarContentEl.querySelectorAll('.taskbar-session-btn').forEach(btn => btn.classList.remove('active'));
        if (sessionId) {
            const btn = taskbarContentEl.querySelector(`[data-session-id="${sessionId}"]`);
            if (btn) {
                btn.classList.add('active');
                centerActiveButton(wrapper, btn);
            }
        }
    }

    /**
     * Рендер списка сессий
     */
    function renderSessionsList(containerId, sessions, currentSessionId, options = {}) {
        const container = typeof document !== 'undefined' && document.getElementById(containerId);
        if (!container) return;

        const { 
            onSelect = () => {}, 
            onDelete = () => {}, 
            onCreate = () => {}, 
            emptyMessage = 'No sessions yet', 
            showCreateButton = true,
            createSession = () => Promise.resolve({}),
            setActiveSession = () => {},
            deleteSessionFn = () => Promise.resolve()
        } = options;

        const list = Array.isArray(sessions) ? sessions : [];

        let html = '';
        if (showCreateButton) {
            html += '<div class="session-manager-actions"><button type="button" class="btn btn-primary session-manager-create-btn">+ New Session</button></div>';
        }
        if (list.length === 0) {
            html += `<div class="session-manager-empty">${escapeHtml(emptyMessage)}</div>`;
        } else {
            html += '<div class="session-manager-list">';
            list.forEach(session => {
                const id = session.id || session.sessionId || session;
                const title = session.title || session.name || `Session ${String(id).slice(0, 8)}`;
                const active = id === currentSessionId ? ' active' : '';
                const status = session.status || '';
                html += `<div class="session-item${active}" data-session-id="${escapeHtml(id)}">
                    <div class="session-item-content">
                        <span class="session-item-title">${escapeHtml(title)}</span>
                        ${status ? `<span class="session-item-status">${escapeHtml(status)}</span>` : ''}
                    </div>
                    <button type="button" class="session-item-delete" title="Delete">&times;</button>
                </div>`;
            });
            html += '</div>';
        }
        container.innerHTML = html;

        // Event handlers
        container.querySelectorAll('.session-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('session-item-delete')) {
                    const sid = item.dataset.sessionId;
                    if (sid) { 
                        setActiveSession(sid); 
                        onSelect(sid); 
                    }
                }
            });
        });
        
        container.querySelectorAll('.session-item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sid = btn.closest('.session-item')?.dataset?.sessionId;
                if (sid && confirm('Delete this session?')) {
                    deleteSessionFn(sid).then(() => onDelete(sid)).catch(() => {});
                }
            });
        });
        
        const createBtn = container.querySelector('.session-manager-create-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                createSession().then(session => {
                    const sid = session?.id || session?.sessionId;
                    if (sid) { 
                        setActiveSession(sid); 
                        onCreate(session); 
                    }
                }).catch(() => {});
            });
        }
    }

    /**
     * Рендер списка сообщений
     */
    function renderConversation(containerId, messages = []) {
        const container = typeof document !== 'undefined' && document.getElementById(containerId);
        if (!container) return;

        const list = Array.isArray(messages) && messages.length > 0 ? messages : [];
        
        if (list.length === 0) {
            container.innerHTML = '<div class="conversation-empty">No messages yet</div>';
            return;
        }
        
        let html = '<div class="conversation-messages">';
        list.forEach(msg => {
            const role = msg.role || msg.direction || 'unknown';
            const content = msg.content || msg.text || msg.message || '';
            const timestamp = msg.timestamp || msg.createdAt || '';
            html += `<div class="conversation-message message-${escapeHtml(role)}">
                <div class="message-header">
                    <span class="message-role">${escapeHtml(role)}</span>
                    ${timestamp ? `<span class="message-time">${new Date(timestamp).toLocaleTimeString()}</span>` : ''}
                </div>
                <div class="message-content">${escapeHtml(String(content))}</div>
            </div>`;
        });
        html += '</div>';
        
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }

    // Export
    global.sessionUI = {
        escapeHtml,
        showContextMenu,
        centerActiveButton,
        updateActiveSessionUI,
        renderSessionsList,
        renderConversation
    };

})(typeof window !== 'undefined' ? window : globalThis);
