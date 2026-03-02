/**
 * App Initialization Module
 * Initializes all components and sets up the application
 */

class App {
    constructor() {
        this.initialized = false;
        this.config = {
            serverUrl: 'http://localhost:8080/api/v1',
            useSSE: true,
            theme: 'dark'
        };
    }

    async init(options = {}) {
        console.log('[App] Initializing...');

        this.config = {...this.config, ...options};

        try {
            await this._initComponents();
            this._setupEventHandlers();
            this._setupUI();
            await this._loadInitialData();

            this.initialized = true;
            console.log('[App] Initialized successfully');

            return this;
        } catch (error) {
            console.error('[App] Initialization error:', error);
            throw error;
        }
    }

    async _initComponents() {
        const uiManager = window.uiManager;
        const actionsManager = window.actionsManager;
        const apiIntegration = window.apiIntegration;

        if (uiManager) uiManager.init('#app');
        if (actionsManager && actionsManager.init) await actionsManager.init();
        if (apiIntegration && apiIntegration.configure) {
            apiIntegration.configure({
                serverUrl: this.config.serverUrl,
                useSSE: this.config.useSSE
            });
        }
    }

    _setupEventHandlers() {
        const appState = window.appState;
        const apiIntegration = window.apiIntegration;
        const actionsManager = window.actionsManager;

        if (appState && appState.on) {
            appState.on('nodes', ({value}) => {
                this._onNodesChange(value);
            });

            appState.on('sessionId', ({value}) => {
                this._onSessionChange(value);
            });

            appState.on('sseConnected', ({value}) => {
                this._onConnectionChange(value);
            });
        }

        if (apiIntegration && apiIntegration.on) {
            apiIntegration.on('taskSent', (data) => {
                this._onTaskSent(data);
            });

            apiIntegration.on('actionProposal', (data) => {
                this._onActionProposal(data);
            });

            apiIntegration.on('taskComplete', (data) => {
                this._onTaskComplete(data);
            });

            apiIntegration.on('error', (data) => {
                this._onError(data);
            });
        }

        if (actionsManager && actionsManager.on) {
            actionsManager.on('proposalsUpdated', (proposals) => {
                this._onProposalsUpdated(proposals);
            });
        }
    }

    _setupUI() {
        this._setupSearch();
        this._setupToolbar();
        this._setupPanels();
        this._setupModals();
    }

    _setupSearch() {
        const searchInput = document.getElementById('globalSearchInput');
        const searchResults = document.getElementById('searchResults');
        const searchCategoryFilter = document.getElementById('searchCategoryFilter');

        if (!searchInput) return;

        let debounceTimer;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const query = e.target.value;
                const category = searchCategoryFilter?.value || null;

                this._performSearch(query, category);
            }, 300);
        });

        searchCategoryFilter?.addEventListener('change', () => {
            const query = searchInput.value;
            this._performSearch(query, searchCategoryFilter.value);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value;
                if (query) {
                    this._executeSearch(query);
                }
            }
        });
    }

    _performSearch(query, category = null) {
        const searchResults = document.getElementById('searchResults');
        const actionsManager = window.actionsManager;

        if (!searchResults) return;

        let results = [];
        if (actionsManager && actionsManager.search) {
            results = actionsManager.search(query, {category});
        }

        if (results.length === 0 && query) {
            searchResults.innerHTML = this._getAISuggestionHTML(query);
        } else if (results.length === 0) {
            searchResults.innerHTML = this._getEmptyResultsHTML();
        } else {
            searchResults.innerHTML = '';
            for (const action of results.slice(0, 10)) {
                const card = document.createElement('div');
                card.className = 'action-card';
                card.innerHTML = `
          <div class="action-card-header">
            <span class="action-card-icon">${action.icon || '📋'}</span>
            <span class="action-card-name">${action.name}</span>
          </div>
          <div class="action-card-description">${action.description || ''}</div>
        `;
                searchResults.appendChild(card);
            }

            const countEl = document.getElementById('searchResultsCount');
            if (countEl) {
                countEl.textContent = `Found: ${results.length}`;
            }
        }

        const appState = window.appState;
        if (appState && appState.set) {
            appState.set('ui.searchQuery', query);
            appState.set('ui.searchFilter', category);
        }
    }

    _executeSearch(query) {
        const apiIntegration = window.apiIntegration;
        console.log('[App] Execute search:', query);

        if (apiIntegration && apiIntegration.sendTask) {
            apiIntegration.sendTask(query).catch(err => {
                console.error('[App] Search error:', err);
            });
        }
    }

    _getAISuggestionHTML(query) {
        return `
      <div class="ai-suggestion">
        <div class="ai-icon">🤖</div>
        <div class="ai-title">AI Agent</div>
        <div class="ai-description">
          No actions found for "${query}".
          AI agent will find the optimal solution.
        </div>
        <button class="ai-execute-btn" data-query="${query}">
          Run AI
        </button>
      </div>
    `;
    }

    _getEmptyResultsHTML() {
        return `
      <div class="search-empty">
        <span class="empty-icon">🔍</span>
        <p>Enter a query to search for actions</p>
      </div>
    `;
    }

    _setupToolbar() {
        document.getElementById('flowZoomIn')?.addEventListener('click', () => {
            window.flowManager?.zoomIn?.();
        });

        document.getElementById('flowZoomOut')?.addEventListener('click', () => {
            window.flowManager?.zoomOut?.();
        });

        document.getElementById('flowFitView')?.addEventListener('click', () => {
            window.flowManager?.fitView?.();
        });

        document.getElementById('flowClear')?.addEventListener('click', () => {
            window.flowManager?.clear?.();
        });

        document.getElementById('flowLoadSimple')?.addEventListener('click', () => {
            window.loadDemo?.('simple');
        });

        document.getElementById('flowLoadWorkflow')?.addEventListener('click', () => {
            window.loadDemo?.('workflow');
        });

        document.getElementById('flowLoadAgents')?.addEventListener('click', () => {
            window.loadDemo?.('agents');
        });

        document.getElementById('connectBtn')?.addEventListener('click', () => {
            this._showConnectModal();
        });

        document.getElementById('newTaskBtn')?.addEventListener('click', () => {
            this._showTaskModal();
        });
    }

    _setupPanels() {
        document.getElementById('panelSessions')?.addEventListener('click', () => {
            const appState = window.appState;
            if (appState && appState.set) appState.set('ui.activePanel', 'sessions');
        });

        document.getElementById('panelActions')?.addEventListener('click', () => {
            const appState = window.appState;
            if (appState && appState.set) appState.set('ui.activePanel', 'actions');
        });

        document.getElementById('panelProjects')?.addEventListener('click', () => {
            const appState = window.appState;
            if (appState && appState.set) appState.set('ui.activePanel', 'projects');
        });
    }

    _setupModals() {
        const taskModal = document.getElementById('taskModal');

        document.getElementById('closeTaskModal')?.addEventListener('click', () => {
            if (taskModal) taskModal.style.display = 'none';
        });

        document.getElementById('cancelTask')?.addEventListener('click', () => {
            if (taskModal) taskModal.style.display = 'none';
        });

        document.getElementById('submitTask')?.addEventListener('click', () => {
            this._submitTask();
        });

        taskModal?.addEventListener('click', (e) => {
            if (e.target === taskModal) {
                taskModal.style.display = 'none';
            }
        });
    }

    _showConnectModal() {
        const sessionId = prompt('Enter session ID:');
        if (sessionId) {
            const apiIntegration = window.apiIntegration;
            if (apiIntegration && apiIntegration.connectSSE) {
                apiIntegration.connectSSE(sessionId);
            }
        }
    }

    _showTaskModal() {
        const taskModal = document.getElementById('taskModal');
        if (taskModal) {
            taskModal.style.display = 'flex';
            document.getElementById('taskInput')?.focus();
        }
    }

    async _submitTask() {
        const taskInput = document.getElementById('taskInput');
        const useSSE = document.getElementById('useSSE')?.checked ?? true;

        const taskText = taskInput?.value?.trim();
        if (!taskText) {
            console.warn('[App] Please enter a task');
            return;
        }

        const apiIntegration = window.apiIntegration;
        if (apiIntegration && apiIntegration.sendTask) {
            try {
                await apiIntegration.sendTask(taskText, {useSSE});

                const taskModal = document.getElementById('taskModal');
                if (taskModal) taskModal.style.display = 'none';
                if (taskInput) taskInput.value = '';

                console.log('[App] Task submitted');
            } catch (error) {
                console.error('[App] Task error:', error);
            }
        }
    }

    async _loadInitialData() {
        const appState = window.appState;
        const apiIntegration = window.apiIntegration;
        const actionsManager = window.actionsManager;

        if (appState && appState.get && apiIntegration && apiIntegration.getSessions) {
            const connected = appState.get('connected');
            if (connected) {
                try {
                    const sessions = await apiIntegration.getSessions();
                    appState.set('sessions', sessions);
                } catch (e) {
                    console.warn('[App] Failed to load sessions:', e);
                }
            }
        }

        if (actionsManager && actionsManager.search) {
            const defaultActions = actionsManager.search('', {limit: 10});
            if (appState && appState.set) {
                appState.set('actions', defaultActions);
            }
        }
    }

    _onActionSelect(action) {
        console.log('[App] Action selected:', action.id);
        const appState = window.appState;
        if (appState && appState.set) appState.set('currentAction', action);
    }

    _onActionExecute(action) {
        console.log('[App] Executing action:', action.id);
        const actionsManager = window.actionsManager;
        if (actionsManager && actionsManager.incrementUsage) {
            actionsManager.incrementUsage(action.id);
        }
    }

    _onNodesChange(nodes) {
        if (window.flowManager) {
            window.flowManager.currentFlow.nodes = nodes;
            if (window.flowManager.render) window.flowManager.render();
        }
    }

    _onSessionChange(sessionId) {
        console.log('[App] Session changed:', sessionId);

        if (sessionId) {
            const url = new URL(window.location.href);
            url.searchParams.set('session', sessionId);
            window.history.replaceState({}, '', url);
        }
    }

    _onConnectionChange(connected) {
        const statusEl = document.getElementById('sseStatus');
        if (!statusEl) return;

        if (connected) {
            statusEl.className = 'sse-status connected';
            const textEl = statusEl.querySelector('.status-text');
            if (textEl) textEl.textContent = 'Connected';
        } else {
            statusEl.className = 'sse-status disconnected';
            const textEl = statusEl.querySelector('.status-text');
            if (textEl) textEl.textContent = 'Disconnected';
        }
    }

    _onTaskSent(data) {
        console.log('[App] Task sent:', data);
    }

    _onActionProposal(data) {
        console.log('[App] Action proposal:', data);
    }

    _onTaskComplete(data) {
        console.log('[App] Task complete:', data);
    }

    _onError(data) {
        console.error('[App] Error:', data);
    }

    _onProposalsUpdated(proposals) {
        console.log('[App] Proposals updated:', proposals.length);

        const countEl = document.getElementById('proposalsCount');
        if (countEl) {
            countEl.textContent = proposals.length;
        }
    }

    getApp() {
        return this;
    }
}

const app = new App();

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[App] DOM Ready, initializing...');

    try {
        await app.init({
            serverUrl: 'http://localhost:8080/api/v1',
            useSSE: true
        });

        console.log('[App] Ready!');
    } catch (error) {
        console.error('[App] Failed to initialize:', error);
    }
});

if (typeof window !== 'undefined') {
    window.App = App;
    window.app = app;
}
