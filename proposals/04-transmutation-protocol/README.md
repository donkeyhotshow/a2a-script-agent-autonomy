# Трансмутация (Transmutation)

> **Статус**: Активно
> **Дата**: 2026-03-28

> **Примечание**: Термин "Трансмутация" — это и есть "Серая комната" (Gray Room).
> Красная комната = автоответы на клиенте (Red Room = auto-response).

---

## Терминология

| Кодовое слово | Значение | Где |
|---------------|----------|-----|
| **Серая комната** | Трансмутация | a2a-server |
| **Трансмутация** | Многоразовые операции с данными (после LLM ответа) | НОВОЕ название |
| **Красная комната** | Автоответ на клиенте | a2a-client |
| **Red Room** | Auto-response | Английский эквивалент |

---

## Что такое Трансмутация

**Аналогия:** Красная комната (autoответ клиента) работает с данными клиента. Серая комната (трансмутация) работает с данными от LLM.

```
Клиент                    Сервер                    LLM
  │                          │                       │
  │────── Запрос ────────────>│─────> Запрос ───────>│
  │                          │                       │
  │                          │<───── Ответ ────────│
  │                          │                       │
  │                          │ ▼ трансмутация #1   │
  │                          │   Операции с данными│
  │                          │ ▼ трансмутация #2   │
  │                          │   Ещё операции    │
  │<────── Ответ ────────────│                       │
```

---

## Реализация

### Шаг 1: Сервер — добавить operation history

**Файл:** `a2a-server/src/services/core/request/request.service.ts`

```typescript
interface Operation {
  step: number;
  timestamp: string;
  operation: 'llm-call' | 'compress' | 'filter' | 'metadata' | 'validate';
  result: 'success' | 'error';
  details?: string;
}

interface RequestRecord {
  // ... существующие поля
  operationHistory?: Operation[];
  transmutationCount?: number;
}
```

### Шаг 2: Клиент — error states

**Файл:** `a2a-client/vite-plugin-a2a/storage/newSessions.js`

```javascript
const SESSION_STATUSES = [
  'active', 
  'completed', 
  'corrupt', 
  'error',    // НОВОЕ
  'stopped'   // НОВОЕ
];
```

### Шаг 3: UI — кнопки

- Кнопка Retry (при error)
- Кнопка Stop (остановить)
- Модальное окно с деталями

---

## Файлы для изменения

| Приоритет | Файл | Изменение |
|-----------|------|-----------|
| 1 | `a2a-server/src/services/core/request/request.service.ts` | + Operation |
| 2 | `a2a-server/src/services/core/request-processor/gray-room-orchestrator.ts` | Записывать операции |
| 3 | `a2a-client/vite-plugin-a2a/storage/newSessions.js` | + error, stopped |
| 4 | `a2a-server/src/routes/requests.routes.ts` | + retry, + stop |
| 5 | `a2a-client/web/js/session-data.js` | UI кнопки |

---

## Roadmap

| Этап | Задача | Статус |
|------|--------|--------|
| 1 | operation history | TODO |
| 2 | error states | TODO |
| 3 | retry/stop API | TODO |
| 4 | UI кнопки | TODO |

---

## ��вязанные документы

- [proposals/06-hybrid-combine/README.md](./06-hybrid-combine/README.md) — Гибридный вариант
- [METHODOLOGY-AGENT-SCRIPT.md](../METHODOLOGY-AGENT-SCRIPT.md) — Методология