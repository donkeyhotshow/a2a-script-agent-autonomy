/**
 * UI Components for Unified JSON
 *
 * Provides UI components for working with UnifiedResponse:
 * - SearchBar with debounce
 * - ActionCardsList for displaying proposed actions
 * - TicketPanel for action details
 * - PropertiesPanel for context/metadata
 */

// ============================================
// Utility: Debounce
// ============================================

/**
 * Creates a debounced function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// SearchBar
// ============================================

/**
 * SearchBar - Search through actions/proposals
 */
class SearchBar {
    /**
     * @param {Object} options - Options
     * @param {string} options.placeholder - Placeholder text
     * @param {number} options.debounceMs - Debounce delay in ms
     * @param {Function} options.onSearch - Search callback
     */
    constructor(options = {}) {
        this.placeholder = options.placeholder || 'Search actions...';
        this.debounceMs = options.debounceMs || 300;
        this.onSearch = options.onSearch || (() => {
        });

        this.input = null;
        this.container = null;
        this._boundHandleInput = null;
    }

    /**
     * Render the search bar
     * @returns {HTMLElement} Search bar container
     */
    render() {
        this.container = document.createElement('div');
        this.container.className = 'json-search-bar';
        this.container.innerHTML = `
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          class="search-input" 
          placeholder="${this.placeholder}"
        >
        <button class="search-clear" style="display: none;">×</button>
      </div>
    `;

        this.input = this.container.querySelector('.search-input');
        this.clearBtn = this.container.querySelector('.search-clear');

        // Set up debounced search
        this._boundHandleInput = debounce((value) => {
            this.onSearch(value);
        }, this.debounceMs);

        this.input.addEventListener('input', (e) => {
            const value = e.target.value;
            this.clearBtn.style.display = value ? 'block' : 'none';
            this._boundHandleInput(value);
        });

        this.clearBtn.addEventListener('click', () => {
            this.input.value = '';
            this.clearBtn.style.display = 'none';
            this.onSearch('');
        });

        return this.container;
    }

    /**
     * Set search value programmatically
     * @param {string} value - Search value
     */
    setValue(value) {
        if (this.input) {
            this.input.value = value;
            this.clearBtn.style.display = value ? 'block' : 'none';
        }
    }

    /**
     * Get current search value
     * @returns {string} Current search value
     */
    getValue() {
        return this.input ? this.input.value : '';
    }

    /**
     * Focus the search input
     */
    focus() {
        if (this.input) {
            this.input.focus();
        }
    }

    /**
     * Clear the search
     */
    clear() {
        this.setValue('');
        this.onSearch('');
    }

    /**
     * Destroy the component
     */
    destroy() {
        if (this.input) {
            this.input.removeEventListener('input', this._boundHandleInput);
        }
        if (this.clearBtn) {
            this.clearBtn.removeEventListener('click', () => {
                this.input.value = '';
                this.clearBtn.style.display = 'none';
                this.onSearch('');
            });
        }
    }
}

// ============================================
// ActionCardsList
// ============================================

/**
 * ActionCardsList - Display list of proposed actions
 */
class ActionCardsList {
    /**
     * @param {Object} options - Options
     * @param {Function} options.onSelect - Selection callback
     * @param {Function} options.onAction - Action button callback
     */
    constructor(options = {}) {
        this.onSelect = options.onSelect || (() => {
        });
        this.onAction = options.onAction || (() => {
        });
        this.actions = [];
        this.selectedId = null;

        this.container = null;
        this.listElement = null;
    }

    /**
     * Set actions to display
     * @param {Array} actions - Array of Action objects
     */
    setActions(actions) {
        this.actions = actions || [];
        this.render();
    }

    /**
     * Add a single action
     * @param {Object} action - Action object
     */
    addAction(action) {
        this.actions.push(action);
        this.render();
    }

    /**
     * Filter actions by search query
     * @param {string} query - Search query
     */
    filter(query) {
        if (!query) {
            this.render();
            return;
        }

        const lowerQuery = query.toLowerCase();
        const filtered = this.actions.filter(action =>
            (action.name && action.name.toLowerCase().includes(lowerQuery)) ||
            (action.description && action.description.toLowerCase().includes(lowerQuery)) ||
            (action.id && action.id.toLowerCase().includes(lowerQuery))
        );

        this._renderList(filtered);
    }

    /**
     * Select an action by ID
     * @param {string} id - Action ID
     */
    selectAction(id) {
        this.selectedId = id;
        this.render();
        this.onSelect(id);
    }

    /**
     * Render the component
     * @returns {HTMLElement} Container element
     */
    render() {
        this.container = document.createElement('div');
        this.container.className = 'json-action-cards-list';

        if (this.actions.length === 0) {
            this.container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📋</span>
          <p>No actions proposed</p>
        </div>
      `;
            return this.container;
        }

        this._renderList(this.actions);
        return this.container;
    }

    /**
     * Render list of actions
     * @param {Array} actions - Actions to render
     * @private
     */
    _renderList(actions) {
        this.container = document.createElement('div');
        this.container.className = 'json-action-cards-list';

        if (actions.length === 0) {
            this.container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <p>No matching actions</p>
        </div>
      `;
            return;
        }

        this.listElement = document.createElement('div');
        this.listElement.className = 'action-cards';

        actions.forEach(action => {
            const card = this._createCard(action);
            this.listElement.appendChild(card);
        });

        this.container.appendChild(this.listElement);
    }

    /**
     * Create a single action card
     * @param {Object} action - Action object
     * @returns {HTMLElement} Card element
     * @private
     */
    _createCard(action) {
        const card = document.createElement('div');
        const isSelected = action.id === this.selectedId;
        const priorityClass = action.priority ? `priority-${Math.min(action.priority, 3)}` : '';

        card.className = `action-card ${isSelected ? 'selected' : ''} ${priorityClass}`;
        card.dataset.actionId = action.id;

        const priorityBadge = action.priority
            ? `<span class="priority-badge">P${action.priority}</span>`
            : '';

        card.innerHTML = `
      <div class="action-card-header">
        <span class="action-icon">⚡</span>
        <span class="action-name">${action.name || 'Unknown Action'}</span>
        ${priorityBadge}
      </div>
      ${action.description ? `<p class="action-description">${action.description}</p>` : ''}
      <div class="action-card-footer">
        <span class="action-id">${action.id || ''}</span>
      </div>
    `;

        card.addEventListener('click', () => {
            this.selectAction(action.id);
        });

        return card;
    }

    /**
     * Get selected action
     * @returns {Object|null} Selected action
     */
    getSelected() {
        if (!this.selectedId) return null;
        return this.actions.find(a => a.id === this.selectedId) || null;
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedId = null;
        this.render();
    }

    /**
     * Destroy the component
     */
    destroy() {
        if (this.container) {
            this.container.remove();
        }
    }
}

// ============================================
// TicketPanel
// ============================================

/**
 * TicketPanel - Display action details (input/output, description)
 */
class TicketPanel {
    /**
     * @param {Object} options - Options
     * @param {Function} options.onClose - Close callback
     * @param {Function} options.onExecute - Execute callback
     */
    constructor(options = {}) {
        this.onClose = options.onClose || (() => {
        });
        this.onExecute = options.onExecute || (() => {
        });

        this.action = null;
        this.container = null;
    }

    /**
     * Set the action to display
     * @param {Object} action - Action object
     */
    setAction(action) {
        this.action = action;
        this.render();
    }

    /**
     * Clear the panel
     */
    clear() {
        this.action = null;
        if (this.container) {
            this.container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📝</span>
          <p>Select an action to view details</p>
        </div>
      `;
        }
    }

    /**
     * Render the component
     * @returns {HTMLElement} Container element
     */
    render() {
        this.container = document.createElement('div');
        this.container.className = 'json-ticket-panel';

        if (!this.action) {
            this.container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📝</span>
          <p>Select an action to view details</p>
        </div>
      `;
            return this.container;
        }

        this._renderContent();
        return this.container;
    }

    /**
     * Render action content
     * @private
     */
    _renderContent() {
        const {action} = this;

        // Format DSL if present
        let dslContent = '';
        if (action.dsl) {
            dslContent = `
        <div class="ticket-section">
          <h4>DSL Configuration</h4>
          <pre class="code-block">${JSON.stringify(action.dsl, null, 2)}</pre>
        </div>
      `;
        } else if (action.dslScript) {
            dslContent = `
        <div class="ticket-section">
          <h4>DSL Script</h4>
          <pre class="code-block">${action.dslScript}</pre>
        </div>
      `;
        }

        this.container.innerHTML = `
      <div class="ticket-header">
        <div class="ticket-title">
          <span class="ticket-icon">⚡</span>
          <h3>${action.name || 'Unknown Action'}</h3>
        </div>
        <button class="ticket-close">×</button>
      </div>
      
      <div class="ticket-body">
        ${action.description ? `
          <div class="ticket-section">
            <h4>Description</h4>
            <p class="description">${action.description}</p>
          </div>
        ` : ''}
        
        <div class="ticket-section">
          <h4>Action ID</h4>
          <code class="action-id">${action.id || 'N/A'}</code>
        </div>
        
        ${action.priority !== undefined ? `
          <div class="ticket-section">
            <h4>Priority</h4>
            <span class="priority-badge priority-${Math.min(action.priority, 3)}">P${action.priority}</span>
          </div>
        ` : ''}
        
        ${dslContent}
      </div>
      
      <div class="ticket-footer">
        <button class="btn btn-secondary ticket-cancel">Cancel</button>
        <button class="btn btn-primary ticket-execute">Execute</button>
      </div>
    `;

        // Bind events
        this.container.querySelector('.ticket-close').addEventListener('click', () => {
            this.onClose();
        });

        this.container.querySelector('.ticket-cancel').addEventListener('click', () => {
            this.onClose();
        });

        this.container.querySelector('.ticket-execute').addEventListener('click', () => {
            this.onExecute(this.action);
        });
    }

    /**
     * Update action status
     * @param {string} status - Status text
     * @param {number} progress - Progress percentage
     */
    updateStatus(status, progress = 0) {
        if (!this.container) return;

        const footer = this.container.querySelector('.ticket-footer');
        if (footer) {
            const progressBar = document.createElement('div');
            progressBar.className = 'ticket-progress';
            progressBar.innerHTML = `
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <span class="progress-text">${status}</span>
      `;

            const executeBtn = footer.querySelector('.ticket-execute');
            if (executeBtn) {
                executeBtn.disabled = true;
                executeBtn.textContent = 'Executing...';
            }

            footer.insertBefore(progressBar, footer.firstChild);
        }
    }

    /**
     * Show completion
     * @param {Object} result - Action result
     */
    showComplete(result) {
        if (!this.container) return;

        const body = this.container.querySelector('.ticket-body');
        if (body && result) {
            const completionSection = document.createElement('div');
            completionSection.className = 'ticket-section completion';
            completionSection.innerHTML = `
        <h4>✅ Completed</h4>
        ${result.summary ? `<p>${result.summary}</p>` : ''}
        ${result.executionTimeMs ? `<span class="execution-time">⏱ ${result.executionTimeMs}ms</span>` : ''}
      `;
            body.appendChild(completionSection);
        }

        const footer = this.container.querySelector('.ticket-footer');
        if (footer) {
            footer.innerHTML = `
        <button class="btn btn-secondary ticket-close">Close</button>
      `;
            footer.querySelector('.ticket-close').addEventListener('click', () => {
                this.onClose();
            });
        }
    }

    /**
     * Show error
     * @param {Object} error - Error object
     */
    showError(error) {
        if (!this.container) return;

        const body = this.container.querySelector('.ticket-body');
        if (body && error) {
            const errorSection = document.createElement('div');
            errorSection.className = 'ticket-section error';
            errorSection.innerHTML = `
        <h4>❌ Error</h4>
        <p>${error.message || 'Unknown error'}</p>
        ${error.code ? `<code class="error-code">${error.code}</code>` : ''}
        ${error.canRetry ? '<p class="retry-hint">You can retry this action</p>' : ''}
      `;
            body.appendChild(errorSection);
        }

        const footer = this.container.querySelector('.ticket-footer');
        if (footer) {
            const executeBtn = footer.querySelector('.ticket-execute');
            if (executeBtn) {
                executeBtn.disabled = false;
                executeBtn.textContent = 'Retry';
            }
        }
    }

    /**
     * Destroy the component
     */
    destroy() {
        if (this.container) {
            this.container.remove();
        }
    }
}

// ============================================
// PropertiesPanel
// ============================================

/**
 * PropertiesPanel - Display context and metadata
 */
class PropertiesPanel {
    /**
     * @param {Object} options - Options
     * @param {string} options.title - Panel title
     */
    constructor(options = {}) {
        this.title = options.title || 'Properties';
        this.context = null;
        this.metadata = {};
        this.container = null;
    }

    /**
     * Set context data
     * @param {Object} context - Context block
     */
    setContext(context) {
        this.context = context;
        this.render();
    }

    /**
     * Set metadata
     * @param {Object} metadata - Metadata key-value pairs
     */
    setMetadata(metadata) {
        this.metadata = metadata || {};
        this.render();
    }

    /**
     * Add a metadata entry
     * @param {string} key - Property key
     * @param {*} value - Property value
     */
    addProperty(key, value) {
        this.metadata[key] = value;
        this.render();
    }

    /**
     * Clear all properties
     */
    clear() {
        this.context = null;
        this.metadata = {};
        this.render();
    }

    /**
     * Render the component
     * @returns {HTMLElement} Container element
     */
    render() {
        this.container = document.createElement('div');
        this.container.className = 'json-properties-panel';

        this.container.innerHTML = `
      <div class="panel-header">
        <h3>${this.title}</h3>
      </div>
      <div class="panel-body">
        ${this._renderContext()}
        ${this._renderMetadata()}
      </div>
    `;

        return this.container;
    }

    /**
     * Render context section
     * @returns {string} HTML string
     * @private
     */
    _renderContext() {
        if (!this.context) {
            return `
        <div class="properties-section">
          <div class="empty-state small">
            <p>No context available</p>
          </div>
        </div>
      `;
        }

        let content = `
      <div class="properties-section">
        <h4>📋 Context</h4>
    `;

        if (this.context.session_id) {
            content += `<div class="property"><span class="label">Session:</span><code>${this.context.session_id}</code></div>`;
        }

        if (this.context.version) {
            content += `<div class="property"><span class="label">Version:</span><span>${this.context.version}</span></div>`;
        }

        if (this.context.new_task && this.context.new_task.length > 0) {
            content += `<div class="property"><span class="label">Tasks:</span><span>${this.context.new_task.length}</span></div>`;
            content += '<ul class="task-list">';
            this.context.new_task.forEach(task => {
                content += `<li>${task}</li>`;
            });
            content += '</ul>';
        }

        if (this.context.architectural_features && this.context.architectural_features.length > 0) {
            content += `<div class="property"><span class="label">Features:</span></div>`;
            content += '<ul class="feature-list">';
            this.context.architectural_features.forEach(feature => {
                content += `<li>${feature}</li>`;
            });
            content += '</ul>';
        }

        if (this.context.tasks && this.context.tasks.length > 0) {
            content += `<div class="property"><span class="label">Active Tasks:</span></div>`;
            content += '<ul class="task-list">';
            this.context.tasks.forEach(task => {
                content += `<li>${task.type} - ${task.status}</li>`;
            });
            content += '</ul>';
        }

        content += '</div>';
        return content;
    }

    /**
     * Render metadata section
     * @returns {string} HTML string
     * @private
     */
    _renderMetadata() {
        const keys = Object.keys(this.metadata);
        if (keys.length === 0) return '';

        let content = `
      <div class="properties-section">
        <h4>📊 Metadata</h4>
    `;

        keys.forEach(key => {
            const value = this.metadata[key];
            const displayValue = typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);

            content += `
        <div class="property">
          <span class="label">${key}:</span>
          <span class="value">${displayValue}</span>
        </div>
      `;
        });

        content += '</div>';
        return content;
    }

    /**
     * Destroy the component
     */
    destroy() {
        if (this.container) {
            this.container.remove();
        }
    }
}

// ============================================
// UnifiedJSONManager
// ============================================

/**
 * UnifiedJSONManager - Main manager for Unified JSON UI
 * Combines all components and handles data flow
 */
class UnifiedJSONManager {
    /**
     * @param {Object} options - Options
     * @param {string} options.containerId - Container element ID
     */
    constructor(options = {}) {
        this.containerId = options.containerId || 'json-ui';
        this.container = document.getElementById(this.containerId);

        // State
        this.currentResponse = null;
        this.proposedActions = [];
        this.selectedAction = null;
        this.currentContext = null;

        // Components
        this.searchBar = null;
        this.actionCardsList = null;
        this.ticketPanel = null;
        this.propertiesPanel = null;

        // Callbacks
        this.onActionSelect = options.onActionSelect || (() => {
        });
        this.onActionExecute = options.onActionExecute || (() => {
        });

        if (this.container) {
            this.init();
        }
    }

    /**
     * Initialize the manager
     */
    init() {
        this.container.innerHTML = '';
        this.container.className = 'json-ui';

        // Create layout
        this._createLayout();

        // Initialize components
        this._initSearchBar();
        this._initActionCardsList();
        this._initTicketPanel();
        this._initPropertiesPanel();

        this._bindEvents();
    }

    /**
     * Create the layout structure
     * @private
     */
    _createLayout() {
        this.container.innerHTML = `
      <div class="json-ui-layout">
        <div class="json-ui-left">
          <div class="search-container"></div>
          <div class="actions-container"></div>
        </div>
        <div class="json-ui-center">
          <div class="ticket-container"></div>
        </div>
        <div class="json-ui-right">
          <div class="properties-container"></div>
        </div>
      </div>
    `;
    }

    /**
     * Initialize search bar
     * @private
     */
    _initSearchBar() {
        const container = this.container.querySelector('.search-container');
        this.searchBar = new SearchBar({
            placeholder: 'Search actions...',
            debounceMs: 300,
            onSearch: (query) => {
                this.actionCardsList.filter(query);
            }
        });
        container.appendChild(this.searchBar.render());
    }

    /**
     * Initialize action cards list
     * @private
     */
    _initActionCardsList() {
        const container = this.container.querySelector('.actions-container');
        this.actionCardsList = new ActionCardsList({
            onSelect: (id) => {
                const action = this.proposedActions.find(a => a.id === id);
                this.selectedAction = action;
                this.ticketPanel.setAction(action);
                this.onActionSelect(action);
            }
        });
        container.appendChild(this.actionCardsList.render());
    }

    /**
     * Initialize ticket panel
     * @private
     */
    _initTicketPanel() {
        const container = this.container.querySelector('.ticket-container');
        this.ticketPanel = new TicketPanel({
            onClose: () => {
                this.selectedAction = null;
                this.actionCardsList.clearSelection();
                this.ticketPanel.clear();
            },
            onExecute: (action) => {
                this.onActionExecute(action);
            }
        });
        container.appendChild(this.ticketPanel.render());
    }

    /**
     * Initialize properties panel
     * @private
     */
    _initPropertiesPanel() {
        const container = this.container.querySelector('.properties-container');
        this.propertiesPanel = new PropertiesPanel({
            title: 'Context & Properties'
        });
        container.appendChild(this.propertiesPanel.render());
    }

    /**
     * Bind internal events
     * @private
     */
    _bindEvents() {
        // Override action select to update properties
        const originalSelect = this.actionCardsList.onSelect;
        this.actionCardsList.onSelect = (id) => {
            const action = this.proposedActions.find(a => a.id === id);
            if (action) {
                // Update properties panel with action details
                this.propertiesPanel.setMetadata({
                    'Action ID': action.id,
                    'Name': action.name,
                    'Priority': action.priority || 'N/A',
                    'Has DSL': action.dsl ? 'Yes' : 'No'
                });
            }
            originalSelect(id);
        };
    }

    /**
     * Process a UnifiedResponse
     * @param {Object} response - UnifiedResponse object
     */
    processResponse(response) {
        this.currentResponse = response;

        // Extract context and actions based on response type
        if (response.type === 'action_proposal') {
            this.proposedActions = response.result?.proposedActions || [];
            this.currentContext = response.result?.context || null;

            // Update components
            this.actionCardsList.setActions(this.proposedActions);
            this.propertiesPanel.setContext(this.currentContext);

        } else if (response.type === 'action_executing') {
            this.ticketPanel.updateStatus('Executing...', 10);

        } else if (response.type === 'action_progress') {
            const progress = response.result?.currentStep?.progress || 0;
            this.ticketPanel.updateStatus('In Progress', progress);

        } else if (response.type === 'action_completed') {
            this.ticketPanel.showComplete(response.result);

        } else if (response.type === 'action_error') {
            this.ticketPanel.showError(response.result?.error);
        }
    }

    /**
     * Clear all data
     */
    clear() {
        this.currentResponse = null;
        this.proposedActions = [];
        this.selectedAction = null;
        this.currentContext = null;

        this.actionCardsList.setActions([]);
        this.ticketPanel.clear();
        this.propertiesPanel.clear();
        this.searchBar.clear();
    }

    /**
     * Destroy the manager
     */
    destroy() {
        if (this.searchBar) this.searchBar.destroy();
        if (this.actionCardsList) this.actionCardsList.destroy();
        if (this.ticketPanel) this.ticketPanel.destroy();
        if (this.propertiesPanel) this.propertiesPanel.destroy();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// ============================================
// Export
// ============================================

// Export all components
if (typeof window !== 'undefined') {
    window.UnifiedJSON = {
        SearchBar,
        ActionCardsList,
        TicketPanel,
        PropertiesPanel,
        UnifiedJSONManager,
        debounce
    };
}

// Export for ES modules
export {
    SearchBar,
    ActionCardsList,
    TicketPanel,
    PropertiesPanel,
    UnifiedJSONManager,
    debounce
};
