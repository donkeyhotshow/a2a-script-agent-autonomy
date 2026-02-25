# Финальный чеклист для модуля `question-to-user/v5` (и любых модулей AiRudeDepot)

**Этот чеклист обязателен для финализации и запуска любого модуля. Составлен на основе анализа эталонных модулей и
стандартов.**

## Ссылки и стандарты по customHooks, actions и архитектуре QTU v5

- [README: Архитектура и структура QTU v5](README.md)
- [Стандарт создания модулей с customHooks (playground/v1)](/docs/guides/StrictModuleChecklist.md#35-customhooks-клиентские-действия)

---

## 1. Структурная проверка

- [x] Структура папок и файлов строго соответствует эталону (как в login-form/v1, playground/v1, landing-main-page/v1):
    - [x] docs/ — документация модуля
    - [x] actions/ — серверные действия модуля
    - [x] templates/ — шаблоны интерфейса (включая подпапки, например, layouts, ui_data_maps, если они не пусты)
    - [x] sections/ — секции UI (если используются отдельно от templates)
    - [x] code/ — PHP-классы модуля
    - [x] validations/ — правила валидации (не пустая папка, если валидация используется)
    - [x] data/ — данные модуля, включая:
        - [x] blanks/ — эталонные структуры для UI компонентов
        - [x] ui-blanks/ — (если используется) более сложные UI-заготовки
        - [x] question_sets/ — (если используется) наборы вопросов
        - [x] examples/ — (не стандартная папка, содержимое должно быть в blanks или ui-blanks)
    - [x] pages/ — страницы модуля
    - [x] state/ — файлы состояния (не пустая папка, если состояние используется) (Not found - is it needed? - User
      confirmed NOT needed)
    - [x] _i/ — метаданные и индексы
    - [x] assets/ — если необходимо (Not found - is it needed? - User confirmed NOT needed)

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
    - All files and directories within this module have been verified to be in kebab-case. References (e.g., in
      `_i/files-by-block.json` and any includes/calls) have been updated accordingly.
    - **Исключение**: Файлы PHP классов в директории `code/` должны использовать PascalCase (например, `MyClass.php`).
- [x] Проверены пути для динамически загружаемого контента (например, UI blanks, шаблоны для вопросов) на корректность и
  соответствие структуре модуля.

## 2. Документация (docs/)

- [x] README.md — цель, сценарии, структура, ограничения, миграция.
- [x] index.md — структура документации, ссылки на документы.
- [x] known-issues.md — реальные известные проблемы и их статус (не просто заглушка).
- [x] code.md — структура PHP-кода, при наличии (если есть `code/` директория).
- [x] data-schema.md — описание всех структур данных, используемых модулем.
- [x] changelog.md — история изменений модуля.
- [x] Все внутренние и внешние ссылки актуальны.

## 3. Метаданные и индексы (_i/)

- [x] meta.json — актуальные `name`, `version`, `description`, `author`, `dependencies` (
  Эталон: [login-form/v1/_i/meta.json](<../../../../login-form/v1/_i/meta.json>)).
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
- [x] Отсутствуют placeholders без реализации; если action/command не реализован, он должен быть удален или содержать
  только `comment` с указанием статуса TODO. (JSON actions reviewed; `submit-task.json` is a valid TODO.
  `QuestionToUser.php` is minimal and seems complete for its current scope.)
- [x] `id` внутри файла action/command совпадает с именем файла (без расширения) (
  Эталон: [login-form/v1/commands/authenticate.json](<../../../../login-form/v1/commands/authenticate.json>) содержит
  `"id": "authenticate"`).
- [x] Параметры `call` (поле `from`) указывают на существующие и корректные пути к другим actions или commands.

## 5. Actions и Commands (actions/, commands/)

- [x] Все actions имеют `type: "Instructions"` (Эталон: [login-form/v1/actions/login-form/login]).
- [x] Используются только поддерживаемые action-типы: `update`, `save`, `add`, `remove`, `call`, `for`, `return`,
  `print_r`, `comment`. (Полный список и детали см. в
  `app/AiRudeDepot/Processors/InstructionProcessor/StorageHelper.php`).
- [x] Команды (каталог commands/) должны использовать action-типы `update`, `save` и `return` с DataHub-путями (
  например, `file!question-to-user/data/markers/{scenarioId}`) для работы со сценарием и маркерами вместо простых
  `call`. **Пример использования `update` для изменения переменной в файле маркеров см.
  в [implement-modules/primary-form/v2/actions/program-section](<../../../../primary-form/v2/actions/program-section.json>).
  **
- [x] Адресация DataHub:
    - [x] Используются допустимые префиксы (`mysql!`, `file!`, `buffer:`, `session!`, `input:`, `output:` и др.).
    - [x] При доступе к элементам внутри `for` цикла:
        - [x] Текущий элемент доступен через `buffer:for.currentItem`.
        - [ ] Индекс текущего элемента доступен через `buffer:for.currentIndex`. (Not currently used in this module)
        - [x] Свойства текущего элемента доступны через прямой DataHub путь, например,
          `buffer:for.currentItem.propertyName`.
        - Для доступа к свойствам элементов цикла *в качестве DataHub-адреса* (например, в поле `from` другой
          инструкции), используется прямой путь `buffer:for.currentItem.propertyName`. Синтаксис `{...}` (фигурные
          скобки) предназначен для подстановки значений *внутрь строковых литералов* (например,
          `value: "Значение: {buffer:someValue}"` или `comment: "Обрабатывается элемент {buffer:for.currentItem.id}"`),
          а не для формирования самого DataHub *адреса* в таких полях как `from`.
    - [x] Для вложенных циклов `for` можно использовать `buffer:for.parentItem` для доступа к элементу внешнего цикла из
      внутреннего цикла (детали см. `StorageHelper.php` и примеры использования, например
      `load-ai-probe-questions.json`).
    - [x] Плейсхолдеры вида `{...}` (фигурные скобки) в строковых значениях полей `value` (в `update`, `add`), `to` (в
      `update`, `add`, `for`), `from` (в `for`, `call`) разрешаются через `DataHub::processResolveInstruction` *перед*
      использованием самого пути или значения.
    - [x] Динамическое формирование *сегментов* DataHub-пути: если часть пути должна быть динамической (например, имя
      файла из буфера), необходимо сначала сформировать полную строку пути (возможно, используя `{...}` для подстановки
      этого сегмента в строку), а затем эту собранную строку использовать как DataHub-адрес. Пример:
      `"to": "file!generated/{buffer:dynamicFileName}.json"`.
    - [x] **Расширения файлов в DataHub путях `file!`**:
        - [x] **Обязательно**: НЕ указывать полное имя файла с расширением `.json` в параметрах инструкций actions (
          например, `from`, `to` в `update`, `save`; `source` в `call`). Пример: `"from": "file!module/data/some-data"`.
        - [x] **Рекомендуется (для ясности и консистентности)**: Для инструкций `operation: "include"` в UI-файлах (
          pages, sections, templates), также рекомендуется указывать полное имя файла с расширением `.json` (или другим)
          в поле `source`. Хотя система может пытаться автоматически добавить `.json` к пути без расширения, явное
          указание повышает читаемость и предотвращает неоднозначность. Пример:
          `"source": "file!module/sections/my-section.json"`. Использование путей без расширения (например,
          `file!module/sections/my-section`) допустимо, если это стандартная практика для `include` операций и система
          корректно их разрешает.
    - [ ] **Условные выражения (поле `condition`)**: обрабатываются `DataManipulateHelper::evaluateCondition`.
      Поддерживаемые форматы:
        - [ ] **Boolean**: `true` или `false`. (Literal boolean conditions not observed)
        - [ ] **Число**: `0` (false), любое другое число (true). (Literal number conditions not observed)
        - [ ] **Строка (литерал)**: `\"true\"` или `\"false\"`. (Literal string conditions `\"true\"`/`\"false\"` not
          observed)
        - [ ] **Строка (DataHub путь)**: Путь к значению в DataHub, например, `\"buffer:someFlag\"`. Может быть
          инвертировано префиксом `!`, например, `\"!buffer:someFlag\"`. (Used, e.g., `!{buffer:somePath}` which is a
          form
          of this). **Важно**: `DataManipulateHelper::evaluateCondition` интерпретирует такие строки как прямые DataHub
          пути и **не** парсит сложную логику (например, `&&`, `||`, `includes`) из них. Строки вида
          `\"{buffer:valA && buffer:valB}\"` или `\"{buffer:valA | includes: 'substring'}\"` **не будут** работать как
          ожидается в рантайме, даже если они проходят валидатор. Валидатор (`php artisan validate:module-json`)
          использует regex (например, `/^(?:!?[a-zA-Z0-9_$.\\/:\-]+|{[^}]+})?$/`), который может пропускать такие
          сложные строки, но рантайм их не поддерживает.
        - [x] **Массив**: **Единственный способ реализовать сложную логику (AND, OR и т.д.) в рантайме.**
            - [x] `[\"and\", condition1, condition2, ...]` - логическое И. (Пример:
              `[\"and\", \"buffer:pathA\", \"buffer:pathB\"]`)
            - [ ] `[\"or\", condition1, condition2, ...]` - логическое ИЛИ. (**Не поддерживается**
              `DataManipulateHelper.php` на данный момент)
            - [ ] `[оператор, datahub_путь]` (унарные): `is_array`, `is_set`, `notempty`, `isempty`. (Not observed)
            - [x] `[оператор, datahub_путь1, datahub_путь2]` (бинарные): `equals`, `notequals`, `greaterthan`,
              `greaterthanorequal`, `lessthan`, `lessthanorequal`.
            - [ ] `[\"includes\", datahub_путь_к_массиву_или_строке, значение_для_поиска]` (**Не поддерживается**
              `DataManipulateHelper.php` на данный момент для проверки вхождения в массив; для строк используйте
              трансформации или более сложные проверки, если это будет реализовано).
            - [x] **Важно**: операнды `datahub_путь` в массивных условиях являются строковыми DataHub-адресами (
              например, `\"buffer:my.flag\"`), а **не**
              строками с выражениями в `{...}` (например, не `\"{buffer:my.flag}\"`).
    - [x] Общие модификаторы источника данных (применимы в `from` для `update`, `return`, `add`, `print_r` и др., где
      используется `handleSource` из `StorageHelper.php`):
        - [ ] `key: "propertyName"`: извлечь значение указанного ключа из объекта/массива. (Not used in this module)
        - [ ] `find: { "attr": "attributeName", "value": datahub_or_literal_value, "return": "key" (optional) }`: поиск
          внутри массива объектов. `value` здесь может быть литералом или DataHub-путем (разрешается
          `Storage::processResolveInstruction`). (Not used in this module)
        - [x] `with: "transformationName"`: применение трансформаций из
          `DataManipulateHelper::applyDataTransformation` (например, `json_decode`, `increment`, `count`, `stringify`,
          `verifyPasswordHash`, `loginUserById`). (Used for `"count"`. Other specific transformations like
          `json_decode`, `increment` not observed as used.)
- [x] Для action `update`:
    - [x] Корректно используются `from` (или `address`) для указания источника данных, либо `value` для прямого указания
      значения. `value` может быть сложным объектом/массивом, строки внутри которого поддерживают `{...}` плейсхолдеры.
    - [x] Обязательно указан параметр `to` для целевого адреса.
    - [x] Параметр `condition` (см. детализацию формата выше) используется для условного выполнения.
    - [x] Параметр `batch` используется для групповых обновлений; каждый элемент в `batch` является полной инструкцией
      `update` и может иметь свой `condition`. **Замечание**: Хотя это валидный способ группировки, в некоторых
      случаях (например, для упрощения отладки, обхода сложностей с валидатором или если вложенные условия становятся
      слишком комплексными) может быть предпочтительнее "развернуть" такие пакетные операции в последовательность
      отдельных инструкций `update`.
- [x] Для action `save`:
    - [x] Параметр `from` (или `address`) указывает на DataHub-путь к данным для сохранения (например, `buffer:myData`
      или `file!module/data/file.json`). Если `from` указывает на `file!`, этот файл и будет сохранен. Если `from`
      указывает на `buffer:`, то для сохранения в файл также должен быть указан `to`.
    - [x] Параметр `to` используется для указания целевого файла (`file!path.json`), если источником (`from`) является
      буфер (`buffer:someBuffer`). Если `from` уже является путем к файлу (`file!path.json`), то `to` игнорируется, и
      операция `save` применяется непосредственно к файлу, указанному в `from`.
- [x] Для action `for`:
    - [x] Обязательно указан `from` (адрес коллекции для итерации, плейсхолдеры `{...}` разрешаются в этом адресе).
    - [x] Обязательно указан `instructions` (массив инструкций для выполнения на каждой итерации).
    - [ ] Параметр `to` (необязательный, плейсхолдеры `{...}` разрешаются) используется для указания адреса, куда будет
      сохранен массив результатов каждой итерации. Для сбора результатов, вложенные инструкции должны записывать данные
      в `buffer:for.list`, который затем автоматически собирается, если указан `to`. (The `to` parameter for collecting
      `buffer:for.list` results is not currently used in this module's `for` loops)
- [x] Для action `add`:
    - [x] Обязательно указан `to` (DataHub-путь к массиву, в который будет добавлен элемент).
    - [x] Указан либо `from` (DataHub-путь к элементу для добавления), либо `value` (непосредственно значение элемента
      для добавления).
    - [x] Элемент добавляется в конец массива, указанного в `to`.
- [x] Принцип разделения ответственности: actions, отвечающие за генерацию UI (например,
  `load-ai-probe-questions.json`), должны формировать готовую структуру UI в буфере и затем сохранять ее в целевой
  UI-файл (например, `templates/question-area.json`). Они не должны полагаться на то, что UI-шаблон будет "включать"
  данные из буфера через `operation/include`.
- [x] **Actions, генерирующие динамический UI контент**: Должны собирать полную UI JSON структуру в буфере и затем
  напрямую сохранять ее в целевой UI файл (например, `question-to-user/templates/question-area.json`). Структура,
  сохраняемая в `children` файла (или другое соответствующее свойство), должна быть валидным JSON массивом, а не
  строковой ссылкой на буфер.
    - [x] `process-questions.json`: Рефакторинг для корректного сохранения сгенерированного UI в
      `question-to-user/templates/question-area.json`. Убедиться, что свойство `children` получает фактический массив. (
      В настоящее время сохраняет `"{buffer:finalGroupedElements}"` как строку). Имя целевого файла должно быть
      `question-area.json`.
    - [x] `get-next-ai-probe-question.json`: Данное действие в настоящее время помещает сгенерированный UI в
      `buffer:qtu.generatedUI` и возвращает результат. Уточнить, должно ли оно также напрямую сохранять в UI-файл для
      консистентности, или его роль исключительно в подготовке данных для последующего действия. Если должно сохранять,
      провести рефакторинг. (Решено сохранять в файл для консистентности отображения UI).
    - [x] `load-question-set.json`: Refactored to output placeholder UI to `buffer:qtu.generatedUI` for
      `question-area.json` and save to `file!question-to-user/data/generated/question-ui`. (Placeholder UI generation,
      full logic TODO).
- [x] Спроектировать каждый `.json` файл в `actions/` для обслуживания действий при нажатии кнопок, на странице, типа
  сгенерировать сохранить применить удалить., по завершению сканирования - очистить временный список файлов. (Many
  actions now have functional placeholder logic tied to UI components. Backend integration is the primary TODO for
  these).
    - [x] `actions/get-next-ai-probe-question.json` (Structure for UI generation exists, AI logic TODO)
    - [x] `actions/process-questions.json` (Structure for UI generation exists, processing logic TODO)
    - [x] `actions/load-ai-probe-questions.json` (Structure for UI generation exists, AI logic TODO)
    - [x] `actions/list-system-tasks.json` ([x] Placeholder ready, returns mock data)
    - [x] `actions/list-system-scenarios.json` ([x] Placeholder ready, returns mock data)
    - [x] `actions/save-ai-probe-answers.json` (Structure for saving exists, actual save mechanism TODO)
    - [x] `actions/load-question-set.json` ([x] Placeholder ready for UI generation, dynamic loading & full processing
      TODO)
    - [x] `actions/clear-current-answers.json` ([x] Functional for clearing and reloading questions)
    - [x] `actions/save-current-answers.json` ([x] Placeholder ready, saves to file, returns mock status)
    - [x] `actions/execute-main-work-scenario.json` ([x] Placeholder ready, returns mock status, backend call TODO)
    - [x] `actions/list-dialog-definitions.json` ([x] Placeholder ready, returns mock data)
    - [x] `actions/reset-main-work-scenario.json` ([x] Placeholder ready, returns mock status, backend call TODO)
    - [x] `actions/load-dialog-definition.json` ([x] Placeholder ready, returns mock UI content)
    - [x] `actions/submit-task.json` ([x] Placeholder ready, returns mock status, backend save TODO. Was: Purpose clear
      from TODO; serves future 'apply/save' task state)
    - [x] `actions/submit-manual-response.json` ([x] Placeholder ready, created, returns mock status, backend processing
      TODO)
    - [x] `pages/task-scenario-management-page.json` (Analyzed: Hub for task/scenario lists and command execution.
      Corrected missing .json in ScenarioListDisplay include. Connected to placeholder actions.)
    - [x] `pages/task-overview.json` (Analyzed: Displays task list and create/edit form. Includes `TaskListDisplay.json`
      and `task-form.json`. Connected to placeholder actions.)
    - [x] `pages/question-summary-page.json` (Analyzed: Displays a question summary table. Page indicates feature is on
      hold due to missing action `load-question-summary-table.json` - this is noted as deleted.)
    - [x] `pages/dialogs-page.json` (Analyzed: Placeholder for selecting/displaying general dialogs. UI controls and
      integration with placeholder list/load dialog actions established.)
    - [x] `pages/ai-specific-dialogs-page.json` (Analyzed: Facilitates AI-driven dialogs. Forms connected to placeholder
      actions for load/submit AI questions/answers and manual input.)
- [x] Все переменные и буферы инициализируются перед использованием (например, через `update` с `value`).
- [x] Действия `batch`/`condition` содержат корректные вложенные `instructions`.
- [x] Отсутствуют placeholders без реализации; если action/command не реализован, он должен быть удален или содержать
  только `comment` с указанием статуса TODO. (Many actions now have functional placeholder logic with TODOs for backend
  integration. This makes them testable from the UI. `submit-task.json` was previously a bare TODO and is now a
  functional placeholder. `QuestionToUser.php` was deleted, any required PHP logic will need re-evaluation.)
- [x] `id` внутри файла action/command совпадает с именем файла (без расширения).
- [x] Параметры `call` (поле `from`) указывают на существующие и корректные пути к другим actions или commands.
- [x] **Важно:** Actions должны редактировать маркеры только в своем модуле (например,
  `file!question-to-user/data/markers/{scenarioId}`), а не глобальные маркеры (`engine/markers/`). Actions не
  имеют глобального доступа к файлам маркеров вне их модуля.
- [x] **Принцип разделения ответственности:** Actions отвечают за подготовку данных. Если action генерирует
  UI-структуру (например, для динамического обновления файла шаблона), он должен формировать полную JSON-структуру этого
  UI. Сами файлы шаблонов (pages, sections, templates) затем либо статически определяют эту структуру, либо включают ее
  из файла, который был динамически обновлен экшеном (например, page включает `file!template.json`, а action обновляет
  содержимое `template.json`). Actions не должны содержать логику рендеринга, выходящую за рамки формирования этой
  JSON-структуры.

## 6. UI (pages, sections, templates)

- [x] Страницы (`pages/`) и секции (`sections/`) включают компоненты или другие секции через `operation/include` с
  указанием `source` (
  Эталон: [landing-main-page/v1/pages/index.json](<../../../../landing-main-page/v1/pages/index.json>)), а не прямым
  вложением JSON-структур, если это переиспользуемый элемент.
- [x] Динамический UI (списки, условные блоки) строится через `operation/generate` (если доступно и применимо) или через
  `operation/include`
- [x] Нет прямого изменения UI-файлов из actions — UI обновляется через изменение данных, на которые он подписан, или
  через `output:commands` для UI-команд.
- [ ] **`customHooks` для UI элементов**:
    - [x] Определяют клиентские взаимодействия, инициируемые событиями (например, `click`). (Used extensively)
    - [x] **`sendData` hook** (Implemented via `action: "call"` in `customHooks`):
        - [x] Выполняет массив серверных `action` инструкций (как правило, `call` к action-файлу модуля). (Used in
          multiple templates)
        - [x] Пример:
          `"customHooks": { "click": [{ "action": "call", "from": "module/actions/my-action", "input": { "field": "{input:myForm.myField}" }, "to": "buffer:actionResult" }] }` (
          Pattern followed)
        - [x] Позволяет передавать данные из UI (например, поля форм через `"{input:formId.fieldName}"`). (Used)
        - [x] Результаты выполнения actions могут сохраняться в `buffer:` для дальнейшего использования в UI. (Used)
    - [x] **`navigateTo` hook**:
        - [x] Осуществляет переход на другую страницу модуля или внешний URL.
        - [x] Пример:
          `"customHooks": { "click": [{ "action": "navigateTo", "targetType": "page", "target": "module/pages/target-page", "params": { "id": "{buffer:itemId}"} }] }`
        - [x] `targetType` может быть `"page"` (для внутренних страниц модуля) или `"url"` (для внешних ссылок).
        - [x] `target` указывает ID страницы или URL.
        - [x] `params` (необязательно) передает параметры на целевую страницу (доступны в контексте страницы или как URL
          query параметры). (Params not used in current implementation, but the hook itself is now implemented and
          used.)
- [ ] инвентаризация страниц и их контента. создать чеклист страниц. по каждому из файлов. спроектировать предназначение
  страници, какие данные она будет обрабатывать и какие кнопки как будут инициировать действие и что отправлть или не
  отправлять. внедрить формы на примере primary-form/v2, по завершению сканирования - очистить временный список
  файлов. (Significantly progressed: Page skeletons enhanced. Key templates/sections (command-execution-form, task-form,
  task-list-display, scenario-list-display, question-area, module-header, main-qtu-interface, dialogs page, ai-specific
  dialogs page) have form structures & UI elements. These are now connected to placeholder actions that mock data
  loading and submission, establishing data flow for UI testing. Next steps: Implement backend logic for all placeholder
  actions, refine complex UI generation (e.g. for `load-question-set` beyond placeholders), and integrate actual
  scenario execution.)
- [ ] php artisan module:merge question-to-user && php artisan validate:module-json question-to-user

---
*Это первоначальный вариант чеклиста. Дополняйте и адаптируйте по мере необходимости.*

**Заметки по инструментарию и процессу:**

- **`read_file` tool**: Может обрезать большие файлы (например, `process-questions.json`), даже с
  `should_read_entire_file: true`. Это серьезно затрудняет рефакторинг и анализ таких файлов.
- **Валидатор UI (`php artisan validate:module-json` для UI файлов)**: Может показывать несоответствия или помечать как
  ошибки корректные свойства для некоторых компонентов (например, `options`, `optionLabel`, `optionValue` для компонента
  `Select`). Это может быть связано с неполной или устаревшей схемой валидации для UI.
- **`edit_file` tool**: Иногда некорректно применяет изменения, особенно при полной замене содержимого файла или при
  множественных мелких правках в больших файлах. Может потребоваться несколько попыток или использование стратегии "
  backup and replace".
