# Component Structure Standards

1. Явно укажите, какая информация отсутствует или вызывает сомнения.
2. Запросите у пользователя разрешение вопроса через систему QTU.
3. Не продолжайте выполнение задачи, пока не получите подтверждение или разъяснение.

**При работе с файлами:**
- **Для файлов типа `Instructions`:** Строго следовать правилам в [`instruction-file-standard.md`](/docs/ui/core-concepts/instruction-file-standard.md). Проводить глубокий анализ и применять жесткие требования. QTU используется только для выяснения связей и использования (`call`, `file!`). **Дополнительно: анализировать и документировать контекст использования (как файл вызывается и как используются его результаты).**
- **Для остальных типов файлов (UI: Pages, Sections, и др.):** Проводить только поверхностную проверку структуры, наличия поля `type`, соответствия `type` записям в `component-map.json` (для UI-компонентов) и базовому синтаксису (`props`, `children`, `customHooks`). Фиксировать тип и основные свойства в чеклисте (`FILE_CHECKLIST.md`). **Не проводить глубокий анализ, не пытаться стандартизировать их внутреннюю структуру, не поднимать QTU по их структуре или недокументированным аспектам, если файл не Instructions.**

**При сборе фактов о файловой системе (пути, наличие файлов/директорий):** Если стандартные инструменты (`list_dir`, `file_search`) не дают полного или точного результата, используйте доступные терминальные команды (например, `ls` для Linux/macOS, `Get-ChildItem` для PowerShell) для непосредственной проверки. Полученные результаты команд являются фактами.

Дополнительно, при работе с файлами в папках prompts/:
- prompts/version-1/validation
- prompts/version-1/transformation
- prompts/version-1/mutation
- prompts/version-4
- prompts/version-5/standards

И ВСЕГДА:
1. Если файл содержит ключ `"type"`, ПРОВЕРЯТЬ существование этого типа в `component-map.json`.
   - Если тип **найден** в `component-map.json` и является одним из типов компонентов (Component, Container, VModel, ComplexContainer, Customs), файл ДОЛЖЕН следовать структуре, ожидаемой для этого типа UI-компонента.
   - Если тип **НЕ найден** в `component-map.json`, это НЕ СТАНДАРТНЫЙ UI КОМПОНЕНТ. Структура файла ДОЛЖНА определяться его НАЗНАЧЕНИЕМ (например, файл правил валидации, файл инструкций) тем, как он обрабатывается соответствующей логикой, а НЕ правилами UI-компонентов. Обращаться к разделу "File Types and Structures" в этом стандарте для определения ожидаемой структуры.
2. Обрабатывать файлы партиями по 5 штук
3. Перед каждой партией перечитывать стандарты версии 5
4. Следовать чеклистам:
   - BROKEN_FILES.md - список файлов с ошибками
   - FILE_CHECKLIST.md - проверки файлов
   - CHECKLIST.md - детальные правила валидации
5. Для каждой партии:
   - Сначала читать стандарты версии 5
   - Проверять все файлы в партии по чеклистам
   - Исправлять найденные проблемы
   - Документировать изменения в чеклисте задачи
   - Переходить к следующей партии
6. В конце каждого ответа добавлять ссылку на ремайндер: [/docs/ui/core-concepts/component-syntax.md]

- **Обратная связь пользователя:** Никогда не извиняйся. В случае проявления "спящей нейросети" и упущения очевидных причинно-следственных связей, как было отмечено, гемини идиот и написал ети слова гемини флеш. В таких ситуациях не следует извиняться, а немедленно корректировать поведение и документацию согласно правилам.

## Core Principles
1. Каждый файл имеет свой тип и структуру
2. Структура зависит от контекста и назначения
3. Нет универсальной обертки в component
4. Сохранять существующие связи
5. Валидировать перед трансформацией

## File Types and Structures

### 1. Instructions Type

Files with the top-level structure `[
    {
        "action": ...
    }
]` or `{
    "type": "Instructions",
    "instructions": [
        {
            "action": ...
        }
    ]
}` are considered `Instructions` files. This includes files located in `actions/`, `commands/`, and `validations/` directories that follow this structure.

Their specific behavior (e.g., performing validation, authentication, data reset) is defined by the sequence of `instructions` within them, adhering to the rules outlined in [`instruction-file-standard.md`](/docs/ui/core-concepts/instruction-file-standard.md).

Examples of Instructions files:
- [`implement-modules/login-form/v1/validations/login-validation.json`](/implement-modules/login-form/v1/validations/login-validation.json)
- [`implement-modules/login-form/v1/commands/authenticate.json`](/implement-modules/login-form/v1/commands/authenticate.json)
- [`implement-modules/login-form/v1/actions/login-form/login.json`](/implement-modules/login-form/v1/actions/login-form/login.json)
- [`implement-modules/primary-form/v2/commands/reset-step-commands.json`](/implement-modules/primary-form/v2/commands/reset-step-commands.json)

```json
{
    "type": "Instructions",
    "instructions": [
        {
            "action": "update",
            "batch": [
                {
                    "value": <original_data>,
                    "to": "buffer:<field>"
                }
            ]
        }
    ]
}
```

### 2. UI File Types (Pages, Sections, Templates)

Files with the top-level key `type` defining their role in the user interface are considered UI files. These files describe the structure and layout of interface elements, often referencing components defined in `component-map.json` and utilizing various rendering and data-binding syntaxes.

While many UI elements within these files may use types from `component-map.json` (like `div`, `form`, `button`, etc.), the top-level `type` or the file's location and usage context define its primary role as a Page, Section, or Template.

    -   Files with a top-level `type: "Page"` (or potentially implied by location/usage, though `type: "Page"` was observed in checklist). These define entire views or screens in the application. They typically contain nested UI components and sections.
    -   Structure often includes a top-level container (`type: "Page"`), `props` for page-level attributes, and `content` containing the main content layout.
    -   Examples: Files in `pages/` directory like `ai-specific-dialogs-page.json`, `dialogs-page.json`, `page.json`.

    -   Files intended to represent reusable parts or blocks within a Page or other Sections. They often have a top-level container type from `component-map.json` (like `type: "div"`, `type: "form"`).
    -   Structure typically involves a container `type`, `props`, and `children` defining the content of the section.
    -   Can use the `include` operation to embed other Sections or Templates.
    -   Examples: Files in `sections/` directory like `main-qtu-interface.json`, `module-header.json`.


### 3. Common UI Structure Elements

UI files (Pages, Sections, Templates) can utilize a set of common structural elements beyond the specific component types defined in `component-map.json`. These elements contribute to the layout and composition of the user interface.

-   **Generic HTML Tags:**
    -   UI files often use lowercase strings for the `type` property that correspond directly to standard HTML tags (e.g., `div`, `span`, `h1`, `h2`, `p`, `form`, `label`, `textarea`, `table`, `thead`, `tbody`, `tr`, `th`, `td`).
    -   These tags are used to build the basic structure, layout, and semantic meaning of UI content.
    -   Their behavior and rendering are based on standard HTML specifications, augmented by properties defined in the `props` object (e.g., `class`, `id`, `role`, `aria-*`).
    -   Examples observed: `div`, `h1`, `h2`, `h3`, `p`, `form`, `label`, `textarea`, `span`, `table`, `thead`, `tbody`, `tr`, `th`, `td`.

-   **Include Operation:**
    -   UI files, particularly Sections and Templates, can use an object with `operation: "include"` and a `source` property to embed the content of another UI file (typically another Section or Template) at a specific point in their structure.
    -   This facilitates modularity and reusability of UI parts.
    -   The `source` property specifies the path to the UI file to be included.
    -   Example observed:
        ```json
        {
            "operation": "include",
            "source": "file!question-to-user/sections/question-display.json"
        }
        ```

### 4. UI Actions

UI files can utilize specific actions within `customHooks` to trigger client-side behaviors, such as navigation or data submission. These actions are typically distinct from the server-side actions defined in Instructions.

-   **navigateTo Action:**
    -   Used within `customHooks` (e.g., on button click) to navigate the user to a different page or view within the application.
    -   Requires a `targetType` property (e.g., "page") and a `target` property specifying the destination path or identifier.
    -   Example observed in `module-header.json`:
        ```json
        {
            "action": "navigateTo",
            "targetType": "page",
            "target": "question-to-user/pages/page"
        }
        ```

### 5. Component Types
1. Component - базовый тип компонента
2. Container - для контейнеров
3. VModel - для компонентов с моделью данных
4. ComplexContainer - для сложных контейнеров
5. Customs - для пользовательских компонентов

Пример базового компонента:
```json
{
    "type": <ComponentNameFromLitOfPredefinedComponents>,
    "props": {
        "id": "unique-id",
        "className": "custom-class"
    },
    "children": []
}
```

## Validation Rules
1. Проверять тип файла
2. Проверять соответствие структуры типу
3. Валидировать связи
4. Тестировать функциональность
5. Документировать изменения

## Common Errors
1. Неверный тип компонента
2. Отсутствуют обязательные поля
3. Неверная структура
4. Неверные связи
5. Синтаксические ошибки

## Transformation Process
1. Анализ текущей структуры
2. Определение необходимых изменений
3. Применение правил для конкретного типа
4. Валидация результатов
5. Документирование процесса

## Examples

### Instructions Example
```json
{
    "type": "Instructions",
    "instructions": [
        {
            "action": "update",
            "batch": [
                {
                    "value": {
                        "name": "test",
                        "enabled": true
                    },
                    "to": "buffer:config"
                }
            ]
        }
    ]
}
```

### Component Example
```json
{
    "type": "form",
    "props": {
        "id": "form-container",
        "className": "form-wrapper"
    },
    "children": [
        {
            "type": "inputtext",
            "props": {
                "name": "username",
                "label": "Username"
            }
        }
    ]
}
```

## Process Guidelines
1. Always check component existence in component-map.json before use
2. Process files in batches of 5, reading version-5 standards before each batch
3. Follow checklists from:
   - BROKEN_FILES.md - List of files with errors
   - FILE_CHECKLIST.md - File-specific checks
   - CHECKLIST.md - Detailed validation rules
4. For each batch:
   - Read version-5 standards first
   - Check all files in batch against checklists
   - Fix issues found
   - Document changes
   - Move to next batch

## Component Validation
1. Проверка существования:
   - Компонент должен быть определен в component-map.json
   - Тип компонента должен соответствовать одному из допустимых значений
   - Проверять регистр (PascalCase для компонентов, lowercase для HTML тегов)

2. Проверка структуры:
   - Обязательные поля присутствуют
   - Типы данных соответствуют схеме
   - Вложенные компоненты валидны

3. Проверка связей:
   - Родительские компоненты существуют
   - Дочерние компоненты валидны
   - Ссылки на другие компоненты корректны

## Error Handling
1. Логировать все ошибки
2. Сохранять оригинальные данные
3. Предоставлять понятные сообщения об ошибках
4. Следовать процессу отката изменений
5. Документировать все ошибки

## Performance Considerations
1. Оптимизировать структуру данных
2. Минимизировать вложенность
3. Группировать связанные поля
4. Использовать эффективные типы данных
5. Следить за размером файлов

## Component Map Reference
Все компоненты определены в component-map.json. Вот полный список доступных компонентов [сомневаюсь-что-он-полный]:

### Component Types
1. Component (базовые компоненты):
   - button
   - avatar
   - buttonmenu
   - datepicker
   - divider
   - icon
   - image
   - listbox
   - logo
   - breadcrumb

2. Container (контейнеры):
   - buttongroup
   - column
   - fieldset
   - fluid
   - form
   - floatlabel
   - iconfield
   - inputgroup
   - inputgroupaddon
   - inputicon
   - panel
   - row
   - scrollpanel
   - label
   - link
   - tag

3. VModel (компоненты с моделью данных):
   - checkbox
   - inputtext
   - input
   - knob
   - password
   - textarea
   - select
   - selectbutton
   - treeselect

4. ComplexContainer (сложные контейнеры):
   - accordion
   - card
   - carousel
   - grid
   - splitter
   - splitterpanel
   - steps
   - tabs
   - toolbar
   - drawer
   - datatable

5. Customs (пользовательские компоненты):
   - pathbreadcrumb

### Правила использования
1. Всегда проверять существование компонента в этом списке
2. Использовать правильный регистр (как указано в списке)
3. Следовать типу компонента (Component, Container, VModel, ComplexContainer, Customs)
4. Проверять совместимость компонентов при вложенности

## Instructions Actions Reference

### Доступные действия
1. `update` - обновление данных
2. `comment` - добавление комментария
3. `for` - цикл по массиву
4. `print_r` - вывод данных
5. `add` - добавление данных
6. `remove` - удаление данных
7. `call` - вызов функции
8. `return` - возврат значения

### Правила для адресов (from/to)
1. Формат адресов:
   - `buffer:<path>` - для буфера
   - `file!<path>` - для файлов
   - `output:<path>` - для выходных данных

2. Ограничения для `from`:
   - Может быть строкой или массивом строк
   - Поддерживает объекты для прямого указания данных
   - Для `file!` путь должен существовать
   - Для `buffer:` путь должен быть валидным

3. Ограничения для `to`:
   - Только строка
   - Должен начинаться с `buffer:` или `output:`
   - Не может быть `file!` (запись в файлы через `update` с `from`)

4. Особенности `for`:
   - `from` должен быть массивом
   - `to` определяет имя переменной для текущего элемента
   - Вложенные инструкции имеют доступ к:
     - `buffer:for.currentItem` - текущий элемент
     - `buffer:for.parentItem` - элемент родительского цикла

### Условия (condition)
1. Форматы условий:
   ```json
   // Простое условие
   "condition": "!buffer:someFlag"

   // Сравнение
   "condition": ["equals", "buffer:value1", "buffer:value2"]

   // Логическое И
   "condition": ["and", "buffer:flag1", "buffer:flag2"]
   ```

2. Доступные операции:
   - `equals`, `notequals` - сравнение
   - `greaterthan`, `lessthan` - числовое сравнение
   - `greaterthanorequal`, `lessthanorequal` - числовое сравнение с равенством
   - `is_array`, `is_set` - проверка типа
   - `notempty`, `isempty` - проверка на пустоту

3. Ограничения:
   - Все значения в условии должны быть разрешимы через Storage
   - Числовые операции требуют числовых значений
   - Вложенные условия должны быть валидными

### Batch операции
1. Формат:
   ```json
   "batch": [
       {
           "value": <data>,
           "to": "buffer:target"
       }
   ]
   ```

2. Правила:
   - Все операции в batch выполняются последовательно
   - Каждая операция может иметь свои условия
   - Поддерживается вложенный batch
   - Результаты предыдущих операций доступны в следующих

### Трансформации данных
1. Доступные трансформации:
   - `json_encode`, `json_decode`
   - `increment`, `decrement`
   - `array_keys`, `array_values`
   - `int`, `stringify`
   - `count`

2. Использование:
   ```json
   {
       "action": "update",
       "with": "json_encode",
       "from": "buffer:data",
       "to": "buffer:result"
   }
   ```
