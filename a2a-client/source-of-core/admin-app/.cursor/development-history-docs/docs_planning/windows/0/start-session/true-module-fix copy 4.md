# True Module Fix: превращение нерабочих модулей в рабочие

Здравствуйте. Эта сессия предназначена для постоянного дообучения системы исправления модулей.

**Ваша цель — не просто исправлять нерабочие модули, а на каждом шаге:**

- Сканировать примеры (эталонные и проблемные модули).
- Анализировать, что отличает рабочие модули от нерабочих.
- Фиксировать новые best practices, паттерны, ошибки и решения в changelog/lessons-learned (см. секцию ниже).
- Обновлять стандарты, чек-листы, документацию по мере появления новых кейсов (см. секцию "Интеграция новых знаний").
- Применять новые знания к следующим задачам и модулям.

---

# Быстрый старт: Мини-чеклист

1. Найди нерабочий модуль (known-issues.md, ошибки валидации, жалобы пользователей).
2. Запусти глубокую валидацию:
    - `pwsh -File ./main-work.ps1 -Mode RunScenario -ScenarioId SCN-JsonModuleContinueTaskByValidator -TaskId <TaskId>`
    - или `php artisan validate:module-json <moduleName>`
3. Составь чеклист проблем (known-issues.md, checklist, результаты сценария).
4. Исправь модуль по чеклисту: структура, код, тесты, документация, интеграция.
5. Проверь, что модуль теперь рабочий по всем стандартам (см. чек-лист и гайды ниже).
6. Зафиксируй изменения в changelog, lessons-learned, обнови индексы.
7. Если не удаётся исправить — см. секцию "Эскалация нерешаемых проблем".

---

# Scan-Plan-Refine-LEARN: Живой цикл дообучения

## 1. Scan (Сканирование и анализ связей)

- Исследуй не только структуру, но и связи между actions, сценариями, task_definitions, task_types, markers,
  state-файлами, publishedTaskId.
- Глубоко изучай взаимодействие модуля с PHP-ядром ([App\AiRudeDepot\](mdc:app/AiRudeDepot/)), особенно с
  `DataProcessor` ([mdc:app/AiRudeDepot/Processors/DataProcessor.php]),
  `StorageHelper` ([mdc:app/AiRudeDepot/Processors/InstructionProcessor/StorageHelper.php]),
  `DataHub` ([mdc:app/AiRudeDepot/Storage/DataHub.php]) и
  `StoragePathParser` ([mdc:app/AiRudeDepot/Managers/StoragePathParser.php]) для корректной работы с данными и
  JSON-инструкциями.
- Для каждого этапа фиксируй, какие файлы и директории участвуют в жизненном цикле модуля (используй ссылки mdc:... для
  всех ключевых объектов).
- Особое внимание уделяй:
    - Жизненному циклу модуля: как меняется статус (Planned → InProgress → Completed), как происходит архивирование,
      миграция, обновление версий.
    - Использованию markers, publishedTaskId, state-файлов для отслеживания и управления прогрессом.
    - Взаимодействию между actions, сценариями, PowerShell-скриптами, PHP-движком, task_definitions, task_types,
      standards и state-файлами.
- Примеры для
  анализа: [mdc:implement-modules/primary-form/v2/], [mdc:implement-modules/landing-main-page/v2/], [/docs/guides/module/01-overview-creating-modules.md]
  и другие гайды.

## 2. Plan (План исправления и дообучения)

- Строй план не только по исправлению, но и по развитию системы:
    - Какие стандарты/гайды/чеклисты нужно обновить?
    - Какие новые паттерны внести?
    - Как будет меняться статус модуля/задачи?
    - Как использовать markers и state-файлы для отслеживания прогресса?
- Для каждого действия указывай, какие файлы/директории будут доработаны (mdc:...).
- Планируй обновление lessons-learned/changelog после каждого цикла.

## 3. Refine-LEARN (Уточнение, фиксация новых знаний, развитие системы)

- После каждого цикла фиксируй lessons-learned, changelog, новые best practices.
- Если выявлены новые типы ошибок/структур — расширяй стандарты, гайды, чеклисты.
- Всегда указывай, какие файлы/директории были доработаны (mdc:...).
- Если что-то не описано в гайде — расширяй гайд, оформи pull-request или создай задачу на доработку стандарта.
- Главная цель — чтобы система и стандарты постоянно развивались, а не просто повторяли старые ошибки.

---

# Ключевые гайды, стандарты и сценарии (используй на каждом этапе!)

- [Обзор создания модулей](/docs/guides/module/01-overview-creating-modules.md)
- [Структура файлов модуля](/docs/guides/module/02-file-structure.md)
- [Метаданные и _i/](/docs/guides/module/03-metadata.md)
- [Построение UI](/docs/guides/module/04-ui-construction.md)
- [Работа с данными](/docs/guides/module/05-data-handling.md)
- [Логика и actions](/docs/guides/module/06-actions-logic.md)
- [Сборка и merge](/docs/guides/module/07-build-merge.md)
- [Валидация](/docs/guides/module/08-validation.md)
- [Жизненный цикл и поддержка](/docs/guides/module/09-lifecycle-maintenance.md)
- [Индекс гайдов по модулям](/docs/guides/module/README.json)
- [GenericModuleDevelopment_Checklist.md](/docs/guides/module/GenericModuleDevelopment_Checklist.md)
- [StrictModuleChecklist.md](/docs/guides/StrictModuleChecklist.md) (чек-лист строгой структуры модуля)
- [task-definition-standard.json](mdc:script/docs/standards/task-manager/task-definition-standard.json)
- [operational-principles.json](mdc:script/docs/standards/ai-agent/operational-principles.json)
- [SCN-JsonModuleContinueTaskByValidator](mdc:script/engine/scenarios/SCN-JsonModuleContinueTaskByValidator.scenario.json)
- [SCN-CollectModuleImprovementContext](mdc:script/engine/scenarios/SCN-CollectModuleImprovementContext.scenario.json)
- [SCN-JsonModuleConceptualImprovement](mdc:script/engine/scenarios/SCN-JsonModuleConceptualImprovement.scenario.json)

## Ключевые компоненты PHP ядра (для понимания работы модулей)

- `DataProcessor.php` ([mdc:app/AiRudeDepot/Processors/DataProcessor.php]) - Оркестратор обработки данных и
  модификаторов.
- `StorageHelper.php` ([mdc:app/AiRudeDepot/Processors/InstructionProcessor/StorageHelper.php]) - Исполнитель
  JSON-инструкций.
- `DataHub.php` ([mdc:app/AiRudeDepot/Storage/DataHub.php]) - Центральное хранилище и менеджер данных (адреса,
  плейсхолдеры).
- `StoragePathParser.php` ([mdc:app/AiRudeDepot/Managers/StoragePathParser.php]) - Парсер адресов для `DataHub`.
- `WalkForOperations.php` ([mdc:app/AiRudeDepot/Processors/DataProcessor/Php/WalkForOperations.php]) - PHP-модификатор
  для обработки `include/add/remove` в JSON страниц.
- `WalkForForms.php` ([mdc:app/AiRudeDepot/Processors/DataProcessor/Php/WalkForForms.php]) - PHP-модификатор для сбора
  данных форм.
- `InstructionProcessor.php` ([mdc:app/AiRudeDepot/Processors/InstructionProcessor.php]) - API-обертка для
  взаимодействия с конкретным адресом в `DataHub`.
- `DataManipulateHelper.php` ([mdc:app/AiRudeDepot/Processors/InstructionProcessor/DataManipulateHelper.php]) - Утилиты
  для поиска, трансформации данных и вычисления условий.

---

# Типовые ошибки и паттерны исправления (lessons-learned)

- Неактуальная структура директорий (нет `docs/`, `actions/`, `templates/` и т.д., см.
  `StrictModuleChecklist.md` ([/docs/guides/StrictModuleChecklist.md]))
- Отсутствие или устаревание `README.md`, `known-issues.md`, `index.md`
- Неактуальные или отсутствующие тесты/валидации
- Не проходит сценарии интеграции (см.
  `SCN-JsonModuleContinueTaskByValidator` ([mdc:script/engine/scenarios/SCN-JsonModuleContinueTaskByValidator.scenario.json]))
- Не обновлены индексы и метаданные (`_i/`)
- Не зафиксированы `lessons-learned`/`changelog` после исправления
- Не интегрированы новые best practices в стандарты/гайды
- Некорректный синтаксис JSON-инструкций в `actions/` или некорректные JSON-структуры в `pages/` (см. логику
  `StorageHelper.php` ([mdc:app/AiRudeDepot/Processors/InstructionProcessor/StorageHelper.php]))
- Ошибки в адресах `DataHub` (неправильные префиксы, пути, плейсхолдеры, см.
  `StoragePathParser.php` ([mdc:app/AiRudeDepot/Managers/StoragePathParser.php]))
- Несоответствие JSON-структур в `pages/` ожиданиям
  `WalkForOperations.php` ([mdc:app/AiRudeDepot/Processors/DataProcessor/Php/WalkForOperations.php]) или
  `WalkForForms.php` ([mdc:app/AiRudeDepot/Processors/DataProcessor/Php/WalkForForms.php])
- Проблемы с загрузкой данных форм из `data/` (неправильные пути, формат JSON)
- Не эскалированы нерешаемые проблемы (см. секцию ниже)

---

# Интеграция новых знаний и best practices

- После каждого исправления обязательно:
    - Обнови lessons-learned.json или memories.json (фиксируй новые паттерны, ошибки, решения)
    - Обнови changelog (что было изменено и почему)
    - Если выявлен новый тип ошибки — расширь соответствующий гайд или чек-лист (pull-request или задача)
    - Укажи, какие файлы/директории были доработаны (mdc:...)

---

# Эскалация нерешаемых проблем

- Если модуль не удаётся довести до рабочего состояния:
    - Зафиксируй причины в known-issues.md и lessons-learned.json
    - Оформи задачу для эскалации или переписывания с нуля
    - Приложи ссылки на все использованные гайды, сценарии, чек-листы
    - Укажи, какие шаги были предприняты и где возникли блокеры

---

# Пример структуры рабочего модуля

```
implement-modules/<module-name>/v2/
├── docs/
│   ├── README.md
│   ├── known-issues.md
│   ├── index.md
│   └── ...
├── actions/
├── commands/
├── templates/
├── code/
├── validations/
├── data/
├── pages/
├── state/
├── _i/
└── ...
```

- **README.md** — обзор, проблемы, миграция, структура.
- **known-issues.md** — список известных проблем.
- **index.md** — структура документации.
- **code.md** — структура кода.

---

# Чек-лист для рабочего модуля (см. GenericModuleDevelopment_Checklist.md и гайды выше)

- Чёткая цель и идентификатор модуля.
- Сбор и анализ контекста (SCN-CollectModuleImprovementContext).
- Актуальная документация (README.md, known-issues.md, index.md).
- Соответствие стандартам (task-definition-standard.json, operational-principles.json, гайды).
- Корректная структура директорий и файлов.
- Покрытие тестами, успешное прохождение сценариев.
- Интеграция с системой, обновлённые индексы.
- Lessons learned и changelog.

---

# Lessons learned и ретроспектива

- После исправления фиксируй уроки и паттерны в `lessons-learned.md` (например, `docs/development/lessons-learned.md`)
  или `memories.json`.
- Регулярно обновляй стандарты и чек-листы на основе новых кейсов.

---

**Используй этот файл как практическое руководство для превращения нерабочих модулей в рабочие и постоянного развития
стандартов!**
