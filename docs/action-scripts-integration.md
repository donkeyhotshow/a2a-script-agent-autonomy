# План: Интеграция Actions в итеративный обмен

> **Относится к:** a2a-server (actions)

## Задачи

- [ ] [Модифицировать request-processor.service.ts для интеграции ActionProcessor](#модифицировать-request-processorservicets-для-интеграции-actionprocessor)
- [ ] [Обновить формат ответа сервера (action_proposal, action_executing)](#обновить-формат-ответа-сервера-action_proposal-action_executing)
- [ ] [Реализовать обработку continue с step_result](#реализовать-обработку-continue-с-step_result)
- [ ] [Обновить клиента для поддержки нового формата](#обновить-клиента-для-поддержки-нового-формата)
- [ ] [Написать тесты для интеграции](#написать-тесты-для-интеграции)

---

### Модифицировать request-processor.service.ts для интеграции ActionProcessor

### Обновить формат ответа сервера (action_proposal, action_executing)

### Реализовать обработку continue с step_result

### Обновить клиента для поддержки нового формата

### Написать тесты для интеграции

---

## Текущий протокол

```
Клиент                              Сервер
   │                                   │
   │─── POST /api/sessions ────────▶│
   │    { task: "..." }               │
   │                                   │
   │◀─── response { context,          │
   │          execute }                │
   │                                   │
   │─── POST /api/v1/requests ──────▶│
   │    { context: { execution },     │
   │      result: { script: {...} } } │  (action-key shape)
   │                                   │
   │◀─── response { context,          │
   │          execute }                │
   │                                   │
   ... повторяем пока не completed ...
```

## Интеграция ActionProcessor

### Модификация request-processor.service.ts

```typescript
import { actionProcessor } from '../actions/action-processor.js';

// В processOneRequest():

// 1. Проверяем task (top-level поле)
if (ctx['task']) {
  const taskText = ctx['task'];
  
  // Ищем подходящий action
  const result = await actionProcessor.processTaskRequest(sessionId, taskText);
  
  if (result.continue) {
    // Возвращаем execute с action-key shape
    return {
      outcome: 'execute',
      context: result.message.context,
      execute: result.message.execute,
    };
  }
}

// 2. Проверяем result с action-key shape
if (ctx['result']) {
  const result = await actionProcessor.processStepResult(
    sessionId,
    ctx['execution'].step,
    ctx['result']  // уже содержит action-key: { script: {...} }
  );
  
  return {
    outcome: result.continue ? 'execute' : 'completed',
    context: result.message.context,
    execute: result.message.execute,
    finalResult: result.finalResult,
  };
}
```

### Формат ответа сервера (execute с action-key shape)

```json
{
  "context": {
    "task": "Исправить сломанные импорты",
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
      "code": "export default async function run(...) { ... }"
    }
  }
}
```

### Формат запроса клиента (result с action-key shape)

```json
{
  "context": {
    "task": "Исправить сломанные импорты",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-detect"
    }
  },
  "result": {
    "script": { "broken_imports": [...] }
  }
}
```

---

**Дата:** 2026-02-24
**Статус:** Готов к реализации
