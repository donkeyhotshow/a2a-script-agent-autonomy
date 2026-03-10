# Протокол обмена: Этапы

> **Транспорт:** Все этапы используют **async flow с `promiseId`**. Server возвращает `promiseId`, Client API опрашивает статус.

Документация по каждому этапу протокола A2A.

## Обзор этапов

| № | Этап | Направление | Описание |
|---|------|------------|----------|
| 1 | [Инициация](01-initiation.md) | Web → Client API | Первый запрос с задачей пользователя |
| 2 | [Маршрутизация](02-routing.md) | Server → Client → Web | Выбор доступных действий через форму |
| 3 | [Выполнение](03-execution.md) | Bidirectional | Выполнение действий сервером |
| 4 | [Результат](04-result.md) | Client → Server | Возврат результатов выполнения |
| 5 | [Завершение](05-completion.md) | Server → Client → Web | Финализация выполнения |

## Mermaid: Полный поток этапов

```mermaid
flowchart TD
    A[Web UI] -->|"1. Инициация"| B[Client API]
    B -->|request| C[A2A Server]
    C -->|promiseId| B
    B -->|"poll status"| C
    C -->|"2. Маршрутизация (completed)"| B
    B -->|"received (execute.*)"| A
    
    A -->|result.choice| B
    B -->|"3. Выполнение"| C
    C -->|promiseId| B
    B -->|"poll → execute"| C
    B -->|"4. Результат"| A
    
    B -->|result| C
    C -->|"5. Завершение"| B
    B -->|completed| A
    
    C -->|LLM| D[AI Model]
    D -->|response| C
```

> **Примечание:** Server возвращает `promiseId`. Client API опрашивает статус до `completed`, затем возвращает `execute.*` в Web.

## Связанные документы

- [PROTOCOL.md](../PROTOCOL.md) - Основной протокол
- [SCHEMAS.md](../SCHEMAS.md) - JSON схемы
- [DATA-FLOW.md](../DATA-FLOW.md) - Диаграмма потока данных
- [simulations/SCHEMA.md](../../simulations/SCHEMA.md) - Схема симуляций
- [simulations/auto-ai/ACTIONS-MAP.md](../../simulations/auto-ai/ACTIONS-MAP.md) - Карта действий
