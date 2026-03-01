# Протокол взаимодействия

## Обзор

Протокол определяет формат запросов и ответов между компонентами системы:
- **Web → Client API** (порт 3001)
- **Client API → Server** (порт 3000)

## Схемы запросов/ответов

### 1. Первый запрос: Поиск сервисов (task_request)

Пользователь вводит задачу, система предлагает доступные действия.

**Поток:** Web → Client API (URL содержит sessionId) → Server (stateless)

#### Запрос (Web → Client API)

```typescript
// В URL: POST /api/sessions/:sessionId/tasks
interface TaskRequest {
  task: string;                    // Описание задачи пользователя
  provider?: string;                // Провайдер (опционально)
}
```

**Пример:**
```json
// POST /api/sessions/sess_abcde/tasks
{
  "task": "виправити імпорти у vue компонентах"
}
```

#### Ответ от Server (через Client API)

```typescript
interface ServerResponse {
  context: {
    action: string;                 // task_request, approve_action, step_result
    task: string;
    // НЕТ sessionId/projectId - сервер stateless!
  };
  // ... остальные поля
}
```

interface ProposedAction {
  actionId: string;
  title: string;
  description: string;
  priority: number;
  matchScore: number;
  subActions: SubAction[];
}

interface SubAction {
  actionId: string;
  title: string;
  description: string;
  priority: number;
  input: string;                  // none | broken_imports[] | patches[]
  output: string;                 // broken_imports[] | patches[] | fixed_files[]
}

interface FallbackAction {
  mode: 'auto-ai' | 'task-decomposition';
  title: string;
  description: string;
  fallbackType: 'llm_generation' | 'manual';
}
```

**Пример:**
```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "sessionId": "sess_abcde",
    "projectId": "proj_12345"
  },
  "proposedActions": [
    {
      "actionId": "fix-vue-imports",
      "title": "Виправити зламані імпорти у Vue файлах",
      "description": "Автоматично визначити та виправити проблеми з імпортами",
      "priority": 10,
      "matchScore": 0.95,
      "subActions": [
        {
          "actionId": "vue-import-detect",
          "title": "Визначити зламані імпорти",
          "description": "Сканує Vue файли і знаходить биті імпорти",
          "priority": 10,
          "input": "none",
          "output": "broken_imports[]"
        },
        {
          "actionId": "vue-import-resolve",
          "title": "Вирішити правильні шляхи",
          "description": "На основі списку битих імпортів знаходить правильні шляхи",
          "priority": 9,
          "input": "broken_imports[]",
          "output": "patches[]"
        },
        {
          "actionId": "vue-import-apply",
          "title": "Застосувати виправлення",
          "description": "Застосовує виправлення до файлів",
          "priority": 8,
          "input": "patches[]",
          "output": "fixed_files[]"
        },
        {
          "actionId": "vue-import-cleanup",
          "title": "Очистити тимчасові файли",
          "description": "Видаляє тимчасові файли після роботи",
          "priority": 7,
          "input": "none",
          "output": "cleanup_count"
        }
      ]
    }
  ],
  "fallbackActions": [
    {
      "mode": "auto-ai",
      "title": "AI Action Generator",
      "description": "Згенерувати новий екшен за допомогою LLM",
      "fallbackType": "llm_generation"
    },
    {
      "mode": "task-decomposition",
      "title": "Декомпозиція задачі",
      "description": "Розбити задачу на підзадачі вручну",
      "fallbackType": "manual"
    }
  ]
}
```

---

### 2. Выбор действия (action_selection)

Пользователь выбирает действие из предложенных.

#### Запрос (Web → Client API)

```typescript
interface ActionSelectionRequest {
  action: 'action_selection';
  sessionId: string;
  projectId: string;
  selectedActionId: string;
}
```

**Пример:**
```json
{
  "action": "action_selection",
  "sessionId": "sess_abcde",
  "projectId": "proj_12345",
  "selectedActionId": "fix-vue-imports"
}
```

#### Ответ (Client API → Web)

```typescript
interface ActionSelectionResponse {
  status: 'accepted' | 'rejected';
  selectedAction: ProposedAction;
  currentSubAction?: SubAction;   // Текущее поддействие
  canAuto: boolean;                // Можно ли авто-выполнение
  canContinue: boolean;            // Можно ли продолжить
}
```

---

### 3. Следующий шаг (continue)

Пользователь нажимает "Далее" для выполнения следующего поддействия.

#### Запрос (Web → Client API)

```typescript
interface ContinueRequest {
  action: 'continue';
  sessionId: string;
  projectId: string;
  mode: 'manual' | 'auto';         // manual - пошагово, auto - авто
}
```

**Пример:**
```json
{
  "action": "continue",
  "sessionId": "sess_abcde",
  "projectId": "proj_12345",
  "mode": "manual"
}
```

#### Ответ (Client API → Web)

```typescript
interface ContinueResponse {
  status: 'in_progress' | 'completed' | 'waiting_confirmation';
  currentSubAction?: SubAction;
  stepResult?: StepResult;
  promiseId?: string;              // Для асинхронного выполнения
  canContinue: boolean;
  canStop: boolean;
}

interface StepResult {
  actionId: string;
  status: 'success' | 'error';
  output: unknown;
  logs?: string[];
  filesModified?: string[];
}
```

**Пример:**
```json
{
  "status": "in_progress",
  "currentSubAction": {
    "actionId": "vue-import-resolve",
    "title": "Вирішити правильні шляхи",
    "description": "На основі списку битих імпортів знаходить правильні шляхи",
    "priority": 9,
    "input": "broken_imports[]",
    "output": "patches[]"
  },
  "canContinue": true,
  "canStop": true
}
```

---

### 4. Подтверждение (confirm)

Пользователь подтверждает изменения.

#### Запрос (Web → Client API)

```typescript
interface ConfirmRequest {
  action: 'confirm';
  sessionId: string;
  projectId: string;
  confirmed: boolean;
  files?: FileBlockLike[];         // Файлы для отправки
}

interface FileBlockLike {
  path: string;
  content: string;
}
```

---

### 5. Отмена (cancel)

Пользователь отменяет сессию.

#### Запрос (Web → Client API)

```typescript
interface CancelRequest {
  action: 'cancel';
  sessionId: string;
  projectId: string;
}
```

---

## Web → Client API эндпоинты

### POST /api/sessions
Создать новую сессию.

```typescript
// Request
{
  projectId: string;
  task: string;
  provider?: string;
}

// Response
{
  sessionId: string;
  status: 'pending' | 'ready';
  proposedActions?: ProposedAction[];
  fallbackActions?: FallbackAction[];
}
```

### GET /api/sessions
Получить список всех сессий.

```typescript
// Response
{
  sessions: SessionSummary[];
}

interface SessionSummary {
  sessionId: string;
  projectId: string;
  task: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}
```

### GET /api/sessions/:sessionId
Получить состояние сессии.

```typescript
// Response
{
  sessionId: string;
  projectId: string;
  task: string;
  status: SessionStatus;
  selectedActionId?: string;
  currentSubActionIndex?: number;
  results: StepResult[];
  logs: string[];
}
```

### POST /api/sessions/:sessionId/next
Выполнить следующий шаг.

```typescript
// Request
{
  mode: 'manual' | 'auto';
}

// Response
ContinueResponse
```

### POST /api/sessions/:sessionId/cancel
Отменить сессию.

```typescript
// Response
{
  sessionId: string;
  status: 'cancelled';
}
```

---

## Client API → Server эндпоинты

**ВАЖНО:** Сервер полностью stateless - не хранит сессии. 
- SessionId/ProjectId передаются в URL пути, а не в теле запроса
- Client API сама хранит всю информацию о сессиях

### POST /api/v1/invoke

```typescript
// Request (sessionId/projectId - в URL пути, например /api/v1/sessions/:sessionId/invoke)
{
  context?: {
    action?: string;           // action_proposal, approve_action, step_result
    task?: string;
    message?: string;
    selectedAction?: { actionId: string };
    stepId?: string;
    result?: unknown;
  };
  code_blocks?: FileBlockLike[];
}

// Ответ сервера (stateless - не содержит sessionId)
{
  promiseId: string;
  status: 'pending';
}
```

### GET /api/v1/requests/:promiseId/status
Получить статус запроса.

```typescript
// Response
{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
}
```

### GET /api/v1/requests/:promiseId/result
Получить результат запроса (когда status === 'completed').

```typescript
// Response
{
  status: 'completed';
  result: {
    proposedActions?: ProposedAction[];
    fallbackActions?: FallbackAction[];
    stepResult?: StepResult;
  };
}
```

---

## Статусы сессии

| Статус | Описание |
|--------|----------|
| `pending` | Создана, ожидает выбора действия |
| `ready` | Выбрано действие, готова к выполнению |
| `in_progress` | Выполняются поддействия |
| `waiting_confirmation` | Ожидает подтверждения пользователя |
| `completed` | Все поддействия выполнены |
| `cancelled` | Отменена пользователем |
| `error` | Ошибка при выполнении |

---

## Обработка асинхронных операций (promiseId)

Некоторые операции могут выполняться асинхронно. Сервер возвращает `promiseId` для отслеживания.

### Опрос статуса

```
GET /api/v1/requests/:promiseId/status

// Response
{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
}
```

### Получение результата

```
GET /api/v1/requests/:promiseId/result

// Response (когда status === 'completed')
{
  status: 'completed';
  result: StepResult;
}
```

---

## Схемы файлов

### Session (хранится на Client)

```typescript
interface Session {
  id: string;
  projectId: string;
  task: string;
  status: SessionStatus;
  selectedActionId?: string;
  selectedAction?: ProposedAction;
  currentSubActionIndex: number;
  results: StepResult[];
  logs: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Project (хранится на Client)

```typescript
interface Project {
  id: string;
  name: string;
  path: string;                    // Путь к проекту на файловой системе
  description?: string;
  provider?: string;               // Провайдер для LLM
  createdAt: string;
  updatedAt: string;
}
```

### Config (хранится на Client)

```typescript
interface Config {
  provider: string;                // Текущий провайдер
  apiKeys: Record<string, string>;  // API ключи провайдеров
  serverUrl?: string;              // URL сервера (опционально)
  clientApiUrl?: string;          // URL Client API
}
```
