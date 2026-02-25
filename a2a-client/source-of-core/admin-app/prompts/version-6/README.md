# prompts/version-6

## Структура папок и назначение

- `system/` — Общие системные шаблоны, инструкции, заголовки, футеры
- `types/` — Атомарные инструкции для базовых типов (bool, string, object, array, number, null)
- `actions/` — Действия (load, save, submit, process, reset и т.д.)
- `pages/` — Страницы (Page, DialogsPage, TaskOverview и т.д.)
- `sections/` — Секции (main-qtu-interface, module-header, qtu-content-display-section и т.д.)
- `templates/` — Шаблоны (command-execution-form, question-area и т.д.)
- `validation/` — Валидации (ai-probe-validation и др.)
- `error/` — Ошибки (not_found, validation и др.)
- `batch/` — Пакетные операции
- `condition/` — Условия (equals, and_or_not, nested и др.)
- `call/` — Вызовы внешних команд
- `session/` — Операции с сессией
- `includes/` — Общие блоки для include
- `docs/` — Документация по структурам, стандартам, примерам
- `combos/` — Сценарии-композиции (последовательности include-ов для сложных сценариев)

## Принципы организации

- Каждый файл — атомарный, отвечает за одну функцию/тип/шаблон.
- Вложенные папки — для логической группировки и масштабируемости.
- Общие паттерны (например, update, batch, condition) — в includes/ или system/.
- Документация и стандарты — в docs/ и README.md в каждой папке.
- Ошибки и проблемные кейсы — в error/ и отдельном changelog/issue log.
- Композиции для сложных сценариев — в combos/ (например, full-validation.txt, full-transform.txt).

## Пример структуры файлов

- `types/bool.json`
- `types/object.json`
- `actions/load-ai-probe-questions.json`
- `actions/save-current-answers.json`
- `pages/dialogs-page.json`
- `sections/qtu-user-input-section.json`
- `templates/command-execution-form.json`
- `validation/ai-probe-validation.json`
- `error/not_found.json`
- `batch/simple.json`
- `condition/equals.json`
- `call/command.json`
- `session/set_user.json`
- `includes/update-batch.json`
- `docs/README.md`
- `combos/full-validation.txt`

## Дальнейшие шаги

1. Создать папки и README.md с описанием паттернов в каждой.
2. Перенести/рефакторить существующие файлы в новую структуру, устраняя дубли и ошибки.
3. Вести changelog и фиксировать все проблемы/решения.
4. Для каждой группы файлов — добавить примеры использования и типовые ошибки (docs/).
5. Включить шаблоны для include и композиции сложных сценариев. 