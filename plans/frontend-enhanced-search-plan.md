
# Frontend Enhanced Search Plan

## Выбрано пользователем (qtu):
**Enhanced Search (улучшенный поиск в графе)**

---

## Overview
Добавить расширенный функционал поиска для VueFlow графа протокола A2A:
- Поиск по названию, типу, ID узлов
- Фильтрация по статусу и типу
- Подсветка найденных узлов
- Навигация между результатами поиска
- Поиск в содержимом узлов (DSL код, описания)

---

## Current State
- ✅ Базовый поиск (search input + кнопка)
- ❌ Нет подсветки результатов
- ❌ Нет фильтрации по типу/статусу
- ❌ Нет навигации между результатами
- ❌ Нет поиска в содержимом узлов

---

## Plan

### Phase 1: UI Components
- [ ] Расширенная панель поиска с фильтрами
  - Input для текстового поиска
  - Dropdown для типа узла (All, Agents, Nodes, Actions, etc.)
  - Dropdown для статуса (All, Active, Completed, Failed)
  - Кнопки навигации (prev/next)
  - Счётчик результатов

### Phase 2: Search Logic
- [ ] Функция поиска по графу
  - Поиск по label, id, name
  - Поиск по типу узла
  - Поиск по содержимому (data.dsl, data.description)
  - Чувствительность к регистру (опционально)

### Phase 3: Highlighting & Navigation
- [ ] Подсветка найденных узлов
  - Добавить CSS класс для подсветки
  - Анимация при переходе между результатами
- [ ] Навигация между результатами
  - Кнопки prev/next
  - Горячие клавиши (Ctrl+F для фокуса, Enter для след.)

### Phase 4: Edge Highlighting
- [ ] Подсветка связанных рёбер
  - Найти рёбра между подсвеченными узлами
  - Показать путь от одного узла к другому

---

## Files to Modify

### 1. a2a-client/web/index.html
```
html
<!-- Расширенная панель поиска -->
<div class="search-container enhanced-search">
  <select id="flowTypeFilter" class="search-filter">
    <option value="">All Types</option>
    <option value="taskInput">Task Request</option>
    <option value="actionProposal">Action Proposal</option>
    <option value="subAction">Sub Action</option>
    <option value="result">Result</option>
    <option value="actionComplete">Complete</option>
  </select>
  <select id="flowStatusFilter" class="search-filter">
    <option value="">All Status</option>
    <option value="running">Running</option>
    <option value="completed">Completed</option>
    <option value="failed">Failed</option>
  </select>
  <div class="search-nav">
    <span id="searchResultsCount">0/0</span>
    <button id="searchPrev" class="btn btn-small">↑</button>
    <button id="searchNext" class="btn btn-small">↓</button>
  </div>
</div>
```

### 2. a2a-client/web/css/style.css
```
css
/* Enhanced Search Styles */
.enhanced-search {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-filter {
  padding: 4px 8px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--fg);
  font-size: 11px;
}

.search-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

#searchResultsCount {
  font-size: 11px;
  color: var(--fg2);
  min-width: 40px;
  text-align: center;
}

/* Node highlighting */
.vue-flow__node.highlighted {
  box-shadow: 0 0 0 3px var(--accent), 0 4px 12px rgba(88, 166, 255, 0.4);
}

.vue-flow__node.search-match {
  box-shadow: 0 0 0 2px var(--warn), 0 0 20px rgba(210, 153, 34, 0.3);
}

.vue-flow__node.search-match.current {
  box-shadow: 0 0 0 3px var(--accent), 0 0 30px rgba(88, 166, 255, 0.5);
  animation: search-pulse 1s ease-in-out infinite;
}

@keyframes search-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

/* Edge highlighting */
.vue-flow__edge.highlighted {
  stroke: var(--accent);
  stroke-width: 3;
}

.vue-flow__edge.related {
  stroke: var(--fg2);
  stroke-width: 2;
  opacity: 0.7;
}
```

### 3. a2a-client/web/js/flow/search.js (NEW)
```
javascript
/**
 * Enhanced Flow Search - поиск и фильтрация узлов в графе
 */

const FlowSearch = {
  state: {
    results: [],
    currentIndex: -1,
    filters: {
      text: '',
      type: '',
      status: ''
    }
  },

  /**
   * Инициализация
   */
  init() {
    this.bindEvents();
    console.log('FlowSearch initialized');
  },

  /**
   * Привязка событий
   */
  bindEvents() {
    const searchInput = document.getElementById('flowSearchInput');
    const typeFilter = document.getElementById('flowTypeFilter');
    const statusFilter = document.getElementById('flowStatusFilter');
    const prevBtn = document.getElementById('searchPrev');
    const nextBtn = document.getElementById('searchNext');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.onSearch(e.target.value));
      searchInput.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => this.onFilterChange('type', e.target.value));
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => this.onFilterChange('status', e.target.value));
    }

    if (prevBtn) prevBtn.addEventListener('click', () => this.prevResult());
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextResult());
  },

  /**
   * Обработка поискового запроса
   */
  onSearch(text) {
    this.state.filters.text = text.toLowerCase();
    this.performSearch();
  },

  /**
   * Обработка изменения фильтра
   */
  onFilterChange(filterType, value) {
    this.state.filters[filterType] = value;
    this.performSearch();
  },

  /**
   * Выполнить поиск
   */
  performSearch() {
    const { text, type, status } = this.state.filters;
    
    // Get all nodes from VueFlow
    const allNodes = window.getFlowNodes?.() || [];
    
    this.state.results = allNodes.filter(node => {
      // Text search
      if (text) {
        const searchableText = [
          node.id,
          node.data?.label,
          node.data?.name,
          node.data?.task,
          node.data?.actionName,
          node.data?.description,
          node.data?.dsl,
          node.data?.subActionName
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(text)) {
          return false;
        }
      }

      // Type filter
      if (type && node.type !== type) {
        return false;
      }

      // Status filter
      if (status && node.data?.status !== status) {
        return false;
      }

      return true;
    });

    this.state.currentIndex = this.state.results.length > 0 ? 0 : -1;
    this.updateUI();
    this.highlightResults();
    
    console.log(`Search found ${this.state.results.length} results`);
  },

  /**
   * Обновить UI (счётчик, кнопки)
   */
  updateUI() {
    const countEl = document.getElementById('searchResultsCount');
    const prevBtn = document.getElementById('searchPrev');
    const nextBtn = document.getElementById('searchNext');

    if (countEl) {
      if (this.state.results.length === 0) {
        countEl.textContent = '0/0';
      } else {
        countEl.textContent = `${this.state.currentIndex + 1}/${this.state.results.length}`;
      }
    }

    if (prevBtn) prevBtn.disabled = this.state.results.length <= 1;
    if (nextBtn) nextBtn.disabled = this.state.results.length <= 1;
  },

  /**
   * Подсветить результаты поиска
   */
  highlightResults() {
    // Clear previous highlights
    this.clearHighlights();

    if (!window.setFlowNodes) return;

    const allNodes = window.getFlowNodes?.() || [];
    const currentNode = this.state.results[this.state.currentIndex];

    const updatedNodes = allNodes.map(node => {
      const isResult = this.state.results.some(r => r.id === node.id);
      const isCurrent = currentNode?.id === node.id;

      if (isCurrent) {
        // Current result - highlight with accent
        return {
          ...node,
          className: 'search-match current',
          selected: true
        };
      } else if (isResult) {
        // Other results - subtle highlight
        return {
          ...node,
          className: 'search-match'
        };
      }

      return node;
    });

    window.setFlowNodes(updatedNodes);

    // Center view on current result
    if (currentNode && window.fitToNodes) {
      setTimeout(() => window.fitToNodes([currentNode.id]), 100);
    }
  },

  /**
   * Очистить подсветку
   */
  clearHighlights() {
    if (!window.setFlowNodes) return;

    const allNodes = window.getFlowNodes?.() || [];
    const updatedNodes = allNodes.map(node => ({
      ...node,
      className: node.className?.replace('search-match', '').replace('current', '').trim() || ''
    }));

    window.setFlowNodes(updatedNodes);
  },

  /**
   * Перейти к предыдущему результату
   */
  prevResult() {
    if (this.state.results.length === 0) return;
    
    this.state.currentIndex = this.state.currentIndex > 0 
      ? this.state.currentIndex - 1 
      : this.state.results.length - 1;
    
    this.updateUI();
    this.highlightResults();
  },

  /**
   * Перейти к следующему результату
   */
  nextResult() {
    if (this.state.results.length === 0) return;
    
    this.state.currentIndex = this.state.currentIndex < this.state.results.length - 1 
      ? this.state.currentIndex + 1 
      : 0;
    
    this.updateUI();
    this.highlightResults();
  },

  /**
   * Обработка клавиш
   */
  onKeyDown(e) {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        this.prevResult();
      } else {
        this.nextResult();
      }
    }
  }
};

// Auto-initialize
window.FlowSearch = FlowSearch;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => FlowSearch.init());
} else {
  FlowSearch.init();
}
```

---

## Implementation Steps

### Step 1: Add HTML Components
- Add enhanced search panel in `index.html`

### Step 2: Add CSS Styles
- Add search highlighting styles in `style.css`

### Step 3: Create Search Module
- Create `a2a-client/web/js/flow/search.js`

### Step 4: Integrate with VueFlow
- Add `getFlowNodes()` function to VueFlow app
- Connect search module

### Step 5: Test
- Test search functionality
- Test navigation
- Test filters

---

## Dependencies
- VueFlow already loaded
- No new npm packages required

---

## Status: COMPLETED

---

## Implementation Log

### Step 1: Update index.html - ✅ DONE
- [x] Add enhanced search panel with filters
- [x] Add type and status dropdowns  
- [x] Add navigation buttons
- [x] Add getFlowNodes() and getFlowEdges() functions
- [x] Include search.js script

### Step 2: Update style.css - ✅ DONE
- [x] Add enhanced search CSS styles
- [x] Add node highlighting classes
- [x] Add search animation keyframes

### Step 3: Create search.js - ✅ DONE
- [x] Create flow search module
- [x] Implement search logic
- [x] Add highlighting functions
- [x] Add keyboard navigation
- [x] Add filter functionality
