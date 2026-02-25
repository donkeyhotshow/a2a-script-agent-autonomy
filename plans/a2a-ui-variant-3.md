# Вариант 4: Floating Panels + Динамические Панели

## Основная концепция

**Каждая задача = отдельная плавающая панель** (как каналы в Discord)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Header: [Project ▼] [Session ▼]                       [⚙️] [?]           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────┐    ┌─────────────────────────────────────────────────┐   │
│   │ TASKS   │    │        TASK PANEL (draggable, resizable)       │   │
│   │ ─────── │    │                                                 │   │
│   │ [+New]  │    │  ┌───────────────────────────────────────────┐  │   │
│   │         │    │  │ 🔍 Input: [ввести задачу...          ][→] │  │   │
│   │ Task 1  │───▶│  └───────────────────────────────────────────┘  │   │
│   │ Task 2  │    │                                                 │   │
│   │ Task 3  │    │  ┌───────────────────────────────────────────┐  │   │
│   │         │    │  │ 📋 Proposed Actions                       │  │   │
│   │         │    │  │ [▶ Approve] [Dismiss]                    │  │   │
│   │         │    │  └───────────────────────────────────────────┘  │   │
│   │         │    │                                                 │   │
│   │         │    │  ┌───────────────────────────────────────────┐  │   │
│   │         │    │  │ ⚡ Executing: vue-import-detect           │  │   │
│   │         │    │  │ [■ Stop] [Continue] [Logs]               │  │   │
│   │         │    │  └───────────────────────────────────────────┘  │   │
│   └─────────┘    └─────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## СИМУЛЯЦИЯ: Кнопки для тестирования UI

Добавьте в интерфейс панель с кнопками для симуляции ответов сервера:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔧 DEBUG / СИМУЛЯЦИЯ                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   [1️⃣ Sim Task Request]   → Симулирует ввод задачи                  │
│   [2️⃣ Sim Approve]       → Симулирует нажатие Approve              │
│   [3️⃣ Sim Continue #1]    → Симулирует Continue (шаг 2)            │
│   [4️⃣ Sim Continue #2]    → Симулирует Continue (шаг 3)            │
│   [5️⃣ Sim Complete]       → Симулирует финальный результат          │
│   [🔄 Reset Panel]        → Сбросить панель                         │
│                                                                         │
│  ───────────────────────────────────────────────────────────────────  │
│                                                                         │
│  📥 Server Response (mock):                                           │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ {                                                                │ │
│  │   "proposedActions": [                                           │ │
│  │     { "actionId": "fix-vue-imports", "subActions": [...] }     │ │
│  │   ]                                                              │ │
│  │ }                                                                │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Mock Данные для симуляции

### Mock 1: Task Request Response

```javascript
const mockTaskRequest = {
  proposedActions: [
    {
      actionId: "fix-vue-imports",
      title: "Виправити зламані імпорти у Vue файлах",
      description: "Автоматично визначити та виправити проблеми з імпортами",
      priority: 10,
      matchScore: 0.95,
      subActions: [
        { actionId: "vue-import-detect", title: "Визначити зламані імпорти", priority: 10 },
        { actionId: "vue-import-resolve", title: "Вирішити правильні шляхи", priority: 9 },
        { actionId: "vue-import-apply", title: "Застосувати виправлення", priority: 8 },
        { actionId: "vue-import-cleanup", title: "Очистити тимчасові файли", priority: 7 }
      ]
    }
  ],
  fallbackActions: [
    { mode: "auto-ai", title: "AI Action Generator" },
    { mode: "manual", title: "Декомпозиція задачі" }
  ]
};
```

### Mock 2: Approve Response

```javascript
const mockApprove = {
  executingAction: {
    actionId: "vue-import-detect",
    title: "Визначити зламані імпорти",
    description: "Сканує Vue файли і знаходить біті імпорти",
    priority: 10,
    dsl: {
      script: "vue-import-detect",
      input: { rootDir: ".", filePattern: "**/*.vue" },
      output: "broken_imports[]"
    }
  },
  nextSteps: [
    { actionId: "vue-import-resolve", title: "Вирішити правильні шляхи" },
    { actionId: "vue-import-apply", title: "Застосувати виправлення" },
    { actionId: "vue-import-cleanup", title: "Очистити" }
  ]
};
```

### Mock 3: Continue #1 Response

```javascript
const mockContinue1 = {
  context: {
    execution: {
      actionId: "fix-vue-imports",
      currentActionId: "vue-import-resolve",
      history: [
        { step: 1, actionId: "vue-import-detect", status: "completed", result: { broken_imports: 3 } }
      ]
    }
  },
  previousStep: {
    actionId: "vue-import-detect",
    result: { broken_imports: 3 }
  },
  executingAction: {
    actionId: "vue-import-resolve",
    title: "Вирішити правильні шляхи",
    description: "На основі списку бітих імпортів знаходить правильні шляхи",
    dsl: {
      script: "vue-import-resolve",
      input: { broken_imports: [...], aliases: { "@": "resources/js" } },
      output: "patches[]"
    }
  },
  nextSteps: [
    { actionId: "vue-import-apply", title: "Застосувати виправлення" },
    { actionId: "vue-import-cleanup", title: "Очистити" }
  ]
};
```

### Mock 4: Continue #2 Response

```javascript
const mockContinue2 = {
  context: {
    execution: {
      actionId: "fix-vue-imports",
      currentActionId: "vue-import-apply",
      history: [
        { step: 1, actionId: "vue-import-detect", status: "completed", result: { broken_imports: 3 } },
        { step: 2, actionId: "vue-import-resolve", status: "completed", result: { patches: 3 } }
      ]
    }
  },
  previousStep: {
    actionId: "vue-import-resolve",
    result: { patches: 3 }
  },
  executingAction: {
    actionId: "vue-import-apply",
    title: "Застосувати виправлення",
    dsl: {
      script: "vue-import-apply",
      input: { patches: [...] },
      output: "fixed_files[]"
    }
  },
  nextSteps: [
    { actionId: "vue-import-cleanup", title: "Очистити" }
  ]
};
```

### Mock 5: Complete Response

```javascript
const mockComplete = {
  context: {
    execution: {
      actionId: "fix-vue-imports",
      currentActionId: "vue-import-cleanup",
      status: "completed",
      history: [
        { step: 1, actionId: "vue-import-detect", status: "completed", result: { broken_imports: 3 } },
        { step: 2, actionId: "vue-import-resolve", status: "completed", result: { patches: 3 } },
        { step: 3, actionId: "vue-import-apply", status: "completed", result: { fixed_files: 3 } },
        { step: 4, actionId: "vue-import-cleanup", status: "completed", result: { cleanup_count: 0 } }
      ]
    }
  },
  previousStep: {
    actionId: "vue-import-apply",
    result: { fixed_files: 3 }
  },
  finalResult: {
    actionId: "fix-vue-imports",
    summary: {
      broken_imports_found: 3,
      patches_resolved: 3,
      files_fixed: 3,
      cleanup_count: 0
    }
  }
};
```

---

## HTML Кнопки для UI

Добавьте в task-panel.html:

```html
<!-- DEBUG CONTROLS -->
<div class="debug-panel" style="background: #1a1a2e; padding: 10px; margin: 10px; border-radius: 8px;">
  <h4 style="margin: 0 0 10px 0; color: #eee;">🔧 СИМУЛЯЦІЯ</h4>
  
  <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
    <button onclick="simTaskRequest()" style="background: #4a90d9; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
      1️⃣ Task Request
    </button>
    
    <button onclick="simApprove()" style="background: #22c55e; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
      2️⃣ Approve
    </button>
    
    <button onclick="simContinue1()" style="background: #f97316; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
      3️⃣ Continue #1
    </button>
    
    <button onclick="simContinue2()" style="background: #f97316; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
      4️⃣ Continue #2
    </button>
    
    <button onclick="simComplete()" style="background: #8b5cf6; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
      5️⃣ Complete
    </button>
    
    <button onclick="resetPanel()" style="background: #6b7280; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
      🔄 Reset
    </button>
  </div>
  
  <div style="background: #0d1117; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #a5d6ff; max-height: 150px; overflow: auto;">
    <pre id="mockResponse" style="margin: 0;">// Натисніть кнопку симуляції...</pre>
  </div>
</div>
```

---

## JavaScript Реализация

```javascript
// Состояние панели
let panelState = {
  status: 'idle',  // idle | proposed | running | completed
  proposedActions: null,
  executingAction: null,
  history: [],
  previousStep: null,
  finalResult: null
};

// Функции симуляции
function simTaskRequest() {
  const response = mockTaskRequest;
  panelState.status = 'proposed';
  panelState.proposedActions = response.proposedActions;
  panelState.fallbackActions = response.fallbackActions;
  
  // Рендерим Proposed Actions секцию
  renderProposedActions(response.proposedActions);
  
  // Показываем в mock viewer
  document.getElementById('mockResponse').textContent = JSON.stringify(response, null, 2);
}

function simApprove() {
  const response = mockApprove;
  panelState.status = 'running';
  panelState.executingAction = response.executingAction;
  panelState.history = [];
  
  // Рендерим Executing секцию
  renderExecuting(response.executingAction);
  renderNextSteps(response.nextSteps);
  
  // Скрываем Proposed Actions
  hideProposedActions();
  
  document.getElementById('mockResponse').textContent = JSON.stringify(response, null, 2);
}

function simContinue1() {
  const response = mockContinue1;
  panelState.executingAction = response.executingAction;
  panelState.history = response.context.execution.history;
  panelState.previousStep = response.previousStep;
  
  // Рендерим
  renderHistory(panelState.history);
  renderPreviousResult(panelState.previousStep);
  renderExecuting(response.executingAction);
  renderNextSteps(response.nextSteps);
  
  document.getElementById('mockResponse').textContent = JSON.stringify(response, null, 2);
}

function simContinue2() {
  const response = mockContinue2;
  panelState.executingAction = response.executingAction;
  panelState.history = response.context.execution.history;
  panelState.previousStep = response.previousStep;
  
  renderHistory(panelState.history);
  renderPreviousResult(panelState.previousStep);
  renderExecuting(response.executingAction);
  renderNextSteps(response.nextSteps);
  
  document.getElementById('mockResponse').textContent = JSON.stringify(response, null, 2);
}

function simComplete() {
  const response = mockComplete;
  panelState.status = 'completed';
  panelState.finalResult = response.finalResult;
  panelState.history = response.context.execution.history;
  panelState.previousStep = response.previousStep;
  panelState.executingAction = null;
  
  // Рендерим Final Result
  renderFinalResult(response.finalResult);
  renderHistory(panelState.history);
  
  document.getElementById('mockResponse').textContent = JSON.stringify(response, null, 2);
}

function resetPanel() {
  panelState = {
    status: 'idle',
    proposedActions: null,
    executingAction: null,
    history: [],
    previousStep: null,
    finalResult: null
  };
  
  // Очистить все секции
  clearAllSections();
  
  document.getElementById('mockResponse').textContent = '// Панель скинута';
}
```

---

## UI Секции (динамические)

### Секция 1: Task Input

```html
<div class="task-section" id="section-input">
  <input type="text" id="taskInput" placeholder="Що зробити? (або натисніть симуляцію)" 
         style="width: 70%; padding: 8px; border-radius: 4px; border: 1px solid #444; background: #1e1e1e; color: white;">
  <button onclick="simTaskRequest()" style="padding: 8px 16px; background: #4a90d9; color: white; border: none; border-radius: 4px;">
    →
  </button>
</div>
```

### Секция 2: Proposed Actions (показывается после mock 1)

```html
<div class="task-section" id="section-proposed" style="display: none;">
  <h4>📋 Proposed Actions</h4>
  <div id="proposed-list"></div>
  <button onclick="simApprove()" class="action-btn approve">▶ Approve</button>
  <button onclick="resetPanel()" class="action-btn">Dismiss</button>
</div>
```

### Секция 3: Executing (показывается после mock 2-4)

```html
<div class="task-section" id="section-executing" style="display: none;">
  <h4>⚡ <span id="executing-title">...</span></h4>
  <div class="progress-bar" style="background: #333; height: 8px; border-radius: 4px;">
    <div class="progress-fill" style="background: #3b82f6; height: 100%; width: 40%; border-radius: 4px;"></div>
  </div>
  <div style="margin-top: 8px;">
    <button onclick="simContinue1()" class="action-btn continue">Continue ▶</button>
    <button onclick="resetPanel()" class="action-btn stop">■ Stop</button>
  </div>
</div>
```

### Секция 4: History Chain

```html
<div class="task-section" id="section-history" style="display: none;">
  <h4>🔗 History</h4>
  <div id="history-chain"></div>
</div>
```

### Секция 5: Final Result (показывается после mock 5)

```html
<div class="task-section" id="section-final" style="display: none;">
  <h4>🎉 TASK COMPLETE</h4>
  <div id="final-summary"></div>
  <button onclick="resetPanel()" class="action-btn">🔄 New Task</button>
</div>
```

---

## Workflow тестирования

1. **Открыть страницу** → Видим только Input
2. **Нажать [1️⃣ Task Request]** → Появляется Proposed Actions
3. **Нажать [2️⃣ Approve]** → Появляется Executing
4. **Нажать [3️⃣ Continue #1]** → Появляется History + Result
5. **Нажать [4️⃣ Continue #2]** → Обновляется History
6. **Нажать [5️⃣ Complete]** → Появляется Final Result
7. **Нажать [🔄 Reset]** → Всё начинается сначала

---

## Проверьте

- [ ] Кнопки отображаются
- [ ] При нажатии появляются секции
- [ ] History обновляется
- [ ] Reset очищает всё
- [ ] Mock Response показывает JSON

Что нужно исправить?