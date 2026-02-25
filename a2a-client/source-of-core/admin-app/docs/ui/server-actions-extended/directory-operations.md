# Документация операций с директориями в JSON UI

## Обзор

Модуль Directory в JSON UI предоставляет интерфейс для работы с файловой системой на уровне директорий. Этот модуль
позволяет получать информацию о структуре директорий, содержащихся в них файлах и навигацию между ними. Важной
особенностью модуля является то, что он предоставляет доступ к директориям в режиме "только для чтения", что
обеспечивает дополнительную безопасность.

Основной класс, отвечающий за эти операции, расположен в `AiRudeDepot/StorageDataModules/Directory.php`. Как и другие
модули хранения, он редко используется напрямую, а доступ к нему осуществляется через классы `DataHub` и `Data`.

## Особенности модуля Directory

- Доступ к структуре директорий через унифицированный синтаксис адресов
- Получение списка файлов и поддиректорий в указанной директории
- Режим "только для чтения" для обеспечения безопасности
- Навигация по файловой системе с помощью "хлебных крошек" (breadcrumbs)
- Интеграция с классом `StorageNavigator` для удобной навигации
- Фильтрация файлов по расширениям и паттернам

## Формат адресов модуля Directory

Адреса для модуля Directory следуют следующему формату:

```
directory!путь_к_директории
```

где:

- `путь_к_директории` - относительный или абсолютный путь к директории

### Примеры адресов

| Адрес                      | Описание                                                  |
|----------------------------|-----------------------------------------------------------|
| `directory!`               | Корневая директория хранилища                             |
| `directory!uploads`        | Директория 'uploads' внутри корневой директории хранилища |
| `directory!uploads/images` | Поддиректория 'images' внутри директории 'uploads'        |

## Основные операции

### Получение содержимого директории

Модуль Directory предоставляет доступ к содержимому директорий в режиме "только для чтения". Это означает, что вы можете
получать информацию о файлах и поддиректориях, но не можете изменять их.

```javascript
{
  "action": "update",
  "from": "directory!uploads",
  "to": "buffer:uploadsContent"
}
```

Результат будет содержать список файлов и поддиректорий в формате:

```json
{
  "file1.json": {
    "name": "file1.json",
    "type": "file",
    "size": 1234,
    "modified": "2023-01-01 12:00:00"
  },
  "subdirectory": {
    "name": "subdirectory",
    "type": "directory",
    "itemCount": 5,
    "modified": "2023-01-02 14:30:00"
  }
}
```

### Навигация по директориям

Для навигации по директориям вы можете использовать класс `StorageNavigator`, который предоставляет удобные методы для
работы с директориями:

```javascript
{
  "action": "navigate",
  "path": "directory!uploads/images",
  "to": "buffer:navigation"
}
```

Результат будет содержать информацию о текущей директории, списке файлов и поддиректорий, а также "хлебные крошки" для
навигации назад:

```json
{
  "currentPath": "uploads/images",
  "items": [
    {
      "name": "photo1.jpg",
      "type": "file",
      "path": "directory!uploads/images/photo1.jpg"
    },
    {
      "name": "photo2.jpg",
      "type": "file",
      "path": "directory!uploads/images/photo2.jpg"
    }
  ],
  "breadcrumbs": [
    {
      "name": "Home",
      "path": "directory!"
    },
    {
      "name": "uploads",
      "path": "directory!uploads"
    }
  ]
}
```

## Особенности работы с директориями

### Только чтение

Модуль Directory работает в режиме "только для чтения". Попытки изменить содержимое директорий (создать, удалить или
переименовать файлы) через этот модуль приведут к ошибке:

```javascript
{
  "action": "try",
  "try": [
    {
      "action": "update",
      "from": "Новая директория",
      "to": "directory!uploads/new"
    }
  ],
  "catch": [
    {
      "action": "update",
      "from": "Ошибка: Directory storage is read-only",
      "to": "output.error"
    }
  ]
}
```

### Доступ к файлам

Для работы с содержимым файлов в директориях следует использовать модуль File:

```javascript
{
  "action": "batch",
  "actions": [
    {
      // Получение списка файлов в директории
      "action": "update",
      "from": "directory!uploads",
      "to": "buffer:files"
    },
    {
      // Чтение содержимого конкретного файла
      "action": "update",
      "from": "file!uploads/{buffer:files.0.name}",
      "to": "buffer:fileContent"
    }
  ]
}
```

## Интеграция с классом StorageNavigator

Класс `StorageNavigator` предоставляет удобные методы для навигации по директориям:

### Получение списка элементов

```javascript
{
  "action": "navigate.items",
  "path": "directory!uploads",
  "to": "buffer:items"
}
```

### Получение "хлебных крошек"

```javascript
{
  "action": "navigate.breadcrumbs",
  "path": "directory!uploads/images",
  "to": "buffer:breadcrumbs"
}
```

### Создание полноценного файлового менеджера

Сочетание модуля Directory с другими модулями хранения позволяет создать полноценный файловый менеджер:

```javascript
{
  "action": "batch",
  "actions": [
    {
      // Получаем текущий путь из сессии
      "action": "update",
      "from": "session:fileManager.currentPath",
      "to": "buffer:currentPath"
    },
    {
      // Если путь не задан, используем корневую директорию
      "action": "if",
      "condition": "!{buffer:currentPath}",
      "then": [
        {
          "action": "update",
          "from": "",
          "to": "buffer:currentPath"
        }
      ]
    },
    {
      // Получаем содержимое текущей директории
      "action": "update",
      "from": "directory!{buffer:currentPath}",
      "to": "buffer:directoryContent"
    },
    {
      // Получаем "хлебные крошки" для навигации
      "action": "navigate.breadcrumbs",
      "path": "directory!{buffer:currentPath}",
      "to": "buffer:breadcrumbs"
    },
    {
      // Формируем результат
      "action": "update",
      "from": {
        "currentPath": "{buffer:currentPath}",
        "content": "{buffer:directoryContent}",
        "breadcrumbs": "{buffer:breadcrumbs}"
      },
      "to": "output"
    }
  ]
}
```

## Интеграция с другими модулями

Модуль Directory часто используется совместно с другими модулями хранения:

1. **File** - для работы с содержимым файлов в директориях
2. **Buffer** - для временного хранения результатов директорий
3. **Session** - для хранения информации о текущей директории при навигации

## Примеры использования

### Просмотр содержимого директории

```javascript
{
  "action": "update",
  "from": "directory!uploads",
  "to": "buffer:uploadsContent"
}
```

### Фильтрация файлов по расширению

```javascript
{
  "action": "batch",
  "actions": [
    {
      "action": "update",
      "from": "directory!uploads",
      "to": "buffer:allFiles"
    },
    {
      "action": "filter",
      "from": "buffer:allFiles",
      "where": "ends_with(key, '.json')",
      "to": "buffer:jsonFiles"
    }
  ]
}
```

### Создание списка изображений для галереи

```javascript
{
  "action": "batch",
  "actions": [
    {
      "action": "update",
      "from": "directory!uploads/images",
      "to": "buffer:imageFiles"
    },
    {
      "action": "map",
      "from": "buffer:imageFiles",
      "select": {
        "url": "/uploads/images/{key}",
        "name": "{value.name}",
        "size": "{value.size}",
        "modified": "{value.modified}"
      },
      "to": "buffer:galleryImages"
    }
  ]
}
```

## Лучшие практики

1. **Безопасность** - Не храните чувствительные данные в директориях, доступных через модуль Directory
2. **Организация** - Поддерживайте четкую структуру директорий для облегчения навигации
3. **Производительность** - При работе с большими директориями используйте фильтрацию и пагинацию
4. **Кэширование** - Кэшируйте результаты запросов к директориям для оптимизации производительности
5. **Интеграция с File** - Используйте модуль File для работы с содержимым файлов

## Ограничения

1. **Только чтение** - Модуль Directory не поддерживает операции записи
2. **Производительность** - При работе с очень большими директориями могут возникать проблемы с производительностью
3. **Безопасность** - Необходимо контролировать доступ к определенным директориям

## Взаимосвязь с классами Laravel

Модуль Directory использует классы Laravel для работы с файловой системой:

| Операция Directory                | Метод Laravel                 |
|-----------------------------------|-------------------------------|
| Получение списка файлов           | `Storage::files($path)`       |
| Получение списка директорий       | `Storage::directories($path)` |
| Проверка существования директории | `Storage::exists($path)`      |
| Получение информации о файле      | `Storage::getMetadata($path)` |

## Дополнительные ресурсы

- [Документация Laravel Filesystem](https://laravel.com/docs/10.x/filesystem)

<!-- [Документация класса StorageNavigator](../../task-3/storage-navigator.md) -->
<!-- [Документация операций с файлами](../../module-creating/2-actions-on-server/file-operations.md) -->
<!-- [Документация по взаимосвязи классов](../../task-3/class-relationships.md) --> 
