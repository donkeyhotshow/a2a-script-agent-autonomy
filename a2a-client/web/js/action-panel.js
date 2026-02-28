/**
 * Action Panel - UI для выбора и запуска действий
 * Обеспечивает выбор действий из actionsManager с заполнением параметров
 */

class ActionPanel {
  constructor() {
    this.container = null;
    this.currentAction = null;
    this.isVisible = false;
    this.listeners = new Map();
  }

  /**
   * Инициализация панели
   */
  init() {
    this.container = document.getElementById('actionPanel');
    if (!this.container) {
      console.warn('[ActionPanel] Container not found');
      return;
    }
    
    this.setupEventListeners();
    
    // Загрузить категории
    this.updateCategories();
    
    // Показать список действий
    this.renderActionsList();
    
    console.log('[ActionPanel] Initialized');
  }

  /**
   * Настройка обработчиков событий
   */
  setupEventListeners() {
    // Закрытие панели
    document.getElementById('closeActionPanel')?.addEventListener('click', () => {
      this.hide();
    });

    // Поиск действий
    const searchInput = document.getElementById('actionSearchInput');
    searchInput?.addEventListener('input', (e) => {
      this.searchActions(e.target.value);
    });

    // Фильтр категорий
    const categoryFilter = document.getElementById('actionCategoryFilter');
    categoryFilter?.addEventListener('change', (e) => {
      this.filterByCategory(e.target.value);
    });
  }

  /**
   * Показать панель
   */
  show() {
    if (!this.container) this.init();
    
    this.container.style.display = 'flex';
    this.container.classList.add('visible');
    this.isVisible = true;
    this.renderActionsList();
    
    // Фокус на поиск
    setTimeout(() => {
      document.getElementById('actionSearchInput')?.focus();
    }, 100);
  }

  /**
   * Скрыть панель
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
      this.container.classList.remove('visible');
    }
    this.isVisible = false;
    this.currentAction = null;
  }

  /**
   * Переключить видимость
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Получить actionsManager из глобальной области
   */
  getActionsManager() {
    return window.actionsManager || window.ActionsManager;
  }

  /**
   * Отобразить список действий
   */
  renderActionsList(actions = null) {
    const listContainer = document.getElementById('actionsListContainer');
    if (!listContainer) return;

    const am = this.getActionsManager();
    const actionsToShow = actions || (am ? am.getAllActions() : this.getDefaultActions());
    
    if (!actionsToShow || actionsToShow.length === 0) {
      listContainer.innerHTML = '<div class="empty-message">Действия не найдены</div>';
      return;
    }

    listContainer.innerHTML = actionsToShow.map(action => `
      <div class="action-item" data-action-id="${action.id}">
        <div class="action-item-header">
          <span class="action-icon">${action.icon || '📋'}</span>
          <span class="action-name">${action.name}</span>
        </div>
        <div class="action-item-description">${action.description || ''}</div>
        <div class="action-item-tags">
          ${(action.tags || []).slice(0, 3).map(tag => 
            `<span class="action-tag">${tag}</span>`
          ).join('')}
        </div>
      </div>
    `).join('');

    // Показать контейнер списка, скрыть форму
    listContainer.style.display = 'block';
    document.getElementById('actionFormContainer').style.display = 'none';

    // Добавить обработчики клика
    listContainer.querySelectorAll('.action-item').forEach(item => {
      item.addEventListener('click', () => {
        const actionId = item.dataset.actionId;
        this.selectAction(actionId);
      });
    });
  }

  /**
   * Получить список действий по умолчанию
   */
  getDefaultActions() {
    return [
      { id: 'create_file', name: 'Создать файл', icon: '📄', description: 'Создать новый файл', tags: ['file'], params: [
        { name: 'path', label: 'Путь к файлу', type: 'string', required: true },
        { name: 'content', label: 'Содержимое', type: 'textarea' }
      ]},
      { id: 'read_file', name: 'Прочитать файл', icon: '📖', description: 'Прочитать содержимое файла', tags: ['file'], params: [
        { name: 'path', label: 'Путь к файлу', type: 'string', required: true }
      ]},
      { id: 'run_script', name: 'Запустить скрипт', icon: '⚡', description: 'Выполнить PowerShell или Bash скрипт', tags: ['script'], params: [
        { name: 'script', label: 'Скрипт', type: 'textarea', required: true },
        { name: 'shell', label: 'Оболочка', type: 'select', options: ['powershell', 'bash'] }
      ]},
      { id: 'search_code', name: 'Поиск по коду', icon: '🔍', description: 'Поиск по коду в проекте', tags: ['search'], params: [
        { name: 'query', label: 'Запрос', type: 'string', required: true },
        { name: 'path', label: 'Путь', type: 'string' }
      ]},
      { id: 'git_commit', name: 'Git commit', icon: '📝', description: 'Создать коммит', tags: ['git'], params: [
        { name: 'message', label: 'Сообщение', type: 'string', required: true }
      ]}
    ];
  }

  /**
   * Поиск действий
   */
  searchActions(query) {
    if (!query.trim()) {
      this.renderActionsList();
      return;
    }

    const am = this.getActionsManager();
    if (am && am.search) {
      const results = am.search(query);
      this.renderActionsList(results);
    } else {
      // Фоллбек - простой поиск
      const all = this.getDefaultActions();
      const results = all.filter(a => 
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.description?.toLowerCase().includes(query.toLowerCase())
      );
      this.renderActionsList(results);
    }
  }

  /**
   * Фильтр по категории
   */
  filterByCategory(category) {
    if (!category) {
      this.renderActionsList();
      return;
    }

    const am = this.getActionsManager();
    if (am && am.getActionsByCategory) {
      const results = am.getActionsByCategory(category);
      this.renderActionsList(results);
    }
  }

  /**
   * Выбрать действие и показать форму
   */
  selectAction(actionId) {
    const am = this.getActionsManager();
    const action = am ? am.getAction(actionId) : this.getDefaultActions().find(a => a.id === actionId);
    
    if (!action) return;

    this.currentAction = action;
    this.renderActionForm(action);
  }

  /**
   * Отобразить форму действия
   */
  renderActionForm(action) {
    const formContainer = document.getElementById('actionFormContainer');
    const listContainer = document.getElementById('actionsListContainer');
    if (!formContainer) return;

    const paramsHtml = (action.params || []).map(param => {
      return this.renderFormField(param);
    }).join('');

    formContainer.innerHTML = `
      <div class="action-form">
        <div class="action-form-header">
          <span class="action-icon-large">${action.icon || '📋'}</span>
          <div class="action-form-title">
            <h3>${action.name}</h3>
            <p>${action.description || ''}</p>
          </div>
        </div>
        
        <div class="action-form-fields">
          ${paramsHtml || '<p class="no-params">Нет параметров</p>'}
        </div>
        
        <div class="action-form-actions">
          <button class="btn btn-secondary" id="cancelActionBtn">Отмена</button>
          <button class="btn btn-primary" id="executeActionBtn">Выполнить</button>
        </div>
      </div>
    `;

    // Показать форму, скрыть список
    formContainer.style.display = 'block';
    if (listContainer) listContainer.style.display = 'none';

    // Добавить обработчики
    document.getElementById('executeActionBtn')?.addEventListener('click', () => {
      this.executeAction();
    });

    document.getElementById('cancelActionBtn')?.addEventListener('click', () => {
      this.clearForm();
    });
  }

  /**
   * Отобразить поле формы
   */
  renderFormField(param) {
    const required = param.required ? '<span class="required">*</span>' : '';
    
    switch (param.type) {
      case 'textarea':
        return `
          <div class="form-group">
            <label>${param.label} ${required}</label>
            <textarea 
              name="${param.name}" 
              placeholder="${param.placeholder || ''}"
              rows="4"
            ></textarea>
          </div>
        `;
      
      case 'select':
        return `
          <div class="form-group">
            <label>${param.label} ${required}</label>
            <select name="${param.name}">
              <option value="">-- Выберите --</option>
              ${(param.options || []).map(opt => 
                `<option value="${opt}">${opt}</option>`
              ).join('')}
            </select>
          </div>
        `;
      
      case 'checkbox':
        return `
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" name="${param.name}" ${param.default ? 'checked' : ''}>
              ${param.label}
            </label>
          </div>
        `;
      
      case 'number':
        return `
          <div class="form-group">
            <label>${param.label} ${required}</label>
            <input 
              type="number" 
              name="${param.name}" 
              placeholder="${param.placeholder || ''}"
            >
          </div>
        `;
      
      default:
        return `
          <div class="form-group">
            <label>${param.label} ${required}</label>
            <input 
              type="text" 
              name="${param.name}" 
              placeholder="${param.placeholder || ''}"
              value="${param.default || ''}"
            >
          </div>
        `;
    }
  }

  /**
   * Собрать параметры из формы
   */
  collectFormParams() {
    const formContainer = document.getElementById('actionFormContainer');
    if (!formContainer || !this.currentAction) return {};

    const params = {};
    const form = formContainer.querySelector('.action-form') || formContainer;
    
    for (const param of (this.currentAction.params || [])) {
      if (param.type === 'checkbox') {
        const checkbox = form.querySelector(`[name="${param.name}"]`);
        params[param.name] = checkbox?.checked || false;
      } else {
        const input = form.querySelector(`[name="${param.name}"]`);
        params[param.name] = input?.value || '';
      }
    }
    
    return params;
  }

  /**
   * Выполнить действие
   */
  executeAction() {
    if (!this.currentAction) return;

    // Проверить обязательные параметры
    const params = this.collectFormParams();
    for (const param of (this.currentAction.params || [])) {
      if (param.required && !params[param.name]) {
        this.showError(`Заполните обязательное поле: ${param.label}`);
        return;
      }
    }

    // Показать индикатор загрузки
    this.setLoading(true);

    // Эмуляция выполнения
    setTimeout(() => {
      const result = {
        success: true,
        action: this.currentAction.id,
        params: params,
        message: `Действие "${this.currentAction.name}" выполнено`
      };
      
      this.showResult(result);
      this.setLoading(false);
      
      // Увеличить счетчик использования
      const am = this.getActionsManager();
      if (am && am.incrementUsage) {
        am.incrementUsage(this.currentAction.id);
      }
      
    }, 500);
  }

  /**
   * Очистить форму
   */
  clearForm() {
    const formContainer = document.getElementById('actionFormContainer');
    const listContainer = document.getElementById('actionsListContainer');
    const searchInput = document.getElementById('actionSearchInput');
    
    if (formContainer) {
      formContainer.innerHTML = '';
      formContainer.style.display = 'none';
    }
    
    if (listContainer) listContainer.style.display = 'block';
    if (searchInput) {
      searchInput.disabled = false;
      searchInput.value = '';
    }
    
    this.currentAction = null;
  }

  /**
   * Показать ошибку
   */
  showError(message) {
    const formContainer = document.getElementById('actionFormContainer');
    if (!formContainer) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'action-error';
    errorDiv.textContent = message;
    
    formContainer.querySelector('.action-error')?.remove();
    formContainer.insertBefore(errorDiv, formContainer.firstChild);
    
    setTimeout(() => errorDiv.remove(), 5000);
  }

  /**
   * Показать результат
   */
  showResult(result) {
    const formContainer = document.getElementById('actionFormContainer');
    if (!formContainer) return;

    const resultDiv = document.createElement('div');
    resultDiv.className = 'action-result';
    resultDiv.innerHTML = `
      <div class="result-success">✓ ${result.message || 'Действие выполнено'}</div>
      <pre>${JSON.stringify(result, null, 2)}</pre>
    `;
    
    formContainer.appendChild(resultDiv);
    
    setTimeout(() => {
      this.clearForm();
      this.hide();
    }, 3000);
  }

  /**
   * Установить состояние загрузки
   */
  setLoading(loading) {
    const btn = document.getElementById('executeActionBtn');
    if (btn) {
      btn.disabled = loading;
      btn.textContent = loading ? 'Выполнение...' : 'Выполнить';
    }
  }

  /**
   * Обновить категории
   */
  updateCategories() {
    const select = document.getElementById('actionCategoryFilter');
    if (!select) return;

    const am = this.getActionsManager();
    let categories = [];
    
    if (am && am.getCategories) {
      categories = am.getCategories();
    } else {
      // Категории по умолчанию
      categories = [
        { name: 'file', icon: '📁', count: 2 },
        { name: 'script', icon: '⚡', count: 1 },
        { name: 'search', icon: '🔍', count: 1 },
        { name: 'git', icon: '📦', count: 1 }
      ];
    }
    
    select.innerHTML = '<option value="">Все категории</option>' + 
      categories.map(cat => 
        `<option value="${cat.name}">${cat.icon} ${cat.name} (${cat.count})</option>`
      ).join('');
  }
}

// Создать экземпляр
const actionPanel = new ActionPanel();

// Сделать глобальным
if (typeof window !== 'undefined') {
  window.ActionPanel = ActionPanel;
  window.actionPanel = actionPanel;
}
