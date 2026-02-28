/**
 * ActionsManager - System for managing and searching actions
 * Provides action registry, search, and proposal handling
 */

class ActionsManager {
  constructor() {
    this.actions = new Map();
    this.proposedActions = [];
    this.actionHistory = [];
    this.listeners = new Map();
    this.searchIndex = null;
    this.initialized = false;
  }

  /**
   * Initialize the actions manager
   */
  async init() {
    console.log('[ActionsManager] Initializing...');
    
    // Load built-in actions
    await this.loadBuiltInActions();
    
    // Load custom actions from storage
    this.loadCustomActions();
    
    // Build search index
    this.buildSearchIndex();
    
    this.initialized = true;
    console.log(`[ActionsManager] Initialized with ${this.actions.size} actions`);
    
    return this;
  }

  /**
   * Load built-in actions
   */
  async loadBuiltInActions() {
    const builtInActions = [
      // File operations
      {
        id: 'create_file',
        name: 'Создать файл',
        nameEn: 'Create File',
        description: 'Создать новый файл с указанным содержимым',
        descriptionEn: 'Create a new file with specified content',
        category: 'file',
        tags: ['file', 'create', 'new'],
        icon: '📄',
        params: [
          { name: 'path', label: 'Путь к файлу', type: 'string', required: true },
          { name: 'content', label: 'Содержимое', type: 'textarea', required: false }
        ],
        priority: 10
      },
      {
        id: 'read_file',
        name: 'Прочитать файл',
        nameEn: 'Read File',
        description: 'Прочитать содержимое файла',
        descriptionEn: 'Read file contents',
        category: 'file',
        tags: ['file', 'read', 'open'],
        icon: '📖',
        params: [
          { name: 'path', label: 'Путь к файлу', type: 'string', required: true },
          { name: 'encoding', label: 'Кодировка', type: 'select', options: ['utf-8', 'base64'], default: 'utf-8' }
        ],
        priority: 9
      },
      {
        id: 'update_file',
        name: 'Обновить файл',
        nameEn: 'Update File',
        description: 'Обновить содержимое существующего файла',
        descriptionEn: 'Update existing file content',
        category: 'file',
        tags: ['file', 'update', 'edit'],
        icon: '✏️',
        params: [
          { name: 'path', label: 'Путь к файлу', type: 'string', required: true },
          { name: 'content', label: 'Новое содержимое', type: 'textarea', required: true },
          { name: 'mode', label: 'Режим', type: 'select', options: ['replace', 'append', 'prepend'], default: 'replace' }
        ],
        priority: 8
      },
      {
        id: 'delete_file',
        name: 'Удалить файл',
        nameEn: 'Delete File',
        description: 'Удалить файл или директорию',
        descriptionEn: 'Delete file or directory',
        category: 'file',
        tags: ['file', 'delete', 'remove'],
        icon: '🗑️',
        params: [
          { name: 'path', label: 'Путь', type: 'string', required: true },
          { name: 'recursive', label: 'Рекурсивно', type: 'checkbox', default: false }
        ],
        priority: 5
      },
      {
        id: 'list_files',
        name: 'Список файлов',
        nameEn: 'List Files',
        description: 'Получить список файлов в директории',
        descriptionEn: 'Get list of files in directory',
        category: 'file',
        tags: ['file', 'list', 'ls', 'dir'],
        icon: '📂',
        params: [
          { name: 'path', label: 'Путь', type: 'string', default: '.' },
          { name: 'pattern', label: 'Шаблон', type: 'string', default: '*' },
          { name: 'recursive', label: 'Рекурсивно', type: 'checkbox', default: false }
        ],
        priority: 7
      },
      
      // Script execution
      {
        id: 'run_script',
        name: 'Запустить скрипт',
        nameEn: 'Run Script',
        description: 'Выполнить PowerShell или Bash скрипт',
        descriptionEn: 'Execute PowerShell or Bash script',
        category: 'script',
        tags: ['script', 'execute', 'run', 'bash', 'powershell'],
        icon: '⚡',
        params: [
          { name: 'script', label: 'Скрипт', type: 'textarea', required: true },
          { name: 'shell', label: 'Оболочка', type: 'select', options: ['powershell', 'bash', 'cmd'], default: 'powershell' },
          { name: 'timeout', label: 'Таймаут (сек)', type: 'number', default: 30 }
        ],
        priority: 10
      },
      {
        id: 'run_command',
        name: 'Запустить команду',
        nameEn: 'Run Command',
        description: 'Выполнить системную команду',
        descriptionEn: 'Execute system command',
        category: 'script',
        tags: ['command', 'execute', 'run', 'terminal'],
        icon: '💻',
        params: [
          { name: 'command', label: 'Команда', type: 'string', required: true },
          { name: 'cwd', label: 'Рабочая директория', type: 'string' },
          { name: 'timeout', label: 'Таймаут (сек)', type: 'number', default: 30 }
        ],
        priority: 9
      },
      
      // Search and analysis
      {
        id: 'search_code',
        name: 'Поиск по коду',
        nameEn: 'Search Code',
        description: 'Поиск по коду в проекте с использованием RAG',
        descriptionEn: 'Search code in project using RAG',
        category: 'search',
        tags: ['search', 'find', 'rag', 'grep'],
        icon: '🔍',
        params: [
          { name: 'query', label: 'Запрос', type: 'string', required: true },
          { name: 'path', label: 'Путь', type: 'string', default: '.' },
          { name: 'type', label: 'Тип файлов', type: 'string', placeholder: '*.js, *.ts' }
        ],
        priority: 10
      },
      {
        id: 'analyze_security',
        name: 'Анализ безопасности',
        nameEn: 'Security Analysis',
        description: 'Проверить код на уязвимости',
        descriptionEn: 'Check code for vulnerabilities',
        category: 'analysis',
        tags: ['security', 'analysis', 'vulnerability', 'audit'],
        icon: '🛡️',
        params: [
          { name: 'path', label: 'Путь', type: 'string', default: '.' },
          { name: 'rules', label: 'Правила', type: 'select', options: ['all', 'owasp', 'basic'], default: 'all' }
        ],
        priority: 8
      },
      {
        id: 'lint_code',
        name: 'Lint кода',
        nameEn: 'Lint Code',
        description: 'Запустить линтер для проверки стиля кода',
        descriptionEn: 'Run linter to check code style',
        category: 'analysis',
        tags: ['lint', 'code', 'style', 'check'],
        icon: '✅',
        params: [
          { name: 'path', label: 'Путь', type: 'string', default: '.' },
          { name: 'linter', label: 'Линтер', type: 'select', options: ['eslint', 'tslint', 'prettier', 'auto'], default: 'auto' }
        ],
        priority: 7
      },
      {
        id: 'analyze_dependencies',
        name: 'Анализ зависимостей',
        nameEn: 'Analyze Dependencies',
        description: 'Проанализировать зависимости проекта',
        descriptionEn: 'Analyze project dependencies',
        category: 'analysis',
        tags: ['dependencies', 'npm', 'analyze', 'audit'],
        icon: '📦',
        params: [
          { name: 'path', label: 'Путь', type: 'string', default: '.' },
          { name: 'deep', label: 'Глубокий анализ', type: 'checkbox', default: false }
        ],
        priority: 6
      },
      
      // Code generation
      {
        id: 'generate_crud',
        name: 'Сгенерировать CRUD',
        nameEn: 'Generate CRUD',
        description: 'Сгенерировать CRUD операции для модели',
        descriptionEn: 'Generate CRUD operations for model',
        category: 'generate',
        tags: ['generate', 'crud', 'model', 'scaffold'],
        icon: '🪄',
        params: [
          { name: 'model', label: 'Имя модели', type: 'string', required: true },
          { name: 'fields', label: 'Поля', type: 'textarea', placeholder: 'name:string, email:string, age:number' },
          { name: 'framework', label: 'Фреймворк', type: 'select', options: ['express', 'fastify', 'koa', 'auto'], default: 'auto' }
        ],
        priority: 7
      },
      {
        id: 'generate_migration',
        name: 'Сгенерировать миграцию',
        nameEn: 'Generate Migration',
        description: 'Создать миграцию для базы данных',
        descriptionEn: 'Create database migration',
        category: 'generate',
        tags: ['generate', 'migration', 'database', 'schema'],
        icon: '🗄️',
        params: [
          { name: 'name', label: 'Имя миграции', type: 'string', required: true },
          { name: 'up', label: 'Up миграция', type: 'textarea' },
          { name: 'down', label: 'Down миграция', type: 'textarea' }
        ],
        priority: 6
      },
      {
        id: 'generate_test',
        name: 'Сгенерировать тест',
        nameEn: 'Generate Test',
        description: 'Создать unit-тесты для файла',
        descriptionEn: 'Create unit tests for file',
        category: 'generate',
        tags: ['generate', 'test', 'unit', 'spec'],
        icon: '🧪',
        params: [
          { name: 'path', label: 'Путь к файлу', type: 'string', required: true },
          { name: 'framework', label: 'Фреймворк', type: 'select', options: ['jest', 'vitest', 'mocha', 'auto'], default: 'auto' },
          { name: 'type', label: 'Тип тестов', type: 'select', options: ['unit', 'integration', 'e2e'], default: 'unit' }
        ],
        priority: 6
      },
      
      // Git operations
      {
        id: 'git_commit',
        name: 'Git commit',
        nameEn: 'Git Commit',
        description: 'Создать коммит с изменениями',
        descriptionEn: 'Create commit with changes',
        category: 'git',
        tags: ['git', 'commit', 'vcs'],
        icon: '📝',
        params: [
          { name: 'message', label: 'Сообщение', type: 'string', required: true },
          { name: 'files', label: 'Файлы', type: 'string', placeholder: '*.js, *.css (пусто = все)' }
        ],
        priority: 7
      },
      {
        id: 'git_push',
        name: 'Git push',
        nameEn: 'Git Push',
        description: 'Отправить коммиты в удалённый репозиторий',
        descriptionEn: 'Push commits to remote repository',
        category: 'git',
        tags: ['git', 'push', 'remote'],
        icon: '🚀',
        params: [
          { name: 'branch', label: 'Ветка', type: 'string' },
          { name: 'force', label: 'Force push', type: 'checkbox', default: false }
        ],
        priority: 6
      },
      {
        id: 'git_pull',
        name: 'Git pull',
        nameEn: 'Git Pull',
        description: 'Получить изменения из удалённого репозитория',
        descriptionEn: 'Pull changes from remote repository',
        category: 'git',
        tags: ['git', 'pull', 'remote'],
        icon: '🔽',
        params: [
          { name: 'branch', label: 'Ветка', type: 'string' },
          { name: 'rebase', label: 'Rebase', type: 'checkbox', default: false }
        ],
        priority: 6
      },
      
      // Docker
      {
        id: 'docker_build',
        name: 'Docker build',
        nameEn: 'Docker Build',
        description: 'Собрать Docker образ',
        descriptionEn: 'Build Docker image',
        category: 'docker',
        tags: ['docker', 'build', 'image', 'container'],
        icon: '🐳',
        params: [
          { name: 'tag', label: 'Тег', type: 'string', required: true },
          { name: 'path', label: 'Путь', type: 'string', default: '.' },
          { name: 'dockerfile', label: 'Dockerfile', type: 'string', default: 'Dockerfile' }
        ],
        priority: 7
      },
      {
        id: 'docker_run',
        name: 'Docker run',
        nameEn: 'Docker Run',
        description: 'Запустить Docker контейнер',
        descriptionEn: 'Run Docker container',
        category: 'docker',
        tags: ['docker', 'run', 'container', 'start'],
        icon: '▶️',
        params: [
          { name: 'image', label: 'Образ', type: 'string', required: true },
          { name: 'name', label: 'Имя контейнера', type: 'string' },
          { name: 'ports', label: 'Порты', type: 'string', placeholder: '8080:80' },
          { name: 'detach', label: 'Detached', type: 'checkbox', default: true }
        ],
        priority: 6
      },
      
      // Project management
      {
        id: 'npm_install',
        name: 'NPM install',
        nameEn: 'NPM Install',
        description: 'Установить npm зависимости',
        descriptionEn: 'Install npm dependencies',
        category: 'project',
        tags: ['npm', 'install', 'dependencies', 'node'],
        icon: '📥',
        params: [
          { name: 'packages', label: 'Пакеты', type: 'string', placeholder: 'lodash (пусто = все)' },
          { name: 'dev', label: 'Dev зависимости', type: 'checkbox', default: false },
          { name: 'save', label: 'Сохранить в package.json', type: 'checkbox', default: true }
        ],
        priority: 8
      },
      {
        id: 'npm_run',
        name: 'NPM run',
        nameEn: 'NPM Run',
        description: 'Запустить npm скрипт',
        descriptionEn: 'Run npm script',
        category: 'project',
        tags: ['npm', 'run', 'script', 'node'],
        icon: '🎬',
        params: [
          { name: 'script', label: 'Скрипт', type: 'string', required: true },
          { name: 'args', label: 'Аргументы', type: 'string' }
        ],
        priority: 7
      }
    ];

    // Register all built-in actions
    for (const action of builtInActions) {
      this.registerAction(action);
    }
  }

  /**
   * Load custom actions from localStorage
   */
  loadCustomActions() {
    try {
      const stored = localStorage.getItem('a2a-custom-actions');
      if (stored) {
        const customActions = JSON.parse(stored);
        for (const action of customActions) {
          this.registerAction({ ...action, custom: true });
        }
      }
    } catch (e) {
      console.warn('[ActionsManager] Failed to load custom actions:', e);
    }
  }

  /**
   * Save custom actions to localStorage
   */
  saveCustomActions() {
    try {
      const customActions = Array.from(this.actions.values())
        .filter(a => a.custom)
        .map(a => ({ ...a, custom: undefined }));
      localStorage.setItem('a2a-custom-actions', JSON.stringify(customActions));
    } catch (e) {
      console.warn('[ActionsManager] Failed to save custom actions:', e);
    }
  }

  /**
   * Register a new action
   */
  registerAction(action) {
    if (!action.id) {
      console.error('[ActionsManager] Action must have an id');
      return;
    }
    
    this.actions.set(action.id, {
      ...action,
      createdAt: action.createdAt || Date.now(),
      usageCount: action.usageCount || 0
    });
    
    // Rebuild search index when new action is added
    this.buildSearchIndex();
    
    this.emit('actionRegistered', action);
  }

  /**
   * Unregister an action
   */
  unregisterAction(actionId) {
    const action = this.actions.get(actionId);
    if (action) {
      this.actions.delete(actionId);
      this.buildSearchIndex();
      this.emit('actionUnregistered', action);
    }
  }

  /**
   * Get action by ID
   */
  getAction(actionId) {
    return this.actions.get(actionId);
  }

  /**
   * Get all actions
   */
  getAllActions() {
    return Array.from(this.actions.values());
  }

  /**
   * Get actions by category
   */
  getActionsByCategory(category) {
    return this.getAllActions().filter(a => a.category === category);
  }

  /**
   * Build search index
   */
  buildSearchIndex() {
    this.searchIndex = [];
    
    for (const action of this.actions.values()) {
      const searchableText = [
        action.name,
        action.nameEn,
        action.description,
        action.descriptionEn,
        action.category,
        ...(action.tags || [])
      ].join(' ').toLowerCase();
      
      this.searchIndex.push({
        id: action.id,
        text: searchableText,
        action
      });
    }
  }

  /**
   * Search actions
   */
  search(query, options = {}) {
    const { 
      limit = 20, 
      category = null,
      includeCustom = true 
    } = options;
    
    if (!query || !query.trim()) {
      let results = this.getAllActions();
      
      if (category) {
        results = results.filter(a => a.category === category);
      }
      
      // Sort by priority and usage
      results.sort((a, b) => {
        const scoreA = (a.priority || 5) * 10 + (a.usageCount || 0);
        const scoreB = (b.priority || 5) * 10 + (b.usageCount || 0);
        return scoreB - scoreA;
      });
      
      return results.slice(0, limit);
    }
    
    const searchTerms = query.toLowerCase().split(/\s+/);
    
    let results = this.searchIndex
      .filter(entry => {
        // Filter by custom
        if (!includeCustom && entry.action.custom) return false;
        
        // Filter by category
        if (category && entry.action.category !== category) return false;
        
        // Check if all terms match
        return searchTerms.every(term => entry.text.includes(term));
      })
      .map(entry => ({
        ...entry.action,
        _score: this._calculateScore(entry.text, searchTerms)
      }))
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);
    
    return results;
  }

  /**
   * Calculate search score
   */
  _calculateScore(text, terms) {
    let score = 0;
    
    for (const term of terms) {
      // Exact match in name
      if (text.includes(term)) {
        score += 10;
        
        // Bonus for name match
        const nameMatch = text.startsWith(term);
        if (nameMatch) score += 5;
      }
      
      // Tag match bonus
      if (text.includes(`tag:${term}`)) score += 3;
    }
    
    return score;
  }

  /**
   * Get action categories
   */
  getCategories() {
    const categories = new Map();
    
    for (const action of this.actions.values()) {
      const count = categories.get(action.category) || 0;
      categories.set(action.category, count + 1);
    }
    
    return Array.from(categories.entries()).map(([name, count]) => ({
      name,
      count,
      icon: this._getCategoryIcon(name)
    }));
  }

  /**
   * Get category icon
   */
  _getCategoryIcon(category) {
    const icons = {
      file: '📁',
      script: '⚡',
      search: '🔍',
      analysis: '📊',
      generate: '🪄',
      git: '📦',
      docker: '🐳',
      project: '📂'
    };
    return icons[category] || '📋';
  }

  /**
   * Increment action usage
   */
  incrementUsage(actionId) {
    const action = this.actions.get(actionId);
    if (action) {
      action.usageCount = (action.usageCount || 0) + 1;
      action.lastUsed = Date.now();
    }
  }

  /**
   * Set proposed actions (from AI agent)
   */
  setProposedActions(actions) {
    this.proposedActions = actions || [];
    if (window.appState) {
      window.appState.set('proposedActions', this.proposedActions);
    }
    this.emit('proposalsUpdated', this.proposedActions);
  }

  /**
   * Add proposed action
   */
  addProposedAction(action) {
    this.proposedActions.push({
      ...action,
      proposedAt: Date.now()
    });
    if (window.appState) {
      window.appState.set('proposedActions', this.proposedActions);
    }
    this.emit('proposalAdded', action);
  }

  /**
   * Clear proposed actions
   */
  clearProposedActions() {
    this.proposedActions = [];
    if (window.appState) {
      window.appState.set('proposedActions', []);
    }
    this.emit('proposalsCleared');
  }

  /**
   * Subscribe to events
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    return () => this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

// Create singleton instance
const actionsManager = new ActionsManager();

// Make available globally
if (typeof window !== 'undefined') {
  window.ActionsManager = ActionsManager;
  window.actionsManager = actionsManager;
}
