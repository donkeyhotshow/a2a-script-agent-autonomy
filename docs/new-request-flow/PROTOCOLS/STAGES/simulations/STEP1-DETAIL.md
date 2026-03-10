# Детальное описание Шага 1: Инициация и Роутинг

## Обзор

Шаг 1 является критически важным - это точка входа в систему. Здесь пользователь отправляет задачу, а система выполняет роутинг (маршрутизацию) для определения доступных действий.

## Полный поток данных

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ШАГ 1: Инициация и Роутинг                        │
└─────────────────────────────────────────────────────────────────────────────┘

Web UI                    Client API                  A2A Server
  │                           │                           │
  │ { task, projectId }       │                           │
  │──────────────────────────>│                           │
  │                           │ { task }                  │
  │                           │─────────────────────────>│
  │                           │                           │ ┌──────────────┐
  │                           │                           │ │ Router Logic │
  │                           │                           │ │ 1. Parse task│
  │                           │                           │ │ 2. Match     │
  │                           │                           │ │ 3. Generate  │
  │                           │                           │ │    choices   │
  │                           │                           │ └──────────────┘
  │                           │                           │
  │                           │ { context, execute.form } │
  │                           │<───────────────────────────│
  │                           │                           │
  │ { sessionId, execute }   │                           │
  │<──────────────────────────│                           │
```

## Файлы шага

| Файл | Направление | Описание |
|------|-------------|----------|
| `client.json` | Web → Client API | Начальный запрос |
| `request.json` | Client API → Server | Запрос к серверу |
| `response.json` | Server → Client API | Ответ с choices |
| `received.json` | Client API → Web | Ответ для UI |

---

## Детальный разбор каждого файла

### 1. client.json (Web → Client API)

**Путь:** `simulations/dialog/1/client.json`

```json
{
    "task": "диалог",
    "projectId": "123"
}
```

**Поля:**
| Поле | Тип | Обязательный | Описание |
|------|-----|--------------|----------|
| task | string | Да | Описание задачи пользователя |
| projectId | string | Да | ID проекта |

**Обработка на Client API:**
1. Валидация полей
2. Генерация sessionId
3. Привязка к projectId
4. Формирование request.json

---

### 2. request.json (Client API → Server)

**Путь:** `simulations/dialog/1/request.json`

```json
{
  "context": {
    "execution": {
      "action": "task",
      "step": "new"
    }
  },
  "result": {
    "message": "диалог"
  }
}
```

**Поля:**
| Поле | Тип | Обязательный | Описание |
|------|-----|--------------|----------|
| context | object | Да | Контекст выполнения |
| context.execution | object | Да | Информация о действии |
| context.execution.action | string | Да | ID действия ("task" - системное) |
| context.execution.step | string | Да | Текущий шаг ("new" - начальный) |
| result | object | Да | Результат (в данном случае - задача) |
| result.message | string | Да | Текст задачи пользователя |

**Примечание:**
- sessionId и projectId НЕ передаются на сервер (сервер stateless)
- Сервер сам управляет контекстом через execution

---

### 3. response.json (Server → Client API)

**Путь:** `simulations/dialog/1/response.json`

```json
{
  "context": {
    "task": "диалог",
    "execution": {
      "action": "task",
      "step": "router"
    }
  },
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        { "id": "dialog", "label": "AI діалог з користувачем" },
        { "id": "auto-ai", "label": "AI Action Generator" },
        { "id": "task-decomposition", "label": "Декомпозиція задачі" }
      ]
    }
  }
}
```

**Поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| context | object | Контекст для следующего запроса |
| context.task | string | Задача пользователя (эхо) |
| context.execution | object | Текущее состояние выполнения |
| context.execution.action | string | "task" (без изменений) |
| context.execution.step | string | "router" (переключено на роутинг) |
| execute | object | Команда для клиента |
| execute.form | object | Форма для выбора |
| execute.form.title | string | Заголовок формы |
| execute.form.choices | array | Список вариантов |
| execute.form.choices[].id | string | ID варианта |
| execute.form.choices[].label | string | Отображаемый текст |

**Логика сервера (Router):**
1. Анализирует task
2. Определяет доступные действия
3. Генерирует choices
4. Возвращает форму выбора

---

### 4. received.json (Client API → Web)

**Путь:** `simulations/dialog/1/received.json`

```json
{
    "projectId": "123",
    "sessionId": "456",
    "execute": {
      "form": {
        "title": "Оберіть спосіб виконання",
        "choices": [
          { "id": "dialog", "label": "AI діалог з користувачем" },
          { "id": "auto-ai", "label": "AI Action Generator" },
          { "id": "task-decomposition", "label": "Декомпозиція задачі" }
        ]
      }
    }
}
```

**Поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| projectId | string | ID проекта |
| sessionId | string | ID созданной сессии |
| execute | object | Команда для UI |
| execute.form | object | Форма для рендеринга |
| execute.form.title | string | Заголовок |
| execute.form.choices | array | Варианты выбора |

**Обработка на Web UI:**
1. Рендеринг формы с choices
2. Ожидание выбора пользователя
3. Отправка result.choice на следующем шаге

---

## Состояние после Шага 1

| Компонент | Состояние |
|-----------|-----------|
| Web UI | Показывает форму с choices |
| Session | Создана (sessionId: "456") |
| Project | Привязан (projectId: "123") |
| Server Context | task: "диалог", execution: task→router |
| Ожидание | Выбора пользователя (result.choice) |

---

## Переход к Шагу 2

**Следующий шаг начнется когда пользователь выберет действие:**

```json
{
    "projectId": "123",
    "sessionId": "456",
    "result": {
        "choice": "dialog"  // или "auto-ai", "task-decomposition"
    }
}
```

---

## Promise ID и Waiting State

> **Важно:** Если сервер не может ответить сразу (async LLM запрос), используется Promise ID система.

### При ожидании от сервера

Сервер может вернуть:

```json
{
  "promiseId": "abc123",
  "status": "pending",
  "execute": {
    "ui": {
      "state": "waiting",
      "message": "AI обрабатывает запрос...",
      "progress": 30,
      "spinner": true
    }
  }
}
```

### Типы UI состояний

| State | Описание |
|-------|----------|
| `idle` | Ожидание ввода |
| `loading` | Загрузка при инициализации |
| `waiting` | Ожидание Promise от AI |
| `processing` | Активная обработка |
| `error` | Ошибка |
| `success` | Успех |

### При загрузке страницы

1. **Быстрый ответ:** `ui.state: "loading"`
2. **После загрузки:** `ui.state: "idle"` + сессии
3. **При ошибке:** `ui.state: "error"` + retryButton

> Подробнее: [PROMISE-WAITING.md](PROMISE-WAITING.md)

---

## Вариации в других симуляциях

### Coder (Шаг 1)
```json
{
    "task": "допоможи розібратись з кодом",
    "projectId": "123"
}
```
- Те же поля, другая задача
- Choices могут отличаться

### Auto-AI (Шаг 1)
- Аналогичная структура
- Choices могут включать сгенерированные действия

---

## Mermaid: Диаграмма последовательности

```mermaid
sequenceDiagram
    participant W as Web UI
    participant C as Client API
    participant S as A2A Server
    
    W->>C: { task: "диалог", projectId: "123" }
    C->>S: { context: { execution: { action: "task", step: "new" } }, result: { message: "диалог" } }
    
    Note: Router over S анализирует task<br/>Генерирует доступные choices
    
    S->>C: { context: { task: "диалог", execution: { action: "task", step: "router" } }, execute: { form: { choices: [...] } } }
    C->>W: { sessionId: "456", execute: { form: { choices: [...] } } }
    
    Note over W: UI рендерит форму выбора<br/>Ожидает result.choice
```

---

## Ошибки и обработка

| Сценарий | Поведение |
|----------|-----------|
| Пустой task | Возвращает ошибку валидации |
| Неизвестный projectId | Создает новый или ошибка |
| Timeout сервера | Повторная попытка (retry) |
| Server error | Возвращает error в response |

---

## References

- [simulations/dialog/1/client.json](../../../simulations/dialog/1/client.json)
- [simulations/dialog/1/request.json](../../../simulations/dialog/1/request.json)
- [simulations/dialog/1/response.json](../../../simulations/dialog/1/response.json)
- [simulations/dialog/1/received.json](../../../simulations/dialog/1/received.json)
- [SCHEMAS.md](../../SCHEMAS.md)
- [PROTOCOL.md](../../PROTOCOL.md)
