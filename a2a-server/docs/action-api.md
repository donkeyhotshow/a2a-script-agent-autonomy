# Action System API Documentation

## Содержание

1. [Обзор](#1-обзор)
2. [Протокол обмена](#2-протокол-обмена)
3. [Формат сообщений](#3-формат-сообщений)
4. [Создание action definition](#4-создание-action-definition)
5. [Примеры](#5-примеры)
6. [API Client](#6-api-client)
7. [Webhook интеграция](#7-webhook-интеграция)

---

## 1. Обзор

### Что такое Actions

**Actions** — это система итеративного выполнения задач без использования AI (no-ai mode). Каждое действие (action)
определяется в Markdown файле и состоит из последовательности шагов (SubActions), которые выполняются на стороне
клиента.

### Как работает итеративный обмен

```
┌─────────┐                              ┌─────────┐
│ Client  │                              │ Server  │
└────┬────┘                              └────┬────┘
     │                                        │
     │  1. task (top-level)                   │
     │ ──────────────────────────────────────>│
     │                                        │ Поиск подходящего action
     │                                        │
     │  2. execute.script (action-key shape)  │
     │ <──────────────────────────────────────│
     │                                        │
     │  [Выполнение кода на клиенте]          │
     │                                        │
     │  3. result.script (action-key shape)   │
     │ ──────────────────────────────────────>│
     │                                        │ Переход к следующему шагу
     │                                        │
     │  4. next execute или завершение        │
     │ <──────────────────────────────────────│
     │                                        │
     │  [Повторять пока есть шаги]            │
     │                                        │
```

### Когда использовать Actions (no-ai mode)

- **Детерминированные задачи** — когда результат предсказуем и не требует AI
- **Автоматизация** — исправление импортов, рефакторинг, миграция кода
- **Производительность** — нет задержек на AI-вызовы
- **Офлайн-режим** — не требует внешних API
- **Тестирование** — предсказуемое поведение для CI/CD

---

## 2. Протокол обмена

### Запрос task (первый запрос)

Инициирует поиск подходящего action по описанию задачи.

**Endpoint:** `POST /api/sessions`

```json
{
  "task": "Исправить сломанные импорты в Vue файлах",
  "projectId": "proj_abc123"
}
```

### Ответ с execute (action-key shape)

Сервер находит подходящий action и возвращает первый шаг для выполнения.

```json
{
  "context": {
    "task": "Исправить сломанные импорты в Vue файлах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-detect"
    }
  },
  "execute": {
    "script": {
      "input": {
        "rootDir": ".",
        "filePattern": "**/*.vue"
      },
      "output": "broken_imports[]",
      "code": "// vue-import-detect.dsl\nconst result = await script.execute('vue-import-detect', { rootDir, filePattern });"
    }
  }
}
```

### Запрос result (action-key shape)

Клиент выполняет код и отправляет результат.

**Endpoint:** `POST /api/v1/requests`

```json
{
  "context": {
    "task": "Исправить сломанные импорты в Vue файлах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-detect"
    }
  },
  "result": {
    "script": {
      "broken_imports": [
        { "file": "src/App.vue", "line": 5, "specifier": "./components/Header" }
      ]
    }
  }
}
```

### Ответ с следующим шагом или завершением

**Следующий шаг:**

```json
{
  "context": {
    "task": "Исправить сломанные импорты в Vue файлах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-resolve"
    }
  },
  "execute": {
    "script": {
      "input": {
        "broken_imports": [
          { "file": "src/App.vue", "line": 5, "specifier": "./components/Header" }
        ]
      },
      "output": "patches[]",
      "code": "// vue-import-resolve.dsl\nconst result = await script.execute('vue-import-resolve', { broken_imports });"
    }
  }
}
```

**Завершение:**

```json
{
  "context": {
    "task": "Исправить сломанные импорты в Vue файлах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-cleanup",
      "status": "completed"
    }
  },
  "execute": {
    "script": {
      "input": {},
      "output": "cleanup_count",
      "code": "// vue-import-cleanup.dsl\nconst result = await script.execute('vue-import-cleanup', {});"
    }
  },
  "finalResult": {
    "action": "fix-vue-imports",
    "summary": {
      "broken_imports_found": 3,
      "files_fixed": 3
    }
  }
}
```

---

## 3. Формат сообщений

### Полный TypeScript интерфейс

```typescript
// ============================================
// Запросы
// ============================================

/** Первый запрос - task */
interface TaskRequest {
  task: string;                    // Описание задачи пользователя
  projectId: string;               // ID проекта
  provider?: string;               // Провайдер (опционально)
}

/** Запрос с результатом выполнения */
interface StepResultRequest {
  context: {
    task: string;
    execution: {
      action: string;              // ID текущего действия
      step: string;                // ID текущего шага
    };
  };
  result: Record<string, any>;      // Результат выполнения (action-key shape)
}

// ============================================
// Ответы
// ============================================

/** Контекст выполнения */
interface ExecutionContext {
  task: string;
  execution: {
    action: string;                // ID текущего действия
    step: string;                  // ID текущего шага
    status?: 'completed';          // Присутствует только при завершении
  };
}

/** Execute с action-key shape */
interface ExecuteBlock {
  script?: {
    input: Record<string, any>;
    output: string;
    code: string;
  };
  'read-file'?: {
    path: string;
  };
  'write-file'?: {
    path: string;
    content: string;
  };
  'rag-search'?: {
    query: string;
  };
  'execute-command'?: {
    command: string;
  };
  form?: {
    choices?: Array<{ id: string; label: string }>;
    input?: Array<{ id: string; label: string; type: string }>;
  };
  message?: string;
}

/** Полный ответ сервера */
interface ServerResponse {
  context: ExecutionContext;
  execute: ExecuteBlock;
  finalResult?: {                  // Присутствует только в последнем ответе
    action: string;
    summary: Record<string, any>;
  };
}

// ============================================
// Результаты выполнения (action-key shape)
// ============================================

/** Результат выполнения скрипта */
interface ScriptResult {
  script: Record<string, any>;      // Данные от скрипта
}

/** Результат чтения файла */
interface ReadFileResult {
  'read-file': {
    path: string;
    content: string;
  };
}

/** Результат записи файла */
interface WriteFileResult {
  'write-file': {
    path: string;
    success: boolean;
  };
}

/** Результат RAG поиска */
interface RagSearchResult {
  'rag-search': {
    results: Array<{ score: number; content: string }>;
    files: string[];
  };
}

/** Результат выполнения команды */
interface ExecuteCommandResult {
  'execute-command': {
    command: string;
    exitCode: number;
    stdout: string;
    stderr: string;
  };
}
```

---

## 4. Создание action definition

### Формат MD файла

Файлы определений actions располагаются в директории `a2a-server/src/actions/definitions/`.

```markdown
# action-id

Краткое описание действия. Используется для поиска подходящего action.

## Sub-actions (N steps)

### 1. step-id-1
Описание первого шага.

**Input:** описание входных данных  
**Output:** описание выходных данных

```typescript
// Код для выполнения на клиенте
export default async function run(input: { ... }): Promise<{ ... }> {
  // Реализация
}
```

### 2. step-id-2

Описание второго шага.

**Input:** данные от предыдущего шага  
**Output:** результат шага

```typescript
// Код второго шага
```

## Context

- Framework: Vue 3
- Build tool: Vite
- Aliases: @ -> resources/js, ~ -> resources

```

### Структура SubActions

Каждый SubAction (шаг) содержит:

| Поле | Описание | Обязательное |
|------|----------|--------------|
| `id` | Уникальный идентификатор шага | Да |
| `title` | Отображаемое название | Да |
| `description` | Подробное описание | Нет |
| `priority` | Приоритет выполнения (меньше = раньше) | Нет (по умолчанию 100) |
| `input` | Описание входных данных | Нет |
| `output` | Описание выходных данных | Нет |
| `dsl` | Определение DSL скрипта | Нет |
| `code` | TypeScript код для выполнения | Нет |

### TypeScript код в блоках

Код в блоках \`\`\`typescript выполняется на клиенте:

```typescript
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Интерфейсы для типизации
interface Input {
  rootDir: string;
  // ... другие параметры
}

interface Output {
  result: string;
  // ... другие поля
}

// Точка входа - async функция run
export default async function run(input: Input): Promise<Output> {
  const root = resolve(input.rootDir || '.');
  
  // Логика выполнения
  
  return { result: 'success' };
}
```

### Контекст выполнения

Секция `## Context` определяет параметры окружения:

```markdown
## Context

- Framework: Vue 3 | React | Angular | Node.js
- Build tool: Vite | Webpack | Rollup | esbuild
- Aliases: @ -> src, ~ -> root
```

---

## 5. Примеры

### Полный пример: fix-vue-imports

Файл: [`fix-vue-imports.md`](../src/actions/definitions/fix-vue-imports.md)

**Шаг 1: vue-import-detect**

```typescript
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

interface BrokenImport {
  file: string;
  line: number;
  specifier: string;
}

const IMPORT_RE = /(?:from\s+|require\s*\(\s*)['"]([^'"]+)['"]/g;

export default async function run(input: { rootDir: string }): Promise<{ broken_imports: BrokenImport[] }> {
  const root = resolve(input.rootDir || '.');
  const broken: BrokenImport[] = [];
  
  const files = collectFiles(root, ['.ts', '.tsx', '.vue']);
  
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      IMPORT_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      
      while ((m = IMPORT_RE.exec(line)) !== null) {
        const spec = stripQuery(m[1] || '');
        if (isPackageImport(spec)) continue;
        
        if (spec.startsWith('.')) {
          const resolved = resolve(dirname(file), spec);
          if (!resolveExists(resolved)) {
            broken.push({ file, line: i + 1, specifier: spec });
          }
        }
      }
    }
  }
  
  return { broken_imports: broken };
}
```

**Шаг 2: vue-import-resolve**

```typescript
// Разрешает правильные пути для сломанных импортов
// Вход: broken_imports[] от предыдущего шага
// Выход: patches[] с исправленными путями
```

**Шаг 3: vue-import-apply**

```typescript
// Применяет исправления к файлам
// Вход: patches[] от предыдущего шага
// Выход: fixed_files[]
```

**Шаг 4: vue-import-cleanup**

```typescript
// Очищает временные файлы
// Вход: none
// Выход: cleanup_count
```

### Пример с ошибкой

Если шаг завершается с ошибкой:

```json
{
  "context": {
    "task": "Исправить сломанные импорты в Vue файлах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-resolve"
    }
  },
  "execute": {
    "message": "Step vue-import-resolve failed: Cannot resolve module './missing'"
  },
  "error": "Cannot resolve module './missing'"
}
```

### Пример с неизвестной задачей

Если подходящий action не найден:

```json
{
  "context": {
    "task": "Deploy to production"
  },
  "actions": [],
  "fallbackActions": [
    {
      "mode": "auto-ai",
      "title": "AI Action Generator",
      "description": "Згенерувати новий екшен за допомогою LLM",
      "fallbackType": "llm_generation"
    }
  ]
}
```

---

## 6. API Client

### Использование async-client.js

```javascript
const { ApiClient } = require('@a2a/api-client');

const client = new ApiClient({
  serverUrl: 'http://localhost:3000/api/v1',
  token: 'your-jwt-token',
  clientId: 'my-app',
});
```

### Метод executeAction()

Автоматически выполняет все шаги action:

```javascript
const result = await client.executeAction({
  task: 'Исправить сломанные импорты',
  sessionId: 'sess_abc123',
  projectPath: '/path/to/project',
  scriptRunner: myScriptRunner, // Опционально для выполнения кода
}, {
  onStep: (step, result) => {
    console.log(`Executing step: ${step.title}`);
  },
  onStatus: (status) => {
    console.log(`Status: ${status.status}`);
  },
  onComplete: (result) => {
    console.log('Action completed:', result);
  },
  onError: (error) => {
    console.error('Error:', error);
  },
});
```

### Метод continueAction()

Ручное управление шагами:

```javascript
// Шаг 1: Отправить задачу
const { sessionId } = await client.createSession({
  projectId: 'proj_abc123',
  task: 'Исправить импорты',
});

let result = await client.getSession(sessionId);

// Шаг 2: Выполнить шаги вручную
while (result.execute?.script) {
  const step = result.context.execution.step;
  const code = result.execute.script.code;
  
  // Выполнить код шага
  const scriptResult = await executeStepCode(code);
  
  // Отправить результат (action-key shape)
  result = await client.sendResult(sessionId, {
    context: {
      task: result.context.task,
      execution: result.context.execution
    },
    result: {
      script: scriptResult  // action-key shape
    }
  });
}

console.log('Final result:', result.finalResult);
```

### Интеграция с ScriptRunner

```javascript
const { ScriptRunner } = require('@a2a/script-runner');

const scriptRunner = new ScriptRunner({
  timeout: 30000,
  sandbox: true,
});

const result = await client.executeAction({
  task: 'Исправить импорты',
  scriptRunner,
  projectPath: process.cwd(),
});
```

---

## 7. Webhook интеграция

### Обзор

Webhook интеграция позволяет внешним системам получать уведомления о событиях action system.

### Настройка webhook

```javascript
// Конфигурация webhook в .env
WEBHOOK_URL=https://your-server.com/webhooks/a2a
WEBHOOK_SECRET=your-webhook-secret
```

### Формат webhook события

```typescript
interface WebhookEvent {
  id: string;
  type: 'action.started' | 'action.step_completed' | 'action.completed' | 'action.failed';
  timestamp: string;
  data: {
    sessionId: string;
    actionId: string;
    stepId?: string;
    result?: unknown;
    error?: string;
  };
}
```

### Примеры событий

**action.started:**

```json
{
  "id": "evt_abc123",
  "type": "action.started",
  "timestamp": "2026-02-24T05:00:00.000Z",
  "data": {
    "sessionId": "sess_xyz",
    "actionId": "fix-vue-imports"
  }
}
```

**action.step_completed:**

```json
{
  "id": "evt_abc124",
  "type": "action.step_completed",
  "timestamp": "2026-02-24T05:00:05.000Z",
  "data": {
    "sessionId": "sess_xyz",
    "actionId": "fix-vue-imports",
    "stepId": "vue-import-detect",
    "result": {
      "broken_imports": [
        { "file": "src/App.vue", "line": 5, "specifier": "./Header" }
      ]
    }
  }
}
```

**action.completed:**

```json
{
  "id": "evt_abc125",
  "type": "action.completed",
  "timestamp": "2026-02-24T05:00:15.000Z",
  "data": {
    "sessionId": "sess_xyz",
    "actionId": "fix-vue-imports",
    "result": {
      "fixed_files": ["src/App.vue", "src/components/Header.vue"]
    }
  }
}
```

### Обработка webhook на стороне клиента

```javascript
// Express.js пример
const express = require('express');
const crypto = require('crypto');

const app = express();

app.post('/webhooks/a2a', express.json(), (req, res) => {
  // Проверка подписи
  const signature = req.headers['x-webhook-signature'];
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  // Обработка события
  const event = req.body;
  
  switch (event.type) {
    case 'action.started':
      console.log(`Action ${event.data.actionId} started`);
      break;
    case 'action.step_completed':
      console.log(`Step ${event.data.stepId} completed`);
      break;
    case 'action.completed':
      console.log(`Action completed:`, event.data.result);
      break;
    case 'action.failed':
      console.error(`Action failed:`, event.data.error);
      break;
  }
  
  res.status(200).send('OK');
});

app.listen(3001);
```

### Интеграция с CI/CD

```yaml
# GitHub Actions пример
name: Fix Imports

on:
  push:
    branches: [main]

jobs:
  fix-imports:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Run A2A Action
        env:
          A2A_SERVER_URL: ${{ secrets.A2A_SERVER_URL }}
          A2A_TOKEN: ${{ secrets.A2A_TOKEN }}
        run: |
          node scripts/fix-imports.js
```

```javascript
// scripts/fix-imports.js
const { ApiClient } = require('@a2a/api-client');

async function main() {
  const client = new ApiClient({
    serverUrl: process.env.A2A_SERVER_URL,
    token: process.env.A2A_TOKEN,
  });
  
  const result = await client.executeAction({
    task: 'Исправить сломанные импорты',
    projectPath: process.cwd(),
  });
  
  if (result.context.tasks[0]?.status === 'completed') {
    console.log('✅ Imports fixed successfully');
    process.exit(0);
  } else {
    console.error('❌ Failed to fix imports');
    process.exit(1);
  }
}

main().catch(console.error);
```

---

## Приложение A: Коды ошибок

| Код                     | Описание                    |
|-------------------------|-----------------------------|
| `ACTION_NOT_FOUND`      | Подходящий action не найден |
| `STEP_EXECUTION_FAILED` | Ошибка выполнения шага      |
| `INVALID_STEP_RESULT`   | Некорректный результат шага |
| `SESSION_NOT_FOUND`     | Сессия не найдена           |
| `EXECUTION_CANCELLED`   | Выполнение отменено         |

## Приложение B: Ссылки

- [Action Processor](../src/actions/action-processor.ts)
- [Action Service](../src/actions/action-service.ts)
- [Action Executor](../src/actions/action-executor.ts)
- [Action Types](../src/actions/types.ts)
- [API Client](../../a2a-client/packages/api-client/src/async-client.js)
- [Example Action: fix-vue-imports](../src/actions/definitions/fix-vue-imports.md)
