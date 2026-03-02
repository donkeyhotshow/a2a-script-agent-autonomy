/**
 * Sessions Panel - Shows list of sessions
 */

const SessionsPanel = {
    api: '/api/v1',

    render(panelData) {
        const data = panelData?.data || {};
        const sessionsData = data.data || {};
        const sessions = sessionsData.sessions || [];
        const filter = sessionsData.filter || 'all';

        const filteredSessions = this.filterSessions(sessions, filter);

        return `
      <div class="sessions-panel-content">
        <div class="sessions-filter">
          <select id="sessionFilter" class="filter-select">
            <option value="all" ${filter === 'all' ? 'selected' : ''}>All</option>
            <option value="active" ${filter === 'active' ? 'selected' : ''}>Active</option>
            <option value="waiting" ${filter === 'waiting' ? 'selected' : ''}>Waiting</option>
            <option value="completed" ${filter === 'completed' ? 'selected' : ''}>Completed</option>
          </select>
        </div>
        
        <div class="sessions-list" id="sessionsList">
          ${filteredSessions.length === 0
            ? '<div class="empty">No sessions</div>'
            : filteredSessions.map(s => this.renderSessionItem(s)).join('')}
        </div>
        
        <div class="sessions-footer">
          <button class="btn-new-session" id="newSessionBtn">+ New Session</button>
        </div>
      </div>
    `;
    },

    renderSessionItem(session) {
        const preview = session.messages?.[session.messages.length - 1]?.contentText?.slice(0, 40) || 'New session';
        const date = session.createdAt ? new Date(session.createdAt).toLocaleString() : '';

        return `
      <div class="session-item" data-id="${session.id}">
        <div class="session-preview">${this.escape(preview)}</div>
        <div class="session-meta">
          <span class="session-status status-${session.status || 'active'}">${session.status || 'active'}</span>
          <span class="session-date">${date}</span>
        </div>
      </div>
    `;
    },

    filterSessions(sessions, filter) {
        if (filter === 'all') return sessions;
        return sessions.filter(s => (s.status || 'active') === filter);
    },

    setupEvents(panelId, projectId) {
        // Filter change
        const filterSelect = document.getElementById('sessionFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.updateFilter(panelId, e.target.value);
            });
        }

        // New session button
        const newBtn = document.getElementById('newSessionBtn');
        if (newBtn) {
            newBtn.addEventListener('click', () => {
                this.createSession(projectId);
            });
        }

        // Session click
        const sessionItems = document.querySelectorAll('.session-item');
        sessionItems.forEach(item => {
            item.addEventListener('click', () => {
                const sessionId = item.dataset.id;
                this.openSession(sessionId);
            });
        });
    },

    async loadSessions(projectId) {
        if (!projectId) return [];

        try {
            const res = await fetch(`${this.api}/sessions?projectId=${projectId}`);
            const text = await res.text();
            const data = text ? JSON.parse(text) : {};
            return data.success ? data.data : [];
        } catch (err) {
            console.error('Failed to load sessions:', err);
            return [];
        }
    },

    async createSession(projectId) {
        if (!projectId) return;

        try {
            const res = await fetch(`${this.api}/sessions`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({projectId}),
            });
            const data = await res.json();
            if (data.success) {
                // Trigger refresh
                window.dispatchEvent(new CustomEvent('session-created', {detail: data.data}));
            }
        } catch (err) {
            console.error('Failed to create session:', err);
        }
    },

    openSession(sessionId) {
        window.dispatchEvent(new CustomEvent('session-open', {detail: sessionId}));
    },

    updateFilter(panelId, filterValue) {
        if (window.PanelManager) {
            const panel = window.PanelManager.getPanel(panelId);
            if (panel) {
                panel.data.data.filter = filterValue;
                // Re-render would happen here
            }
        }
    },

    escape(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
};

window.SessionsPanel = SessionsPanel;
