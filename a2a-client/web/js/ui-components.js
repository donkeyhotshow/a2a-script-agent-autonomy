/**
 * UI Components - Reusable UI components for A2A Client
 * Provides action cards, search, panels, and other UI elements
 */

class UIManager {
  constructor() {
    this.components = new Map();
    this.container = null;
  }

  /**
   * Initialize UI manager
   */
  init(containerSelector = '#app') {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      console.error('[UI] Container not found:', containerSelector);
      return;
    }
    
    console.log('[UI] Initialized');
    return this;
  }

  /**
   * Create search bar component
   */
  createSearchBar(options = {}) {
    const {
      placeholder = 'Поиск действий...',
      onSearch = () => {},
      showFilters = true
    } = options;

    const searchBar = document.createElement('div');
    searchBar.className = 'search-bar';
    searchBar.innerHTML = `
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          class="search-input" 
          placeholder="${placeholder}"
          id="globalSearchInput"
        >
        <button class="search-clear" style="display: none;">×</button>
      </div>
      ${showFilters ? `
        <select class="search-filter" id="searchCategoryFilter">
          <option value="">Все категории</option>
          ${this._getCategoryOptions()}
        </select>
      ` : ''}
      <div class="search-results-count" id="searchResultsCount"></div>
    `;

    // Setup event listeners
    const input = searchBar.querySelector('.search-input');
    const clearBtn = searchBar.querySelector('.search-clear');
    const filter = searchBar.querySelector('.search-filter');

    let debounceTimer;
    input?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = e.target.value;
        const category = filter?.value || null;
        
        clearBtn.style.display = query ? 'block' : 'none';
        
        onSearch(query, { category });
      }, 300);
    });

    clearBtn?.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      onSearch('', {});
    });

    filter?.addEventListener('change', () => {
      onSearch(input.value, { category: filter.value });
    });

    return searchBar;
  }

  /**
   * Get category options
   */
  _getCategoryOptions() {
    const categories = [
      { name: 'file', icon: '📁' },
      { name: 'script', icon: '⚡' },
      { name: 'search', icon: '🔍' },
      { name: 'analysis', icon: '📊' },
      { name: 'generate', icon: '🪄' },
      { name: 'git', icon: '📦' },
      { name: 'docker', icon: '🐳' },
      { name: 'project', icon: '📂' }
    ];

    return categories.map(cat => 
      `<option value="${cat.name}">${cat.icon} ${cat.name}</option>`
    ).join('');
  }

  /**
   * Create action card
   */
  createActionCard(action) {
    const card = document.createElement('div');
    card.className = 'action-card';
    card.dataset.actionId = action.id;

    card.innerHTML = `
      <div class="action-card-header">
        <span class="action-card-icon">${action.icon || '📋'}</span>
        <span class="action-card-name">${action.name}</span>
      </div>
      <div class="action-card-description">${action.description || ''}</div>
      <div class="action-card-tags">
        ${(action.tags || []).slice(0, 3).map(tag => 
          `<span class="action-tag">${tag}</span>`
        ).join('')}
      </div>
    `;

    card.addEventListener('click', () => {
      card.dispatchEvent(new CustomEvent('actionSelect', { 
        detail: action,
        bubbles: true 
      }));
    });

    return card;
  }

  /**
   * Create node element
   */
  createNodeElement(node) {
    const nodeEl = document.createElement('div');
    nodeEl.className = `flow-node node-${node.type || 'default'}`;
    nodeEl.dataset.nodeId = node.id;

    const data = node.data || {};
    const statusClass = this._getStatusClass(data.status);
    const statusText = this._getStatusText(data.status);

    nodeEl.innerHTML = `
      <div class="node-header">
        <span class="node-icon">${data.icon || '📋'}</span>
        <span class="node-label">${data.label || node.id}</span>
      </div>
      ${data.description ? `
        <div class="node-description">${data.description}</div>
      ` : ''}
      <div class="node-status ${statusClass}">${statusText}</div>
    `;

    // Add position for reference
    if (node.position) {
      nodeEl.style.left = `${node.position.x}px`;
      nodeEl.style.top = `${node.position.y}px`;
    }

    return nodeEl;
  }

  /**
   * Create notification
   */
  createNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span class="notification-icon">${this._getNotificationIcon(type)}</span>
      <span class="notification-message">${message}</span>
      <button class="notification-close">&times;</button>
    `;

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn?.addEventListener('click', () => {
      notification.remove();
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);

    return notification;
  }

  /**
   * Get notification icon
   */
  _getNotificationIcon(type) {
    const icons = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  /**
   * Get status class
   */
  _getStatusClass(status) {
    const classes = {
      running: 'status-running',
      pending: 'status-pending',
      completed: 'status-completed',
      done: 'status-completed',
      failed: 'status-failed',
      error: 'status-failed',
      cancelled: 'status-cancelled',
      active: 'status-running',
      idle: 'status-idle'
    };
    return classes[status] || 'status-pending';
  }

  /**
   * Get status text
   */
  _getStatusText(status) {
    const texts = {
      running: '⏳ Выполняется',
      pending: '⏳ Ожидает',
      completed: '✅ Готово',
      done: '✅ Готово',
      failed: '❌ Ошибка',
      error: '❌ Ошибка',
      cancelled: '🚫 Отменено',
      active: '🔄 Активна',
      idle: '💤 Бездействует'
    };
    return texts[status] || status;
  }

  /**
   * Format date
   */
  _formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Format time
   */
  _formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format message content
   */
  _formatMessageContent(content) {
    if (!content) return '';
    // Convert URLs to links
    return content.replace(
      /(https?:\/\/[^\s]+)/g, 
      '<a href="$1" target="_blank">$1</a>'
    );
  }

  /**
   * Render component to container
   */
  render(component, container) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (container && component) {
      container.innerHTML = '';
      container.appendChild(component);
    }
    
    return component;
  }

  /**
   * Clear container
   */
  clear(container) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (container) {
      container.innerHTML = '';
    }
  }
}

// Create singleton instance
const uiManager = new UIManager();

// Make available globally
if (typeof window !== 'undefined') {
  window.UIManager = UIManager;
  window.uiManager = uiManager;
}
