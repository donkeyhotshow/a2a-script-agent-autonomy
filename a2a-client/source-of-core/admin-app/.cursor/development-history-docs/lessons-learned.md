# Lessons Learned: Анализ ядра системы и эталонных модулей

Дата: 2024-07-26
Сессия: True Module Fix

Этот документ фиксирует ключевые моменты, выявленные в ходе анализа PHP-ядра системы AiRudeDepot и эталонных модулей.

## 1. Архитектура PHP-ядра обработки данных и UI

Ядро системы, отвечающее за обработку JSON-инструкций, рендеринг страниц и управление данными, состоит из следующих
ключевых компонентов:

- **`App\AiRudeDepot\Modules\PageModule.php` ([mdc:app/AiRudeDepot/Modules/PageModule.php])**:
    - Базовый класс для UI-модулей.
    - Метод `moduleRun()` оркестрирует обработку JSON-описания страницы (`pages/page-name.json`).
    - Последовательно вызывает PHP-модификаторы `WalkForOperations` и `WalkForForms` из `DataProcessor`.
    - Собирает данные для рендера, включая обработанную структуру страницы (`page`), данные форм (`forms`) и другие
      метаданные.

- **`App\AiRudeDepot\Processors\DataProcessor.php` ([mdc:app/AiRudeDepot/Processors/DataProcessor.php])**:
    - Центральный движок для применения "модификаторов" (PHP-классов или JSON-инструкций) к данным.
    - Использует `DataHub` для доступа к данным.
    - PHP-модификаторы (например, `WalkForOperations`, `WalkForForms`) находятся в `Processors/DataProcessor/Php/`.
    - JSON-модификаторы (инструкции) находятся в `Processors/DataProcessor/Json/`.
    - Метод `processActionFile()` используется для выполнения JSON-файлов из директории `actions/` модуля.

- **
  `App\AiRudeDepot\Processors\InstructionProcessor\StorageHelper.php` ([mdc:app/AiRudeDepot/Processors/InstructionProcessor/StorageHelper.php])
  **:
    - Содержит основную логику выполнения последовательности JSON-инструкций (метод `executeInstructions()`).
    - `executeInstructions()` итерирует по инструкциям и вызывает `processInstruction()` для каждой.
    - `processInstruction()` определяет тип действия (`action`) и вызывает соответствующий метод-обработчик (например,
      `handleUpdate`, `handleSave`, `processForLoop`, `processCall`).
    - Методы-обработчики используют `handleSource()` для получения данных из `DataHub` и выполняют свои операции.

- **`App\AiRudeDepot\Processors\InstructionProcessor.php` ([mdc:app/AiRudeDepot/Processors/InstructionProcessor.php])**:
    - Не является исполнителем цикла инструкций, а предоставляет API (`get`, `set`, `save`, `remove`, `find`) для
      конкретного адреса в `DataHub`.
    - Создается и используется `StorageHelper` (или `DataHub`) для взаимодействия с "модулем хранения", ассоциированным
      с адресом.

- **
  `App\AiRudeDepot\Processors\InstructionProcessor\DataManipulateHelper.php` ([mdc:app/AiRudeDepot/Processors/InstructionProcessor/DataManipulateHelper.php])
  **:
    - Предоставляет статические методы для:
        - Поиска данных (`searchInData`) - используется инструкциями с `find`.
        - Трансформации данных (`applyDataTransformation`) - используется инструкциями с `with`.
        - Вычисления условий (`evaluateCondition`) - используется инструкциями с `condition`.

- **`App\AiRudeDepot\Storage\DataHub.php` ([mdc:app/AiRudeDepot/Storage/DataHub.php])**:
    - Центральное хранилище и менеджер данных.
    - Метод `address('...')` - основная точка входа, возвращает `InstructionProcessor`.
    - Использует `PathHelper` для парсинга адресов.
    - Управляет "модулями хранения" (контроллерами) для разных типов данных:
        - `FileController` (`Storage/Data/Controllers/File.php`): для JSON-файлов.
        - `BufferController` (`Storage/Data/Controllers/Buffer.php`): для данных в памяти (буферы `input`, `output`,
          `args`, etc.).
        - `SessionController`, `ModelController`, `MysqlController`, `DirectoryController`.
    - Поддерживает разрешение плейсхолдеров вида `{адрес_в_DataHub}` в строках адресов и данных (через
      `resolveAddress()` и `processResolveInstruction()`).

- **`App\AiRudeDepot\Helpers\PathHelper.php` ([mdc:app/AiRudeDepot/Helpers/PathHelper.php])**:
    - Отвечает за первичный парсинг строки адреса, делегируя основную работу `StoragePathParser`.
    - Хранит распарсенные компоненты пути.

- **`App\AiRudeDepot\Managers\StoragePathParser.php` ([mdc:app/AiRudeDepot/Managers/StoragePathParser.php])**:
    - Детально разбирает строку адреса на компоненты:
        - Префикс типа хранилища (например, `file!`, `buffer:`, `mysql!`).
        - Путь к ресурсу (`storagePath`).
        - JSON-ключи (`:key1.key2...` -> `keyPath`).
        - Query-параметры (`?param=value...` -> `parameters`).
        - Для `mysql!` и `model!` также извлекает CRUD-операции из сегментов пути.

## 2. Обработка JSON страниц модулей

- **`WalkForOperations.php` ([mdc:app/AiRudeDepot/Processors/DataProcessor/Php/WalkForOperations.php])**:
    - Вызывается первым из `PageModule`.
    - Рекурсивно обходит JSON-структуру страницы.
    - Обрабатывает узлы `{"type": "operation", "action": "include", "source": "..."}`: загружает данные из `source` (
      DataHub адрес), рекурсивно их обрабатывает и вставляет вместо узла `include`.
    - Обрабатывает `{"type": "operation", "action": "add", "source": "..."}`: аналогично `include`, но результат "
      сплющивается" при вставке в родительский последовательный массив.
    - Обрабатывает `{"type": "operation", "action": "remove"}`: удаляет узел.

- **`WalkForForms.php` ([mdc:app/AiRudeDepot/Processors/DataProcessor/Php/WalkForForms.php])**:
    - Вызывается после `WalkForOperations`.
    - Рекурсивно ищет узлы `{"model": {"form": "имя_файла_данных_формы"}}`.
    - Загружает данные для форм из `[moduleSlug]/data/[имя_файла_данных_формы]` (JSON-файлы).
    - Автоматически подгружает ошибки валидации для соответствующей формы из буфера `buffer:validationErrors` (если они
      там есть) и добавляет их в данные формы под ключом `errors`.
    - Собирает данные всех форм, которые затем `PageModule` добавляет в общий ответ под ключом `forms`.

## 3. Ключевые моменты по JSON-инструкциям (`actions/`)

- Исполняются через `DataProcessor::processActionFile()` -> `runJson()` -> `StorageHelper::executeInstructions()`.
- `StorageHelper::executeInstructions()` итерирует по массиву инструкций, вызывая `StorageHelper::processInstruction()`
  для каждой.
- `processInstruction()` использует карту обработчиков (`$actionHandlers`) для вызова соответствующего метода (например,
  `handleUpdate`, `handleSave`, `processForLoop`).
- **Основные поля инструкций**:
    - `action`: (string) Тип действия (например, `update`, `save`, `for`, `call`, `add`, `remove`, `return`, `comment`,
      `print_r`).
    - `from` / `address`: (string) Источник данных (адрес в `DataHub`, может содержать плейсхолдеры `{...}`).
    - `value`: (any) Прямое значение, используется вместо `from`/`address`. Может содержать плейсхолдеры `{...}` если
      строка.
    - `to`: (string) Целевой адрес в `DataHub` (для `update`, `add`). Может содержать плейсхолдеры.
    - `condition`: (boolean | string | array) Условие выполнения инструкции. Строки и значения в массивах могут быть
      адресами в `DataHub` и содержать плейсхолдеры.
    - `with`: (string) Имя трансформации данных (см. `DataManipulateHelper::applyDataTransformation`).
    - `find`: (array) Параметры для поиска данных (см. `DataManipulateHelper::searchInData`).
    - `keyPath`: (string | array) Путь к ключу внутри данных, полученных из `from`.
    - `instructions`: (array) Массив вложенных инструкций ("comment", "coment", "update", "save", "print_r", "for", "
      add", "remove", "call", "return").
    - `disabled`: (boolean) Если `true`, инструкция пропускается.
- **Буферы `DataHub`**:
    - `args`: Аргументы, переданные в `DataProcessor::runJson()`.
    - `input`: Основные входные данные для набора инструкций.
    - `output`: Используется для возврата результата из JSON-модификаторов.
    - `buffer:for.currentItem`, `buffer:for.currentIndex`, `buffer:for.list`: Используются внутри инструкций
      `action: "for"`.

## 4. Замечания по документации и отсутствующим файлам

В ходе анализа документации модуля `login-form/v1` (`implement-modules/login-form/v1/docs/known-issues.md`) были
обнаружены ссылки на следующие файлы стандартов/чек-листов, которые не удалось найти в текущем рабочем пространстве:

- `docs/guides/checklists/module-verification.md`
- `docs/standards/component-standards.md`

**Рекомендация**: Необходимо либо создать эти документы, либо обновить документацию `login-form/v1` для использования
актуальных ссылок на стандарты, если они существуют под другими именами или в других местах.

Также, описание некоторых аспектов в `login-form/v1/docs/` может потребовать актуализации для более точного отражения
работы текущего PHP-ядра (например, детали взаимодействия с `DataHub`, точный синтаксис JSON-инструкций, если он там
описан).

## 5. Общие рекомендации для разработки модулей

- Всегда обеспечивать строгое соответствие структуры директорий и файлов модуля требованиям, зафиксированным в
  `StrictModuleChecklist.md` ([/docs/guides/StrictModuleChecklist.md]).
- Тщательно проверять синтаксис JSON-инструкций в `actions/`, обращая внимание на правильность указания `action`,
  `from`, `to`, `condition` и других полей.
- Корректно использовать адресацию `DataHub`, включая префиксы (`file!`, `buffer:`, `model!`, etc.) и плейсхолдеры
  `{...}`.
- Для JSON-структур в `pages/` убеждаться в правильном использовании конструкций
  `{"type": "operation", "action": "include/add/remove", "source": "..."}`.
- Для форм проверять пути к файлам данных в `[moduleSlug]/data/` и корректность описания `{"model": {"form": "..."}}`.
- Активно использовать логирование в PHP-коде для отладки.

## 6. Клиентские JavaScript Менеджеры и Глобальный `hub` (JSON UI)

Ключ к пониманию клиентской логики JSON UI — это глобальный объект `hub` и связанные с ним менеджеры (документация:
`docs/ui/core-concepts/managers.md`).

- **`hub` (как StateManager)**:
    - Реализован в `HubManager` (который `extends StateManager`).
    - Управляет **общим состоянием приложения**. Данные доступны через `hub.get(path)` (что объясняет плейсхолдеры
      `{path}` в JSON UI) и обновляются через `hub.update(path, value)`.
    - Используется для хранения глобальных настроек, состояния UI, данных пользователя.
- **`hub.actionManager`**:
    - **Основной менеджер для парсинга и выполнения клиентских команд**, определенных в свойстве `customHooks`
      компонентов JSON UI (например, `sendData`, `navigateTo`, `confirm`, `closeDialog`).
    - Получает описание действия из `customHooks`, выполняет логику, взаимодействуя с другими менеджерами и Inertia (
      `router`).
- **`hub.formManager`**:
    - Управляет состоянием форм (данные полей, статус `pending`, ошибки), их регистрацией и получением данных.

    * Компоненты JSON UI с объектом `model` (например, `model: { form: "myForm", field: "fieldName" }`) взаимодействуют
      с `FormManager`.
    * `ActionManager` использует `FormManager` для получения данных формы перед отправкой на сервер (через действие
      `sendData` с указанием `form: "myForm"`) и для обновления статуса/ошибок формы после ответа сервера.
- **`hub.notifyManager` (Event Bus)**:
    - Центральный event bus (`on`, `emit`) для коммуникации между компонентами и менеджерами.
- **`hub.toastManager`**:
    - Для отображения глобальных UI-уведомлений (toasts).
- **Другие менеджеры**: `logManager`, `alertManager`, `propsManager`, `componentManager`, `layoutManager`,
  `menuManager`, `modalManager`, `themeManager` и др. У многих из них документация отсутствует, но они инициализируются
  в `HubManager`.

## 7. Рендеринг JSON UI на клиенте

Процесс превращения JSON-структур в видимые Vue-компоненты на клиенте (описан в
`docs/ui/core-concepts/rendering-pipeline.md`):

1. **Старт**: Основной JSON-файл модуля (например, `pages/some-page.json`).
2. **`RenderJson.vue`**: Корневой компонент для рендеринга одного JSON-объекта компонента. Передает JSON в
   `Presets.vue`.
3. **`Presets.vue`**:
    * Использует `type` из JSON (приведенный к **нижнему регистру**) и файл
      `install-modules/aiCore/js/component-map.json` для определения **категории обертки** (например,
      `ComplexContainer`, `VModelComponent`, `Container`, `Tag`).
    * Рендерит эту категорию-обертку.
4. **Категория-обертка (например, `ComplexContainer.vue`)**:
    * Получает JSON. Снова смотрит на `type` для определения **имени конкретного компонента** (например, "Tabs", "
      Card").
    * Может использовать дополнительные маппинг-файлы для детализации (например, `v-model-component-map.json` для
      категории `VModel`, `component-containers-map.json` для категории `Container`).
    * Динамически загружает и рендерит **конечную, специфичную обертку компонента** (например, `Tabs.vue`).
5. **Специфичная обертка компонента (например, `Tabs.vue`)**:
    * Получает JSON, рендерит HTML (часто используя PrimeVue), передает `props`.
    * **Рендерит `children` рекурсивно, снова вызывая `RenderJson.vue`**.

Эта цепочка (`RenderJson` -> `Presets` -> Категория -> Специфичная обертка) обеспечивает гибкость рендеринга.

## 8. Ключевые файлы маппинга и конфигурации JSON UI (клиент)

- **`install-modules/aiCore/js/component-map.json`**:
    - **Центральный файл**, определяющий, как `type` из JSON (в **нижнем регистре**) маппится на **категорию
      Vue-компонента-обертки** (`Component`, `Container`, `VModel`, `ComplexContainer`, `Customs`).
    - Содержит `"default": "Tag"` для ненайденных типов (рендерит HTML-тег, имя которого берется из `type`).
    - **Пример**: `{ "button": "Component", "card": "ComplexContainer", "inputtext": "VModel" }`.
- **`install-modules/aiCore/js/v-model-component-map.json`**:
    - Используется **внутри логики категории `VModel`** для дальнейшей детализации рендеринга конкретного типа
      инпут-компонента.
    - **Пример**: `{ "inputtext": "Input", "select": "Select", "checkbox": "Checkbox" }` (ключи - `type` в нижнем
      регистре).
- **`install-modules/aiCore/js/component-containers-map.json`**:
    - Аналогично для категории `Container`, маппит на конкретные Vue-компоненты-обертки контейнеров.
    - **Пример**: `{ "form": "Form", "panel": "Panel" }`.

**Важнейшее следствие из этих файлов: `type` в JSON UI для компонентов, перечисленных в этих картах, должен быть в
НИЖНЕМ РЕГИСТРЕ. Для стандартных HTML-тегов также используется нижний регистр (обрабатывается `"default": "Tag"`).** Это
расходится с некоторыми рекомендациями в документации (PascalCase), но конфигурационные файлы имеют приоритет.

## 9. Разделение Client Actions и Server Actions

- **Client Actions**:
    - Определены в свойстве `customHooks` компонентов JSON UI.
    - Выполняются **в браузере** клиентским `hub.actionManager`.
    - Примеры: `navigateTo`, `confirm`, `closeDialog`, `sendData`.
- **Server Actions (Module Actions)**:
    - Определены в JSON-файлах в директории `actions/` модуля (например, `my-module/actions/saveForm.json`).
    - Выполняются **на сервере** (PHP-код, использующий `DataHub`, `StorageHelper.php`).
    - Запускаются с клиента через Client Action `sendData`, который указывает, какое серверное действие выполнить.
    - Примеры: сохранение данных формы, загрузка данных, вызов PHP команд.

## 10. Паттерны JSON UI из примеров

- **Динамическая загрузка опций для `Select`**:
    - В `model` компонента `Select` используется:
      `options: { "action": "include", "type": "operation", "source": "dataHub/path/to/options" }`. Операция `include` (
      выполняемая `WalkForOperations.php`) загружает данные из `DataHub`.
- **Динамическое обновление `DataTable`**:
    - `DataTable.props.value` привязывается к данным в `StateManager/hub` (например, `value: "state:productData"`).
    - Действия фильтров (через `customHooks`) используют `sendData` с параметром `target: "productData"`, чтобы обновить
      эти данные в `hub`, что приводит к обновлению таблицы.
- **Кастомизация ячеек `DataTable`**:
    - Через `children` компонента `Column`:
      `[{ "type": "template", "slot": "body", "template": { ... JSON UI структура для ячейки ... } }]`.
- **Модальные диалоги с формами через `dialogConfig` у `Button`**:
    - Компонент `Button` может иметь свойство `dialogConfig`.
    - `dialogConfig` описывает структуру диалога (`type: "Dialog"`), его поля (`fields` - массив JSON UI компонентов с
      `model`, привязанным к `dialogForm`) и кнопки действий (`actions`).
    - Позволяет декларативно создавать сложные диалоги.
- **Компоненты `Accordion` и `Tabs`**:
    - Используют свойство `items` (массив), где каждый элемент описывает панель/вкладку (с `props.header` и `children`
      для контента).

## 11. Case-Sensitivity of Component `type` in JSON UI (Critical for Validator)

- **Обнаружено**: Свойство `type` в JSON-определениях UI компонентов является **строго регистро-зависимым**.
- **Правила определения Регистра**:
    - **Стандартные HTML элементы**: Должны быть указаны в **нижнем регистре** (e.g., `div`, `h2`, `p`, `span`, `img`,
      `a`). Валидатор и система рендеринга ожидают именно такой регистр для корректной обработки стандартных HTML-тегов.
    - **Vue компоненты (включая PrimeVue)**: Должны быть указаны в **PascalCase** (e.g., `Panel`, `Button`, `InputText`,
      `DataTable`). Это соответствует стандартным соглашениям Vue по именованию компонентов.
- **Поведение Валидатора (`validate:module-json`)**:
    - Валидатор строго проверяет регистр `type`.
    - Ошибки типа `Invalid component type 'div'` (когда ожидалось `div`) или `Invalid component type 'h2'` (если
      валидатор ожидает другую обработку или имеет баг для некоторых HTML-тегов) напрямую связаны с этим правилом.
    - Хотя `component-map.json` (ранее предполагаемый как `storage/aiCore/js/component-map.json`, но его точное
      расположение и использование в валидаторе требует уточнения) играет роль в маппинге типов на категории рендеринга,
      базовое правило регистра HTML vs Vue компонентов является фундаментальным.
- **Рекомендации**:
    - При разработке и рефакторинге модулей необходимо тщательно следить за регистром значения `type`.
    - Вся документация, касающаяся создания UI JSON, должна явно указывать на эти правила регистро-зависимости.
    - Если валидатор продолжает выдавать ошибки на корректно указанные в нижнем регистре HTML-теги (например, `h2`), это
      может указывать на необходимость дальнейшего исследования конфигурации валидатора или на его внутреннюю ошибку для
      определенных тегов.

## 12. Ложноположительные срабатывания Валидатора (`ValidateModuleJsonCommand`)

- **Проблема**: Текущая версия `ValidateModuleJsonCommand` пытается валидировать **все** JSON-файлы в модуле как JSON UI
  структуры.
- **Следствие**: Это приводит к ложноположительным ошибкам типа `"Invalid component type 'object'"` для файлов, которые
  являются валидными JSON Schema (где `"type": "object"` является стандартным объявлением), но не JSON UI компонентами.
    - Пример: `question-to-user/ai/parsers/analyze_general_text_for_entities.parser.json`.
- **Рекомендация**: Необходимо доработать валидатор, чтобы он:
    - Либо корректно идентифицировал и пропускал JSON Schema файлы (например, по наличию ключей `"properties"`,
      `"items"`, `"$schema"` на верхнем уровне и отсутствию UI-специфичных ключей типа `customHooks` или `model` в
      корне).
    - Либо ограничивал свою область действия только теми директориями, где ожидаются JSON UI файлы (например, `pages/`,
      `templates/`).

## 13. Расположение исходных и собранных файлов модулей

- **Исходные файлы версий модуля**:
    - Находятся в `implement-modules/<имя_модуля>/<номер_версии>/`.
    - Здесь содержатся все файлы, специфичные для конкретной версии модуля, до их объединения.
- **Собранные (merged) файлы модуля**:
    - Находятся в `install-modules/aiInstaller/<имя_модуля>/`.
    - Эта директория содержит результат выполнения команды `php artisan module:merge <имя_модуля>`.
    - Представляет собой "готовую к установке" или "актуальную рабочую" версию модуля, объединяющую все указанные в
      `module-versions.json` версии.
    - Именно эту директорию следует рассматривать для получения полного набора файлов модуля после всех слияний.

## 14. Validator Discrepancy with `InputText` `model` Property

- **Symptom**: The `php artisan validate:module-json` command may report an error for the `model` property of
  `InputText` components, such as: "Invalid content type 'array' found. Allowed: [None]" (e.g., observed in
  `question-to-user/v5/sections/question-display.json`).
- **Analysis**:
    - The component validation rule (`install-modules/aiCore/validation/components/I/InputText.json`) defines `model` as
      an object:
      `{"type": "object", "nestedValidation": {"structure": {"form": {"type": "string"}, "field": {"type": "string"}}}}`.
    - The typical usage (e.g., `"model": { "form": "someForm", "field": "someField" }`) correctly adheres to this rule
      and matches usage in reference modules like `primary-form/v1`.
- **Conclusion**: This validation error is likely a bug or misleading error reporting within the
  `ValidateModuleJsonCommand.php` validator for this specific component and property. The UI JSON structure is generally
  correct.
- **Recommendation**: If `InputText` components function correctly at runtime despite this validation error, the error
  can be noted as a known validator issue. Avoid altering correct `model` structures solely to try and appease this
  specific validator message if it contradicts the component's rule.

## 15. Validator Behavior with Non-UI JSON Files (Update to #12)

- **Context**: Lesson #12 noted that the validator incorrectly tries to validate all JSON files, causing issues with
  JSON Schema files (e.g., `*.parser.json`).
- **Observation**: In the `question-to-user` module refactoring (v5), errors related to parser files in
  `install-modules/aiInstaller/question-to-user/ai/parsers/` were resolved when it was confirmed that this `ai/parsers/`
  directory was no longer being populated in `install-modules` after correct merging from `implement-modules` (where
  source `ai/` directories were refactored or removed).
- **Persistent Concern**: While the immediate issue for that specific path was resolved by ensuring the source files
  were no longer merged into a location the validator scanned for UI components, the validator's general behavior
  remains a point of attention. If any `.json` file within a scanned module directory (typically
  `install-modules/aiInstaller/<moduleName>/`) does not conform to UI component structure (e.g., by lacking a `type`
  property or having a `type` like `"object"` at its root which is not a UI component type), it may still be flagged.
- **Recommendation**:
    - Continue to be mindful of placing arbitrary JSON data files within module structures that the UI validator (
      `ValidateModuleJsonCommand.php`) recursively scans.
    - If such validation errors appear for other non-UI JSON files, preferred solutions would involve improvements to
      the validator itself (to correctly identify and skip non-UI JSONs like schemas) or stricter scoping of validator
      paths.
    - As a last resort, consider if such files truly need to be `.json` or be present in those locations if they cause
      persistent validation noise and the validator cannot be easily fixed.

## 16. Нормализация UI-модулей (на примере question-to-user)

Дата: 2024-07-27
Сессия: True Module Fix (продолжение, валидация `question-to-user`)

В ходе приведения модуля `question-to-user` к соответствию правилам валидатора JSON (`php artisan validate:module-json`)
были выявлены следующие ключевые моменты и выработаны решения:

### 16.1. Определения пользовательских UI-компонентов

Файлы, определяющие кастомные секции или лейауты UI (обычно в `implement-modules/<module>/<version>/ui/layouts/` или
`implement-modules/<module>/<version>/ui/sections/`), должны следовать этим правилам для успешной валидации:

* **Корневой `type`**: Должен быть стандартным HTML-тегом (например, `"type": "div"`) или валидным контейнерным
  компонентом PrimeVue. Использование имени самого файла компонента в качестве типа (например,
  `type: "qtu-dialog-layout"` для `qtu-dialog-layout.json`) приводит к ошибке "Unknown component type".
* **`propsSchema`**: Это свойство на корневом уровне определения пользовательского UI-компонента не поддерживается
  валидатором и должно быть удалено.
* **Внутренняя структура**:
    * Специализированные свойства вроде `slots` или `template.children` (которые могли использоваться в более ранних
      версиях или внутренних концепциях) должны быть преобразованы в стандартный массив `children` для корневого
      элемента этого файла.
    * Любые нестандартные или сложные компоненты, используемые внутри этих определений (например, кастомный `Repeater`,
      `MarkdownView`), должны быть заменены на базовые HTML-теги, стандартные компоненты PrimeVue или статические
      примеры их использования. Это необходимо, так как валидатор может не знать о кастомных компонентах, которые не
      зарегистрированы глобально или не имеют своих схем валидации.
* **Неподдерживаемые корневые свойства**: Свойства, такие как `condition` или `customHooks`, на корневом уровне файла
  определения пользовательского UI-компонента (если только этот файл не определяет *экземпляр* компонента PrimeVue,
  который их поддерживает) приводят к ошибкам "Unknown key" и должны быть удалены или их логика должна быть реализована
  другими способами (например, через родительские компоненты или JavaScript).

### 16.2. Использование стандартных и PrimeVue компонентов

При непосредственном использовании компонентов в JSON-структурах (например, в файлах страниц `pages/` или внутри
`children` других компонентов):

* **Компоненты PrimeVue**:
    * `Button`: Свойство `props.severity` должно иметь одно из допустимых значений (`primary`, `secondary`, `success`,
      `info`, `warn`, `help`, `danger`, `contrast`). Значение `primary-outline` некорректно. Для "контурного" стиля,
      если он поддерживается темой/компонентом, используется `props.variant="outlined"`.
    * `InputText`, `Textarea`: Свойство `props.name`, хотя и стандартно для HTML-элементов `input` и `textarea`, может
      вызывать ошибку "Unknown property 'name'" в контексте валидатора JSON UI. Это происходит, если компонент
      используется вне обертки PrimeVue `<Form>` или если система рендеринга не передает это свойство явно. Если для
      привязки данных используется `model.form` и `model.field`, свойство `name` в `props` часто можно безопасно
      удалить.
    * **Соответствие типов**: Важно использовать корректные `type` для компонентов PrimeVue, как они определены в
      `component-map.json` или ожидаются системой. Например, `TaskList` был заменен на `datatable`, а `TaskForm` на
      `form` (или более специфичный контейнерный компонент формы).
* **Базовые HTML-элементы**:
    * Типы вроде `div`, `span`, `h4`, `form` обычно безопасны.
    * **Регистр**: Для базовых HTML-тегов обычно используется нижний регистр (`"type": "span"`). Компоненты PrimeVue в
      JSON объявляются как PascalCase (`"type": "InputText"`), но система рендеринга (через `component-map.json`) часто
      ожидает их в нижнем регистре для первоначального маппинга. Вывод валидатора и схемы компонентов (
      `install-modules/aiCore/validation/components/`) являются основным источником истины.
* **Структура и ключи**:
    * Следует избегать неизвестных валидатору ключей на верхнем уровне компонента или в `props`. Например,
      пользовательский ключ `footer` в компоненте, если он не является стандартным слотом или свойством этого
      компонента, вызовет ошибку. Содержимое должно размещаться внутри `children` или других допустимых свойств.

### 16.3. Типы файлов, их содержимое и расположение

Структура модуля и содержимое ключевых JSON-файлов влияют на валидацию:

* **`actions/*.json`**:
    * Если файл определяет серверное действие, может подойти `"type": "actionDefinition"` (или `"action"` в нижнем
      регистре, если это соответствует схеме `install-modules/aiCore/validation/components/A/Action.json`).
    * Если файл описывает набор инструкций для пользователя или системы (не являясь прямым UI-компонентом), и для него
      есть схема, как для `"type": "Instructions"`, то его нужно использовать, обеспечив наличие требуемых полей (
      например, `instructions: []`).
* **`templates/*.json`**:
    * Если файл определяет UI-шаблон (например, структуру формы), который сам по себе не является кастомным
      UI-компонентом, он может требовать `"type": "templateDefinition"` (или `"formtemplate"` согласно схеме
      `install-modules/aiCore/validation/components/F/FormTemplate.json`) или может быть определен через базовый
      контейнер типа `"div"`.
    * Файлы, представляющие собой карты данных или шаблоны для UI (например, `ui_data_maps/`), должны быть перемещены в
      директорию `data/` модуля. Им желательно давать суффикс `.template.json`. Важно убедиться, что внутри этих файлов
      данных отсутствуют ключи `type` в их основной структуре данных, если это не предусмотрено их назначением.
* **`data/*.json`**:
    * Обычно не должны содержать ключ `type` на корневом уровне, если только они не соответствуют конкретной схеме
      данных, требующей его.
* **`docs/*.*`**:
    * Файлы в директории `docs/` (любых форматов, включая `.json` или `.md`) обычно пропускаются валидатором модулей.
      Поэтому наличие ключа `type` в JSON-файлах в `docs/` излишне и может быть безопасно удалено.
* **`pages/*.json`**:
    * Обычно требуют `"type": "Page"` (или `"page"` в нижнем регистре, согласно схеме
      `install-modules/aiCore/validation/components/P/Page.json`).
    * Должны соответствовать схеме страницы, например, иметь ключ `content` для основного содержимого, корректно
      указанный `layout` и другие ожидаемые свойства.

### 16.4. Процесс валидации и отладки

* **Последовательность команд**: Всегда выполняйте `php artisan module:merge <module_name>` *перед* запуском
  `php artisan validate:module-json <module_name>`. Это гарантирует, что валидируются последние изменения из
  `implement-modules/`.
* **Итеративный подход**: Исправляйте ошибки по одной или небольшими группами, затем повторяйте цикл слияния и
  валидации.
* **Источники информации для отладки**:
    * Сообщения об ошибках от валидатора: они обычно указывают путь к файлу в `install-modules/` и проблемный
      ключ/значение.
    * Схемы валидации:
        * Общий валидатор модуля: `install-modules/aiCore/validation/module-validator.json`.
        * Схемы для конкретных типов компонентов:
          `install-modules/aiCore/validation/components/<КАТЕГОРИЯ>/<ТИП>.json` (например, `P/Page.json`).
    * Руководства: `docs/guides/module-validation-guide.md` может содержать специфические требования для определенных
      `type`.
* **Стратегия "упрощения"**: Если причина ошибки неясна, попробуйте временно заменить сложную структуру на максимально
  простой валидный аналог (например, заменить кастомный компонент на простой `div` с текстом), чтобы локализовать
  проблему.

Эти уроки помогут ускорить процесс нормализации других модулей и уменьшить количество ошибок валидации.

---
Этот документ должен обновляться по мере выявления новых "уроков" и лучших практик. 
