енения
# Frontend Session History Plan

## Выбрано пользователем (qtu):
**История сессий (Session History)** - ОДОБРЕНО ✓

**Дополнительное требование:** Сессии должны сохраняться в проекте в папке `.carrier/sessions`

---

## Overview
Добавить функционал для просмотра и управления историей сессий в интерфейсе A2A Client.

Текущее состояние:
- Сессии отображаются в списке, но без детальной истории
- Нет возможности фильтровать/искать по сессиям
- Нет восстановления удалённых сессий

Новое состояние:
- Полная история сессий с фильтрацией
- Поиск по содержимому сообщений
- Восстановление сессий
- Экспорт истории

---

## Current State
- ✅ Отображение списка сессий
- ✅ Выбор активной сессии
- ❌ Нет фильтрации сессий
- ❌ Нет поиска в сообщениях
- ❌ Нет восстановления
- ❌ Нет экспорта

---

## Plan

### Phase 1: UI Components
- [ ] Добавить панель фильтров в секции сессий
- [ ] Создать компонент истории сессий
- [ ] Добавить строку поиска
- [ ] Добавить кнопки действий (удалить, восстановить, экспорт)

### Phase 2: Data Display
- [ ] Показать дату создания сессии
- [ ] Показать количество сообщений
- [ ] Показать статус (active, completed, failed)
- [ ] Показать последнее сообщение (превью)
- [ ] Показать тип проекта/фреймворк

### Phase 3: Interaction
- [ ] Фильтрация по статусу
- [ ] Поиск по содержимому сообщений
- [ ] Удаление сессий
- [ ] Восстановление удалённых сессий
- [ ] Экспорт в JSON

---

## Files to Modify

### 1. a2a-client/web/index.html
```
html
<!-- Session History Panel -->
<div id="session-history-panel" class="session-history-panel" style="display: none;">
  <div class="history-header">
    <h3>История сессий</h3>
    <div class="history-filters">
      <select id="sessionStatusFilter" class="filter-select">
        <option value="all">Все статусы</option>
        <option value="active">Активные</option>
        <option value="completed">Завершённые</option>
        <option value="failed">Ошибки</option>
      </select>
      <input type="text" id="sessionSearchInput" placeholder="Поиск..." class="search-input">
    </div>
  </div>
  
  <div id="sessionHistoryList" class="history-list">
    <!-- Session items will be rendered here -->
  </div>
  
  <div class="history-footer">
    <button class="btn btn-secondary" id="exportSessions">Экспорт</button>
    <button class="btn btn-secondary" id="clearHistory">Очистить</button>
  </div>
</div>
```

### 2. a2a-client/web/css/style.css
```
css
/* Session History Styles */
.session-history-panel {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin: 12px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.history-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg);
  margin: 0;
}

.history-filters {
  display: flex;
  gap: 8px;
}

.filter-select {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--fg);
  padding: 4px 8px;
  font-size: 12px;
}

.search-input {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--fg);
  padding: 4px 8px;
  font-size: 12px;
  width: 150px;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: var(--bg3);
}

.history-item.active {
  background: var(--bg3);
  border: 1px solid var(--accent);
}

.history-item .session-icon {
  font-size: 18px;
}

.history-item .session-info {
  flex: 1;
}

.history-item .session-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--fg);
}

.history-item .session-meta {
  font-size: 11px;
  color: var(--fg2);
}

.history-item .session-status {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.history-item .session-status.active {
  background: #dbeafe;
  color: #2563eb;
}

.history-item .session-status.completed {
  background: #dcfce7;
  color: #16a34a;
}

.history-item .session-status.failed {
  background: #fee2e2;
  color: #dc2626;
}

.history-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}
```

### 3. a2a-client/web/js/sessions.js
```
javascript
// Добавить методы для истории сессий

// Показать панель истории
showSessionHistory() {
  const panel = document.getElementById('session-history-panel');
  if (panel) panel.style.display = 'flex';
  this.renderSessionHistory();
}

// Скрыть панель истории
hideSessionHistory() {
  const panel = document.getElementById('session-history-panel');
  if (panel) panel.style.display = 'none';
}

// Отобразить историю сессий
renderSessionHistory() {
  const listEl = document.getElementById('sessionHistoryList');
  if (!listEl) return;
  
  const filter = document.getElementById('sessionStatusFilter')?.value || 'all';
  const search = document.getElementById('sessionSearchInput')?.value?.toLowerCase() || '';
  
  let sessions = this.state.list;
  
  // Фильтр по статусу
  if (filter !== 'all') {
    sessions = sessions.filter(s => s.status === filter);
  }
  
  // Поиск
  if (search) {
    sessions = sessions.filter(s => {
      const messages = s.messages || [];
      return messages.some(m => 
        (m.contentText || '').toLowerCase().includes(search) ||
        (m.content?.text || '').toLowerCase().includes(search)
      );
    });
  }
  
  if (sessions.length === 0) {
    listEl.innerHTML = '<div class="empty">Нет сессий</div>';
    return;
  }
  
  listEl.innerHTML = sessions.map(s => {
    const preview = s.messages?.[s.messages.length - 1]?.contentText?.slice(0, 50) || 
                   s.messages?.[s.messages.length - 1]?.content?.text?.slice(0, 50) || 'Новое';
    const date = s.createdAt ? new Date(s.createdAt).toLocaleString() : '';
    const status = s.status || 'active';
    
    return `
      <div class="history-item ${this.state.current?.id === s.id ? 'active' : ''}" data-id="${s.id}">
        <span class="session-icon">📋</span>
        <div class="session-info">
          <div class="session-title">${date}</div>
          <div class="session-meta">${preview}...</div>
        </div>
        <span class="session-status ${status}">${status}</span>
      </div>
    `;
  }).join('');
  
  // Добавить обработчики
  listEl.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => this.open(item.dataset.id));
  });
}

// Экспорт сессий
exportSessions() {
  const data = {
    sessions: this.state.list,
    exportedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sessions-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Очистить историю
clearHistory() {
  if (!confirm('Очистить всю историю сессий?')) return;
  
  this.state.list = [];
  this.state.current = null;
  this.renderSessionHistory();
  this.renderList();
}
```

---

## Implementation Steps

### Step 1: Add HTML Template
- Add Session History Panel container
- Add filters and search input
- Add list and footer

### Step 2: Add CSS Styles
- Panel styles
- List item styles
- Filter and search styles

### Step 3: Update JavaScript
- Add showSessionHistory method
- Add hideSessionHistory method
- Add renderSessionHistory method
- Add exportSessions method
- Add clearHistory method
- Connect to existing session flow

### Step 4: Integration
- Add button to toggle history panel
- Add keyboard shortcut
- Connect to session list

---

## Dependencies
- VueFlow already loaded
- No new npm packages required

---

## Status: PENDING

---

## Implementation Log

### Step 1: Add HTML Template - PENDING
- [ ] Add Session History Panel container
- [ ] Add header with filters
- [ ] Add list container
- [ ] Add footer with buttons

### Step 2: Add CSS Styles - PENDING
- [ ] Panel styles
- [ ] List item styles
- [ ] Status badges
- [ ] Filter styles

### Step 3: Update JavaScript - PENDING
- [ ] Add showSessionHistory function
- [ ] Add hideSessionHistory function
- [ ] Add renderSessionHistory function
- [ ] Add exportSessions function
- [ ] Add clearHistory function
- [ ] Connect to session flow

### Step 4: Integration - PENDING
- [ ] Add toggle button
- [ ] Add keyboard shortcut
- [ ] Test functionality
