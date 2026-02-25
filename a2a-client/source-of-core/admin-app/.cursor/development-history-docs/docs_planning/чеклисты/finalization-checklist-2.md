# Финальный чеклист для модуля `question-to-user/v5` (и любых модулей AiRudeDepot)

**Этот чеклист обязателен для финализации и запуска любого модуля. Составлен на основе анализа эталонных модулей и
стандартов.**

## Ссылки и стандарты по customHooks, actions и архитектуре QTU v5

- [README: Архитектура и структура QTU v5](README.md)
- [Стандарт создания модулей с customHooks (playground/v1)](../../../..//docs/guides/StrictModuleChecklist.md#35-customhooks-клиентские-действия)

---

## 1. Структурная проверка

- [ ] Структура папок и файлов строго соответствует эталону (как в login-form/v1, playground/v1, landing-main-page/v1):
    - [ ] docs/ — документация модуля
    - [ ] actions/ — серверные действия модуля
    - [ ] templates/ — шаблоны интерфейса (включая подпапки, например, layouts, ui_data_maps, если они не пусты)
    - [ ] code/ — PHP-классы модуля
    - [ ] validations/ — правила валидации (не пустая папка, если валидация используется)
    - [ ] data/ — данные модуля, включая:
        - [ ] blanks/ — эталонные структуры для UI компонентов
        - [ ] ui-blanks/ — (если используется) более сложные UI-заготовки
        - [ ] question_sets/ — (если используется) наборы вопросов
        - [ ] examples/ — (не стандартная папка, содержимое должно быть в blanks или ui-blanks)
    - [ ] pages/ — страницы модуля
    - [ ] state/ — файлы состояния (не пустая папка, если состояние используется)
    - [ ] _i/ — метаданные и индексы
    - [ ] assets/ — если необходимо

Ran tool

Read file: app/AiRudeDepot/Processors/DataProcessor/Php/WalkForOperations.php

Ran tool

Ran tool

Read file: app/AiRudeDepot/Processors/DataProcessor/Php/WalkForOperations.php

Я добавил поддержку нового формата нод с ключом `"operation"` (в дополнение к существующему `"type":"operation"`/
`"action"`) в методе `processNode` класса `WalkForOperations`. Теперь узлы вида

```json
{
  "operation": "include",
  "source": "file!question-to-user/sections/main-qtu-interface"
}
```

будут корректно распознаваться и обрабатываться так же, как и старый формат. Соответственно, аналогичная логика
применима к операциям `add` и `remove`. Пожалуйста, протестируйте и дайте знать, если нужно доработать что-то ещё.

- [x] Нет лишних, устаревших или неиспользуемых файлов/директорий (например, пустых `ui_data_maps`).
- [x] Имена файлов и каталогов в kebab-case (например, `my-file`, `my-directory`).
- [x] Проверены пути для динамически загружаемого контента (например, UI blanks, шаблоны для вопросов) на корректность и
  соответствие структуре модуля.

## 2. Документация (docs/)

- [ ] README.md — цель, сценарии, структура, ограничения, миграция.
- [ ] index.md — структура документации, ссылки на документы.
- [x] known-issues.md — реальные известные проблемы и их статус (не просто заглушка).
- [x] code.md — структура PHP-кода, при наличии (если есть `code/` директория).
- [x] data-schema.md — описание всех структур данных, используемых модулем.
- [x] changelog.md — история изменений модуля.
- [x] Все внутренние и внешние ссылки актуальны.

## 3. Метаданные и индексы (_i/)

- [x] meta.json — актуальные `name`, `version`, `description`, `author`, `dependencies` (
  Эталон: [login-form/v1/_i/meta.json](<../../../../login-form/v1/_i/meta.json>)).
- [x] `lastUpdated` в meta.json содержит реальную дату, а не плейсхолдер.
- [x] files-by-block.json — JSON валиден, все файлы модуля корректно отражены и соответствуют реальному содержимому на
  диске (нет дубликатов, отсутствующих или лишних записей) (
  Эталон: [login-form/v1/_i/files-by-block.json](<../../../../login-form/v1/_i/files-by-block.json>)).
- [x] links.json — все основные страницы, включая те, что предназначены для динамического отображения контента и
  взаимодействия через сценарии, доступны через ссылки, пути корректны (
  Эталон: [login-form/v1/_i/links.json](<../../../../login-form/v1/_i/links.json>)).
- [x] useAnyway.json — при необходимости.

## 4. PHP-класс (code/)

- [x] Если присутствует, основной PHP-класс наследуется от нужного базового класса (`PageModule` (
  см. [playground/v1/code/Playground.php](<../../../../playground/v1/code/Playground.php>)), `ApiModule` и т.д.).
- [x] Свойство `$folder` соответствует имени директории модуля.
- [x] Нет закомментированного кода, который не является актуальным комментарием.
- [x] Все используемые `use` утверждения актуальны.
- [ ] Отсутствуют placeholders без реализации; если action/command не реализован, он должен быть удален или содержать
  только `comment` с указанием статуса TODO.
- [x] `id` внутри файла action/command совпадает с именем файла (без расширения) (
  Эталон: [login-form/v1/commands/authenticate.json](<../../../../login-form/v1/commands/authenticate.json>) содержит
  `"id": "authenticate"`).
- [x] Параметры `call` (поле `from`) указывают на существующие и корректные пути к другим actions или commands.

## 5. Actions и Commands (actions/, commands/)

- [x] Все actions имеют `type: "Instructions"` (Эталон: [login-form/v1/actions/login-form/login]).
- [x] Используются только поддерживаемые action-типы: `update`, `save`, `add`, `remove`, `call`, `for`, `return`,
  `print_r`, `comment`, `batch`, `condition`. (Полный список и детали см. в
  `app/AiRudeDepot/Processors/InstructionProcessor/StorageHelper.php`).
- [x] Команды (каталог commands/) должны использовать action-типы `update`, `save` и `return` с DataHub-путями (
  например, `file!question-to-user/data/markers/{scenarioId}`) для работы со сценарием и маркерами вместо простых
  `call`. **Пример использования `update` для изменения переменной в файле маркеров см.
  в [implement-modules/primary-form/v2/actions/program-section](<../../../../primary-form/v2/actions/program-section.json>).
  **
- [ ] Адресация DataHub:
    - [ ] Используются допустимые префиксы (`mysql!`, `file!`, `buffer:`, `session!`, `input:`, `output:` и др.).
    - [ ] При доступе к элементам внутри `for` цикла:
        - Текущий элемент доступен через `buffer:for.currentItem`.
        - Индекс текущего элемента доступен через `buffer:for.currentIndex`.
        - Свойства текущего элемента доступны через прямой DataHub путь, например,
          `buffer:for.currentItem.propertyName`.
        - Для доступа к свойствам элементов цикла *в качестве DataHub адреса* (например, в поле `from` другой
          инструкции), используется прямой путь `buffer:for.currentItem.propertyName`. Синтаксис `{...}` (фигурные
          скобки) предназначен для подстановки значений *внутрь строковых литералов* (например,
          `value: "Значение: {buffer:someValue}"` или `comment: "Обрабатывается элемент {buffer:for.currentItem.id}"`),
          а не для формирования самого DataHub *адреса* в таких полях как `from`.
    - [ ] Для вложенных циклов `for` можно использовать `buffer:for.parentItem` для доступа к элементу внешнего цикла из
      внутреннего цикла (детали см. `StorageHelper.php` и примеры использования, например
      `load-ai-probe-questions.json`).
    - [ ] Плейсхолдеры вида `{...}` (фигурные скобки) в строковых значениях полей `value` (в `update`, `add`), `to` (в
      `update`, `add`, `for`), `from` (в `for`, `call`) разрешаются через `DataHub::processResolveInstruction` *перед*
      использованием самого пути или значения.
    - [ ] Динамическое формирование *сегментов* DataHub-пути: если часть пути должна быть динамической (например, имя
      файла из буфера), необходимо сначала сформировать полную строку пути (возможно, используя `{...}` для подстановки
      этого сегмента в строку), а затем эту собранную строку использовать как DataHub-адрес. Пример:
      `"to": "file!generated/{buffer:dynamicFileName}.json"`.
    - [ ] **Условные выражения (поле `condition`)**: обрабатываются `DataManipulateHelper::evaluateCondition`.
      Поддерживаемые форматы:
        - **Boolean**: `true` или `false`.
        - **Число**: `0` (false), любое другое число (true).
        - **Строка (литерал)**: `"true"` или `"false"`.
        - **Строка (DataHub путь)**: Путь к значению в DataHub, например, `"buffer:someFlag"`. Может быть инвертировано
          префиксом `!`, например, `"!buffer:someFlag"`.
        - **Массив**:
            - `["and", condition1, condition2, ...]` - логическое И.
            - `[оператор, datahub_путь]` (унарные): `is_array`, `is_set`, `notempty`, `isempty`.
            - `[оператор, datahub_путь1, datahub_путь2]` (бинарные): `equals`, `notequals`, `greaterthan`,
              `greaterthanorequal`, `lessthan`, `lessthanorequal`.
            - **Важно**: операнды `datahub_путь` в массивных условиях являются строковыми DataHub-адресами, а **не**
              строками с выражениями в `{...}`.
    - [ ] Общие модификаторы источника данных (применимы в `from` для `update`, `return`, `add`, `print_r` и др., где
      используется `handleSource` из `StorageHelper.php`):
        - `key: "propertyName"`: извлечь значение указанного ключа из объекта/массива.
        - `find: { "attr": "attributeName", "value": datahub_or_literal_value, "return": "key" (optional) }`: поиск
          внутри массива объектов. `value` здесь может быть литералом или DataHub-путем (разрешается
          `Storage::processResolveInstruction`).
        - `with: "transformationName"`: применение трансформаций из `DataManipulateHelper::applyDataTransformation` (
          например, `json_decode`, `increment`, `count`, `stringify`, `verifyPasswordHash`, `loginUserById`).
- [ ] Для action `update`:
    - [ ] Корректно используются `from` (или `address`) для указания источника данных, либо `value` для прямого указания
      значения. `value` может быть сложным объектом/массивом, строки внутри которого поддерживают `{...}` плейсхолдеры.
    - [ ] Обязательно указан параметр `to` для целевого адреса.
    - [ ] Параметр `condition` (см. детализацию формата выше) используется для условного выполнения.
    - [ ] Параметр `batch` используется для групповых обновлений; каждый элемент в `batch` является полной инструкцией
      `update` и может иметь свой `condition`.
- [ ] Для action `save`:
    - [ ] Параметр `from` (или `address`) указывает на DataHub-путь к данным для сохранения (например, `buffer:myData`
      или `file!module/data/file.json`). Источник сам определяет место сохранения при использовании префикса `file!` (
      например, `file!module/data/file.json` будет сохранен в `module/data/file.json`).
    - [ ] Параметр `to` **не используется** в `save` для указания файла напрямую; путь сохранения определяется
      источником в `from`.
- [ ] Для action `for`:
    - [ ] Обязательно указан `from` (адрес коллекции для итерации, плейсхолдеры `{...}` разрешаются в этом адресе).
    - [ ] Обязательно указан `instructions` (массив инструкций для выполнения на каждой итерации).
    - [ ] Параметр `to` (необязательный, плейсхолдеры `{...}` разрешаются) используется для указания адреса, куда будет
      сохранен массив результатов каждой итерации. Для сбора результатов, вложенные инструкции должны записывать данные
      в `buffer:for.list`, который затем автоматически собирается, если указан `to`.
- [ ] Для action `add`:
    - [ ] Используется `from` (или `value`) для данных, которые нужно добавить. Строки в `value` поддерживают `{...}`.
    - [ ] Обязательно указан `to` (адрес массива или строки, куда добавляются данные, плейсхолдеры `{...}` разрешаются).
- [x] Нет прямого изменения UI-файлов из actions — UI обновляется через изменение данных, на которые он подписан, или
  через `output:commands` для UI-команд. **Необходимо рефакторинг actions process-questions.json,
  load-ai-probe-questions.json и get-next-ai-probe-question.json для разделения логики подготовки данных и генерации UI.
  **
- [x] Все переменные и буферы инициализируются перед использованием (например, через `update` с `value`).
- [x] Действия `batch`/`condition` содержат корректные вложенные `instructions`.
- [x] Отсутствуют placeholders без реализации; если action/command не реализован, он должен быть удален или содержать
  только `comment` с указанием статуса TODO.
- [x] `id` внутри файла action/command совпадает с именем файла (без расширения).
- [x] Параметры `call` (поле `from`) указывают на существующие и корректные пути к другим actions или commands.
- [x] **Важно:** Actions должны редактировать маркеры только в своем модуле (например,
  `file!question-to-user/data/markers/{scenarioId}`), а не глобальные маркеры (`engine/markers/`). Actions не
  имеют глобального доступа к файлам маркеров вне их модуля.

## 6. UI (pages, sections, templates)

- [x] Страницы (`pages/`) и секции (`sections/`) включают компоненты или другие секции через `operation/include` с
  указанием `source` (
  Эталон: [landing-main-page/v1/pages/index.json](<../../../../landing-main-page/v1/pages/index.json>)), а не прямым
  вложением JSON-структур, если это переиспользуемый элемент.
- [ ] Динамический UI (списки, условные блоки) строится через `operation/generate` (если доступно и применимо) или через
  `operation/include`
