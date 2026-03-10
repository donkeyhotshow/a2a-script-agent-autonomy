# Протокол состояния: waiting

## Описание

Состояние `waiting` означает, что система ожидает ввод от пользователя для продолжения выполнения.

## Когда используется

- Требуется выбор пользователя (form.choices)
- Требуется ввод данных (form.input)
- Длительная операция на стороне AI Hub
- Ожидание подтверждения

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

### 1. Waiting на выбор (choices)

```json
{
  "execute": {
    "form": {
      "choices": [
        { "id": "fix", "label": "Исправить" },
        { "id": "skip", "label": "Пропустить" }
      ]
    }
  }
}
```

### 2. Waiting на ввод (input)

```json
{
  "execute": {
    "form": {
      "title": "Введите данные",
      "input": [
        {
          "name": "name",
          "type": "text",
          "label": "Имя"
        }
      ]
    }
  }
}
```

### 3. Waiting во время Promise

```json
{
  "promiseId": "promise_123",
  "status": "pending",
  "execute": {
    "ui": {
      "state": "waiting",
      "message": "AI обрабатывает запрос...",
      "progress": 50,
      "spinner": true
    }
  }
}
```

## Client API поведение

### Ожидание пользователя

```javascript
async function handleWaiting(execute) {
  // Рендерим UI
  renderForm(execute.form);
  
  // Ждем ввод от пользователя
  const userInput = await waitForUserInput();
  
  // Отправляем result
  return sendResult(userInput);
}
```

### Promise polling с UI

```javascript
async function handlePromiseWaiting(promiseId) {
  // Показываем loading UI
  showLoadingUI("AI обрабатывает...");
  
  // Начинаем polling
  while (true) {
    const status = await pollPromise(promiseId);
    
    if (status === 'completed') {
      // Получаем результат
      const result = await getPromiseResult(promiseId);
      hideLoadingUI();
      return result;
    }
    
    // Обновляем UI
    updateProgress(status.progress);
    
    // Ждем
    await sleep(getBackoffDelay());
  }
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
