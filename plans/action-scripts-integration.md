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
   │─── POST /api/v1/requests ────────▶│
   │    { context: { new_task } }      │
   │                                   │
   │◀─── response { context, action } ─│
   │                                   │
   │─── POST /api/v1/requests ────────▶│
   │    { context: { continue },       │
   │      files: [ результат ] }       │
   │                                   │
   │◀─── response { context, action } ─│
   │                                   │
   ... повторяем пока не completed ...
```

## Интеграция ActionProcessor

### Модификация request-processor.service.ts

```typescript
import { actionProcessor } from '../actions/action-processor.js';

// В processOneRequest():

// 1. Проверяем new_task
if (ctx['new_task']) {
  const taskText = parseTaskText(ctx);
  
  // Ищем подходящий action
  const result = await actionProcessor.processTaskRequest(sessionId, taskText);
  
  if (result.continue) {
    // Возвращаем action_proposal с кодом
    return {
      outcome: 'action_proposal',
      context: result.message.context,
      action: result.message.action,
    };
  }
}

// 2. Проверяем continue с результатом выполнения
if (ctx['continue'] && ctx['step_result']) {
  const result = await actionProcessor.processStepResult(
    sessionId,
    ctx['step_id'],
    ctx['step_result']
  );
  
  return {
    outcome: result.continue ? 'action_executing' : 'completed',
    context: result.message.context,
    action: result.message.action,
  };
}
```

### Формат ответа сервера

```json
{
  "context": {
    "version": "1.0",
    "session_id": "xxx",
    "tasks": [{ "id": "fix-vue-imports", "status": "in_progress" }]
  },
  "action": {
    "id": "fix-vue-imports",
    "currentStep": {
      "id": "vue-import-detect",
      "title": "Определить сломанные импорты",
      "code": "export default async function run(...) { ... }"
    },
    "nextSteps": [
      { "id": "vue-import-resolve", "title": "Разрешить пути" },
      { "id": "vue-import-apply", "title": "Применить исправления" },
      { "id": "vue-import-cleanup", "title": "Очистить" }
    ]
  }
}
```

### Формат запроса клиента (continue)

```json
{
  "context": {
    "version": "1.0",
    "session_id": "xxx",
    "continue": true,
    "step_id": "vue-import-detect",
    "step_result": { "broken_imports": [...] }
  }
}
```

---

**Дата:** 2026-02-24
**Статус:** Готов к реализации
