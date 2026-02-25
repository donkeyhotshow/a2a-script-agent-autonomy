# UI Визуализация - Анализ Flux от Сервера

## Реальный обмен данными (из simulations/fix-vue-imports)

```
┌─────────┐                                    ┌─────────┐
│ КЛИЕНТ  │ ─── task_request (POST) ────────▶ │ СЕРВЕР  │
│         │                                    │          │
│ Input:  │                                    │ Returns: │
│ "виправити│                                   │ proposedActions[]
│  імпорти"│ ◀─── response.json ───────────── │   │
└─────────┘                                    └────┬────┘
                                                   │
                           approve_action (POST) ──┘
                                                   │
                              Returns:             │
│         │ ◀── executingAction (step 1) ─────── │
│ UI:     │     history: []                       │
│ [▶ Run] │                                        │
└────┬────┘                                        │
     │                                             │
     └───── continue (POST) ──────────────────────▶
                                                   │
                              Returns:             │
│         │ ◀── executingAction (step 2) ──────── │
│ UI:     │     history: [step1 completed]        │
│ [Next]  │     previousStep: {result}           │
└────┬────┘                                        │
     │                                             │
     └───── continue (POST) ──────────────────────▶
                                                   │
                              Returns:             │
│         │ ◀── executingAction (step 3) ──────── │
│ UI:     │     history: [step1, step2 completed] │
│ [Next]  │     previousStep: {result}           │
└────┬────┘                                        │
     │                                             │
     └───── continue (POST) ──────────────────────▶
                                                   │
                              Returns:             │
│         │ ◀── finalResult ──────────────────────│
│ UI:     │     status: completed                │
│ [Done]  │                                        │
└─────────┘                                        │
```

---

## Поток данных по шагам

### Шаг 1: Отправка задачи (task_request)

**Request:**
```json
{
  "action": "task_request",
  "task": "виправити імпорти у vue компонентах"
}
```

**Response - что приходит от сервера:**
```json
{
  "proposedActions": [
    {
      "actionId": "fix-vue-imports",
      "title": "Виправити зламані імпорти у Vue файлах",
      "subActions": [
        { "actionId": "vue-import-detect", "title": "Визначити зламані імпорти" },
        { "actionId": "vue-import-resolve", "title": "Вирішити правильні шляхи" },
        { "actionId": "vue-import-apply", "title": "Застосувати виправлення" },
        { "actionId": "vue-import-cleanup", "title": "Очистити" }
      ]
    }
  ]
}
```

**Что рендерим на канвасе:**
```
┌─────────────────────────────────────────┐
│ 📋 TASK: виправити імпорти             │
├─────────────────────────────────────────┤
│ Proposed Actions:                       │
│                                         │
│ [✓] vue-import-detect                   │
│ [ ] vue-import-resolve                  │
│ [ ] vue-import-apply                    │
│ [ ] vue-import-cleanup                  │
│                                         │
│ [▶ Approve & Run]  [Dismiss]            │
└─────────────────────────────────────────┘
```

---

### Шаг 2: Подтверждение (approve_action)

**Request:**
```json
{
  "action": "approve_action",
  "selectedAction": { "actionId": "fix-vue-imports" }
}
```

**Response:**
```json
{
  "executingAction": {
    "actionId": "vue-import-detect",
    "title": "Визначити зламані імпорти",
    "dsl": { "script": "vue-import-detect", "input": {...} }
  },
  "nextSteps": [
    { "actionId": "vue-import-resolve" },
    { "actionId": "vue-import-apply" },
    { "actionId": "vue-import-cleanup" }
  ]
}
```

**Что рендерим:**
```
┌─────────────────────────────────────────┐
│ ⚡ EXECUTING: vue-import-detect         │
├─────────────────────────────────────────┤
│ Status: ● Running                       │
│ ─────────────────────────────────────  │
│ Input:                                  │
│ { filePattern: "**/*.vue" }            │
│ ─────────────────────────────────────  │
│ [■ Stop]  [View Logs]                  │
└─────────────────────────────────────────┘

Connected to next:
┌─────────────────────────────────────────┐
│ ⏳ vue-import-resolve (pending)         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ⏳ vue-import-apply (pending)           │
└─────────────────────────────────────────┘
```

---

### Шаг 3: Результат первого шага (continue)

**Request:**
```json
{ "action": "continue" }
```

**Response:**
```json
{
  "context": {
    "execution": {
      "actionId": "fix-vue-imports",
      "currentActionId": "vue-import-resolve",
      "history": [
        { "step": 1, "actionId": "vue-import-detect", "status": "completed", "result": { "broken_imports": 3 } }
      ]
    }
  },
  "previousStep": {
    "result": { "broken_imports": 3 }
  },
  "executingAction": {
    "actionId": "vue-import-resolve",
    "title": "Вирішити правильні шляхи"
  },
  "nextSteps": [...]
}
```

**Что рендерим:**
```
Шаг 1 (выполнен):
┌─────────────────────────────────────────┐
│ ✓ vue-import-detect                     │
│ broken_imports: 3                        │
└─────────────────────────────────────────┘
         │
         ▼
Шаг 2 (выполняется):
┌─────────────────────────────────────────┐
│ ⚡ vue-import-resolve                  │
│ Input:                                  │
│ broken_imports: [...]                   │
└─────────────────────────────────────────┘
         │
         ▼
Шаг 3 (ожидает):
┌─────────────────────────────────────────┐
│ ⏳ vue-import-apply                     │
└─────────────────────────────────────────┘
```

---

### Шаг 4-5: Продолжение выполнения

Аналогично шагу 3, только history растёт:

```
history: [
  { step: 1, actionId: "vue-import-detect", status: "completed", result: {...} },
  { step: 2, actionId: "vue-import-resolve", status: "completed", result: {...} },
  { step: 3, actionId: "vue-import-apply", status: "completed", result: {...} }
]
```

---

### Шаг 5: Финальный результат (finalResult)

**Response:**
```json
{
  "finalResult": {
    "summary": {
      "broken_imports_found": 3,
      "patches_resolved": 3,
      "files_fixed": 3,
      "cleanup_count": 0
    }
  }
}
```

**Что рендерим:**
```
┌─────────────────────────────────────────┐
│ ✅ COMPLETE: fix-vue-imports            │
├─────────────────────────────────────────┤
│ Summary:                                │
│ ┌─────────────────────────────────────┐ │
│ │ broken_imports_found: 3             │ │
│ │ patches_resolved: 3                 │ │
│ │ files_fixed: 3                      │ │
│ │ cleanup_count: 0                    │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ [📋 Copy Report] [🔄 New Task]          │
└─────────────────────────────────────────┘
```

---

## Динамическое создание узлов

### Алгоритм

```
1. ПОЛУЧАЕМ response ОТ СЕРВЕРА

2. ЕСЛИ response.proposedActions:
   → Рендерим PROPOSED_ACTIONS_PANEL
   → Показываем кнопку [▶ Approve]

3. ЕСЛИ response.executingAction:
   → Рендерим EXECUTING_ACTION_NODE
   → Показываем кнопку [■ Stop] / [Continue]

4. ЕСЛИ response.previousStep:
   → Рендерим RESULT_NODE для previousStep
   → Связываем с текущим

5. ЕСЛИ response.history:
   → Рендерим всеcompleted nodes
   → Строим цепочку

6. ЕСЛИ response.finalResult:
   → Рендерим COMPLETE_NODE
   → Показываем summary
```

---

## Соответствие данных → UI элементы

| Ключ в response | UI Элемент | Что делает |
|-----------------|------------|------------|
| `proposedActions` | **Action Proposal Panel** | Показывает список предложенных действий |
| `executingAction` | **Executing Node** | Текущее выполняемое действие |
| `executingAction.dsl` | **DSL Viewer** | Показывает код/скрипт |
| `previousStep` | **Result Node** | Результат предыдущего шага |
| `history` | **Chain Nodes** | Цепочка выполненных действий |
| `nextSteps` | **Pending Nodes** | Следующие ожидающие действия |
| `fallbackActions` | **Fallback Panel** | Альтернативные действия |
| `finalResult` | **Complete Node** | Итоговый результат |

---

## UI Панели (согласно ответам сервера)

### 1. Task Input Panel (всегда вверху)

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Task: [виправити імпорти у vue компонентах...     ] [Send]│
└─────────────────────────────────────────────────────────────┘
```

### 2. Proposed Actions Panel (если есть proposedActions)

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Proposed Actions                              [Collapse] │
├─────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ ⚡ fix-vue-imports (0.95)                                 │ │
│ │    Виправити зламані імпорти у Vue файлах                │ │
│ │                                                            │ │
│ │    SubActions (4):                                        │ │
│ │    ├─ vue-import-detect      [▶]                        │ │
│ │    ├─ vue-import-resolve     [▶]                        │ │
│ │    ├─ vue-import-apply       [▶]                        │ │
│ │    └─ vue-import-cleanup     [▶]                        │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                              [▶ Approve]  [Dismiss]            │
└─────────────────────────────────────────────────────────────┘
```

### 3. Execution Progress Panel (если есть executingAction)

```
┌─────────────────────────────────────────────────────────────┐
│ ⚡ EXECUTING: vue-import-detect                  [Details] │
├─────────────────────────────────────────────────────────────┤
│                                                                 │
│ Progress: ████████░░░░░░░░░░░░░░░░░░░░░░  30%               │
│                                                                 │
│ ───────────────────── Current Step ──────────────────────    │
│ Input: { "filePattern": "**/*.vue" }                          │
│                                                                 │
│ ───────────────────── Previous ───────────────────────────    │
│ └─ (awaiting completion)                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────┘
```

### 4. Action Chain Panel (если есть history)

```
┌─────────────────────────────────────────────────────────────┐
│ 🔗 Action Chain                                              │
├─────────────────────────────────────────────────────────────┤
│                                                                 │
│ ✅ 1. vue-import-detect    → broken_imports: 3             │
│      │                                                        │
│      ▼                                                        │
│ ⚡ 2. vue-import-resolve    → (running)                      │
│      │                                                        │
│      ▼                                                        │
│ ⏳ 3. vue-import-apply      → (pending)                      │
│      │                                                        │
│      ▼                                                        │
│ ⏳ 4. vue-import-cleanup    → (pending)                      │
│                                                                 │
│ ─────────────────────────────────────────────────────────     │
│ [Continue]  [Stop All]  [View All Logs]                       │
└─────────────────────────────────────────────────────────────┘
```

### 5. Result Panel (если есть previousStep)

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Result: vue-import-detect                                │
├─────────────────────────────────────────────────────────────┤
│                                                                 │
│ Status: ✅ Completed                                          │
│ Duration: 2.3s                                                │
│                                                                 │
│ Output:                                                       │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ broken_imports: [                                        │ │
│ │   { file: "Login.vue", line: 3, specifier: "../..." },  │ │
│ │   { file: "Register.vue", line: 5, specifier: "../..." },│ │
│ │   { file: "UserCard.vue", line: 2, specifier: "@/..." } │ │
│ │ ]                                                         │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [View Files]  [Copy]  [Use as Input]                          │
└─────────────────────────────────────────────────────────────┘
```

### 6. Final Result Panel (если есть finalResult)

```
┌─────────────────────────────────────────────────────────────┐
│ 🎉 TASK COMPLETE                                             │
├─────────────────────────────────────────────────────────────┤
│                                                                 │
│ Summary:                                                      │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ ✅ broken_imports_found: 3                               │ │
│ │ ✅ patches_resolved: 3                                    │ │
│ │ ✅ files_fixed: 3                                        │ │
│ │ ✅ cleanup_count: 0                                      │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ─────────────────────────────────────────────────────────     │
│ [📋 View Report] [🔄 New Task] [📂 Open Files]                │
└─────────────────────────────────────────────────────────────┘
```

---

## Селекты в шапке (ваше требование)

### #1 Project Select

```html
<select id="projectSelect">
  <option value="">-- Select Project --</option>
</select>
```

**Поведение:**
1. При загрузке → читаем `.carrier/sessions/projects.json`
2. Заполняем options
3. Если сохранённый проект → `trigger('change')` = автоклик
4. При change → грузим `.carrier/sessions/{id}/meta.json`

### #2 Session Select

```html
<select id="sessionSelect" disabled>
  <option value="">-- Session --</option>
</select>
```

**Поведение:**
1. Активируется после выбора проекта
2. При change → грузим `sessions/session-{id}.json`
3. Рендерим messages на канвасе

### #3 Task Input (вместо поиска!)

```html
<input type="text" id="taskInput" placeholder="Що зробити?">
<button id="sendTask">Send</button>
```

**Поведение:**
1. Ввод задачи → POST /api/v1/requests
2. Получаем response → рендерим Proposed Actions Panel
3. Пользователь жмёт Approve → следующий запрос...

---

## Workflow: Полный цикл

```
1. [SELECT PROJECT] → грузим sessions
2. [SELECT SESSION] → грузим messages
3. [TYPE TASK] → POST task_request
4. [SEE PROPOSED] → видим proposedActions
5. [CLICK APPROVE] → POST approve_action
6. [SEE PROGRESS] → видим executingAction + nextSteps
7. [CLICK CONTINUE] → POST continue
8. [SEE RESULT] → видим previousStep + executingAction
9. ...повторяем 7-8 пока не complete
10. [SEE FINAL] → видим finalResult
```

---

## Что реализуем?

1. **Project/Session селекты** в шапке с автокликом
2. **Task Input** вместо поиска
3. **Proposed Actions Panel** - динамически
4. **Execution Progress Panel** - динамически
5. **Action Chain** - связываем узлы
6. **Result Panel** - после каждого шага
7. **Final Result** - в конце

Напишите что из этого приоритетно!