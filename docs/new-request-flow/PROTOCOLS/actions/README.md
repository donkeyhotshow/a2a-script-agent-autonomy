# Протоколы действий (Actions)

## Обзор

Этот раздел содержит детальные протоколы обмена для каждого типа действий (actions) в системе A2A.

## Типы действий

| Action | Файл | Статус | Описание |
|--------|------|--------|----------|
| `read-file` | [read-file.md](actions/read-file.md) | ✅ | Чтение содержимого файла |
| `write-file` | [write-file.md](actions/write-file.md) | ✅ | Запись данных в файл |
| `execute-command` | [execute-command.md](actions/execute-command.md) | ✅ | Выполнение shell команд |
| `script` | [script.md](actions/script.md) | ✅ | Выполнение JavaScript в sandbox |
| `rag-search` | [rag-search.md](actions/rag-search.md) | ✅ | RAG поиск с результатами |
| `form` | [form.md](actions/form.md) | ✅ | Интерактивные формы |
| `message` | [message.md](actions/message.md) | ✅ | Отображение сообщений |
| `list-directory` | [list-directory.md](actions/list-directory.md) | 🔶 | Список файлов в директории |
| `grep-search` | [grep-search.md](actions/grep-search.md) | ❌ | Текстовый поиск по файлам |
| `file-exists` | [file-exists.md](actions/file-exists.md) | ❌ | Проверка существования файла |
| `scan-directory` | [scan-directory.md](actions/scan-directory.md) | 🔶 | Сканирование директорий |
| `edit-patch` | [edit-patch.md](actions/edit-patch.md) | ❌ | Применение патча |
| `run-script` | [run-script.md](actions/run-script.md) | ❌ | Запуск предопределенных скриптов |

## Статусы реализации

- ✅ **Реализовано** - полный протокол создан
- 🔶 **Частично** - протокол требует доработки
- ❌ **Не реализовано** - протокол только планируется

## Структура каждого протокола

Каждый протокол действия содержит:

1. **Описание** - что делает действие
2. **Направление** - откуда куда идет запрос
3. **Формат execute** - структура запроса
4. **Формат result** - структура ответа
5. **Примеры** - конкретные примеры JSON
6. **Обработка ошибок** - как обрабатываются ошибки
7. **Связанные файлы** - ссылки на схемы и тесты

## see also

- [Этапы протокола](../STAGES/README.md)
- [JSON Схемы](../json-schemas/README.md)
- [Симуляции](../STAGES/simulations/OVERVIEW.md)
