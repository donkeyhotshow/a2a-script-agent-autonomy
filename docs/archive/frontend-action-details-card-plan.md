# Frontend Action Details Card Plan

## Выбрано пользователем (qtu):
**Action Details Card (детали действия)**

---

## Overview
Добавить улучшенный UI компонент для отображения деталей серверного ответа с предложением действия (action_proposal).

Текущее состояние:
- Показывается только кнопка Approve
- Минимальная информация об action

Новое состояние:
- Полная карточка с деталями действия
- Информация о sub-actions
- Match score и описание
- Улучшенные кнопки действий

---

## Current State
- ✅ Базовое отображение серверных ответов
- ✅ Кнопка Approve
- ❌ Нет детальной карточки с информацией
- ❌ Нет списка sub-actions
- ❌ Нет match score визуализации
- ❌ Нет параметров действия

---

## Plan

### Phase 1: UI Components
- [ ] Создать HTML шаблон для Action Details Card
- [ ] Добавить стили для карточки
- [ ] Интегрировать в панель прогресса действий

### Phase 2: Data Display
- [ ] Показать ID и название действия
- [ ] Показать описание
- [ ] Показать match score (визуальная оценка)
- [ ] Показать список sub-actions с статусами
- [ ] Показать параметры/контекст

### Phase 3: Interaction
- [ ] Кнопка Approve с подтверждением
- [ ] Кнопка Reject (отклонение)
- [ ] Кнопка Edit (редактирование параметров)
- [ ] Раскрытие/скрытие деталей

---

## Files to Modify

### 1. a2a-client/web/index.html
```
html
<!-- Action Details Card (добавить в панель прогресса) -->
<div id="action-details-card" class="action-details-card" style="display: none;">
  <div class="action-card-header">
    <div class="action-title-row">
      <span class="action-icon">⚡</span>
      <span id="actionCardTitle" class="action-card-title">Action</span>
      <span id="actionMatchScore" class="match-score">95%</span>
    </div>
    <button class="btn btn-icon card-close" id="closeActionCard">×</button>
  </div>
  
  <div class="action-card-body">
    <div class="action-description" id="actionDescription">
      Description of the action...
    </div>
    
    <div class="action-subactions">
      <div class="subactions-header">
        <span>Sub-actions</span>
        <span id="subactionsCount">0</span>
      </div>
      <div id="subactionsList" class="subactions-list">
        <!-- Sub-action items will be rendered here -->
      </div>
    </div>
    
    <div class="action-params" id="actionParams">
      <div class="params-header">Parameters</div>
      <div id="paramsContent" class="params-content"></div>
    </div>
  </div>
  
  <div class="action-card-footer">
    <button class="btn btn-reject" id="rejectAction">✕ Reject</button>
    <button class="btn btn-approve" id="approveActionCard">✓ Approve</button>
  </div>
</div>
```

### 2. a2a-client/web/css/style.css
```
css
/* Action Details Card Styles */
.action-details-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin: 12px;
  overflow: hidden;
}

.action-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg3);
  border-bottom: 1px solid var(--border);
}

.action-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-icon {
  font-size: 18px;
}

.action-card-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--fg);
}

.match-score {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.match-score.medium {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.match-score.low {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.card-close {
  background: none;
  border: none;
  color: var(--fg2);
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}

.card-close:hover {
  color: var(--fg);
}

.action-card-body {
  padding: 16px;
}

.action-description {
  color: var(--fg2);
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 16px;
}

.action-subactions {
  margin-bottom: 16px;
}

.subactions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--fg2);
  margin-bottom: 8px;
  text-transform: uppercase;
}

#subactionsCount {
  background: var(--bg3);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.subactions-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.subaction-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 12px;
}

.subaction-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.subaction-icon.pending {
  background: var(--bg3);
  color: var(--fg2);
}

.subaction-icon.running {
  background: #3b82f6;
  color: white;
  animation: pulse 1s infinite;
}

.subaction-icon.completed {
  background: #22c55e;
  color: white;
}

.subaction-icon.failed {
  background: #ef4444;
  color: white;
}

.subaction-name {
  flex: 1;
  color: var(--fg);
}

.subaction-status {
  font-size: 11px;
  color: var(--fg2);
}

.action-params {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.params-header {
  font-size: 12px;
  font-weight: 600;
  color: var(--fg2);
  margin-bottom: 8px;
  text-transform: uppercase;
}

.params-content {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  font-family: monospace;
  font-size: 11px;
  color: var(--fg2);
  overflow-x: auto;
}

.action-card-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg3);
  border-top: 1px solid var(--border);
}

.btn-reject {
  background: transparent;
  color: var(--error);
  border: 1px solid var(--error);
  padding: 8px 16px;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-reject:hover {
  background: var(--error);
  color: white;
}
```

### 3. a2a-client/web/js/sessions.js
```
javascript
// Добавить методы для управления Action Details Card

// Показать карточку с деталями действия
showActionDetailsCard(action) {
  const card = document.getElementById('action-details-card');
  if (!card) return;
  
  // Заполнить данные
  const titleEl = document.getElementById('actionCardTitle');
  const descEl = document.getElementById('actionDescription');
  const scoreEl = document.getElementById('actionMatchScore');
  const countEl = document.getElementById('subactionsCount');
  const listEl = document.getElementById('subactionsList');
  const paramsEl = document.getElementById('paramsContent');
  
  if (titleEl) titleEl.textContent = action.id || 'Action';
  if (descEl) descEl.textContent = action.description || 'No description';
  
  // Match score
  const score = action.matchScore || 0;
  if (scoreEl) {
    scoreEl.textContent = Math.round(score * 100) + '%';
    scoreEl.className = 'match-score';
    if (score < 0.7) scoreEl.classList.add('medium');
    if (score < 0.5) scoreEl.classList.add('low');
  }
  
  // Sub-actions
  const subActions = action.subActions || [];
  if (countEl) countEl.textContent = subActions.length;
  if (listEl) {
    listEl.innerHTML = subActions.map((sub, idx) => `
      <div class="subaction-item">
        <span class="subaction-icon pending">${idx + 1}</span>
        <span class="subaction-name">${this.escape(sub.title || sub.id)}</span>
        <span class="subaction-status">pending</span>
      </div>
    `).join('');
  }
  
  // Parameters
  if (paramsEl) {
    paramsEl.textContent = JSON.stringify(action.parameters || {}, null, 2);
  }
  
  // Показать карточку
  card.style.display = 'block';
  
  // Скрыть старую панель прогресса
  this.hideActionProgress();
}

// Скрыть карточку
hideActionDetailsCard() {
  const card = document.getElementById('action-details-card');
  if (card) card.style.display = 'none';
}

// Обновить статус sub-actions
updateSubActionStatus(stepIndex, status) {
  const listEl = document.getElementById('subactionsList');
  if (!listEl) return;
  
  const items = listEl.querySelectorAll('.subaction-item');
  if (items[stepIndex]) {
    const icon = items[stepIndex].querySelector('.subaction-icon');
    const statusEl = items[stepIndex].querySelector('.subaction-status');
    
    if (icon) {
      icon.className = 'subaction-icon ' + status;
      icon.textContent = status === 'completed' ? '✓' : (status === 'failed' ? '✕' : stepIndex + 1);
    }
    if (statusEl) statusEl.textContent = status;
  }
}

// Добавить обработчики кнопок
initActionDetailsCard() {
  document.getElementById('closeActionCard')?.addEventListener('click', () => {
    this.hideActionDetailsCard();
  });
  
  document.getElementById('approveActionCard')?.addEventListener('click', () => {
    this.approveAction();
  });
  
  document.getElementById('rejectAction')?.addEventListener('click', () => {
    this.rejectAction();
  });
}

// Новый метод: отклонение действия
rejectAction() {
  console.log('Action rejected');
  this.hideActionDetailsCard();
  this.resetActionState();
  this.addActionLog('Action rejected by user', 'warn');
}
```

---

## Implementation Steps

### Step 1: Add HTML Template
- Add Action Details Card HTML to index.html

### Step 2: Add CSS Styles
- Add card styles to style.css

### Step 3: Update JavaScript
- Add showActionDetailsCard method
- Add hideActionDetailsCard method
- Add updateSubActionStatus method
- Add rejectAction method
- Integrate with existing action flow

### Step 4: Connect to Server Response
- Update showApproveButton to show full card
- Update handleActionResponse to use new card

---

## Dependencies
- VueFlow already loaded
- No new npm packages required

---

## Status: COMPLETED

---

## Implementation Log

### Step 1: Add HTML Template - ✅ DONE
- [x] Add Action Details Card container
- [x] Add header with title and match score
- [x] Add body with description and sub-actions
- [x] Add footer with Approve/Reject buttons

### Step 2: Add CSS Styles - ✅ DONE
- [x] Card container styles
- [x] Header styles
- [x] Sub-actions list styles
- [x] Match score badge styles
- [x] Button styles

### Step 3: Update JavaScript - ✅ DONE
- [x] Add showActionDetailsCard function
- [x] Add hideActionDetailsCard function
- [x] Add updateSubActionStatus function
- [x] Add rejectAction function
- [x] Connect to action proposal flow
