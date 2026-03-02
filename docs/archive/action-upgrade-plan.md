# План апгрейда на формат Action

## Текущее состояние

### Что уже работает

1. **Action System** - серверная часть готова:
    - [`action-registry.ts`](a2a-server/src/actions/action-registry.ts) - загрузка MD файлов
    - [`action-parser.ts`](a2a-server/src/actions/action-parser.ts) - парсинг MD с извлечением TypeScript кода
    - [`action-service.ts`](a2a-server/src/actions/action-service.ts) - управление выполнением
    - [`action-processor.ts`](a2a-server/src/actions/action-processor.ts) - интеграция с протоколом
    - [`types.ts`](a2a-server/src/actions/types.ts) - типы SubAction с полем `code`

2. **Script Runner** - клиентская часть готова:
    - [`a2a-client/packages/script-runner/src/index.js`](a2a-client/packages/script-runner/src/index.js) - VM2-based
      execution

3. **Тесты проходят** - `npx tsx src/actions/test-actions.ts`

### Что нужно доделать

## Этап 1: Интеграция в request-processor.service.ts

### 1.1 Добавить обработку new_task

В [`request-processor.service.ts`](a2a-server/src/services/request-processor.service.ts) добавить:

```typescript
// В начале processOneRequest(), после инициализации:

// ========================================
// ACTION MODE: Проверяем new_task для no-ai
// ========================================
if (ctx['new_task']) {
  const taskText = parseTaskText(ctx);
  
  // Ищем подходящий action
  const result = await actionProcessor.processTaskRequest(sessionId, taskText);
  
  if (result.continue && result.message.action) {
    // Нашли action - возвращаем предложение с кодом
    return {
      context: result.message.context,
      message: result.message.message,
      action: result.message.action,
    };
  }
  
  // Action не найден - продолжаем обычный flow с AI
}
```

### 1.2 Добавить обработку continue с step_result

```typescript
// После обработки new_task:

if (ctx['continue'] && ctx['step_result']) {
  const stepId = ctx['step_id'] as string;
  const stepResult = ctx['step_result'];
  
  const result = await actionProcessor.processStepResult(
    sessionId, 
    stepId, 
    stepResult
  );
  
  return {
    context: result.message.context,
    message: result.message.message,
    action: result.message.action,
  };
}
```

## Этап 2: Формат MD файлов

### 2.1 Структура MD файла

```markdown
# Action ID: fix-vue-imports

## Title
Исправить сломанные импорты в Vue файлах

## Description
Автоматическое исправление импортов с учетом алиасов Vite

## Priority
100

## Context
```json
{
  "framework": "Vue 3",
  "buildTool": "Vite",
  "aliases": { "@": "resources/js", "~": "resources" }
}
```

## Triggers

- исправить импорты
- vue import
- сломанные импорты

## SubActions

### Step 1: vue-import-detect

**Title:** Определить сломанные импорты
**Input:** none
**Output:** broken_imports[]

```typescript
// Код для выполнения на клиенте
import { glob } from 'glob';
import fs from 'fs';

export default async function detect() {
  const files = await glob('**/*.vue');
  const broken = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    // ... логика обнаружения
  }
  
  return { broken_imports: broken };
}
```

### Step 2: vue-import-resolve

**Title:** Разрешить правильные пути
**Input:** broken_imports[]
**Output:** patches[]

```typescript
export default async function resolve({ broken_imports }) {
  // ... логика разрешения
  return { patches: [...] };
}
```

```

### 2.2 Парсер уже поддерживает

- Извлечение метаданных из заголовков
- Извлечение TypeScript кода из блоков ```typescript
- Создание SubAction с полем code

## Этап 3: Протокол обмена

### 3.1 Запрос new_task

**Клиент отправляет:**
```json
{
  "context": {
    "new_task": "исправить импорты в vue файлах",
    "session_id": "sess-123"
  }
}
```

**Сервер отвечает:**

```json
{
  "context": {
    "session_id": "sess-123",
    "tasks": [{
      "id": "fix-vue-imports",
      "type": "analyze",
      "status": "in_progress",
      "progress": 0
    }]
  },
  "message": "Найден action: Исправить сломанные импорты",
  "action": {
    "id": "fix-vue-imports",
    "title": "Исправить сломанные импорты в Vue файлах",
    "currentStep": {
      "id": "vue-import-detect",
      "title": "Определить сломанные импорты",
      "code": "import { glob } from 'glob';\n..."
    },
    "nextSteps": [
      { "id": "vue-import-resolve", "title": "Разрешить пути" },
      { "id": "vue-import-apply", "title": "Применить исправления" },
      { "id": "vue-import-cleanup", "title": "Очистить" }
    ]
  }
}
```

### 3.2 Запрос continue с результатом

**Клиент отправляет:**

```json
{
  "context": {
    "continue": true,
    "session_id": "sess-123",
    "step_id": "vue-import-detect",
    "step_result": {
      "broken_imports": [
        { "file": "App.vue", "import": "@/components/Button" }
      ]
    }
  }
}
```

**Сервер отвечает:**

```json
{
  "context": {
    "session_id": "sess-123",
    "tasks": [{
      "id": "fix-vue-imports",
      "type": "analyze",
      "status": "in_progress",
      "progress": 25
    }]
  },
  "message": "Шаг выполнен. Переходим к следующему: Разрешить пути",
  "action": {
    "currentStep": {
      "id": "vue-import-resolve",
      "title": "Разрешить правильные пути",
      "code": "export default async function resolve(...) {...}"
    },
    "nextSteps": [
      { "id": "vue-import-apply", "title": "Применить исправления" },
      { "id": "vue-import-cleanup", "title": "Очистить" }
    ]
  }
}
```

### 3.3 Завершение

**Сервер отвечает:**

```json
{
  "context": {
    "session_id": "sess-123",
    "tasks": [{
      "id": "fix-vue-imports",
      "type": "analyze",
      "status": "completed",
      "progress": 100
    }]
  },
  "message": "Выполнение завершено. Исправлено 5 файлов.",
  "action": null
}
```

## Этап 4: Клиентская интеграция

### 4.1 Обработка action в ответе

В [`async-client.js`](a2a-client/packages/api-client/src/async-client.js):

```javascript
// При получении ответа с action:
if (response.action && response.action.currentStep?.code) {
  // Выполнить код на клиенте
  const result = await scriptRunner.execute(
    response.action.currentStep.code,
    { /* контекст */ }
  );
  
  // Отправить результат обратно
  await this.continue(sessionId, stepId, result);
}
```

### 4.2 Script Runner уже готов

```javascript
// a2a-client/packages/script-runner/src/index.js
import { VM } from 'vm2';

export async function execute(code, context = {}) {
  const vm = new VM({
    sandbox: context,
    console: 'inherit',
  });
  
  return vm.run(code);
}
```

## Этап 5: Тестирование

### 5.1 Unit тесты

- [x] Тест парсинга MD с TypeScript блоками
- [x] Тест actionProcessor.processTaskRequest
- [x] Тест actionProcessor.processStepResult
- [x] Тест итеративного обмена

### 5.2 Integration тесты

- [x] Полный цикл fix-vue-imports
- [x] Обработка ошибок при выполнении кода
- [x] Timeout при долгом выполнении

## Приоритеты реализации

1. **Высокий**: Интеграция в request-processor.service.ts
2. **Высокий**: Тестирование итеративного обмена
3. **Средний**: Обработка ошибок на клиенте
4. **Низкий**: UI для отображения прогресса

## Файлы для изменения

| Файл                                                                                    | Изменения                              |
|-----------------------------------------------------------------------------------------|----------------------------------------|
| `a2a-server/src/services/request-processor.service.ts`                                  | Добавить обработку new_task и continue |
| [definitions/fix-vue-imports.md](a2a-server/src/actions/definitions/fix-vue-imports.md) | Обновить формат с TypeScript кодом     |
| [definitions/README.md](a2a-server/src/actions/definitions/README.md)                   | Ссылки на планы и код                  |
| `a2a-client/packages/api-client/src/async-client.js`                                    | Добавить обработку action              |
| `a2a-client/packages/script-runner/`                                                    | Добавить тесты                         |

## Риски

1. **Безопасность**: Код выполняется на клиенте - нужен sandbox (VM2 уже есть)
2. **Совместимость**: Старые клиенты могут не понимать action - нужен fallback
3. **Timeout**: Долгое выполнение кода - нужен таймаут в script-runner
