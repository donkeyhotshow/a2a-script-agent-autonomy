# Режим 2: отладка и улучшения

> **Цель:** быстро анализировать ошибки, восстанавливать состояние и предоставлять подробные диагностические задачи.
> **Контекст:** сюда попадают только активные pending-файлы и логи, остальные задачи уже завершены или отключены.

## Принцип работы

- Обход очереди `/tasks/pending/` и чтение `/logs/archive/{client, server, sessions, console}`.
- Сбор консольных ошибок, network-запросов и состояния браузера.
- Формирование диагностической задачи с описанием, последовательностью и гипотезами.
- Удаление pending-файлов только после подтверждённого решения с результатом в архиве.
- После фикса система возвращается в режим 1, когда очередь пуста.

## Текущая диагностика: диалог не отвечает

1. Сохранить состояние страницы через скрипт, собираем `projectSelect`, `taskFlowPanel`, `sessionWindows`.
2. Перехватить ошибки и network во `fetch`, записать в localStorage.
3. Экспортировать `a2a_debug_state` через POST к `/api/a2a/sessions`.
4. Считать результат, искать `networkRequests` и `consoleErrors`.
5. Создать диагностическую задачу и отправить в очередь, пока не найдена причина.

### Тест-скрипт
```javascript
(function savePageState() {
  const state = {
    url: window.location.href,
    timestamp: new Date().toISOString(),
    projectSelect: document.getElementById('projectSelect')?.value,
    taskFlowPanel: document.getElementById('task-flow-panel'),
    sessionWindows: document.querySelectorAll('.session-window'),
    consoleErrors: [],
    networkRequests: []
  };
  window.onerror = (msg) => state.consoleErrors.push(msg);
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const result = await originalFetch(...args);
    state.networkRequests.push({
      url: args[0],
      method: args[1]?.method,
      status: result.status
    });
    return result;
  };
  localStorage.setItem('a2a_debug_state', JSON.stringify(state, null, 2));
  console.log('[Debug] State saved to localStorage');
  return state;
})();
```

### Экспорт
```bash
curl -X POST http://localhost:5173/api/a2a/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "system",
    "task": "Прочитай localStorage ключ a2a_debug_state и сохрани в logs/archive/debug/state-{timestamp}.json"
  }'
```

```bash
curl http://localhost:5173/api/a2a/sessions/{id}
```

## Типичные проблемы
| Проблема | Признак | Решение |
|----------|---------|---------|
| POST возвращает 404 | `/next` отсутствует | Проверяем роуты и токены |
| asyncPending = true | polling не возвращает статус | Перезапуск Ollama, повторный запрос |
| execute = null | LLM не отвечает | Проверка health, retry, fallback |
| Форма не рендерится | `no form` в execute | Анализ router/response |

## Диагностическая задача
- Структура: `description`, `whatHappened`, `howItHappened`, `problem`, `hypotheses`.
- Пример:
  ```json
  {
    "task": {
      "description": "Диалог не отвечает",
      "whatHappened": "POST /next вернул 200, потом тишина",
      "howItHappened": "1. POST /next\n2. 200\n3. Polling ждёт 5 минут\n4. Ответ не приходит",
      "problem": "asyncPending остаётся true",
      "hypotheses": [
        "LLM не отвечает",
        "polling теряет соединение",
        "сервер не сохраняет результат"
      ]
    }
  }
  ```
- Сохраняем копию состояния в `/logs/archive/{timestamp}/diagnostics/`.

## Возврат в режим 1
- Убедиться, что все диагностические задачи удалены из `/tasks/pending/`.
- Обновить `/runtime/status.json` и `mode1_context.json`.
- Подтвердить завершение через `curl -X POST http://localhost:5173/api/a2a/sessions/{id}/next` с результатом.

## Источники данных
- `/logs/archive/client/` — запросы/ответы между UI и API.
- `/logs/archive/server/` — invoke-ответы, ошибки. К ним привязан `traceId`.
- `/logs/archive/sessions/` — session dump, результат исполнений.
- `/logs/archive/console/` — ошибки браузера.
- В отладке используем `runtime/retrospective-{timestamp}.json`, чтобы понять временную шкалу.

## Контрольные точки
- Сохраняем snapshot состояния (projectSelect, panel, windows).
- После экспорта всегда проверяем `networkRequests` и `consoleErrors`.
- В диагностических задачах указываем `retrySteps` и `fallback`.
- Если появляется новая гипотеза — обновляем `hypotheses` в JSON и добавляем в `/tasks/pending/`.

## Рабочие подсказки
- Использовать `curl http://localhost:5173/api/a2a/sessions/{id}/async` для мониторинга polling.
- Проверять `asyncPending` и состояние `sessionWindow`.
- При `status = pending` > 3 циклов — обновляем описание или escalate.

## Отчёты
- После каждой диагностической работы добавляем запись в `/logs/archive/{timestamp}/diagnostics/notes.txt`.
- Ретроспектива: что случилось, причины, выбранные решения, `lessons`.
