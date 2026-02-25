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
    - [ ] commands/ — команды для actions
    - [ ] _i/ — метаданные и индексы
    - [ ] assets/ — если необходимо
- [ ] Нет лишних, устаревших или неиспользуемых файлов/директорий (например, пустых `ui_data_maps`).
- [ ] Имена файлов и каталогов в kebab-case (например, `my-file.json` (
  см. [login-form/v1/actions/login-form/login.json](<../../../../login-form/v1/actions/login-form/login.json>)),
  `my-directory` (см. [login-form/v1/actions/login-form/](<../../../../login-form/v1/actions/login-form/>))).
- [ ] Проверены пути для динамически загружаемого контента (например, UI blanks, шаблоны для вопросов) на корректность и
  соответствие структуре модуля.

## 2. Документация (docs/)

- [ ] README.md — цель, сценарии, структура, ограничения, миграция.
- [ ] index.md — структура документации, ссылки на документы.
- [ ] known-issues.md — реальные известные проблемы и их статус (не просто заглушка).
- [ ] code.md — структура PHP-кода, при наличии (если есть `code/` директория).
- [ ] data-schema.md — описание всех структур данных, используемых модулем.
- [ ] changelog.md — история изменений модуля.
- [ ] Все внутренние и внешние ссылки актуальны.

## 3. Метаданные и индексы (_i/)

- [ ] meta.json — актуальные `name`, `version`, `description`, `author`, `dependencies` (
  Эталон: [login-form/v1/_i/meta.json](<../../../../login-form/v1/_i/meta.json>)).
- [ ] `lastUpdated` в meta.json содержит реальную дату, а не плейсхолдер.
- [ ] files-by-block.json — JSON валиден, все файлы модуля корректно отражены и соответствуют реальному содержимому на
  диске (нет дубликатов, отсутствующих или лишних записей) (
  Эталон: [login-form/v1/_i/files-by-block.json](<../../../../login-form/v1/_i/files-by-block.json>)).
- [ ] links.json — все основные страницы, включая те, что предназначены для динамического отображения контента и
  взаимодействия через сценарии, доступны через ссылки, пути корректны (
  Эталон: [login-form/v1/_i/links.json](<../../../../login-form/v1/_i/links.json>)).
- [ ] useAnyway.json — при необходимости.

## 4. PHP-класс (code/)

- [ ] Если присутствует, основной PHP-класс наследуется от нужного базового класса (`PageModule` (
  см. [playground/v1/code/Playground.php](<../../../../playground/v1/code/Playground.php>)), `ApiModule` и т.д.).
- [ ] Свойство `$folder` соответствует имени директории модуля.
- [ ] Нет закомментированного кода, который не является актуальным комментарием.
- [ ] Все используемые `use` утверждения актуальны.
- [ ] Все `commands` (`.json` или `.command.json`) имеют корректные `instructions`.
- [ ] Отсутствуют placeholders без реализации; если action/command не реализован, он должен быть удален или содержать
  только `comment` с указанием статуса TODO.
- [ ] `id` внутри файла action/command совпадает с именем файла (без расширения) (
  Эталон: [login-form/v1/commands/authenticate.json](<../../../../login-form/v1/commands/authenticate.json>) содержит
  `"id": "authenticate"`).
- [ ] Параметры `call` (поле `from`) указывают на существующие и корректные пути к другим actions или commands.

## 5. Actions и Commands (actions/, commands/)

- [ ] Все actions имеют `type: "Instructions"` (
  Эталон: [login-form/v1/actions/login-form/login.json](<../../../../login-form/v1/actions/login-form/login.json>)).
- [ ] Используются только поддерживаемые action-типы: `update` (
  см. [login-form/v1/actions/login-form/login.json](<../../../../login-form/v1/actions/login-form/login.json>)),
  `save` (
  см. [playground/v1/actions/scenario/save-answers.json](<../../../../playground/v1/actions/scenario/save-answers.json>)),
  `add` (
  см. [playground/v1/actions/tasks/add-task-log.json](<../../../../playground/v1/actions/tasks/add-task-log.json>)),
  `remove`, `call` (
  см. [login-form/v1/actions/login-form/login.json](<../../../../login-form/v1/actions/login-form/login.json>)), `for` (
  см. [playground/v1/actions/scenario/process-steps.json](<../../../../playground/v1/actions/scenario/process-steps.json>)),
  `return` (
  см. [login-form/v1/actions/login-form/login.json](<../../../../login-form/v1/actions/login-form/login.json>)),
  `print_r` (
  см. [playground/v1/actions/debug/print-context.json](<../../../../playground/v1/actions/debug/print-context.json>)),
  `comment` (
  см. [playground/v1/actions/player/load-player-state.json](<../../../../playground/v1/actions/player/load-player-state.json>)),
  `batch` (
  см. [playground/v1/actions/player/set-player-options.json](<../../../../playground/v1/actions/player/set-player-options.json>)),
  `condition` (
  см. [login-form/v1/actions/login-form/login.json](<../../../../login-form/v1/actions/login-form/login.json>)).
- [ ] Для action `update`:
    - [ ] Параметры `from`, `to`, `value`, `condition`, `with` используются корректно (
      Эталон: [login-form/v1/actions/login-form/login.json](<../../../../login-form/v1/actions/login-form/login.json>), [playground/v1/actions/player/load-player-state.json](<../../../../playground/v1/actions/player/load-player-state.json>)).
    - [ ] `address` и `from` не используются одновременно в одном action.
- [ ] Для action `save`:
    - [ ] Параметр `from` указывает на DataHub-путь к данным для сохранения (например, `module/data/file-to-save` или
      `input:answers` как
      в [playground/v1/actions/scenario/save-answers.json](<../../../../playground/v1/actions/scenario/save-answers.json>)).
    - [ ] Параметр `to` (если используется для указания файла напрямую) содержит корректный DataHub-путь.
      **Примечание по интерполяции в путях**: Эталонные модули (
      например, [playground/v1/actions/scenario/save-answers.json](<../../../../playground/v1/actions/scenario/save-answers.json>)
      с `to: "file!playground/data/scenario-answers/{input:scenarioId}-answers.json"`
      и [primary-form/v2/actions/data/save-application-data.json](<../../../../primary-form/v2/actions/data/save-application-data.json>)
      с `value: "file!primary-form/data/applications/application-{input:applicationId}.json"` в `update` для подготовки
      пути) часто используют интерполяцию `{...}` для вставки ID или динамических частей в имена файлов при сохранении и
      формировании путей.
      (См. обновленное правило по интерполяции `{...}` в Разделе 4).
- [ ] Адресация DataHub: используются допустимые префиксы (`mysql!` (
  см. [playground/v1/actions/db/query-example.json](<../../../../playground/v1/actions/db/query-example.json>)),
  `file!` (
  см. [playground/v1/actions/scenario/load-scenario.json](<../../../../playground/v1/actions/scenario/load-scenario.json>)),
  `buffer:` (
  см. [login-form/v1/actions/login-form/login.json](<../../../../login-form/v1/actions/login-form/login.json>)),
  `session!` (
  см. [login-form/v1/actions/login-form/login.json](<../../../../login-form/v1/actions/login-form/login.json>)),
  `input:` (
  см. [login-form/v1/actions/login-form/login.json](<../../../../login-form/v1/actions/login-form/login.json>)),
  `output:` (
  см. [login-form/v1/actions/login-form/login.json](<../../../../login-form/v1/actions/login-form/login.json>)) и др.).
- [ ] Нет прямого изменения UI-файлов из actions — UI обновляется через изменение данных, на которые он подписан, или
  через `output:commands` для UI-команд.
- [ ] Все переменные и буферы инициализируются перед использованием (например, через `update` с `value`).
- [ ] Действия `batch`/`condition` содержат корректные вложенные `instructions`.
- [ ] Все `commands` (`.json` или `.command.json`) имеют корректные `instructions`.
- [ ] Отсутствуют placeholders без реализации; если action/command не реализован, он должен быть удален или содержать
  только `comment` с указанием статуса TODO.
- [ ] `id` внутри файла action/command совпадает с именем файла (без расширения).
- [ ] Параметры `call` (поле `from`) указывают на существующие и корректные пути к другим actions или commands.

## 6. UI (pages, sections, templates)

- [ ] Страницы (`pages/`) и секции (`sections/`) включают компоненты или другие секции через `operation/include` с
  указанием `source` (
  Эталон: [landing-main-page/v1/pages/index.json](<../../../../landing-main-page/v1/pages/index.json>)), а не прямым
  вложением JSON-структур, если это переиспользуемый элемент.
- [ ] Динамический UI (списки, условные блоки) строится через `operation/generate` (если доступно и применимо) или через
  `operation/include` из буфера, который подготавливается в `actions`.
- [ ] Определена основная страница или шаблон-контейнер, способный отображать динамически загружаемый контент (например,
  из `buffer:qtu.generatedUI` или аналогичного). Этот контейнер должен четко определять, откуда он ожидает динамический
  контент.
- [ ] Убедиться, что `children` содержит корректный `operation/include` с путем к файлу данных, подготовленному
  соответствующим action (например,
  `"children": [{"operation": "include", "source": "file!question-to-user/data/generated/question-ui.json"}]`).
- [ ] Динамический UI (списки, условные блоки) строится через `operation/include` с указанием файла данных,
  подготовленного соответствующим action.
- [ ] Определена основная страница или шаблон-контейнер, который интегрирует компоненты через `operation/include`.
  Actions обрабатывают запросы и сохраняют данные в файлы, которые затем включаются в страницу при рендеринге.
- [ ] Компоненты `input` (InputText, Select, Checkbox, RadioGroup, Textarea и т.д.) имеют корректный `model` с указанием
  `form` и `field` (например, `model: {form: "myForm", field: "fieldName"}` (
  Эталон: [login-form/v1/templates/auth-tabs.json](<../../../../login-form/v1/templates/auth-tabs.json>))).
- [ ] Не используется Vue-подобный синтаксис (`v-for`, `v-if`, интерполяция `{{...}}` в `content` или `props` для
  формирования отображаемого текста). Текст задается напрямую или через DataHub.
- [ ] Обработчики событий (например, `click` для `Button`) оформлены через объект `customHooks`.
- [ ] `customHooks` имеют корректную структуру и используются правильно:
    - [ ] Каждый `customHooks` содержит `vAddress` для указания на обрабатываемый элемент.
    - [ ] Для кнопок, инициирующих действия, не являющиеся прямой отправкой формы, используется `emitEvent` для
      сигнализации о намерении, которое затем обрабатывается соответствующей логикой (см. примеры в конце документа).
      Для отправки форм используется `action: "submitForm"` (Эталон кнопки в
      форме: [login-form/v1/templates/auth-tabs.json](<../../../../login-form/v1/templates/auth-tabs.json>), кнопка "
      Войти"). Пример общего формата с `emitEvent`:
      `"customHooks": {"click": {"vAddress": "myButtonId", "action": "emitEvent", "params": {"eventName": "myCustomEvent", "eventData": {"key": "value"}}}}`
    - [ ] Для сложных взаимодействий можно указывать различные события: `click`, `change`, `input`, и другие.
    - [ ] Используется метод доступа к данным формы через `vAddress`, а не через прямые строковые ссылки.
- [ ] `options` для `Select`, `RadioGroup`, `CheckboxGroup` имеют структуру массива объектов с полями `label` (для
  отображения) и `value` (для значения) (
  Эталон: [playground/v1/templates/components/settings-form.json](<../../../../playground/v1/templates/components/settings-form.json>)).
- [ ] Используются только стандартные типы компонентов (например, `Button`, `InputText`, `Panel`, `Form`, `Textarea`).
  Имена типов должны быть в PascalCase (
  Эталон: [login-form/v1/templates/auth-tabs.json](<../../../../login-form/v1/templates/auth-tabs.json>)).
- [ ] Поля `blanks` (из `data/blanks/` или `data/ui-blanks/`) соответствуют эталонным примерам, не содержат
  нестандартных `props` или некорректной структуры. `vAddress` (если есть) - на верхнем уровне blank-файла.
- [ ] Интерактивные элементы (кнопки, поля ввода) имеют четкое предназначение и связаны с соответствующими actions.
- [ ] Заполнить или удалить пустой каталог `state/` (если состояние не используется, удалить из `files-by-block.json`).

## 7. Данные (data/)

- [ ] Структуры данных (например, в `data/*.json` или `data/question_sets/*.json`) состоят из реальных значений, а не
  строк-ссылок вида `"props.textInput.label"`.
- [ ] Все `options` в данных (например, для вопросов) имеют структуру с `label` и `value` (Эталон структуры
  options: [playground/v1/templates/components/settings-form.json](<../../../../playground/v1/templates/components/settings-form.json>)).
- [ ] Для `question_sets`: используется поле `label` (не `text` или `text_ru`) для текста вопроса; `inputType` (
  например, `text`, `select`, `radio`) для определения типа поля ввода.
- [ ] `Blanks` (в `data/blanks/` или `data/ui-blanks/`) содержат только необходимую базовую структуру компонента
  согласно эталонам (`login-form/v1/data/blanks/` (<../../../../login-form/v1/data/blanks/>),
  `landing-main-page/v1/data/blanks/` (<../../../../landing-main-page/v1/data/blanks/>)).
- [ ] **data/question_sets/** (все файлы):
    - [ ] В каждом вопросе СТРОГО использовать:
        - `label` вместо `text`
        - `inputType: "text"` вместо `type: "text_input"`
        - `inputType: "radio"` вместо `type: "radio_choice"`
        - `inputType: "select"` вместо `type: "select_choice"`
    - [ ] ПОЛНОСТЬЮ удалить `answer_model_path` из всех вопросов.
    - [ ] Для всех `options` использовать ТОЛЬКО структуру `{label: "...", value: "..."}`.
    - [ ] Проверить, что все `value` в `options` уникальны и имеют смысловое значение.
    - [ ] Убедиться, что `label` корректно описывают варианты выбора.

## 8. Валидация и Обработка Ошибок

- [ ] Если модуль предполагает ввод данных, присутствует папка `validations/` с файлами правил валидации (эталон:
  `login-form/v1/validations/login-validation.json`).
- [ ] Actions, обрабатывающие данные форм, вызывают соответствующие правила валидации.
- [ ] Предусмотрена корректная обработка ошибок валидации и отображение сообщений пользователю.
- [ ] Actions обрабатывают возможные ошибки при выполнении (например, при обращении к DataHub, вызове других
  actions/commands) и возвращают корректный статус.

## 9. Исправление найденных проблем в модуле `question-to-user/v5`

### Структурные проблемы

- **_i/files-by-block.json**:
    - [ ] Полностью исправить JSON-синтаксис:
        - Удалить лишние запятые
        - Выровнять отступы
        - Проверить корректность вложенных структур
    - [ ] Удалить дублирующиеся записи файлов.
    - [ ] Проверить соответствие записей реально существующим файлам на диске.
    - [ ] Унифицировать расширения файлов (`.json` для всех, кроме скриптов).
    - [ ] Удалить записи несуществующих файлов.
    - [ ] Проверить, что каждый блок (`core_qtu`, `general_dialogs` и т.д.) содержит только актуальные файлы.
    - [ ] Убедиться, что файлы распределены по корректным блокам и подкатегориям.
- **Отсутствующие файлы и каталоги**:
    - [ ] Создать и наполнить каталог `data/ui-blanks/` необходимыми файлами (`text-question.json`,
      `text-input-answer.json`, `radio-button.json`, `select.json`, `textarea-question.json`) на основе эталонов и
      содержимого из `data/examples/`.
    - [ ] Удалить каталог `data/examples/` после переноса содержимого.
    - [ ] Создать и наполнить каталог `validations/` правилами валидации для форм (например, для `aiProbeForm`).
    - [ ] Заполнить или удалить пустой каталог `templates/ui_data_maps/`.
    - [ ] Заполнить или удалить пустой каталог `state/` (если состояние не используется, удалить из
      `files-by-block.json`).
- **Именование**:
    - [ ] Унифицировать расширения файлов команд (`.json` вместо `.command.json`, если это стандарт).
    - [ ] Проверить все имена файлов и папок на соответствие kebab-case.
- **Непоследовательная структура JSON**:
    - [ ] Стандартизировать `form`/`model` структуру во всех компонентах форм.
- **Нестандартные каталоги**:
    - [ ] Удалить каталог `ui/` с дублирующимися подкаталогами `sections/` и `layouts/`. Перенести необходимые файлы в
      соответствующие стандартные каталоги модуля.
    - [ ] Проверить, нет ли других избыточных или нестандартных каталогов, не указанных в эталонной структуре модуля.

### Шаблоны (templates)

- **templates/TaskListDisplay.json и templates/ScenarioListDisplay.json**:
    - [ ] Заменить Vue-подобный синтаксис (`v-for`, `v-if`, `{{...}}`) на `operation/include` из буфера или
      `operation/generate`.
    - [ ] Заменить строковые обработчики событий (`"@click": "activateTask(task.taskId)"`) на стандартную структуру
      `customHooks` с `vAddress`.
- **templates/CommandExecutionForm.json**:
    - [ ] Добавить имя формы в `model`: (`model: {form: "execForm", field: "scenarioId"}`)
    - [ ] Заменить `@click` на стандартную структуру `customHooks` с указанием `vAddress` для доступа к данным формы.
    - [ ] Заменить параметры вида `"scenarioId": "formState.scenarioId"` на доступ через `vAddress`.
- **templates/layouts/qtu-dialog-layout.json**:
    - [ ] Заменить интерполяцию `"content": "{{slotProps.header.title?|AI Assistant}}"` на статический текст или
      получение из props.

### Экшены (actions)

- **actions/processQuestions.json**:
    - [ ] Удалить нестандартный параметр `options: {deepMerge: true}` в `update`.
    - [ ] Удалить прямое изменение UI-файлов ( `to: "file!..."`); использовать подготовку данных в буфер.
- **actions/saveCurrentAnswers.json**:
    - [ ] Исправить action `save`, используя `from` для указания DataHub-пути к данным и `to` (если нужно) для пути
      сохранения.
- **actions/clearCurrentAnswers.json**:
    - [ ] Исправить `update` с `from: {}` на корректную структуру.
- **actions/loadQuestionSet.json**:
    - [ ] Удалить прямое изменение UI-файла; использовать буфер.
    - [ ] Добавить реальную логику в `for` для обработки вопросов.
- **actions/submit-task.json**:
    - [ ] Реализовать логику или оставить только `comment` с TODO.
- **actions/loadAiProbeQuestions.json**:
    - [ ] Удалить интерполяцию `{{...}}` в `value`. Для конкатенации использовать несколько `update` или `batch`.
    - [ ] Заменить ссылки на несуществующие `ui-blanks` на корректные пути после их создания.
    - [ ] Заменить нестандартный `v-model` и `answer_model_path` на стандартный `model: {form, field}` при генерации
      элементов.
- **actions/saveAiProbeAnswers.json**:
    - [ ] Привести `id` в соответствие с именем файла (`saveAiProbeAnswers`).
    - [ ] Проверить DataHub-путь в `update` (`to: "question-to-user/data/ai-probe-answers:sessionAnswers"`).
    - [ ] Проверить корректность `save` (`from: "question-to-user/data/ai-probe-answers"`).
- **actions/list-system-tasks.json** (и другие системные):
    - [ ] Убедиться, что путь в `call` (`from: "qtu/system/listTasks"`) указывает на существующую команду/action в
      модуле QTU или системе.
- **actions/loadQuestionSummaryTable.json**:
    - [ ] Устранить "TODO" плейсхолдер или реализовать функциональность.
    - [ ] Исправить некорректные пути `file!...` на валидные DataHub-пути.
- **actions/get-next-ai-probe-question.json**:
    - [ ] Привести `id` в соответствие с именем файла (`get-next-ai-probe-question`).
    - [ ] Удалить интерполяцию `{{...}}` в `value`, `loop.item` и других местах; использовать стандартные механизмы.
    - [ ] Заменить ссылки на несуществующие `ui-blanks` на корректные пути.
    - [ ] Заменить нестандартный `v-model` и `answer_model_path` на стандартный `model: {form, field}` при генерации
      элементов.
- **actions/reset-main-work-scenario.json и actions/execute-main-work-scenario.json**:
    - [ ] Удалить плейсхолдер-комментарии о заблокированной функциональности или реализовать её.
- **actions/*-dialog-definition.json, actions/*-system-scenarios.json, actions/*-dialog-definitions.json (и аналогичные,
  использующие `call` на внутренние пути)**:
    - [ ] Убедиться, что путь в `call` (например, `from: "question-to-user/filesystem/loadDialog"`) указывает на
      существующую и корректно функционирующую команду/action в модуле QTU или системе.

### Секции (sections)

- **sections/question-display.json**:
    - [ ] Заменить нестандартные обработчики событий на стандартную структуру `customHooks`.
    - [ ] Убедиться, что `children` содержит корректный `operation/include` с путем к файлу данных, подготовленному
      соответствующим action (например,
      `"children": [{"operation": "include", "source": "file!question-to-user/data/generated/question-ui.json"}]`).
- **sections/QtuUserInputSection.json**:
    - [ ] Удалить ВЕЗДЕ интерполяцию `{{props.class?}}`, `{{props.formId}}`, `{{props.fields[0].label?}}`.
    - [ ] Добавить `model` ВСЕМ компонентам ввода (`InputText`).
    - [ ] Добавить `customHooks` всем кнопкам (`Button`).
    - [ ] Заменить динамические плейсхолдеры на стандартные статические значения или данные из DataHub.

### Данные (data/)

- **data/blanks/** (все файлы):
    - [ ] Привести структуру к эталонам (`login-form/v1/data/blanks/`, `landing-main-page/v1/data/blanks/`).
      `vAddress` (если есть) - на верхнем уровне.
- **data/question_sets/current-probe-questions.json** (и другие):
    - [ ] Заменить `text` на `label`.
    - [ ] Заменить `type: "text_input"` на `inputType: "text"`, `type: "radio_choice"` на `inputType: "radio"`.
    - [ ] Удалить `answer_model_path`, использовать стандартный `model` в генерируемых UI элементах.
- **data/examples/text-input-answer-example.json**:
    - [ ] Удалить файл после переноса и исправления его содержимого в `data/ui-blanks/text-input-answer.json`. Удалить
      `v-model` и интерполяцию.

### Страницы (pages)

- **pages/task-scenario-management-page.json**:
    - [ ] Заменить плейсхолдеры (`"content": "Task list content goes here."`) на `operation/include` для соответствующих
      шаблонов (`templates/TaskListDisplay.json` и др.).
- **pages/question-summary-page.json**:
    - [ ] Заменить `events` на стандартную структуру `customHooks`, с помошью `customHooks` с `vAddress` можуно
      управлять любым елементом сраници, согласно примерам.
    - [ ] Использовать механизм локализации для текстов или единый язык.
- **pages/ai-specific-dialogs-page.json**:
    - [ ] Заменить ВСЕ `@click` на стандартную структуру `customHooks`.
    - [ ] Дополнить `customHooks` свойством `vAddress` для управления элементами страницы.
    - [ ] Заменить `"type": "textarea"` на `"type": "Textarea"` (с заглавной буквы).
    - [ ] Добавить корректный `model` для `Textarea`: `model: {form: "aiProbeForm", field: "freeformResponse"}`.
    - [ ] Заменить пустые `params: {}` на необходимые параметры или полностью удалить параметр, если он не требуется.
    - [ ] Добавить `customHooks` всем кнопкам (`Button`).
    - [ ] Заменить div с `content: "AI feedback will appear here."` на корректное отображение содержимого.
    - [ ] Заменить статический плейсхолдер `"Enter your thoughts here..."` на локализованный текст.
- **pages/dialogs-page.json** (и другие неполные):
    - [ ] Заменить плейсхолдеры на реальную реализацию.

### PHP-класс (code/)

- **code/QuestionToUser.php**:
    - [ ] Удалить полностью закомментированные `use` утверждения.
    - [ ] Добавить минимально необходимую реализацию класса, если он используется.

### Метаданные (_i/)

- **_i/files-by-block.json**:
    - [ ] Полностью исправить JSON-синтаксис:
        - Удалить лишние запятые
        - Выровнять отступы
        - Проверить корректность вложенных структур
    - [ ] Удалить дублирующиеся записи файлов.
    - [ ] Проверить соответствие записей реально существующим файлам на диске.
    - [ ] Унифицировать расширения файлов (`.json` для всех, кроме скриптов).
    - [ ] Удалить записи несуществующих файлов.
    - [ ] Проверить, что каждый блок (`core_qtu`, `general_dialogs` и т.д.) содержит только актуальные файлы.
    - [ ] Убедиться, что файлы распределены по корректным блокам и подкатегориям.

### Команды (commands/)

- **Унификация файлов**:
    - [ ] Переименовать все команды к единому стандарту расширений: `.json` вместо `.command.json`
    - [ ] Исправить иерархию вызовов: если команды `ai/`, `system/`, и `filesystem/` вызывают реализации по фактическим
      путям, убедиться, что эти пути существуют.
    - [ ] Удалить комментарии в JSON из всех команд (например, `getNextProbe.command.json`, `listTasks.command.json`).
- **Проверка соответствия files-by-block.json**:
    - [ ] В `_i/files-by-block.json` указан файл `cleanupQtuSession.ps1`, но на диске находится
      `cleanupQtuSession.json`. Исправить несоответствие.
    - [ ] Проверить, что все команды в подкаталогах `ai/`, `system/` и `filesystem/` корректно отражены в
      `files-by-block.json`.

### Документация (docs/)

- **docs/known-issues.md**:
    - [ ] Заполнить актуальными известными проблемами на основе этого чеклиста.
- **Отсутствующие документы**:
    - [ ] Создать `data-schema.md`, `code.md` (если есть PHP код), `changelog.md`.

## 10. Контрольный список для финальной проверки

- [ ] Валидация всех JSON-файлов (синтаксис).
- [ ] Тестирование основных сценариев работы модуля после исправлений.
- [ ] Проверка соответствия структуры файлов и `_i/files-by-block.json`.
- [ ] Проверка работы ссылок и переходов между страницами (из `_i/links.json`).
- [ ] Обновление документации (`README.md`, `known-issues.md`, `changelog.md`) с учетом внесенных изменений.

## 11. Сводка ключевых проблем и приоритеты исправления (для QTU v5)

**Приоритет 1: Структура и базовые стандарты**

1. **Несоответствие `_i/files-by-block.json`**: = удалить дубликаты, синхронизировать с диском.
2. **Отсутствующие и пустые каталоги**: Создать `data/ui-blanks/`, `validations/` и их содержимое по эталонам. Удалить
   `data/examples/`.
3. **Нестандартные каталоги**: Удалить `ui/` с дублирующимися `sections/` и `layouts/`. Перенести необходимые файлы в
   соответствующие стандартные каталоги модуля.
