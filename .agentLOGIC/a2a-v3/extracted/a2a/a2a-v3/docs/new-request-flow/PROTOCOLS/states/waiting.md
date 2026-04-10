# Протокол состояния: waiting

## Описание

Состояние `waiting` означает, что система ожидает ввод от пользователя для продолжения выполнения.

## Когда используется

- Требуется выбор пользователя (form.choices)
- Требуется ввод данных (form.textarea)
- Длительная операция на стороне AI Hub (execute.wait)

## Формат

### Server → Client API

```json
{
  "execute": {
    "form": {
      "title": "Выберите действие",
      "choices": [
        { "id": "option1", "label": "Вариант 1" },
        { "id": "option2", "label": "Вариант 2" }
      ]
    }
  },
  "context": {
    "execution": {
      "status": "waiting"
    }
  }
}
```

### UI трансляция (Client API → Web UI)

**Важно:** Client API (a2a-client/packages/sdk) добавляет UI команды.

Server возвращает только form:
```json
{
  "execute": {
    "form": {
      "title": "Выберите действие",
      "choices": [...]
    }
  }
}
```

Client API добавляет ui state:

```json
{
  "execute": {
    "ui": {
      "state": "waiting",
      "message": "Выберите действие"
    },
    "form": {
      "title": "Выберите действие",
      "choices": [...]
    }
  }
}
```

## Типы waiting

### 1. Ожидание ввода пользователя (form.choices / form.textarea)

Когда есть `execute.form` с `choices` или `input` - это ожидание пользователя:

```json
{
  "execute": {
    "form": {
      "title": "Выберите действие",
      "choices": [
        { "id": "fix", "label": "Исправить" },
        { "id": "skip", "label": "Пропустить" }
      ]
    }
  }
}
```

### 2. Ожидание сервера (execute.wait)

Когда есть `execute.wait` - это длительная операция на стороне AI Hub. `SessionStore.setExecute` подавляет форму и эмитит событие `wait`:

```json
{
  "execute": {
    "wait": {
      "message": "AI обрабатывает запрос...",
      "progress": 50
    }
  }
}
```

## Client API поведение

### Ожидание ввода пользователя (form.choices / form.textarea)

```javascript
async function handleWaiting(execute) {
  // Рендерим форму только если есть execute.form с choices или input
  if (execute.form && (execute.form.choices?.length || execute.form.textarea)) {
    renderForm(execute.form);
    const userInput = await waitForUserInput();
    return sendResult(userInput);
  }
}
```

### Ожидание сервера (execute.wait)

```javascript
// SessionStore.setExecute проверяет наличие execute.wait
// Если есть execute.wait - форма НЕ отображается, эмитится событие 'wait'
// AppTask.setupLoaderIndicator слушает событие 'wait' и показывает loader

function handleServerWaiting(execute) {
  // Vite plugin (stepRoutes.js) делает polling к A2A Server
  // Web UI реагирует на события SessionStore: wait / promisePending
  
  // Форма НЕ отображается, показывается только loader
  showLoader(execute.wait?.message);
}
```

## Таймауты

| Параметр | Значение | Описание |
|----------|----------|----------|
| User wait timeout | 5 минут | Таймаут ожидания пользователя |
| Promise poll timeout | 5 минут | Таймаут опроса Promise |

## Примеры

### Пример 1: Выбор из списка

**Server → Client API:**
```json
{
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        { "id": "auto", "label": "Автоматически" },
        { "id": "manual", "label": "Вручную" }
      ]
    }
  }
}
```

**Client API → Web UI (добавлен ui state):**
```json
{
  "execute": {
    "ui": {
      "state": "waiting"
    },
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [...]
    }
  }
}
```

**Web UI → Client API (result):**
```json
{
  "result": {
    "form": {
      "choice": "auto"
    }
  }
}
```

### Пример 2: Длительная обработка

**Server → Client API:**
```json
{
  "promiseId": "promise_abc",
  "status": "pending"
}
```

**Client API → Web UI:**
```json
{
  "execute": {
    "ui": {
      "state": "waiting",
      "message": "Анализирую код...",
      "progress": 30,
      "spinner": true
    }
  }
}
```

## Связанные файлы

- [PROMISE-WAITING.md](../../STAGES/simulations/PROMISE-WAITING.md)
- [UI-COMMANDS.md](../../json-schemas/UI-COMMANDS.md)
- [form](../actions/form.md)

## Следующий шаг

После получения ввода:
- Переходит к [Этап 4: Результат](../../STAGES/04-result.md)
