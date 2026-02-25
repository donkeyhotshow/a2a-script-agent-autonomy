Понял. Прежде чем переходить к конкретным модулям, вы хотите, чтобы я проверил директорию `docs/ui/` на наличие
документации, которая может быть релевантна для понимания UI-компонентов, стандартов или общих принципов построения
интерфейса. Это разумный шаг, так как лучшее понимание UI поможет в исправлении модулей.

Я выполню следующие шаги:

1. **Просмотрю содержимое директории `docs/ui/`**.
2. Если там есть файлы, **изучу их содержимое**, обращая внимание на:
    * Описание UI-компонентов (стандартных или кастомных).
    * Гайды по стилизации.
    * Принципы построения макетов.
    * Информацию о взаимодействии UI с PHP-процессорами или JS-логикой.
    * Любые стандарты или best practices, связанные с UI.
3. **Обновлю `docs/development/lessons-learned.md` и/или `/docs/guides/StrictModuleChecklist.md`**, если найду
   новую важную информацию.
4. После этого мы вернемся к выбору модуля для исправления.

Приступаю к просмотру `docs/ui/`.

Ran tool
В директории `docs/ui/` есть несколько потенциально очень интересных файлов и поддиректорий.

Исходя из названий, наиболее релевантными для нашей текущей задачи (понимание UI для исправления модулей) кажутся:

* `primevue-components.md`: Вероятно, описывает используемые компоненты PrimeVue.
* `primevue-rude-vs-original-structure.md`: Может объяснять кастомизации или отличия в использовании PrimeVue.
* `ui-examples.md` и `ui-examples-complex.md`: Примеры использования UI, которые могут показать паттерны.
* `json-template-schema.md`: Схема JSON для UI-шаблонов, это очень важно.
* `README.json`: Возможно, это индекс документации по UI.
* Директории `core-concepts/` и `theming/`.

Предлагаю следующий план изучения:

1. Начну с `README.json`, так как это может быть индекс и даст общую структуру.
2. Затем `json-template-schema.md`, чтобы понять структуру JSON, описывающего UI.
3. Далее `primevue-components.md` и `primevue-rude-vs-original-structure.md` для понимания конкретных компонентов.
4. После этого `ui-examples.md` и `ui-examples-complex.md` для практических примеров.
5. И, наконец, загляну в `core-concepts/` и `theming/`, если останутся вопросы.

Приступаю к чтению `docs/ui/README.json`.

Read file: docs/ui/README.json
Файл `docs/ui/README.json` (который на самом деле является Markdown, судя по содержимому) — это очень подробный и
полезный индекс документации по всей системе JSON UI.

**Ключевые моменты и находки из `docs/ui/README.json`:**

* **Структура документации UI**: Ссылается на множество других файлов и директорий внутри `docs/ui/`, таких как:
    * `core-concepts/`: Основополагающие принципы.
    * `json-template-schema.md`: **Критически важный файл**, описывающий схему JSON для UI.
    * `module-architecture/` и `module-installation/`: Структура и установка модулей.
    * `commands-and-operations/` и `server-actions-extended/`: Взаимодействие с бэкендом.
    * Примеры: `ui-examples-v1.md` (помечен как "Review relevance") и `ui-examples-v2.md` (помечен как "Review
      relevance"). Вероятно, актуальны файлы, которые мы видели в листинге: `ui-examples.md` и `ui-examples-complex.md`.
* **Типы модулей**: Описаны основные типы (Landing Page, Primary Form, Login Form, Top Bar Modules) и их особенности.
* **Процесс создания модуля**: Описаны шаги от планирования до тестирования.
* **Классы для серверных действий**: Упомянуты `File`, `Directory`, `Buffer`, `Model`, `MySQL` — это, по сути, префиксы
  хранилищ `DataHub`, которые мы уже изучили.
* **Рекомендации по разработке**: Модульность, консистентность, разделение UI и логики, документация, тестирование,
  следование стандартам.
* **Чек-листы для верификации**:
    * **Наконец-то найдены ссылки на чек-листы!**
        * `Module Verification Checklist`: `../../checklists/verifications/verify-module.md` (относительно `docs/ui/`)
        * `UI Component Standards Checklist`: `../../checklists/verifications/verify-component-standards.md` (
          относительно `docs/ui/`)
    * Это означает, что они должны лежать в `docs/checklists/verifications/`.
* **Связанная документация**: Ссылки на общие менеджеры, общие элементы и специфику PrimeVue элементов в
  `../resources/common/`.
* **Жизненный цикл запроса (GET - Рендеринг страницы)**: Очень ценное описание!
    * Маршрутизация -> Инициализация Модуля (класс) -> `moduleRun()` -> Модификаторы:
        * `layoutModule` + `layoutNodeOperation`: Строят структуру UI (`props.page`) из `layout.json` / `page.json`,
          обрабатывают `include`.
        * `layoutFormComponent`: Обрабатывает формы, готовит данные состояния форм (`props.forms`).
    * Ответ клиенту (Inertia) с `props.page` и `props.forms`.
    * Vue рендерит на фронте.
* **Обработка Действий (POST)**: Ссылка на `../../concepts/action-handling-flow.md`.

**Выводы и следующие шаги:**

1. **Найдены чек-листы!** Это очень важно. Я должен буду их просмотреть.
    * `docs/checklists/verifications/verify-module.md`
    * `docs/checklists/verifications/verify-component-standards.md`
2. **Критически важный файл**: `docs/ui/json-template-schema.md`. Его нужно изучить следующим.
3. **Описание жизненного цикла рендеринга (GET)** очень полезно и должно быть отражено в `lessons-learned.md` и,
   возможно, в `StrictModuleChecklist.md` в разделе про `pages/`.
4. Ссылка на `docs/concepts/action-handling-flow.md` также важна для понимания обработки POST-запросов (actions).

**План изучения документации UI (обновленный):**

1. Прочитать `docs/ui/json-template-schema.md`.
2. Прочитать `docs/checklists/verifications/verify-module.md`.
3. Прочитать `docs/checklists/verifications/verify-component-standards.md`.
4. Прочитать `docs/ui/primevue-components.md` и `docs/ui/primevue-rude-vs-original-structure.md`.
5. Прочитать `docs/ui/ui-examples.md` и `docs/ui/ui-examples-complex.md`.
6. Прочитать `docs/concepts/action-handling-flow.md`.
7. Быстро просмотреть содержимое `docs/ui/core-concepts/` и `docs/ui/theming/`.
8. Обновить `lessons-learned.md` и `StrictModuleChecklist.md` всеми новыми знаниями.

Приступаю к чтению `docs/ui/json-template-schema.md`.

Read file: docs/ui/json-template-schema.md
Файл `docs/ui/json-template-schema.md` содержит **очень подробное описание структуры JSON-объектов, используемых для
определения UI-компонентов и целых страниц.** Это именно то, что нужно для понимания, как собираются интерфейсы.

**Ключевые моменты из `json-template-schema.md`:**

* **Пометка "(Innactive standard/recheck)"**: Важно! Это означает, что документ может быть не полностью актуален, но он
  все равно дает отличное представление об основных полях.
* **Основные принципы**: Декларативность, компонентная структура, переиспользуемость, расширяемость, читаемость,
  валидация.
* **Ключевые свойства JSON-объекта компонента**:
    * `type` (String, **Обязательное**): Тип компонента Vue (например, `"Grid"`, `"InputText"`, `"Button"`).
    * `props` (Object): Свойства, передаваемые компоненту Vue (HTML-атрибуты, стили, данные).
    * `children` (Array): Массив JSON-объектов дочерних компонентов (для контейнеров типа `Grid`, `div`, `Card`).
    * `items` (Array): Аналогично `children`, для списковых компонентов (`Menu`, `TreeSelect`).
    * `model` (Object): Для связывания с данными формы (VModel).
        * `form` (String): Имя формы.
        * `field` (String): Имя поля в форме.
        * `options` (Array, опционально): Опции для `Select`, `TreeSelect`.
        * `optionLabel` / `optionValue` (String, опционально): Для объектов в `options`.
        * `default` (Any, опционально): Значение по умолчанию.
    * `customHooks` (Object): Обработчики событий (ключи - имена событий, например, `"click"`; значения - массив
      действий).
        * `action` (String): Имя действия (например, `"sendData"`, `"openDialog"`).
        * `data` (Object): Данные для действия.
    * `validation` (Object): Правила валидации (помечено как "не имплементировано").
        * `required`, `min`, `max`, `pattern`, etc.
        * `message`.
    * `name` (String): Имя компонента/формы для идентификации.
    * `vAddress` (String): Уникальный адрес компонента (будет заменен на `id`).
    * `disabled` (Boolean): Отключен ли компонент.
* **Примеры**: Даны хорошие примеры для кнопки, формы с полем ввода, макета с Grid и Card.
* **Лучшие практики**: Модульность (!! сюда ссылку на операции инклую и адд - **важная пометка в документе, указывающая
  на необходимость связи с операциями `include`/`add` из `WalkForOperations.php`**), консистентность, документирование.
* **"Новые реалии"**: Упоминание приоритета CSS (Vue Flow > PrimeVue > Tailwind) и необходимости четкого определения
  связей компонентов и их состояния.

**Выводы и следующие шаги:**

1. **Это фундаментальный документ для понимания JSON UI.** Несмотря на пометку "Innactive standard/recheck", он содержит
   описание большинства полей, которые мы видели в `pages/*.json` и `templates/*.json` в эталонном модуле
   `login-form/v1`.
2. **Связь с `WalkForOperations.php`**: Пометка про `include`/`add` подтверждает, что эти операции из PHP-ядра напрямую
   работают с этой JSON-структурой для сборки страниц.
3. **`customHooks` и Actions**: Это объясняет, как UI-события (например, клик кнопки) могут запускать actions (которые,
   в свою очередь, являются JSON-инструкциями, обрабатываемыми `StorageHelper.php`).
4. **`model`**: Объясняет механизм связывания полей ввода с данными форм, которые затем собираются `WalkForForms.php`.
5. **Отсутствие серверной валидации через это поле**: Пометка "не имплементировано" для `validation` объясняет, почему в
   `login-form/v1` валидация описывалась отдельными файлами в `validations/` и обрабатывалась через actions/commands.

**Что нужно сделать:**

* Эту информацию необходимо будет плотно интегрировать в `lessons-learned.md`.
* В `StrictModuleChecklist.md` нужно будет добавить/уточнить пункты, касающиеся правильности использования этих
  JSON-ключей в `pages/` и `templates/`.

Теперь, согласно плану, я приступлю к чтению найденных чек-листов. Начну с
`docs/checklists/verifications/verify-module.md`.

Read file: docs/checklists/verifications/verify-module.md
Похоже, я ошибся с путем к чек-листам. Ссылка `../../checklists/verifications/verify-module.md` была дана относительно
`docs/ui/`, а я попытался открыть `docs/checklists/verifications/verify-module.md` из корня проекта.

Правильный путь должен быть `docs/checklists/verifications/verify-module.md`.

Попробую еще раз прочитать `docs/checklists/verifications/verify-module.md` по правильному пути.

Read file: docs/checklists/verifications/verify-module.md
К сожалению, файл `docs/checklists/verifications/verify-module.md` все равно не найден, даже с учетом предполагаемого
правильного пути.

Это означает одно из двух:

1. Либо этих чек-листов действительно нет в проекте.
2. Либо путь, указанный в `docs/ui/README.json`, все-таки не корректен или я его неверно интерпретирую.

Попробую поискать файл `verify-module.md` по всему проекту.

Ran tool
Поиск файла `verify-module.md` не дал результатов.
Это подтверждает, что этого чек-листа, скорее всего, нет в проекте, несмотря на многочисленные ссылки на него в
документации.

То же самое, вероятно, относится и к `verify-component-standards.md`.

**Выводы:**

* Ключевые чек-листы, на которые ссылается документация (`verify-module.md` и `verify-component-standards.md`),
  отсутствуют в проекте.
* Это важный "урок": документация может быть неактуальной и ссылаться на несуществующие ресурсы.
* Наш `StrictModuleChecklist.md` ([/docs/guides/StrictModuleChecklist.md]) становится еще более важным, так
  как он, по сути, будет выполнять роль отсутствующего `verify-module.md`.

**Что нужно сделать:**

1. **Зафиксировать отсутствие этих чек-листов** в `docs/development/lessons-learned.md`.
2. **Убедиться, что наш `StrictModuleChecklist.md` покрывает все аспекты**, которые мог бы покрывать `verify-module.md`,
   основываясь на контексте из `docs/ui/README.json` и другой изученной документации. Я считаю, что текущая версия
   нашего чеклиста уже достаточно подробна, но я перепроверю его еще раз после завершения анализа остальной
   UI-документации.

Продолжим по плану изучения UI-документации. Следующие файлы:

* `docs/ui/primevue-components.md`
* `docs/ui/primevue-rude-vs-original-structure.md`

Начну с `docs/ui/primevue-components.md`.

Read file: docs/ui/primevue-components.md
Файл `docs/ui/primevue-components.md` очень важен, так как он описывает **специфику использования компонентов PrimeVue в
рамках JSON UI системы**.

**Ключевые моменты:**

* **Не заменяет официальную документацию PrimeVue**: Для полного списка props, slots, событий нужно смотреть туда.
* **Общая структура JSON для компонентов PrimeVue**:
    * `type`: Имя компонента PrimeVue (PascalCase).
    * `name`: Опциональный уникальный идентификатор.
    * `props`: Свойства компонента.
        * Могут быть статическими значениями.
        * Могут быть привязаны к данным из `StateManager (hub)` через синтаксис `{data/source/path}`.
        * `class`: Классы Tailwind CSS.
        * `content`: Текстовое содержимое.
    * `model`: Для v-model.
        * `form`: Имя формы (управляется `FormManager`).
        * `field`: Имя поля в форме.
    * `customHooks`: Для обработки событий PrimeVue.
        * Ключи - имена событий PrimeVue (e.g., `click`, `change`).
        * Значения - массив стандартных действий JSON UI (e.g., `sendData`, `dialogOpened`).
    * `children`: Для компонентов-контейнеров.
* **Отличия от стандартного Vue**: Декларативность, специфичная привязка данных (однонаправленная через `props` +
  `{path}`, двунаправленная через `model` + `FormManager`), обработка событий через `customHooks` + `ActionManager`.
* **Привязка данных**:
    * `model`: Связь с `FormManager`.
    * `props` + `{users/list}`: Получение данных из `hub.get('users.list')`.
* **Обработка событий (`customHooks`)**:
    * События PrimeVue -> Стандартные действия JSON UI -> `ActionManager`.
    * Даны ссылки на документацию по стандартным действиям и событиям.
* **Стилизация**: Преимущественно **Tailwind CSS** в `props.class`. Упомянут `PrimeVue Tailwind Pass Through` для
  глубокой кастомизации.
* **Рекомендации**: Именование (`kebab-case`), производительность (пагинация, виртуальный скроллинг), централизация
  через стандартные события/действия, доступность.
* **Множество ссылок на внутреннюю документацию**: `managers/`, `constants/`, `core-concepts/`. Это золотая жила для
  дальнейшего изучения, если потребуется углубиться в работу конкретных менеджеров (`FormManager`, `ActionManager`,
  `StateManager (hub)`).

**Выводы:**

1. Этот документ дает четкое представление о том, как компоненты PrimeVue интегрируются и описываются в JSON-структурах
   модулей.
2. Связь с `{path}` для данных из `hub` (StateManager), `model` для `FormManager` и `customHooks` для `ActionManager` —
   это ключевые механизмы.
3. Стилизация через Tailwind CSS — основной подход.
4. Документ активно ссылается на другие части документации, что поможет при необходимости глубже изучить конкретные
   аспекты (менеджеры, стандартные действия/события).

**Что нужно сделать:**

* Основные принципы (особенно структура JSON для PrimeVue компонентов, привязка данных и обработка событий) должны быть
  отражены в `lessons-learned.md`.
* В `StrictModuleChecklist.md` нужно будет уточнить пункты, касающиеся `pages/` и `templates/`, чтобы они включали
  проверки на корректное использование этих полей для PrimeVue компонентов (правильный `type`, `props`, `model`,
  `customHooks`).

Теперь перехожу к `docs/ui/primevue-rude-vs-original-structure.md`.

Read file: docs/ui/primevue-rude-vs-original-structure.md
Файл `docs/ui/primevue-rude-vs-original-structure.md` описывает **категоризацию оберток над PrimeVue компонентами**,
используемых в системе. Похоже, в файле два похожих описания структуры, одно "Detailed", другое "Basic". Основная идея в
том, что есть разные типы кастомных компонентов-оберток:

1. **`Components/`**: Простые обертки, часто 1-в-1 с PrimeVue элементом (Button, Icon, divider). Конфигурация через
   `props`, `attrs`. Мало внутреннего состояния.
    * *Примеры*: `@Button.md`, `@Icon.md`, `@divider.md`.
2. **`Containers/`**: Для группировки и структуры, без сложного внутреннего состояния (Fieldset, Label, ScrollPanel).
   Контент через `children`.
    * *Примеры*: `@Fieldset.md`, `@Label.md` (через `@Tag.md`), `@ScrollPanel.md`.
3. **`ComplexContainer/`**: Обертки для сложных PrimeVue компонентов, управляющих структурированным контентом, слотами,
   коллекциями (Card, DataTable, Accordion, Tabs). Конфигурация может включать вложенные структуры в `props` или
   ожидания по типам `children`.
    * *Примеры*: `@Accordion.md`, `@Card.md`, `@DataTable.md`, `@Grid.md`.
4. **`VModel/`**: Инпут-компоненты для интеграции с `FormManager` (InputText, Checkbox, Select). Ожидают
   `component.model` с `form` и `field`.
    * *Примеры*: `@InputText.md`, `@Checkbox.md`, `@Select.md`.

**Выводы:**

* Эта классификация помогает понять, что не все JSON-объекты с `type` являются прямым вызовом PrimeVue компонента. Могут
  существовать **кастомные Vue компоненты-обертки**, которые уже внутри себя используют PrimeVue и добавляют
  специфическую логику или структуру.
* Имена файлов с `@` (например, `@Button.md`) — это, видимо, ссылки на документацию по этим конкретным оберткам. Эти
  файлы должны лежать где-то в `docs/ui/resources/elements/primevue/` (согласно ссылке из `docs/ui/README.json` на "
  PrimeVue Elements").
* Это объясняет, почему в `json-template-schema.md` поле `type` может ссылаться не только на "чистые" PrimeVue
  компоненты, но и на эти зарегистрированные кастомные обертки.
* Для `VModel/` компонентов подтверждается важность объекта `model: { form: "...", field: "..." }`.

**Что нужно сделать:**

* Добавить в `lessons-learned.md` понимание, что в системе могут использоваться кастомные обертки над PrimeVue,
  классифицированные по их роли.
* В `StrictModuleChecklist.md` в разделе про `pages/` и `templates/` нужно будет учитывать, что `type` может ссылаться
  как на "чистый" PrimeVue компонент, так и на одну из этих оберток. Для оберток могут быть свои специфичные ожидания по
  `props`, `children` или `model`.

Далее по плану: `docs/ui/ui-examples.md` и `docs/ui/ui-examples-complex.md`.
Начну с `docs/ui/ui-examples.md`.

Read file: docs/ui/ui-examples.md
Файл `docs/ui/ui-examples.md` содержит практические примеры JSON-структур для различных UI-паттернов (V1 Patterns). Это
очень полезно для понимания, как все изученные концепции (типы компонентов, props, model, customHooks) применяются на
практике.

**Ключевые моменты из первой части файла (пример формы "User Profile"):**

* **Структура страницы**: Используются `Card`, `div`, `h2`, `h3`, `Span` для общей компоновки.
* **Поля ввода**: `InputText`, `Checkbox`, `RadioButton` активно используются с
  `model: { form: "user-profile", field: "..." }` для привязки к данным формы `user-profile`.
* **Данные из StateManager/Hub**: `children: ["User ID: {user/id}"]` - пример получения данных через плейсхолдер
  `{user/id}`.
* **Стилизация**: Классы Tailwind CSS активно используются в `props.class`.
* **Actions (`customHooks`)**:
    * Кнопка "Cancel": `action: "navigate", data: { to: "/users" }`.
    * Кнопка "Save Changes": `action: "sendData", data: { sendTo: "users/update", form: "user-profile" }`. Это
      показывает, как данные формы отправляются на бэкенд-действие `users/update`.
* **Ссылки на документацию**: В конце каждого примера есть ссылки на релевантные документы (компоненты PrimeVue,
  FormManager, Actions, Styling). Это подтверждает важность тех документов, которые мы уже просмотрели или планируем
  просмотреть.
* **Упрощения**: Отмечено, что `Calendar` и `Select` были заменены на простые `InputText` в примере, что может указывать
  на сложности с их конфигурацией или на то, что для примера это было не критично.

**Общие выводы из примеров:**

1. **JSON UI — это сборка UI из компонентов**: Страницы и их части строятся путем вложения JSON-объектов, описывающих
   компоненты.
2. **Данные и действия — центральные концепции**:
    * Данные формы управляются через `model` и `FormManager`.
    * Данные из общего состояния (hub) доступны через плейсхолдеры `{path}`.
    * Интерактивность достигается через `customHooks`, которые вызывают стандартные действия (`navigate`, `sendData`,
      `confirm` и т.д.), обрабатываемые `ActionManager`.
3. **Стилизация в основном через Tailwind CSS**.
4. **Композиция**: Сложные интерфейсы строятся из более простых компонентов и контейнеров.

Я продолжу изучение этого файла, чтобы увидеть другие примеры, особенно `DataTable`.

Read file: docs/ui/ui-examples.md
Дочитал `docs/ui/ui-examples.md`.
Он содержит примеры:

1. **User Profile Form**: Демонстрирует различные инпуты (`InputText`, `Checkbox`, `RadioButton`), структуру в `Card`,
   получение данных `{user/id}` и отправку формы через `sendData`.
2. **Product List with DataTable**: Показывает использование `DataTable` с пагинацией, сортировкой, фильтрацией (
   ссылается на `state:productFilters` - интересно!), и кастомные колонки с действиями (`navigate`, `confirm` ->
   `sendData`). Используется `type: "template", slot: "body"` для кастомизации ячеек.
3. **Order Details View (Read-Only)**: Отображение структурированной информации с помощью `Card` и `Tag`. Отмечена
   необходимость серверной обработки или специального компонента для итерации по списку (`order.items`).
4. **Basic Dashboard Widgets**: Использование `Card`, `Grid` и иконок PrimeIcons (`<i class="pi pi-dollar">`) для
   отображения статистики, данные из `{dashboard...}`.

**Общие наблюдения и выводы из примеров:**

* **Плейсхолдеры `{path}`**: Повсеместно используются для получения данных (например, `{user/id}`, `{row.name}`,
  `{dashboard.salesMonth}`). Это механизм доступа к данным из `StateManager/hub`.
* **`DataTable`**: Мощный компонент для отображения списков.
    * `value`: Может быть путем к API (`api/products`) или к данным в `StateManager` (`{state:productFilters}`,
      `{state:productsLoading}`).
    * `children` у `DataTable` — это массив объектов `Column`.
    * `Column` может иметь `field` для прямого отображения, `sortable`, `filter`.
    * Для кастомного отображения ячейки используется
      `children: [{ type: "template", slot: "body", template: { ...JSON UI структура... } }]`. Это очень гибко.
* **Действие `confirm`**: Показывает, как делать подтверждение перед выполнением другого действия (например,
  `sendData`).
* **Состояние для компонентов**: `DataTable` использует `filters: "state:productFilters"` и
  `loading: "state:productsLoading"`. Это означает, что состояние фильтров и загрузки может храниться в
  `StateManager/hub` и динамически влиять на компонент.

**Что нужно сделать:**

* В `lessons-learned.md` добавить понимание работы `DataTable` с `template slot="body"`, а также использование префикса
  `state:` для привязки к `StateManager/hub` в `props` компонентов (`filters`, `loading`).
* В `StrictModuleChecklist.md` (раздел `pages/` и `templates/`) добавить проверки на:
    * Корректное использование `template slot="body"` для кастомизации ячеек `DataTable`.
    * Правильную привязку `props` компонентов к `StateManager/hub` через `{path}` или `{state:path}`.

Теперь посмотрю `docs/ui/ui-examples-complex.md`.

Read file: docs/ui/ui-examples-complex.md
Файл `docs/ui/ui-examples-complex.md` содержит более сложные примеры (помечены как "V1 Complex Patterns").

**Ключевые моменты:**

* **Example 1 (Tabs)**: JSON для этого примера **отсутствует** в документе. Есть только ссылки на документацию. Это
  пробел.
* **Example 2: Product Filtering with Dynamic Update**:
    * Демонстрирует, как изменение фильтра (`Select` для категории) или нажатие кнопки "Apply Search" триггерит
      `sendData` для обновления `DataTable`.
    * `Select` (Dropdown):
        *
        `model: { ..., options: { "action": "include", "type": "operation", "source": "lookups/productCategories" } }`.
        Это показывает, как опции для селекта могут **динамически загружаться** из `DataHub` адреса
        `lookups/productCategories` с помощью операции `include` (которую обрабатывает `WalkForOperations.php`). Это
        очень важный паттерн!
        *
        `customHooks: { change: [{ action: "sendData", data: { action: "products/fetch", form: "product-filters", target: "productData" } }] }`.
        При изменении селекта отправляются данные формы `product-filters` на бэкенд-действие `products/fetch`, и
        результат ожидается в `StateManager/hub` по ключу `productData`.
    * `DataTable`:
        * `props: { value: "state:productData" }`. Таблица привязана к `productData` в `StateManager/hub`, который
          обновляется действиями фильтра.
* **Example 3: Simple Approval Workflow UI**:
    * Показывает использование кнопок "Reject" и "Approve" с действием `confirm`.
    * Внутри `confirm`, в поле `accept`, определяется другое действие `sendData` для отправки решения на бэкенд.
    * Есть пометка `"{ пример имеет нерабочие аргументы"}` перед JSON этого примера. Это требует внимания, если бы мы
      его реализовывали.

**Выводы:**

1. **Динамическая загрузка опций для `Select`**: Паттерн
   `model: { options: { action: "include", type: "operation", source: "..." } }` критически важен для понимания, как
   селекты наполняются данными.
2. **Динамическое обновление `DataTable`**: Связывание `DataTable.props.value` с `state:ключ_в_hub` и обновление этого
   ключа через `sendData` с параметром `target` — это основной способ реализации динамических таблиц.
3. **Вложенные действия**: Действие `confirm` может содержать в себе другое действие (например, `sendData`) в поле
   `accept`.
4. **Пробелы и ошибки в документации**: Отсутствие JSON для первого примера и пометка о нерабочих аргументах в третьем
   примере — еще одно напоминание об актуальности документации.

**Что нужно сделать:**

* В `lessons-learned.md` добавить:
    * Паттерн динамической загрузки опций для `Select` через `model.options.source` с операцией `include`.
    * Паттерн динамического обновления `DataTable` через `state:` и `target` в `sendData`.
    * Возможность вложенных действий (например, `sendData` внутри `confirm`).
* В `StrictModuleChecklist.md`:
    * Раздел `pages/` и `templates/`: Добавить проверку на корректное использование `model.options.source` для `Select`
      и других подобных компонентов.
    * Раздел `Actions`: Учесть возможность вложенных действий и использование `target` в `sendData`.

Мы почти закончили с UI-документацией. Осталось:

1. Прочитать `docs/concepts/action-handling-flow.md` (на который ссылались).
2. Быстро просмотреть содержимое `docs/ui/core-concepts/` и `docs/ui/theming/`.
3. Проверить файл `asset-structure.md`.

Начну с `docs/concepts/action-handling-flow.md`. Для этого мне сначала нужно найти этот файл.

Ran tool
Поиск файла `action-handling-flow.md` не дал результатов. Похоже, это еще одна "битая" ссылка в документации.

Это означает, что у нас нет отдельного документа, описывающего "Поток обработки действий (POST)". Однако мы уже собрали
довольно много информации о том, как работают actions:

* Они определяются в `actions/*.json` модуля.
* Запускаются через `customHooks` в JSON UI.
* Обрабатываются `ActionManager` (согласно `docs/ui/primevue-components.md`).
* Представляют собой последовательность JSON-инструкций, исполняемых `StorageHelper.php`.
* Могут взаимодействовать с `DataHub`, `FormManager` и другими компонентами.

**Что нужно сделать:**

* Отметить в `lessons-learned.md` отсутствие документа `action-handling-flow.md` и обобщить наше текущее понимание
  потока обработки действий на основе собранной информации.

Теперь быстро просмотрю содержимое директорий `docs/ui/core-concepts/` и `docs/ui/theming/`.

Ran tool

Ran tool
В директории `docs/ui/core-concepts/` есть несколько интересных файлов:

* `README.json` (вероятно, индекс этой подсекции).
* `template-schema.md`: Похоже на дубликат или более раннюю версию `json-template-schema.md`, который мы уже смотрели.
  Надо будет сравнить.
* `elements-v1.md` и `elements-v2.md`: Могут описывать конкретные UI-элементы.
* `component-syntax.md`: Может детализировать синтаксис.
* `module-actions.md`: Может дать больше информации об actions.
* `managers.md`: Может описывать глобальные менеджеры (`hub`).
* `rendering-pipeline.md`: Может дополнить информацию о рендеринге.

В директории `docs/ui/theming/`:

* `README.json` (индекс).
* `tailwind-styling-guide.md`: Важно для понимания стилизации.
* `colors.md`, `tailwind-config.md`, `sakai-core-module.md`: Могут содержать специфику темы.
* `managers.md`: Еще один файл про менеджеры, возможно, специфичный для темизации.

**План (сканирование этих директорий):**

1. Просмотрю `docs/ui/core-concepts/README.json` и `docs/ui/theming/README.json` для общего понимания.
2. Быстро сравню `docs/ui/core-concepts/template-schema.md` с уже просмотренным `docs/ui/json-template-schema.md`.
3. Просмотрю `docs/ui/core-concepts/module-actions.md`.
4. Просмотрю `docs/ui/core-concepts/managers.md` и `docs/ui/theming/managers.md`.
5. Просмотрю `docs/ui/theming/tailwind-styling-guide.md`.
6. Проверю `docs/ui/asset-structure.md`.

Начну с `docs/ui/core-concepts/README.json`.

Read file: docs/ui/core-concepts/README.json
`docs/ui/core-concepts/README.json` (опять Markdown) служит индексом для этой важной секции.

**Основные моменты:**

* **Ссылки на ключевые документы внутри `core-concepts/`**:
    * `component-syntax.md`: Как компоненты представляются в JSON.
    * `elements-v1.md` и `elements-v2.md`: Документация по UI-элементам (компонентам). V2, вероятно, более актуален.
    * `managers.md`: **Frontend JavaScript менеджеры** (`ActionManager`, `NotifyManager`, `FormManager`), доступные
      через `hub`. Это очень важно для понимания клиентской части.
    * `module-actions.md`: Клиентские vs. серверные действия.
    * `rendering-pipeline.md`: Обзор рендеринга JSON.
    * `template-schema.md`: Помечено как "Conceptual explanation" и "(Compare/merge with `../json-template-schema.md`)".
      Это подтверждает, что `docs/ui/json-template-schema.md` (который мы уже смотрели) является основным.
* **Повторная ссылка на отсутствующий чек-лист**: `module-verification.md`.
* **"Documentation Link Needed"** для UI component standards – еще одно указание на пробелы.

**План действий по этой секции (уточненный):**

1. Прочитаю `docs/ui/core-concepts/managers.md`, так как это критично для понимания JS `hub` и клиентской логики.
2. Прочитаю `docs/ui/core-concepts/module-actions.md`.
3. Прочитаю `docs/ui/core-concepts/elements-v2.md` (как более актуальный).
4. Быстро просмотрю `docs/ui/core-concepts/component-syntax.md` и `docs/ui/core-concepts/rendering-pipeline.md`.
5. Пропущу `docs/ui/core-concepts/template-schema.md`, так как основной (`../json-template-schema.md`) уже изучен.

Начну с `docs/ui/core-concepts/managers.md`.

Read file: docs/ui/core-concepts/managers.md
`docs/ui/core-concepts/managers.md` — это **супер-важный документ**, описывающий **клиентские JavaScript менеджеры**,
доступные через глобальный объект `hub`. Это ключ к пониманию клиентской логики JSON UI.

**Ключевые менеджеры и их роль:**

* **`hub.notifyManager` (Event Bus)**:
    * Центральный **event bus** для общения компонентов и менеджеров (`on`, `emit`).
    * Используется `ActionManager` или `customHooks` для публикации событий.
* **`hub.toastManager` (UI Notifications)**:
    * Отображение глобальных уведомлений (toasts: `success`, `info`, `warn`, `error`).
    * Используется `ActionManager` (например, после сохранения данных).
* **`hub.formManager`**:
    * Управление состоянием форм (данные полей, `pending` статус, ошибки), их регистрация, получение данных.
    * Компоненты с `model` взаимодействуют с ним. `ActionManager` использует его для получения данных перед отправкой и
      обновления статуса/ошибок после ответа сервера.
* **`hub.actionManager`**:
    * **Основной менеджер для парсинга и выполнения клиентских команд из `customHooks`** (например, `sendData`,
      `navigateTo`).
    * Получает описание действия, выполняет логику, взаимодействует с другими менеджерами и Inertia (`router`).
* **`hub` (как StateManager)**:
    * `HubManager` наследуется от `StateManager`.
    * Управляет **общим состоянием приложения**, доступным через `hub.get(path)` и `hub.update(path, value)`.
    * Используется для хранения глобальных настроек, состояния UI, данных пользователя. Это объясняет плейсхолдеры
      `{path}`.
* **Другие менеджеры**: `logManager`, `alertManager`, `propsManager`, `componentManager`, `layoutManager`,
  `menuManager`, `modalManager`, `themeManager`, `splitterManager`, `timerManager`. У многих из них документация
  отсутствует.

**Выводы:**

1. **Глобальный объект `hub`**: Центральная точка доступа к клиентским менеджерам и состоянию.
2. **`ActionManager`**: Ключевой исполнитель логики, описанной в `customHooks`.
3. **`FormManager`**: Основа для работы форм и `v-model` через JSON.
4. **`StateManager` (через `hub`)**: Объясняет, как работают плейсхолдеры `{path}` для доступа к данным в `props` и
   других местах JSON UI. Данные могут быть прочитаны через `hub.get(path)`.
5. **Событийная модель (`NotifyManager`)**: Позволяет разным частям системы общаться без прямой связи.
6. **Пробелы в документации**: Для многих менеджеров документация отсутствует, но указаны пути к их JS-файлам в
   `resources/common/managers/`.

**Что нужно сделать:**

* **Обязательно отразить эту информацию в `lessons-learned.md`**: Особенно роль `hub`, `ActionManager`, `FormManager` и
  `StateManager`.
* **Обновить `StrictModuleChecklist.md`**:
    * В разделе про Actions/`customHooks` подчеркнуть, что они выполняются `ActionManager`.
    * В разделе про `pages/` (для `props`) и `actions/` (для данных) уточнить, что плейсхолдеры `{path}` разрешаются
      через `StateManager (hub)`.
    * В разделе про формы (`model`) подчеркнуть связь с `FormManager`.

Теперь прочитаю `docs/ui/core-concepts/module-actions.md`.

Read file: docs/ui/core-concepts/module-actions.md
`docs/ui/core-concepts/module-actions.md` проводит важное различие между двумя типами "действий":

1. **Server Actions (или Module Actions)**:
    * Определены в JSON-файлах в `actions/` директории модуля (например, `actions/login.json`).
    * **Выполняются на сервере**.
    * Обрабатывают бизнес-логику, манипулируют данными через `DataHub` (как мы видели в `StorageHelper.php`).
    * Запускаются с клиента через `customHooks` действие `sendData`, которое указывает, какое серверное действие
      выполнить.
    * Примеры: сохранение формы, загрузка деталей, вызов PHP команд.
    * Ссылается на (возможно, отсутствующий) `docs/ui/json-ui/commands-and-operations/server-actions-reference.md` для
      деталей по серверным командам (`update`, `save`, `call`).

2. **Client Actions (определены в `customHooks`)**:
    * Определены в свойстве `customHooks` JSON UI компонента.
    * **Выполняются в браузере пользователя (клиент-сайд)**, обрабатываются клиентским `ActionManager` (как мы узнали из
      `managers.md`).
    * Обрабатывают прямые UI взаимодействия, навигацию, уведомления, локальные DOM-манипуляции или **инициируют запросы
      к серверу (через `sendData`)**.
    * Запускаются событиями браузера (`click`, `change`).
    * Примеры: `navigateTo`, `changeAttribute`, `alert`, и **`sendData` (который связывает с Server Actions)**.
    * Ссылается на `template-schema.md` и (возможно, отсутствующий)
      `docs/ui/json-ui/commands-and-operations/ui-documentation.md`.

**Ключевой вывод**: Важно различать серверные JSON-инструкции (`actions/*.json`) и клиентские обработчики событий (
`customHooks`). Клиентские действия часто служат триггером для серверных через `sendData`.

**Что нужно сделать:**

* Это различие очень важно и должно быть четко отражено в `lessons-learned.md`.
* В `StrictModuleChecklist.md` это уже косвенно учтено, так как есть отдельные проверки для `actions/*.json` (серверные)
  и для `customHooks` в `pages/` (клиентские). Но можно добавить комментарий для ясности.

Далее по плану: `docs/ui/core-concepts/elements-v2.md`.

Read file: docs/ui/core-concepts/elements-v2.md
Документ `docs/ui/core-concepts/elements-v2.md` описывает более продвинутые или реже используемые UI-компоненты (V2).

**Ключевые моменты:**

* **`component-map.json`**: **Очень важный файл `storage/aiCore/component-map.json`** определяет маппинг `type` из JSON
  на реальные Vue-компоненты-обертки. Рекомендуется PascalCase для типов компонентов и lowercase для HTML-тегов.
* **Категории рендеринг-врапперов**: Компоненты рендерятся через разные обертки (`Component`, `Container`,
  `VModelComponent`, `ComplexContainer`, `Customs`) на основе `component-map.json`.
* **Описанные компоненты (примеры)**:
    * `Panel` (Container): Контейнер с рамкой и заголовком.
    * `Card` (ComplexContainer): Использует `props` для `header`, `title`, `subtitle`, `footer`. `children` для
      контента.
    * `Accordion` (ComplexContainer): Использует `items` массив, где каждый элемент - компонент (например, `div`) с
      `props.header` и `children` для контента панели.
    * `Grid` (ComplexContainer): `children` - это `Column` компоненты.
    * `Tabs` (ComplexContainer): Использует `items` массив, каждый элемент с `props.header` и `children` для контента
      вкладки.
* **Расширенный пример `Button` с `dialogConfig`**:
    * Кнопка может иметь специальное свойство `dialogConfig`.
    * `dialogConfig` описывает структуру диалога (`type: "Dialog"`), его поля (`fields` - массив JSON UI компонентов) и
      кнопки действий (`actions` - массив JSON UI кнопок).
    * Это позволяет создавать модальные окна с формами прямо из конфигурации кнопки.
    * Данные формы диалога (`dialogForm`) отправляются через `sendData`.
    * Используется клиентское действие `closeDialog`.

**Выводы:**

1. **`storage/aiCore/component-map.json`**: Необходимо будет изучить этот файл, так как он является центральным для
   сопоставления `type` из JSON с реальными Vue компонентами. Это недостающее звено в понимании, какие `type` вообще
   допустимы.
2. **Кастомные обертки и их логика**: Существуют разные категории оберток, и они по-разному обрабатывают `props` и
   `children`.
3. **Компоненты `Accordion` и `Tabs`**: Используют массив `items`, где каждый элемент описывает панель/вкладку (с
   `props.header` и `children`). Это отличается от простого использования `children` у `Card` или `Grid`.
4. **Паттерн `dialogConfig` у `Button`**: Мощный способ декларативно описывать диалоговые окна с формами.

**Что нужно сделать:**

* **Обязательно найти и изучить `storage/aiCore/component-map.json`**.
* В `lessons-learned.md` добавить:
    * Информацию о `component-map.json`.
    * Способы конфигурации `Accordion` и `Tabs` через `items`.
    * Паттерн `dialogConfig` для `Button`.
* В `StrictModuleChecklist.md`:
    * Учесть специфику `Accordion` и `Tabs` (использование `items` вместо `children` для основного контента).
    * Добавить проверку на корректное использование `dialogConfig` у кнопок, если он применяется.

Продолжу по плану:

1. Быстро просмотрю `docs/ui/core-concepts/component-syntax.md` и `docs/ui/core-concepts/rendering-pipeline.md`.
2. Затем перейду к секции `theming`.

Read file: docs/ui/core-concepts/component-syntax.md
`docs/ui/core-concepts/component-syntax.md` обобщает синтаксис JSON для компонентов.

**Ключевые моменты:**

* **Использовать `type`, а не `_element`**: Это основное правило.
* **Регистр для `type`**: Рекомендуется PascalCase для компонентов (например, `Button`, `Card`) и lowercase для
  HTML-тегов (`div`, `Span`), хотя `component-map.json` может обрабатывать регистронезависимо, но динамическая загрузка
  внутри обертки может зависеть от регистра.
* **Основные свойства компонента**: `type`, `props`, `content` (для простого текстового содержимого), `children`,
  `customHooks`. Это несколько расходится/упрощает то, что было в `json-template-schema.md` (там был еще `model`,
  `items`, `validation`, `name`, `vAddress`, `disabled`). Вероятно, `json-template-schema.md` более полный.
* Даны простые примеры.
* Указана распространенная ошибка: использование `_element`.

**Выводы:**

* Документ полезен как быстрое напоминание об основном синтаксисе, но `json-template-schema.md` является более детальным
  справочником по всем возможным полям.
* Рекомендация по регистру для `type` важна.

Теперь `docs/ui/core-concepts/rendering-pipeline.md`.

Read file: docs/ui/core-concepts/rendering-pipeline.md
`docs/ui/core-concepts/rendering-pipeline.md` описывает цепочку рендеринга JSON в Vue компоненты.

**Этапы рендеринга:**

1. **Старт**: Основной JSON файл (например, `page.json`).
2. **`RenderJson.vue`**: Получает JSON-объект компонента и передает его в `Presets.vue`. Это точка входа для рендеринга
   одного JSON-определения компонента.
3. **`Presets.vue`**:
    * Использует ключ `component` (или `type` как fallback) из JSON и файл **`storage/aiCore/component-map.json`** для
      определения **категории** компонента-обертки (например, `ComplexContainer`, `VModelComponent`, `Container`,
      `Tag`).
    * Рендерит эту категорию-обертку.
4. **Категория-обертка (например, `ComplexContainer.vue`)**:
    * Получает JSON-объект.
    * Снова смотрит на `component` (или `type`) для определения **имени конкретного компонента** (например, "Tabs", "
      Card", "InputText").
    * Динамически загружает (`defineAsyncComponent`) и рендерит **конечную, специфичную обертку компонента** (например,
      `Tabs.vue`).
5. **Специфичная обертка компонента (например, `Tabs.vue`)**:
    * Получает JSON-определение.
    * Рендерит HTML, часто используя компоненты из библиотек типа PrimeVue.
    * Передает `props`.
    * **Рендерит `children` рекурсивно, снова используя `RenderJson.vue`**.

**Цепочка:** `RenderJson` -> `Presets` -> Категория-обертка -> Специфичная обертка.

**Выводы:**

1. **Это ключевой документ для понимания клиентского рендеринга.** Он объясняет, как JSON-структуры превращаются в
   видимый UI.
2. **`storage/aiCore/component-map.json`** снова подтверждается как центральный файл для маппинга.
3. **Рекурсивный рендеринг `children`**: `RenderJson.vue` вызывается для каждого дочернего элемента, что обеспечивает
   построение дерева компонентов.
4. **Динамическая загрузка**: Компоненты часто загружаются динамически (`defineAsyncComponent`).

**Что нужно сделать:**

* Включить эту информацию о рендеринге в `lessons-learned.md`.
* Теперь точно нужно найти и изучить `storage/aiCore/component-map.json`.

Прежде чем искать `component-map.json`, закончу с текущей директорией `docs/ui/core-concepts/` и перейду к `theming`.

Пропущу `docs/ui/core-concepts/template-schema.md` (уже смотрели аналог) и `elements-v1.md` (сконцентрируемся на v2).

Теперь перехожу к `docs/ui/theming/`. Начну с `README.json`.

Read file: docs/ui/theming/README.json
`docs/ui/theming/README.json` (Markdown) — это индекс для секции по темам.

**Ключевые моменты:**

* Ссылки на:
    * `colors.md` (помечен как Placeholder).
    * `managers.md` (помечен как "Needs review, potential overlap").
    * `sakai-core-module.md` (Placeholder).
    * `tailwind-config.md` (Placeholder).
* Основной документ, который не помечен как Placeholder и который мы уже видели в листинге директории - это
  `tailwind-styling-guide.md`.

Учитывая, что большинство файлов здесь — плейсхолдеры, я сосредоточусь на `tailwind-styling-guide.md` и, возможно, на
`managers.md`, если он отличается от того, что в `core-concepts`.

Начну с `docs/ui/theming/tailwind-styling-guide.md`.

Read file: docs/ui/theming/tailwind-styling-guide.md
`docs/ui/theming/tailwind-styling-guide.md` дает руководство по использованию Tailwind CSS.

**Ключевые моменты:**

* **Пометка "(Innactive standard/recheck)"**: Опять же, может быть не полностью актуален.
* **Приоритеты стилизации**: Vue Flow -> PrimeVue -> Tailwind CSS.
* **Применение классов**: Через `props.class` в JSON.
* **Интеграция с PrimeVue**: Tailwind может переопределять или дополнять стили PrimeVue.
* **Темизация и цвета**:
    * Использовать палитру из (отсутствующего?) `./design-guidelines.md`.
    * Для темной темы использовать префикс `dark:`.
* **Рекомендации**: Группировка классов, пользовательские классы через `@apply` в SCSS, консистентность.
* **Оптимизация**: `PurgeCSS` для удаления неиспользуемых стилей, настроенный на сканирование
  `storage/json-ui/**/*.json` и других файлов.

**Выводы:**

* Tailwind CSS — основной инструмент для утилитарной стилизации.
* Важно знать о приоритетах и возможности использования `dark:` префикса.
* Настройка `PurgeCSS` показывает, что JSON-файлы с UI сканируются на предмет используемых Tailwind-классов.

Файл `docs/ui/theming/managers.md` скорее всего будет дублировать информацию из `core-concepts`, поэтому я его пропущу.
Проверю `docs/ui/asset-structure.md`.

Read file: docs/ui/asset-structure.md
Файл `docs/ui/asset-structure.md` оказался всего лишь заголовком. Никакой полезной информации.

**Итоги по UI-документации:**

Мы просмотрели значительную часть документации в `docs/ui/`.
**Ключевые находки:**

* Структура JSON для UI-компонентов (`json-template-schema.md`).
* Использование PrimeVue компонентов и Tailwind CSS.
* Механизм рендеринга (`RenderJson.vue`, `Presets.vue`, категории оберток).
* Клиентские менеджеры (`hub`, `ActionManager`, `FormManager`, `StateManager`).
* Разделение на Client Actions (`customHooks`) и Server Actions (`actions/*.json`).
* Множество примеров использования.
* **Критически важный файл `storage/aiCore/component-map.json`**, который связывает `type` из JSON с Vue компонентами.
* Множество "битых" ссылок и плейсхолдеров в документации, что подчеркивает важность нашего собственного исследования и
  `lessons-learned.md`.

Теперь я **обязательно** должен изучить `storage/aiCore/component-map.json`.

Read file: storage/aiCore/component-map.json
Файл `storage/aiCore/component-map.json` не найден по этому пути.
Однако, я помню, что в одном из документов (`docs/ui/core-concepts/elements-v2.md`) путь был указан как
`storage/aiCore/component-map.json`, но также упоминался `resources/common/js/Elements/Primevue/component-map.json` (
косвенно, через путь к оберткам).

Попробую поискать `component-map.json` по всему проекту, чтобы точно его найти.

Ran tool
Отлично! Поиск дал несколько результатов.

Наиболее релевантным кажется:

* `install-modules/aiCore/js/component-map.json`

Также есть:

* `install-modules/aiCore/js/v-model-component-map.json` (может быть специфичен для VModel компонентов).
* `install-modules/aiCore/js/component-containers-map.json` (может быть для контейнеров).
* И два файла `ui-component-manager-categories-primevue.json` в `docs` и `_to_deprecated_dir`, которые могут быть
  связаны, но `component-map.json` выглядит как основной.

Начну с `install-modules/aiCore/js/component-map.json`. Это должен быть тот самый ключ к пониманию `type` в JSON UI.

Read file: install-modules/aiCore/js/component-map.json

Наконец-то! Файл `install-modules/aiCore/js/component-map.json` — это именно то, что мы искали. Он определяет, как
`type` из JSON-структуры UI (в нижнем регистре) маппится на **категорию Vue-компонента-обертки**.

**Структура файла:**

* `"default": "Tag"`: Категория по умолчанию, если тип не найден в `items`. `Tag`, вероятно, рендерит простой HTML-тег,
  имя которого берется из `type`.
* `"items": { ... }`: Объект, где:
    * **Ключ**: Имя типа компонента из JSON (например, `"button"`, `"card"`, `"inputtext"`) — **все в нижнем регистре!**
    * **Значение**: Имя категории Vue-компонента-обертки (например, `"Component"`, `"Container"`, `"VModel"`,
      `"ComplexContainer"`, `"Customs"`).

**Примеры маппинга:**

* `"button": "Component"`
* `"avatar": "Component"`
* `"divider": "Component"`
* `"icon": "Component"`
* `"image": "Component"`
* `"column": "Container"`
* `"fieldset": "Container"`
* `"form": "Container"`
* `"panel": "Container"`
* `"scrollpanel": "Container"`
* `"checkbox": "VModel"`
* `"inputtext": "VModel"` (и просто `"input": "VModel"`)
* `"password": "VModel"`
* `"textarea": "VModel"`
* `"select": "VModel"`
* `"accordion": "ComplexContainer"`
* `"card": "ComplexContainer"`
* `"grid": "ComplexContainer"`
* `"tabs": "ComplexContainer"`
* `"toolbar": "ComplexContainer"`
* `"datatable": "ComplexContainer"`
* `"pathbreadcrumb": "Customs"` (какая-то кастомная категория)

**Выводы:**

1. **Центральный маппинг**: Этот файл является сердцем механизма определения, какой Vue-компонент-обертку использовать
   для данного `type` из JSON.
2. **Нижний регистр для `type` в JSON**: Хотя документация рекомендовала PascalCase для компонентов, здесь в ключах
   маппинга **все типы указаны в нижнем регистре**. Это очень важное уточнение. Возможно, `Presets.vue` (который
   использует этот маппинг) приводит `type` к нижнему регистру перед поиском.
3. **Категории оберток**: Подтверждает существование категорий (`Component`, `Container`, `VModel`, `ComplexContainer`,
   `Customs`), которые мы видели в `rendering-pipeline.md`. Каждая категория, вероятно, имеет свою базовую логику
   обработки `props` и `children`.
4. **HTML-теги**: Если `type` не найден в `items` (например, `div`, `span`, `h2`, `p`, `i`), будет использована
   категория по умолчанию `"Tag"`. Компонент `Tag.vue` (вероятно, существует) должен уметь рендерить произвольный
   HTML-тег, имя которого передается ему.

**Что нужно сделать:**

* **Обновить `lessons-learned.md`**: Добавить информацию о `component-map.json`, его структуре, использовании нижнего
  регистра для `type` и роли категорий оберток.
* **Обновить `StrictModuleChecklist.md`**:
    * В разделе про `type` в `pages/` и `templates/` **ОБЯЗАТЕЛЬНО** указать, что `type` должен соответствовать ключам
      из `component-map.json` (и, следовательно, **должен быть в нижнем регистре для всех компонентов, перечисленных там
      **). Для HTML-тегов, не перечисленных в `items`, также использовать нижний регистр (так как они будут
      обрабатываться оберткой `Tag`).
    * Это расходится с предыдущими рекомендациями из документации (PascalCase), но `component-map.json` — это реальный
      код/конфигурация, и он имеет приоритет.

Теперь посмотрим на `install-modules/aiCore/js/v-model-component-map.json`, он может дать дополнительную информацию о
VModel компонентах.

Read file: install-modules/aiCore/js/v-model-component-map.json
Файл `install-modules/aiCore/js/v-model-component-map.json` содержит маппинг для компонентов, которые, по-видимому,
используются внутри обертки `VModel`.

**Структура и содержимое:**

* `"default": "Tag"`: Та же логика, что и в основном `component-map.json`.
* `"items": { ... }`:
    * **Ключ**: Имя типа компонента из JSON (опять **все в нижнем регистре**).
    * **Значение**: Некое имя "подкатегории" или конкретного Vue-компонента внутри `VModel` (например, `"Checkbox"`,
      `"Input"`, `"Select"`).

**Примеры маппинга:**

* `"checkbox": "Checkbox"`
* `"radiobutton": "Checkbox"` (интересно, что radiobutton тоже маппится на "Checkbox" категорию/компонент)
* `"inputtext": "Input"`
* `"input": "Input"`
* `"password": "Input"`
* `"textarea": "Input"`
* `"select": "Select"`
* `"multiselect": "Select"`
* `"treeselect": "Select"`

**Выводы:**

1. **Конкретизация для `VModel`**: Основной `component-map.json` маппит, например, `"inputtext"` на категорию
   `"VModel"`. Затем, уже внутри логики рендеринга для категории `VModel`, этот файл (`v-model-component-map.json`)
   используется для дальнейшего определения, какой конкретный тип инпут-компонента (`Input`, `Checkbox`, `Select`) нужно
   рендерить.
2. **Нижний регистр**: Подтверждает использование нижнего регистра для `type`.
3. **Группировка VModel компонентов**: Показывает, что разные инпуты (текстовые, числовые, пароли, файловые) могут
   обрабатываться общей подкатегорией/компонентом `"Input"`, а разные селекты - общей `"Select"`.

**Что нужно сделать:**

* Дополнить `lessons-learned.md` информацией о `v-model-component-map.json` и его роли в детализации рендеринга
  компонентов внутри категории `VModel`.
* Убедиться, что рекомендация в `StrictModuleChecklist.md` об использовании нижнего регистра для `type` покрывает и эти
  компоненты.

Аналогично, быстро проверю `install-modules/aiCore/js/component-containers-map.json`.

Read file: install-modules/aiCore/js/component-containers-map.json
Файл `install-modules/aiCore/js/component-containers-map.json` аналогичен предыдущему, но для компонентов, которые в
основном `component-map.json` были отнесены к категории `"Container"`.

**Структура и содержимое:**

* `"default": "Tag"`.
* `"items": { ... }`:
    * **Ключ**: Имя типа компонента из JSON (опять **все в нижнем регистре**).
    * **Значение**: Имя конкретного Vue-компонента-обертки для этого контейнера (например, `"ButtonGroup"`, `"Column"`,
      `"Form"`, `"Panel"`). Имена значений здесь совпадают с ключами (в PascalCase), что логично, если это прямые имена
      Vue-файлов.

**Примеры маппинга:**

* `"column": "Column"`
* `"form": "Form"`
* `"panel": "Panel"`
* `"label": "Label"`
* `"link": "Link"`
* `"tag": "Tag"` (забавно, что `tag` маппится на `Tag`, а `Tag` это и default в этом файле)

**Выводы:**

1. **Конкретизация для `Container`**: Похоже, для категории `"Container"` этот файл предоставляет маппинг на конкретные
   Vue-компоненты-обертки контейнеров.
2. **Нижний регистр**: Еще раз подтверждает.

**Что нужно сделать:**

* Дополнить `lessons-learned.md` о `component-containers-map.json`.

Мы собрали ОЧЕНЬ много информации.
Я обновил `lessons-learned.md` и `StrictModuleChecklist.md` на основе последних находок, особенно касательно
`component-map.json` и регистра `type`.

Файл `docs/development/lessons-learned.md` дополнен.
Файл `/docs/guides/StrictModuleChecklist.md` дополнен.

Теперь, когда мы так глубоко изучили документацию и ядро JSON UI, мы гораздо лучше подготовлены к **основной задаче:
дообучению системы исправления модулей и превращению нерабочих модулей в рабочие.**

**Следующий шаг по плану "Scan-Plan-Refine-LEARN":**

Мы завершили большой этап "Scan" (сканирование документации, ядра и эталонных модулей). Теперь нужно переходить к "
Plan".

**План:**

1. **Выбрать конкретный "проблемный" модуль для анализа и исправления.** У нас есть эталонные (`landing-main-page/v2`,
   `login-form/v1`, `primary-form/v1`). Нам нужен кандидат на исправление.
    * **Вопрос к вам, USER**: Есть ли у вас на примете конкретный модуль, который сейчас не работает или работает
      некорректно и который мы могли бы взять в качестве первого "пациента"?
    * Если нет, я могу попробовать найти модуль с известными проблемами, если есть какие-то логи ошибок или
      `known-issues.md` на уровне проекта.
2. **После выбора проблемного модуля:**
    * **Scan (проблемного модуля)**: Глубоко проанализировать его структуру, JSON-файлы (`_i/`, `pages/`, `templates/`,
      `actions/` и т.д.), сравнить с эталонами и `StrictModuleChecklist.md`.
    * Выявить конкретные ошибки или несоответствия стандартам.
    * **Plan (исправления)**: Составить план правок для этого модуля.
    * **Refine (применить правки)**: Внести изменения.
    * **LEARN**: Зафиксировать новые уроки, если таковые появятся в процессе исправления конкретного модуля, обновить
      `lessons-learned.md` и `StrictModuleChecklist.md`.

Пожалуйста, дайте знать, есть ли у вас кандидат на первый проблемный модуль.

Файлы `docs/development/lessons-learned.md` и `/docs/guides/StrictModuleChecklist.md` были успешно обновлены с
учетом всей последней информации, особенно по `component-map.json` и регистру `type`.

Мы завершили очень объемный этап "Scan", изучив документацию и ключевые конфигурационные файлы системы. Теперь мы
гораздо лучше понимаем, как должны быть устроены "правильные" модули.

**Переходим к этапу "Plan" и "Refine-LEARN" на конкретном примере.**

Для этого нам нужен "пациент" — проблемный модуль.

**Пожалуйста, USER, укажите, есть ли у вас на примете конкретный модуль, который сейчас не работает или работает
некорректно, и который мы могли бы взять для анализа и исправления?**

Если такого модуля нет, я могу попробовать поискать признаки проблемных модулей (например, через анализ логов ошибок,
если они доступны, или через файлы `known-issues.md` в директориях модулей, если таковые имеются). Однако ваш выбор
будет предпочтительнее, если у вас есть конкретный случай.
