# Протокол взаимодействия (new-request-flow)

Цель: стандартизировать ответы сервера и обработку ответов клиентом; описать полный поток Web → Client API → Server. 
Термины: **web** — веб-интерфейс клиента (`a2a-client/web`), **клиент** — `a2a-client`, **Client API** — vite-plugin-a2a (порт 5173), **сервер** — `a2a-server` (порт 3000).

> **См.:** [PROTOCOL.md](PROTOCOL.md), [SCHEMA.md](SCHEMA.md), [simulations/SCHEMA.md](../../simulations/SCHEMA.md)

## Каноничные источники

| Документ | Описание |
|----------|----------|
| [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md) | **Каноничная схема** симуляций - основной источник истины |
| [`simulations/REFERENCE.md`](../../simulations/REFERENCE.md) | Справочник: Actions vs AI-Actions |
| [`a2a-server/docs/LLM-REQUEST-PREP.md`](../../a2a-server/docs/LLM-REQUEST-PREP.md) | Подготовка тела запроса к LLM на сервере (`result` → `history`, `flowControlHint`) |

## Текущая архитектура

- **Web не знает адрес сервера.** Все запросы к серверу идут через Client API (vite-plugin-a2a на порту 5173).
- **Конфигурация на Web:** страница настроек (Settings) для URL Client API; редактор проектов (Projects).
- **Сервер обрабатывает запросы и сохраняет их состояние**, но не хранит долгосрочные пользовательские сессии в традиционном смысле. Каждый запрос ассоциируется с promiseId для отслеживания состояния.

## Поток задачи (Task Flow): Web → Client API → Server

Система поддерживает два типа потоков в зависимости от типа операции и настроек:

### Sync Flow (Для тестирования/симуляций)
*Включается установкой переменной окружения `DEFAULT_SYNC_MODE=1`*
- **Когда:** Простые операции, взаимодействие с формами, выбор вариантов
- **Ответ:** Немедленный объект `execute` с данными формы/ввода
- **Пример использования:** UI взаимодействия, простые действия, автоматизированное тестирование
- **Пример:**
  - `task: "dialog"` → `execute.form.textarea` (прямой диалог)
  - `task: "analyze code"` → `execute.form.choices` (роутер с вариантами)
- **Поток:**
  1. **Web:** поле ввода задачи + кнопка Send → панель с прелоадером
  2. **POST /api/a2a/sessions** (Web → Client API): `{ projectId, task }`
  3. **Client API** сохраняет сессию, проксирует на Server: `{ task }`
  4. **Server** возвращает немедленный результат с `execute.form.textarea` или `execute.form.choices`
  5. **Client API** возвращает `execute.*` в Web
  6. **Прелоадер скрывается** после получения ответа (с учетом минимального времени показа 5000мс)

### Async Flow (PromiseId - По умолчанию)
*Стандартный режим для сложных операций, требующих обработки LLM*
- **Когда:** Сложная обработка ИИ, вызовы LLM, длительные операции
- **Ответ:** `promiseId` для опроса статуса/результата
- **Пример использования:** Генерация ИИ, сложный анализ, внешние вызовы API
- **Поток:**
  1. **Web:** поле ввода задачи + кнопка Send → панель с прелоадером
  2. **POST /api/a2a/sessions** (Web → Client API): `{ projectId, task }`
  3. **Client API** сохраняет сессию, проксирует на Server: `{ task }`
  4. **Server** возвращает `{ promiseId, status: "pending" }`
  5. **Client API** опрашивает статус через `GET /api/a2a/sessions/{id}/async` (предпочтительно для веб-UI) или `GET /api/a2a/sessions/{id}/promise/{promiseId}` (legacy)
  6. **После завершения** Server возвращает результат:
     - Если задача содержит "dialog" — `execute.form.textarea` (прямой диалог)
     - Иначе `execute.form.choices` (роутер с вариантами)
  7. **Client API** возвращает `execute.*` в Web
  8. **Прелоадер скрывается** после получения финального результата

#### Обнаружение типа потока
- **Запрос от Client:** Включите `sync: true` для принудительного синхронного ответа
- **Ответ от Server:** `sync: true` + `execute` = синхронный, `promiseId` = асинхронный

Дополнительные сценарии:
- [Remote web viewer + local client workflow](REMOTE-CLIENT-WEB.md) — когда ты сидишь на телефоне и весь лог/история остаются на локальном клиенте.

Подробно: [WEB-UI.md](WEB-UI.md), [API-SERVER.md](API-SERVER.md). 
Формат первого запроса к серверу: только `{ task }` (см. [simulations/SCHEMA.md](../../simulations/SCHEMA.md)).
