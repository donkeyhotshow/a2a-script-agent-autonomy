## 3. Структурные операции (`include`)

Структурные операции отвечают за композицию UI путем включения одного JSON-файла в другой.

### Основные характеристики

- **Синтаксис**: Определяются через `"type": "operation"`.
- **Модульность**: Позволяют создавать реиспользуемые блоки UI.
- **Композиция**: Поддерживают сборку сложных интерфейсов из простых компонентов.

**Важно:** Эти операции выполняются **на сервере** при обработке JSON-структуры перед отправкой клиенту.

### Структура операции `include`

```json
{
  "type": "operation",
  "action": "include",
  "source": "модуль/путь/к/файлу"
}
```

- `type`: Указывает, что это операция (всегда `"operation"`).
- `action`: Тип операции  `"include"`.
- `source`: Путь к включаемому JSON-файлу.

### Пример использования

Корневой файл страницы:

```json
{
  "type": "div",
  "props": { "class": "page-container" },
  "children": [
    {
      "type": "operation",
      "action": "include",
      "source": "landing-main-page/sections/header"
    },
    {
      "type": "operation",
      "action": "include",
      "source": "landing-main-page/sections/hero"
    },
    {
      "type": "operation",
      "action": "include",
      "source": "landing-main-page/sections/services"
    },
    {
      "type": "operation",
      "action": "include",
      "source": "landing-main-page/sections/footer"
    }
  ]
}
```

### Структура операции `add`

- **Назначение:** Позволяет вставить содержимое другого JSON-файла (как массив, если источник не массив) в текущее
  местоположение **внутри массива `children`**. Это полезно для добавления блоков UI из отдельных файлов, не заменяя
  собой элемент `operation` (в отличие от `include`).

```json
{
  "type": "operation",
  "action": "add",
  "source": "модуль/путь/к/файлу"
}
```

- `type`: Всегда `"operation"`.
- `action`: Тип операции `"add"`.
- `source`: Путь к JSON-файлу, содержимое которого нужно добавить.

> Примеры использования см. в [Примерах](./examples.md).
