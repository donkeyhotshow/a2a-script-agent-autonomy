# Raw Observations: ROOT.md (2025, scan 1/5)

- Документ объединяет требования, архитектуру, глоссарий, ссылки на стандарты для модульной JSON-админки.
- Основная цель: автоматизация генерации новых модулей по спецификациям, минимум ручного кода.
- Используются Laravel 11, Inertia.js, Vue.js, PrimeVue, Tailwind, PHP 8.3+, MySQL 8.0+, Fedora 40+/Win10+.
- Роли: админ, менеджер, гость, TBD.
- Метрики успеха: интерактивность целевой страницы, минимум 1 страница.
- UI/UX: логика UI через JSON и ответы сервера, стандарты UI/UX определяются по ходу.
- Ключевые фичи: динамический рендеринг UI по JSON-схемам, серверные actions/instructions, модульная архитектура, auth.
- Workflow: планирование и генерация с AI, реализация, анализ, коррекция, повторение.
- Протокол задач: фиксация задач в docs/tasks/*.md, структура задачи, проверка на дубликаты, интеграция с @scratchpad.md.
- Структура проекта: app (код, JSON-фреймворк, консольные команды), config, docs, docs-mirrors, implement-modules, install-modules, resources, routes, storage/ai, tests.
- Обязательное чтение: README.md, ROOT.md, system-overview.md, glossary.md.
- System Overview: админ-приложение с динамическим UI, генерируемым по JSON-инструкциям от PHP backend.
- Архитектура: client-server, backend (PHP, бизнес-логика, data, UI-структура), frontend (Vue SPA, PrimeVue, JSON-инструкции).
- Принципы: backend-driven UI, модульность, компонентный рендеринг.
- Data Flow: user action → frontend request → backend processing → JSON response → frontend handling → UI update.
- Core Backend: App, ProcessInstruction, Data, DataHub, Model, Mysql, UrlHelper.
- UI Layer: RenderJson.vue, Presets.vue, component-map.json, HubManager, FormManager, ActionManager, PropsManager, ThemeManager, TimerManager, LayoutManager, MenuManager, ModalManager, Vue wrappers.
- Модульная система: versioned modules (v1, v2...), installer мержит файлы, строгая структура (docs, actions, templates, code, validations, data, pages, state, commands, _i, assets), _i/ (meta.json, files-by-block.json) — для discovery/установки.
- Валидация: JSON Schema, чеклисты, ручной ревью, сравнение с эталонами.
- Индексация: @data.index.json, @docs.index.json, main-index.ps1, index-processor.php.
- Storage: DataHub (единый доступ к файлам, session, buffer, MySQL, Eloquent, директории), контроллеры для CRUD.
- UI & API: JSON-driven UI, component map, customHooks, server-side Instructions, backend controllers.
- Automation: сценарии (JSON/PHP), task lifecycle, progress markers.
- Ссылки на ключевые документы: StrictModuleChecklist.md, module-validation-guide.md, module-installer-integration-setup.json, module-lifecycle-workflow.json, installation-format.md, directory-structure.md, scenario-standard.json, task-definition-standard.json, operational-principles.json, ai-task-system-operation-standard.md, indexing-usage-guide.json, manual-index-tagging-guide.json, index-data-collection.md, json-template-schema.md, primevue-components.md, primevue-rude-vs-original-structure.md, ui-examples.md, ui-examples-complex.md, elements-v1.md, elements-v2.md, component-syntax.md, module-actions.md, server-actions-reference.md, iterative-mode-development-process.json, architect-act-mode-workflow.json, process-analysis-methodology.json, module-task-creation-process.json, module-build-process.json.
- Глоссарий: объединён из docs/9.md и docs/glossary.md, дубли объединены, наиболее полные определения сохранены.
- Много внутренних ссылок ../... — невалидны вне оригинального контекста.

# Raw Observations: 00-review.md (2025, scan 2/5)

- Гайд агрегирует выводы по всем ключевым module-гайдам (01-09), используется как источник истины по структуре и best practices.
- Модули: исходники в script/data/implement/{module}/vX/, обязательна версия vX/ и _i/.
- _i/: meta.json (метаданные), links.json (роутинг), common.json (категории файлов для инсталлятора), files-by-block.json (логические блоки файлов для инсталлятора).
- common.json и files-by-block.json могут пересекаться по структуре, но используются инсталлятором для разных целей/этапов.
- Стандартные директории модуля: page.json, data/, sections/, templates/, programs/, actions/, _i/, docs/ (вариативно).
- Депрекейтед: @specification.md, @memories.md, @scratchpad.md в директории версии.
- _i/ — интерфейс между исходниками модуля и инсталлятором, meta.json — общая инфа, files-by-block.json/common.json — что копировать, links.json — как линкировать.
- Примеры структур common.json и links.json есть в гайде, но финальный формат — в документации инсталлятора (TBD).
- module:merge копирует _i/, но не использует содержимое напрямую — только для инсталлятора.
- Рекомендация: приоритет информации из guides/module/* над выводами из кода, если нет явных расхождений.
- UI строится через page.json (или аналог), компоненты с type/component, props, children.
- Data binding через model: {form, field}, FormManager, инициализация из program.json.
- Серверные actions через customHooks, sendData, sendTo.
- Form компоненты должны быть обёрнуты в Form с name, совпадающим с model.form.
- Включение UI через operation: include, source относительный к script/data/implement/.
- Рекомендуется разбивать UI на шаблоны (templates/forms/parts) и включать в page.json.
- Для question-to-user/v5: page.json, form с input'ами (InputText/TextArea/RadioButton), model, Form, submit-кнопка с customHooks/sendData, action-файл для сохранения.
- Данные вопросов — возможно в data/questions.json, либо прямо в UI JSON.
- Data: может быть в файлах, session, buffer, БД, доступ через префиксы file!, model!, session:, buffer:.
- program.json — для инициализации, динамика через actions/save.
- Прямое биндинг {data...} не поддерживается, только через includes/model/props.
- Pattern: инициализация буфера формы через action, затем overwrite динамикой, потом populate на фронте.

# Raw Observations: all-in-one.md (2025, scan 3/5, концентрат)

- Чеклист QTU покрывает унификацию, стандартизацию, протоколы, формы, шаблоны, тесты, документацию, ошибки, расширяемость.
- Везде акцент на строгие схемы, группировку вопросов, meta-информацию (taskId, groupId, tags), валидацию и актуализацию.
- Протоколы: ИИ ↔ QTU ↔ пользователь ↔ сервер, artisan-команды для синхронизации, обработка конфликтов.
- Формы: универсальный form-renderer, шаблоны для одиночных/серийных/групповых вопросов, bulk-операций, диалогов с ИИ, админ-действий.
- Тестирование: обязательная валидация всех типов вопросов/форм, универсальный рендер.
- Документация: поддержка стандарта question-to-user-standard.json, примеры JSON, актуальный список страниц/шаблонов.
- Архитектура: динамический UI через operation: include, шаблоны, секции, page.json, playground, разделение на страницы (StartPage, ScenarioList, ScenarioStep, ScenarioResult, AdminPanel, UserHistory и др.).
- Для каждой страницы — отдельный .design.md, 20 вопросов для сбора требований, ответы, итоговые выводы, прозрачность.
- Расширенный план: анализ UI, actions, validations, data, сверка с component-map.json, фиксация отклонений, user stories, сценарии, интеграция с сервером.
- Проектирование: динамический UI (data/question_sets, buffer:qtu.generatedUI), поддержка новых типов вопросов, строгий синтаксис, модульность.
- Actions: валидация, сохранение, очистка, submit, обработка ошибок, DataHub-адреса, расширяемость.
- Валидация: все validations/ — формат Instructions, интеграция с UI, отображение ошибок.
- Буферы: buffer:qtu.generatedUI, buffer:validationErrors, кеширование UI-структур.
- Тесты: покрытие user stories, UI, данные, ошибки, фиксация багов.
- Финализация: финальный чеклист, структура, имена, ссылки, документация, отражение новых паттернов.
- Критерии: динамический UI, ввод/отправка ответов, фидбек, списки задач, аналитика, только рабочий синтаксис, соответствие стандартам.
- Best practices: массивы для статусов/тегов, operation: include для динамики, шаблоны для bulk, секции для фильтров, истории, динамики.
- Для каждой страницы — примеры структуры данных (view-only), вопросы для сбора требований, TODO, вопросы для обсуждения.
- Везде акцент: не использовать неимплементированный синтаксис, все изменения документировать, обсуждать через QTU.

# Raw Observations: QTU Data Structures and Scenario Interaction (2025, scan 4/5)

## questions-to-user-1.json
- Содержит список вопросов, сгруппированных по категориям (Workflow, UI, Testing, Data Storage, Error Handling, Configuration).
- Используются типы вопросов: yes_no, checkbox_list, text, select. Options имеют value и label.
- Подтверждает использование категорий для организации вопросов.
- Вопросы охватывают многие аспекты системы.

## current_answers.json
- Простой JSON файл, хранящий ответы пользователя в формате ключ-значение (например, "userName": "").
- Используется как временное хранилище для данных, собранных через QTU.
- Ключи соответствуют именам полей, предположительно связанных с моделью данных или контекстом сценария.

## select.json (UI Blank)
- Определяет стандартную структуру для UI компонента "Dropdown" (выпадающий список).
- Содержит `type`, `props` (лейбл, опции) и `model` (`form`, `field`) для связывания с данными формы.
- Показывает, как UI компоненты описываются в JSON и связываются с моделью данных.

## TASK-QTU-FIX-INVALID-OBJECT-TYPE-001.json
- Задача связана с ошибками валидации "Invalid component type object", когда валидатор ожидает компонент (со свойством "type"), но находит простой JSON объект.
- Ошибка указывает на несоответствие между фактической структурой JSON в файлах (парсеры, секции) и ожидаемой структурой согласно схеме валидации компонента.
- Решения включают: оборачивание объектов в компонентную структуру, создание новых схем компонентов, или корректировку родительской схемы для разрешения произвольных объектов.
- Подчеркивает проблемы с гибкостью текущей системы валидации на основе JSON Schema для сложных/вложенных UI структур.

## SCN-ActivateTask.scenario.json
- Сценарий для активации задачи.
- Состоит из шагов типа "Action", вызывающих внешние PowerShell скрипты (`set-active-task.ps1`, `SetTaskStatusAction.ps1`).
- Использует `contextSchema` для формального описания требуемых (`taskId`) и предоставляемых (`activeTask`, `taskStatus`) контекстных переменных.
- Демонстрирует, как сценарии оркестрируют вызовы внешних скриптов и управляют статусом задачи.

---

# Alternative Approaches: QTU Data Structures and Scenario Interaction (2025, scan 4/5)

## Alternative to JSON File for Questions:
- **Centralized Question Bank/Database:** Хранение всех вопросов в базе данных или едином, хорошо структурированном файле с возможностью поиска и фильтрации по категориям, тегам и метаданным. Упростит управление большим количеством вопросов и обеспечит уникальность ID.
- **Versioning:** Внедрение явного версионирования для отдельных вопросов или наборов вопросов, чтобы отслеживать изменения и откатываться к предыдущим версиям.

## Alternative to Simple `current_answers.json`:
- **Database/Cache Storage:** Использование более надежного хранилища (например, Redis, база данных) для сессионных данных и ответов пользователя. Обеспечит лучшую масштабируемость, устойчивость и поддержку более сложных структур данных.
- **Standardized Answer Keys:** Принудительное использование стандартизированных ключей для сохранения ответов, возможно, с префиксом, указывающим на ID вопроса или сценария (например, `qtu.Q001`, `scenario.SCN-XYZ.stepInput`).

## Alternative to JSON UI Blanks:
- **Programmatic UI Generation:** Генерация UI структур программно на основе метаданных или более абстрактных описаний полей, а не из статических JSON файлов. Повысит гибкость и позволит применять общие правила рендеринга и валидации.
- **Component Registry with Standardized Props:** Создание реестра UI компонентов с четко определенными и документированными свойствами (props), вместо свободной структуры JSON в бланках.

## Alternative to JSON Schema for Complex Structures:
- **Code-Based Validation:** Использование PHP классов или других кодовых механизмов для валидации сложных JSON структур, особенно для определений компонентов и инструкций. Код может предложить большую гибкость и выразительность по сравнению с JSON Schema для сложных логических правил и зависимостей.
- **Custom Linter/Static Analyzer:** Разработка специализированного инструмента для статического анализа JSON файлов проекта, который может выявлять нестандартные паттерны или нарушения архитектурных принципов, специфичных для проекта.

## Alternative for Scenario Action Handling:
- **Action Handler Classes:** Вынесение логики обработки каждого типа действия сценария ("RunPowerShell", "UpdateTaskData" и т.д.) в отдельные PHP классы, реализующие общий интерфейс. Это сделает `invoke-scenario-engine.php` более чистым, модульным и легко расширяемым для новых типов действий.
- **Asynchronous Action Execution:** Для длительных операций (например, индексация, сложные скрипты) рассмотреть возможность асинхронного запуска действий сценария, чтобы не блокировать основной поток выполнения сценария и QTU интерфейс.

--- 

# Raw Observations: Checklists and Task Details (2025, scan 5/5)

## TASK-QTU-FIX-JSON-SYNTAX-001.json
- Задача по исправлению синтаксических ошибок в JSON файлах действий QTU.
- Указывает на конкретные файлы (`generateSuggestionsWithAI.json`, `finalizeQtuSession.json`) с ошибками.
- Подчеркивает необходимость валидации JSON файлов и использования валидатора.
- Руководство включает советы по поиску распространенных ошибок JSON.

## rule-manager.md (Чеклист)
- Описывает планируемую логику скрипта `rule-manager.ps1`.
- Функции включают: инициализацию директорий правил, enable/disable/status/priority правил, валидацию, создание новых правил, экспорт/импорт, поиск.
- Правила категоризируются (core, process, commands, system).

## migrate-rules.md (Чеклист)
- Описывает логику скрипта `migrate-rules.ps1`.
- Основная задача - перенос файлов правил из исходной директории в целевые категории.
- Включает шаги по созданию целевых директорий, определению категории правила по содержимому/пути, обновлению заголовков файла и сохранению.

## ai-processor.md (Чеклист)
- Описывает логику скрипта `ai-processor.ps1`, являющегося интерфейсом для AI агентов.
- Определяет режимы работы: RunScenario, ProcessActiveTask, QueryIndex, Help.
- Чеклист подробно описывает, как для каждого режима подготавливаются параметры и вызываются соответствующие PHP скрипты (`process.php`, `process-query-index.php`).
- Включает пункты по логированию, обработке ошибок и выводу в JSON.

---

# Alternative Approaches: Checklists and Task Details (2025, scan 5/5)

## Alternative to Manual JSON Syntax Fixing:
- **Automated JSON Linting/Formatting:** Использование инструментов командной строки (например, `jsonlint`, `jq`) в CI/CD пайплайне для автоматической проверки синтаксиса JSON и форматирования файлов. Это предотвратит коммит файлов с базовыми синтаксическими ошибками.
- **Code Editor Integration:** Настройка редактора кода для автоматической валидации JSON файлов по мере ввода, с подсветкой ошибок.

## Alternative to Separate Checklists for Each Script:
- **Centralized Process Documentation:** Вместо отдельных Markdown чеклистов для каждого скрипта, создать единый документ или набор документов, описывающих комплексные рабочие процессы (workflow) с указанием, какие скрипты или компоненты используются на каждом шаге. Это лучше отразит взаимодействие между частями системы.
- **Executable Checklists:** Использование форматов (например, YAML, JSON) для описания шагов чеклиста, которые могут быть прочитаны и частично автоматизированы скриптами или сценарным движком.

## Alternative for Rule/File Migration Logic:
- **PHP-Based Migration Commands:** Реализация логики миграции правил и файлов как консольных команд Laravel (Artisan commands) на PHP. Это позволит использовать всю мощь PHP для анализа содержимого файлов, работы с файловой системой и обновления метаданных, а также интегрировать миграцию в общую систему команд проекта.
- **Standardized File Header Format:** Принудительное использование стандартизированного формата для заголовков файлов (например, YAML front matter в Markdown) для хранения метаданных правил (Status, Priority, Category). Это упростит их парсинг скриптами.

## Alternative for AI Processor Interface:
- **Dedicated API Service:** Как упоминалось ранее, выделенный HTTP API сервис (возможно, на Laravel) для взаимодействия AI агентов. Это обеспечит лучшую безопасность, масштабируемость и гибкость по сравнению с вызовами PowerShell скриптов.
- **Message Queue Integration:** Использование системы очередей сообщений (например, RabbitMQ, Kafka) для асинхронного взаимодействия между AI агентами и системой. Агенты отправляют сообщения с запросами, а система обрабатывает их в фоновом режиме и публикует результаты в другую очередь.

--- 