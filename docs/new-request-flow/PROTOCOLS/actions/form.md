# Протокол действия: form

## Описание

Действие `form` используется для отображения интерактивных форм пользователю. Это один из основных механизмов взаимодействия с пользователем в A2A протоколе.

## Направление

```
Server → Client API → Web UI (execute form)
Web UI → Client API → Server (result form)
```

## Типы форм

### 1. form.choices - Выбор из списка

Используется для предложения пользователю выбора из готовых вариантов.

### 2. form.textarea - Ввод данных

Используется для сбора текстовой информации от пользователя.

### 3. form.mixed - Смешанная форма

Комбинация choices и input.

## Формат execute (choices)

### Server → Client API

```json
{
  "execute": {
    "form": {
      "title": "Выберите действие",
      "choices": [
        { "id": "action-1", "label": "Действие 1" },
        { "id": "action-2", "label": "Действие 2" }
      ]
    }
  }
}
```

### Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `title` | string | ❌ | Заголовок формы |
| `choices` | array | ✅ | Массив вариантов выбора |
| `choices[].id` | string | ✅ | Идентификатор варианта |
| `choices[].label` | string | ✅ | Отображаемый текст |
| `choices[].description` | string | ❌ | Описание варианта |

## Формат execute (input)

### Server → Client API

```json
{
  "execute": {
    "form": {
      "title": "Введите данные",
      "input": [
        {
          "name": "username",
          "type": "text",
          "label": "Имя пользователя",
          "placeholder": "Введите имя",
          "required": true
        },
        {
          "name": "email",
          "type": "email",
          "label": "Email",
          "placeholder": "user@example.com",
          "required": true
        },
        {
          "name": "bio",
          "type": "textarea",
          "label": "О себе",
          "rows": 4
        }
      ]
    }
  }
}
```

### Типы полей ввода

| Тип | Описание | Дополнительные параметры |
|-----|----------|------------------------|
| `text` | Текстовое поле | maxLength, pattern |
| `email` | Email поле | pattern |
| `password` | Пароль | minLength, maxLength |
| `number` | Числовое поле | min, max, step |
| `textarea` | Многострочный текст | rows, cols |
| `select` | Выпадающий список | options |
| `checkbox` | Чекбокс | checked |
| `radio` | Радио кнопки | options |
| `file` | Загрузка файла | accept, multiple |
| `date` | Дата | min, max |

## Формат result

### Client API → Server

```json
{
  "result": {
    "form": {
      "choice": "action-1"
    }
  }
}
```

или для input:

```json
{
  "result": {
    "form": {
      "input": {
        "username": "ivan",
        "email": "ivan@example.com",
        "bio": "Разработчик"
      }
    }
  }
}
```

## Примеры

### Пример 1: Выбор действия (choices)

**Server → Client API (execute):**
```json
{
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        {
          "id": "fix-vue-imports",
          "label": "Виправити зламані імпорти у Vue файлах (автомат)"
        },
        {
          "id": "auto-ai",
          "label": "AI Action Generator — згенерувати екшен за допомогою LLM"
        },
        {
          "id": "task-decomposition",
          "label": "Ручна декомпозиція задачі"
        }
      ]
    }
  }
}
```

**Web UI → Client API (result):**
```json
{
  "result": {
    "form": {
      "choice": "fix-vue-imports"
    }
  }
}
```

### Пример 2: Ввод сообщения (input)

**Server → Client API (execute):**
```json
{
  "execute": {
    "form": {
      "title": "Введите ваше сообщение",
      "input": [
        {
          "name": "message",
          "type": "textarea",
          "label": "Сообщение",
          "placeholder": "Опишите вашу проблему...",
          "rows": 5,
          "required": true
        }
      ]
    }
  }
}
```

**Web UI → Client API (result):**
```json
{
  "result": {
    "form": {
      "input": {
        "message": "привет, мне нужна помощь с исправлением ошибок в коде"
      }
    }
  }
}
```

### Пример 3: Смешанная форма (mixed)

**Server → Client API (execute):**
```json
{
  "execute": {
    "form": {
      "title": "Настройки проекта",
      "choices": [
        { "id": "new", "label": "Создать новый проект" },
        { "id": "existing", "label": "Открыть существующий" }
      ],
      "input": [
        {
          "name": "projectName",
          "type": "text",
          "label": "Название проекта",
          "placeholder": "my-awesome-project"
        }
      ]
    }
  }
}
```

**Web UI → Client API (result):**
```json
{
  "result": {
    "form": {
      "choice": "new",
      "input": {
        "projectName": "a2a-client"
      }
    }
  }
}
```

## Валидация

### Server-side валидация

Сервер должен валидировать:
- Наличие обязательных полей
- Соответствие типов данных
- Соответствие паттернам (regex)

### Клиентская валидация

Client API обеспечивает:
- Проверку перед отправкой
- Отображение ошибок валидации
- Блокировку отправки невалидных данных

### Пример валидации на клиенте

```json
{
  "execute": {
    "form": {
      "input": [
        {
          "name": "email",
          "type": "email",
          "label": "Email",
          "required": true,
          "validation": {
            "pattern": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
            "message": "Введите корректный email"
          }
        },
        {
          "name": "age",
          "type": "number",
          "label": "Возраст",
          "min": 18,
          "max": 120
        }
      ]
    }
  }
}
```

## Обработка ошибок

| Код ошибки | Сообщение | Описание |
|------------|-----------|----------|
| `REQUIRED_FIELD` | Required field | Обязательное поле не заполнено |
| `INVALID_FORMAT` | Invalid format | Неверный формат данных |
| `VALIDATION_FAILED` | Validation failed | Ошибка валидации |
| `CANCELLED` | Form cancelled | Пользователь отменил форму |

## Поток выполнения

```
1. Server формирует execute.form (choices/input/mixed)
2. Client API получает запрос
3. Client API рендерит форму в Web UI
4. Пользователь заполняет форму
5. Web UI валидирует данные
6. Client API отправляет result
7. Server получает result и переходит к следующему шагу
```

## Ограничения

- Максимум 20 полей в форме
- Максимум 50 вариантов выбора
- Таймаут ожидания: 5 минут (по умолчанию)

## Связанные файлы

- [server-invoke-response-execute.schema.json](../../json-schemas/server-invoke-response-execute.schema.json)
- [client-result.schema.json](../../json-schemas/client-result.schema.json)
- [PROTOCOL.md](../../PROTOCOL.md)

## Следующий шаг

После получения `result.form` сервер:
- Если действие завершено → переходит к [Этап 5: Завершение](../../STAGES/05-completion.md)
- Если требуется следующий шаг → переходит к [Этап 3: Выполнение](../../STAGES/03-execution.md)
