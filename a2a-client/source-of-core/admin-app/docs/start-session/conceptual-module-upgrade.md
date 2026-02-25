Здравствуйте. Эта сессия предназначена для проведения концептуальных улучшений JSON-модулей с одновременным дообучением
системы и обновлением стандартов.

**Ваша основная задача — не просто изменить модуль, а провести его концептуальное обновление, и на каждом шаге:**

- Глубоко сканировать модуль, его текущую роль в системе, связанные с ним процессы и документацию.
- Анализировать, как новые стандарты, технологии или бизнес-требования могут улучшить модуль.
- Планировать изменения, охватывающие архитектуру, данные, UI/UX, и взаимодействие с другими частями системы.
- Фиксировать новые архитектурные паттерны, best practices, и lessons-learned в ходе рефакторинга.
- Обновлять стандарты, гайды ([/docs/guides/module/README.json]), и чек-листы, отражая полученный опыт.
- Применять новые знания для будущих концептуальных апгрейдов и разработки новых модулей.

---

# Scan-Plan-Refine-LEARN: Цикл Концептуального Обновления и Дообучения

## 1. Scan (Глубокое Сканирование и Анализ Контекста)

- **Анализ Модуля:**
    - Изучи текущую структуру модуля ([mdc:implement-modules/YOUR-MODULE-NAME/vX/]), его `_i/meta.json`,
      `_i/links.json`, `actions/`, `pages/`, `data/`.
    - Определи его текущие функции, сильные и слабые стороны.
    - Проанализируй историю изменений модуля, если доступна (например, через changelog или git history).
- **Системный Контекст:**
    - Исследуй, как модуль интегрирован с системой: сценарии ([mdc:script/engine/scenarios/]), которые его используют,
      задачи ([mdc:script/engine/task_definitions/]) и глобальное состояние активной задачи (
      `script/engine/state/system.state.json` поле `publishedTaskId`).
    - Изучи взаимодействие с PHP-ядром: DataProcessor ([mdc:app/AiRudeDepot/Processors/DataProcessor.php]) и его
      ключевые компоненты ([mdc:app/AiRudeDepot/Processors/DataProcessor/Php/]), такие как `WalkForOperations.php` и
      `WalkForForms.php` (для обработки `actions/` и `pages/`),
      StorageHelper ([mdc:app/AiRudeDepot/Processors/InstructionProcessor/StorageHelper.php]),
      InstructionProcessor ([mdc:app/AiRudeDepot/Processors/InstructionProcessor.php]) (для работы с данными модуля
      через `DataHub`), DataHub ([mdc:app/AiRudeDepot/Storage/DataHub.php]), и
      StoragePathParser ([mdc:app/AiRudeDepot/Managers/StoragePathParser.php]).
    - Проверь актуальность его взаимодействия с `main-work.ps1` [mdc:main-work.ps1] (для управления задачами и
      сценариями) и `invoke-scenario-engine.php` [mdc:script/engine/invoke-scenario-engine.php] (который исполняет
      сценарии, используя `ScenarioId`, `TaskId`, `context`, и создает маркеры вида
      `engine/markers/<SCENARIO_ID>_<TaskID_или_default>.progress.json`).
- **Стандарты и Гайды:**
    - Сверься с последними версиями гайдов по разработке модулей ([/docs/guides/module/README.json] – обрати внимание
      на все гайды с 01 по 09, а также проверь статус TBD гайдов: 'Troubleshooting Module Creation Errors' и 'Landing
      Page Template Upgrade Example'),
      особенно [/docs/guides/module/01-overview-creating-modules.md], [/docs/guides/module/02-file-structure.md], [/docs/guides/module/05-data-handling.md], [/docs/guides/module/06-actions-logic.md]).
    - Изучи актуальные архитектурные стандарты и operational
      principles ([mdc:script/docs/standards/ai-agent/operational-principles.json]).
- **Цели Апгрейда:**
    - Четко определи, какие концептуальные улучшения требуются: повышение производительности, улучшение UX, интеграция
      новых функций, соответствие новым бизнес-логикам, переход на новые технологии/библиотеки, используемые в PHP-ядре.

## 2. Plan (Планирование Концептуальных Изменений и Обновления Системы)

- **Архитектурный План:**
    - Разработай план рефакторинга или пересмотра архитектуры модуля.
    - Определи, какие компоненты модуля (файлы, структуры данных, JSON-инструкции) будут изменены, созданы или удалены.
      Используй mdc: ссылки.
    - Запланируй изменения в `_i/meta.json` и `_i/links.json` для отражения новой концепции.
- **План Интеграции:**
    - Предусмотри, как изменения в модуле повлияют на связанные сценарии, задачи и PHP-обработчики.
    - Запланируй создание или обновление задач для тестирования и валидации обновленного модуля.
- **План Документирования и Дообучения:**
    - Запланируй обновление релевантных гайдов ([/docs/guides/module/]) или создание новых, если апгрейд вводит
      значимые новые паттерны.
    - Включи в план обновление changelog модуля и общего lessons-learned ([/docs/development/lessons-learned.md]).
    - Предусмотри создание задач на обновление стандартов, если текущие не покрывают новые подходы.

## 3. Refine-LEARN (Реализация, Итеративное Улучшение и Фиксация Знаний)

- **Реализация и Тестирование:**
    - Внеси запланированные изменения в модуль.
    - Тщательно протестируй обновленный модуль, используя сценарии валидации (
      например, [mdc:script/engine/scenarios/SCN-AutomatedModuleValidation.scenario.json]) и ручные проверки.
- **Фиксация Знаний:**
    - После каждого этапа реализации и тестирования обновляй changelog модуля и общий
      lessons-learned ([/docs/development/lessons-learned.md]).
    - Документируй принятые архитектурные решения, их обоснование, возникшие проблемы и способы их решения.
    - Если были созданы новые универсальные подходы или компоненты, опиши их в соответствующем
      гайде ([/docs/guides/module/]) или предложи для включения в PHP-ядро.
- **Обновление Стандартов и Гайдов:**
    - Если в ходе апгрейда были выявлены пробелы или устаревшая информация в гайдах или стандартах, создай pull-request
      или задачу на их обновление.
    - Убедись, что новые архитектурные решения задокументированы и могут быть использованы другими разработчиками.
- **Обратная Связь:**
    - Собери обратную связь (если применимо) о концептуальных изменениях, чтобы убедиться, что они соответствуют
      ожиданиям.

---

# Ключевые Ресурсы для Концептуального Апгрейда

- **Гайды по Модулям (Обязательно к изучению перед началом!):**
    - [/docs/guides/module/README.json] (обзор всех гайдов)
    - [/docs/guides/module/01-overview-creating-modules.md] (общие принципы)
    - [/docs/guides/module/02-file-structure.md] (структура модуля)
    - [/docs/guides/module/03-metadata.md] (`_i/meta.json`, `_i/links.json`)
    - [/docs/guides/module/04-ui-construction.md] (построение UI)
    - [/docs/guides/module/05-data-handling.md] (обработка данных, DataHub)
    - [/docs/guides/module/06-actions-logic.md] (логика действий)
    - [/docs/guides/module/07-build-merge.md] (сборка и слияние)
    - [/docs/guides/module/08-validation.md] (валидация)
    - [/docs/guides/module/09-lifecycle-maintenance.md] (жизненный цикл и поддержка)
- **Системные Компоненты и Сценарии:**
    - `main-work.ps1` [mdc:main-work.ps1], `main-index.ps1` [mdc:main-index.ps1],
      `invoke-scenario-engine.php` [mdc:script/engine/invoke-scenario-engine.php]
    - PHP Core: DataProcessor [mdc:app/AiRudeDepot/Processors/DataProcessor.php] (и его компоненты
      в [mdc:app/AiRudeDepot/Processors/DataProcessor/Php/]),
      StorageHelper [mdc:app/AiRudeDepot/Processors/InstructionProcessor/StorageHelper.php],
      InstructionProcessor [mdc:app/AiRudeDepot/Processors/InstructionProcessor.php],
      DataHub [mdc:app/AiRudeDepot/Storage/DataHub.php],
      StoragePathParser [mdc:app/AiRudeDepot/Managers/StoragePathParser.php],
      WalkForOperations [mdc:app/AiRudeDepot/Processors/DataProcessor/Php/WalkForOperations.php],
      WalkForForms [mdc:app/AiRudeDepot/Processors/DataProcessor/Php/WalkForForms.php]
    - Сценарии: [mdc:script/engine/scenarios/README.json] (изучи релевантные сценарии, особенно для валидации и
      тестирования)
- **Стандарты и Принципы:**
    - [mdc:script/docs/standards/task-manager/task-definition-standard.json]
    - [mdc:script/docs/standards/ai-agent/operational-principles.json]
    - [/docs/guides/StrictModuleChecklist.md]

---

# Типовые Задачи при Концептуальном Апгрейде (lessons-learned)

- **Переход на новые PHP-обработчики:** Модуль использует устаревшие `actions` или `pages` структуры, которые
  неэффективно обрабатываются новыми версиями `WalkForOperations.php` или `WalkForForms.php`. Требуется адаптация
  JSON-структур.
- **Оптимизация DataHub запросов:** Модуль делает слишком много мелких запросов к
  DataHub [mdc:app/AiRudeDepot/Storage/DataHub.php]; требуется рефакторинг для агрегации данных или использования более
  эффективных путей через StoragePathParser [mdc:app/AiRudeDepot/Managers/StoragePathParser.php].
- **Унификация UI компонентов:** Модуль использует кастомные UI-элементы, которые можно заменить стандартными,
  описанными в [/docs/guides/module/04-ui-construction.md], для улучшения консистентности и поддержки.
- **Рефакторинг бизнес-логики:** Изменение бизнес-требований делает текущую логику в `actions/` неактуальной или
  неоптимальной. Требуется перепроектирование.
- **Отсутствие документации:** Концепция старого модуля не была должным образом задокументирована, что усложняет его
  понимание и развитие. Апгрейд должен включать создание или обновление документации.

---

# Интеграция Новых Знаний и Best Practices

- **Обязательно после каждого концептуального апгрейда:**
    - Обнови `lessons-learned.md` ([/docs/development/lessons-learned.md]) новыми архитектурными решениями,
      проблемами и их решениями.
    - Обнови `changelog.md` модуля, детально описывая суть концептуальных изменений.
    - Если в ходе апгрейда были разработаны новые подходы, достойные стать стандартом, инициируй обновление
      соответствующих гайдов ([/docs/guides/module/]) или создай задачу на их пересмотр.
    - Удостоверься, что все mdc: ссылки в этом и других связанных документах актуальны.

---

# Эскалация Нерешаемых Проблем

- Если концептуальный апгрейд сталкивается с фундаментальными ограничениями системы, которые не могут быть решены на
  уровне модуля:
    - Четко задокументируй проблему, ее влияние и предложенные варианты решения (даже если они требуют изменений в
      PHP-ядре или системных сценариях).
    - Создай задачу высокого уровня для команды разработки ядра или системных архитекторов.
    - Приложи ссылки на модуль, все релевантные гайды, стандарты и проведенный анализ.

---

**Веди changelog и lessons-learned непрерывно.**

**Этот промт — ваш инструмент для превращения рутинных апгрейдов в возможность для роста и улучшения всей системы!**

# Пример использования сценария `SCN-CreateTask`

Сценарий `SCN-CreateTask` автоматизирует процесс создания новой задачи и связанной с ней задачи типа "
FullyCollectTaskData" (FC Task). Ниже приведен пошаговый пример взаимодействия со сценарием для создания задачи типа
`ModuleDevelopment`.

1. **Инициация сценария:**
   ```powershell
   pwsh -File ./main-work.ps1 -Mode RunScenario -ScenarioId SCN-CreateTask
   ```

2. **Ввод типа задачи:** Система запросит тип создаваемой задачи.
    * Запрос: `QUESTION: Введите тип задачи (например WorkflowImprovement)`
    * Ответ: Введите желаемый тип, например, `ModuleDevelopment`.
      ```powershell
      pwsh -File ./main-work.ps1 -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue ModuleDevelopment
      ```

3. **Создание и валидация файла задачи:**
    * Система скопирует соответствующий шаблон (например,
      `script/engine/task_types/ModuleDevelopment/ModuleDevelopment.template.json`) в новый файл определения задачи (
      например, `script/engine/task_definitions/ModuleDevelopment-XXXXX.json`).
    * Далее, система попытается валидировать этот файл. Если в шаблоне есть плейсхолдеры, валидация сообщит об этом.

4. **Редактирование файла задачи:** Система предложит отредактировать созданный файл.
    * Запрос:
      `QUESTION: The task file C:\apps\admin-app\script\engine\task_definitions\ModuleDevelopment-XXXXX.json contains placeholder text. Please edit the file to fill in the details...`
    * Действие: Откройте указанный `.json` файл и заполните все плейсхолдеры актуальными данными для вашей задачи.

5. **Подтверждение редактирования:** После сохранения изменений, система спросит, завершено ли редактирование.
    * Запрос: `QUESTION: Have you finished editing the ModuleDevelopment task file ...? Enter 'yes' to re-validate.`
    * Ответ: `yes`
      ```powershell
      pwsh -File ./main-work.ps1 -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue yes
      ```

6. **Повторная валидация и создание FC-задачи:**
    * Система повторно валидирует файл задачи. Если все плейсхолдеры заменены, валидация пройдет успешно.
    * Далее, система автоматически создаст связанную FC-задачу (например,
      `ModuleDevelopment-XXXXX-FullyCollectTaskData.json`).

7. **Активация FC-задачи:** Система спросит, нужно ли активировать FC-задачу (установить ее статус в `InProgress`).
    * Запрос:
      `QUESTION: Введите 'yes' для установки статуса задачи ...ModuleDevelopment-XXXXX-FullyCollectTaskData.json в 'InProgress'`
    * Ответ: `yes`
      ```powershell
      pwsh -File ./main-work.ps1 -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue yes
      ```

8. **Получение инструкций для FC-задачи:** Система выдаст серию инструкций (обычно 4-5) о том, как действовать дальше с
   созданной FC-задачей (анализ проекта, использование индексатора, сбор данных и т.д.). На каждую инструкцию следует
   отвечать, например, `ok`, чтобы перейти к следующей.
   ```powershell
   # Пример ответа на одну из инструкций
   pwsh -File ./main-work.ps1 -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue ok
   ```

9. **Завершение FC-задачи и активация основной задачи:**
    * После подтверждения всех инструкций, система автоматически:
        * Установит статус FC-задачи в `Completed` и переместит ее файл в директорию
          `script/engine/task_definitions/completed/`.
        * Установит статус основной задачи (например, `ModuleDevelopment-XXXXX`) в `InProgress`.
        * Обновит глобальный параметр `activeTask` на ID основной задачи.

10. **Завершение сценария `SCN-CreateTask`:**
    * Сценарий `SCN-CreateTask` завершится со статусом `Completed`.
    * Сообщение: `Scenario finished with status: Completed`

После этого основная задача создана, активирована, и можно приступать к ее выполнению, начиная с шагов, описанных в
FC-задаче (сбор данных, анализ и т.д.), используя сценарий `SCN-FullyCollectTaskData`.

---

**Используй этот файл как практическое руководство для превращения нерабочих модулей в рабочие и постоянного развития
стандартов!**
