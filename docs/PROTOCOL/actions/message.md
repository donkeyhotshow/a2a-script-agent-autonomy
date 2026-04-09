# Протокол действия: message

## Описание

Действие `message` используется для отображения текстовых сообщений пользователю. Это **только UI действие** - оно не требует ответа от клиента.

## Направление

```
Server → Client API → Web UI (message)
(Нет result - это однонаправленное действие)
```

## Особенности

- Это **terminal action** - не требует взаимодействия пользователя
- Сообщение отображается и поток переходит к следующему шагу автоматически
- Может использоваться для отображения прогресса, статуса, уведомлений

## Формат execute

### Server → Client API

```json
{
  "execute": {
    "message": {
      "text": "Загрузка файлов...",
      "type": "info",
      "duration": 2000
    }
  }
}
```

### Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `text` | string | ✅ | Текст сообщения |
| `type` | string | ❌ | Тип сообщения (info, success, warning, error) |
| `duration` | number | ❌ | Длительность показа в мс (0 = бесконечно) |
| `dismissible` | boolean | ❌ | Можно ли закрыть сообщение |
| `action` | object | ❌ | Действие с сообщением |

## Типы сообщений

| Тип | Описание | Иконка |
|-----|----------|--------|
| `info` | Информационное сообщение | ℹ️ |
| `success` | Успешное выполнение | ✅ |
| `warning` | Предупреждение | ⚠️ |
| `error` | Ошибка | ❌ |
| `loading` | Загрузка | ⏳ |

## Примеры

### Пример 1: Простое информационное сообщение

**Server → Client API (execute):**
```json
{
  "execute": {
    "message": {
      "text": "Начинаю анализ проекта..."
    }
  }
}
```

### Пример 2: Сообщение об успехе

```json
{
  "execute": {
    "message": {
      "text": "✅ Файл успешно сохранен",
      "type": "success",
      "duration": 3000
    }
  }
}
```

### Пример 3: Сообщение об ошибке

```json
{
  "execute": {
    "message": {
      "text": "❌ Ошибка: Файл не найден",
      "type": "error",
      "dismissible": true
    }
  }
}
```

### Пример 4: Сообщение с действием

```json
{
  "execute": {
    "message": {
      "text": "Найдено 5 файлов с ошибками",
      "type": "warning",
      "action": {
        "label": "Посмотреть",
        "handler": "show-errors"
      }
    }
  }
}
```

### Пример 5: Прогресс выполнения

```json
{
  "execute": {
    "message": {
      "text": "Обработка: 45%",
      "type": "loading",
      "progress": 45
    }
  }
}
```

## Формат для UI отображения

### Client API → Web UI

После получения execute.message, Client API транслирует его в Web UI:

```json
{
  "execute": {
    "ui": {
      "state": "message",
      "message": {
        "text": "Загрузка...",
        "type": "info"
      }
    }
  }
}
```

## Обработка на Client API

### Логика отображения

1. **Получить message** от Server
2. **Определить тип** сообщения
3. **Сформировать UI команду** для Web
4. **Отобразить** в интерфейсе
5. **Перейти к следующему шагу** (автоматически если duration > 0)

### Timeout handling

```javascript
// Если duration > 0, автоматически переходим к следующему шагу
if (message.duration > 0) {
  setTimeout(() => {
    // Автоматический переход
    proceedToNextStep();
  }, message.duration);
}
```

## Поток выполнения

```
1. Server формирует execute.message
2. Client API получает запрос
3. Client API определяет параметры отображения
4. Client API транслирует в UI команду
5. Web UI отображает сообщение
6. Если duration > 0 → автоматический переход к следующему шагу
7. Server НЕ ждет result (нет return trip)
```

## Ограничения

- Максимальная длина текста: 5000 символов
- Максимальная длительность: 60000 мс (1 минута)
- message не требует result

## Связанные файлы

- [server-invoke-response-execute.schema.json](../../json-schemas/server-invoke-response-execute.schema.json)
- [UI-COMMANDS.md](../../json-schemas/UI-COMMANDS.md)

## Следующий шаг

После отправки `execute.message`:
- Server сразу переходит к следующему шагу
- Нет ожидания result
- Переходит к [Этап 3: Выполнение](../../STAGES/03-execution.md) или [Этап 5: Завершение](../../STAGES/05-completion.md)
