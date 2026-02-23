# Модернизация системы нейронов

**Индекс:** [docs/README.md](README.md)  
**Связано:** [etalon-neuron-activation.md](etalon-neuron-activation.md) | [neurons-and-paths-law.md](neurons-and-paths-law.md)

---

## Текущее состояние

Система нейронов в [`a2a-server/src/neurons/`](../a2a-server/src/neurons/) содержит ~100 нейронов:
- **detect-*** — обнаружение проблем (N+1 queries, XSS, accessibility)
- **suggest-*** — рекомендации по исправлению
- **apply-*** — автоматическое применение
- **generate-*** — генерация кода (CRUD, тесты, компоненты)

Каждый нейрон имеет структуру:
```typescript
interface Neuron {
  id: string;           // neuron-detect-n1-queries
  name: string;         // Detect N1 Queries
  category: string;     // custom_pattern | framework | directory_structure
  triggers: string[];  // ["with(","->load","N+1","eager"]
  knowledge: object;
  actions: { type: 'inject' | 'request_files'; target?: string; items?: string[] }[];
  triggersMode: 'any' | 'all';
  priority: number;
}
```

---

## Что нужно изменить

### 1. Архив текущих нейронов

Переместить текущие нейроны в `archive/neurons-legacy/`:
```
archive/
└── neurons-legacy/
    ├── detect-n1-queries.neuron.ts
    ├── suggest-eager-loading.neuron.ts
    └── ... (все текущие нейроны)
```

Создать `archive/neurons-legacy/README.md` с описанием структуры и принципов.

---

### 2. new_task активирует нейроны анализа задач

**Новая логика:**

```
User → new_task → Server
                ↓
        Анализ детализации задачи
                ↓
        Активация семантических нейронов
                ↓
        Задача → tasks[] (добавляется)
                ↓
        Активированные нейроны → tasks[] (добавляются)
                ↓
        Server → Response (БЕЗ new_task)
```

**Ключевое отличие:**
- Теперь `new_task` не передаётся в ответ сервера
- Задача добавляется в `tasks[]`
- Активированные нейроны добавляются в `tasks[]`

---

### 3. Определение уровня детализации задачи

Нейроны семантики для анализа входящей задачи:

| Тип задачи | Пример | Обработка |
|------------|--------|-----------|
| **Короткая** | "fix bug", "add field" | Требует уточнения контекста проекта |
| **Средняя** | "add user validation with rules" | Понятна структура, нужны файлы |
| **Детальная** | "create API endpoint for..." | Готова к обработке |

**Алгоритм:**
1. Анализ длины `new_task` (символы, слова)
2. Наличие технических терминов (фреймворк, паттерны)
3. Наличие файловых путей
4. Семантический анализ через NLP/embedding

---

### 4. Итеративная обработка

В зависимости от итерации срабатывают разные нейроны:

| Итерация | Цель | Нейроны |
|----------|------|---------|
| **Iter1** | Уточнение контекста | task-semantic-analyzer, project-context-detector |
| **Iter2** | Сбор файлов | file-collector, path-resolver |
| **Iter3** | Анализ кода | code-analyzer (legacy neurons) |
| **IterN** | Внешний AI | external-ai-trigger |

---

### 5. Нейроны для новой архитектуры

Новые нейроны для анализа задач:

```typescript
// task-semantic-analyzer.neuron.ts
export const taskSemanticAnalyzerNeuron: Neuron = {
  id: 'neuron-task-semantic-analyzer',
  name: 'Task Semantic Analyzer',
  category: 'task_analysis',
  triggers: ['*'], // активируется всегда
  knowledge: {},
  actions: [
    { type: 'analyze', target: 'task-detail-level' },
    { type: 'classify', target: 'task-type' },
  ],
  triggersMode: 'all',
  priority: 10, // highest
};

// project-context-detector.neuron.ts  
export const projectContextDetectorNeuron: Neuron = {
  id: 'neuron-project-context-detector',
  name: 'Project Context Detector',
  category: 'task_analysis',
  triggers: ['framework', 'laravel', 'vue', 'inertia', 'api'],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'framework-context' },
  ],
  triggersMode: 'any',
  priority: 9,
};

// file-collector.neuron.ts
export const fileCollectorNeuron: Neuron = {
  id: 'neuron-file-collector',
  name: 'File Collector',
  category: 'context_gathering',
  triggers: ['request_files'],
  knowledge: {},
  actions: [
    { type: 'collect', target: 'required-files' },
  ],
  triggersMode: 'any',
  priority: 8,
};

// external-ai-trigger.neuron.ts
export const externalAiTriggerNeuron: Neuron = {
  id: 'neuron-external-ai-trigger',
  name: 'External AI Trigger',
  category: 'external_ai',
  triggers: ['completed', 'ready-for-ai'],
  knowledge: {},
  actions: [
    { type: 'trigger', target: 'external-ai' },
  ],
  triggersMode: 'any',
  priority: 1, // lowest - последняя итерация
};
```

---

## Структура tasks[] в ответе

```typescript
interface Task {
  id: string;
  type: 'user_task' | 'neuron_task';
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  source: 'user' | 'neuron';
  neuronId?: string; // если создано нейроном
}

// Ответ сервера (iter1)
{
  "tasks": [
    {
      "id": "task-001",
      "type": "user_task",
      "status": "pending",
      "description": "implement user login",
      "source": "user"
    },
    {
      "id": "task-002", 
      "type": "neuron_task",
      "status": "pending",
      "description": "Detect framework and architecture",
      "source": "neuron",
      "neuronId": "neuron-project-context-detector"
    },
    {
      "id": "task-003",
      "type": "neuron_task", 
      "status": "pending",
      "description": "Analyze task detail level",
      "source": "neuron",
      "neuronId": "neuron-task-semantic-analyzer"
    }
  ],
  "context": {
    "taskDetailLevel": "short", // short | medium | detailed
    "needsContext": true,
    "needsFiles": false,
    "readyForAi": false
  }
}
```

---

## Workflow: Полный цикл обработки

```
┌─────────────────────────────────────────────────────────────┐
│  User → POST /api/v1/requests { new_task: "..." }          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  1. TaskDetailAnalyzer                                     │
│     → Определяет уровень детализации (short/medium/detailed)│
│     → Анализирует семантику                                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  2. NeuronActivator (по результатам анализа)                 │
│     short  → [context-detector, question-generator]         │
│     medium → [file-collector, code-analyzer]               │
│     detailed→ [code-analyzer, pattern-detector]            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  3. TaskProcessor                                           │
│     → Добавляет original task → tasks[]                     │
│     → Добавляет activated neurons → tasks[]                  │
│     → Формирует ответ БЕЗ new_task                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Response                                                   │
│  {                                                          │
│    tasks: [user_task, neuron_tasks...],                    │
│    context: { taskDetailLevel, needsContext, needsFiles }  │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Новая категоризация нейронов

| Категория | Назначение | Примеры |
|-----------|------------|---------|
| `task_analysis` | Анализ входящей задачи | semantic-analyzer, detail-level-detector |
| `context_gathering` | Сбор контекста проекта | project-detector, framework-detector |
| `file_management` | Работа с файлами | file-collector, path-resolver |
| `code_analysis` | Анализ кода (legacy) | detect-n1-queries, detect-xss |
| `generation` | Генерация кода | generate-crud, generate-tests |
| `external_ai` | Внешний AI | ai-trigger, completion-handler |

---

## Архив нейронов

Перенос текущих нейронов в `archive/neurons-legacy/`:

```bash
# Создать директорию архива
mkdir -p archive/neurons-legacy

# Переместить текущие нейроны
mv a2a-server/src/neurons/*.neuron.ts archive/neurons-legacy/
```

Создать `archive/neurons-legacy/README.md`:
- Описание структуры нейрона
- Примеры триггеров
- Как мигрировать на новую систему

---

## Миграция

1. **Этап 1:** Создать новые нейроны анализа задач
   - `task-semantic-analyzer.neuron.ts`
   - `project-context-detector.neuron.ts`
   - `file-collector.neuron.ts`

2. **Этап 2:** Обновить `RequestProcessor`
   - Добавить определение уровня детализации
   - Формировать `tasks[]` вместо передачи `new_task`

3. **Этап 3:** Переместить legacy нейроны в архив

4. **Этап 4:** Добавить `external-ai-trigger` для финальной итерации

---

**Дата создания:** 2026-02-23
