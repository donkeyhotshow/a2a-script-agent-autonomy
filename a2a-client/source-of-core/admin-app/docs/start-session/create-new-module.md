Здравствуйте. Эта сессия предназначена для создания нового JSON-модуля с нуля, с акцентом на обучение, следование
стандартам и улучшение документации.

**Ваша цель — не просто создать функциональный модуль, но и на каждом шаге:**

- Тщательно изучать и применять все релевантные гайды из [/docs/guides/module/README.json].
- Анализировать процесс создания, выявляя потенциальные улучшения в гайдах или типовые сложности.
- Фиксировать lessons-learned, особенно касающиеся начальной настройки, структуры, и интеграции.
- Предлагать обновления для существующих гайдов или создавать черновики для недостающих (например, TBD
  гайда [/docs/guides/module/README.json] 'Troubleshooting Module Creation Errors').
- Создавать модуль, который является образцом следования текущим best practices.

---

# Scan-Plan-Refine-LEARN: Цикл Создания Модуля и Дообучения Системы

## 1. Scan (Изучение Требований, Гайдов и Системного Контекста)

- **Требования к Модулю:**
    - Четко определи назначение, основные функции и предполагаемое поведение нового модуля.
    - Собери (если возможно) примеры данных, с которыми модуль будет работать, или его ожидаемый UI.
- **Гайды по Модулям (Обязательное изучение ДО начала работы!):**
    - Проработай КАЖДЫЙ гайд из [/docs/guides/module/README.json], начиная
      с [/docs/guides/module/01-overview-creating-modules.md] и далее по списку (02-file-structure, 03-metadata,
      04-ui-construction, 05-data-handling, 06-actions-logic, 07-build-merge, 08-validation, 09-lifecycle-maintenance).
    - Особое внимание удели структуре файлов ([/docs/guides/module/02-file-structure.md]) и
      метаданным ([/docs/guides/module/03-metadata.md]).
- **Системный Контекст и Аналоги:**
    - Изучи существующие модули (
      например, [mdc:implement-modules/primary-form/v2/], [mdc:implement-modules/landing-main-page/v2/]) как примеры
      реализации.
    - Проанализируй, как новый модуль будет взаимодействовать с PHP-ядром (
      DataProcessor [mdc:app/AiRudeDepot/Processors/DataProcessor.php] и его компоненты `WalkForOperations`,
      `WalkForForms`; StorageHelper [mdc:app/AiRudeDepot/Processors/InstructionProcessor/StorageHelper.php],
      DataHub [mdc:app/AiRudeDepot/Storage/DataHub.php]).
    - Пойми, какие сценарии ([mdc:script/engine/scenarios/]) могут быть использованы для его тестирования или
      интеграции (например, [mdc:script/engine/scenarios/SCN-AutomatedModuleValidation.scenario.json]).
- **Стандарты и Чек-листы:**
    - Ознакомься с [/docs/guides/StrictModuleChecklist.md]
      и [/docs/guides/module/GenericModuleDevelopment_Checklist.md].

## 2. Plan (Планирование Структуры Модуля, Разработки и Документирования)

- **Структура Модуля:**
    - Спроектируй файловую структуру модуля в директории `implement-modules/YOUR-NEW-MODULE-NAME/v1/`
      согласно [/docs/guides/module/02-file-structure.md].
    - Запланируй содержимое `_i/meta.json` и `_i/links.json`.
    - Определи основные `actions/`, `pages/`, и `data/` JSON файлы, которые потребуются.
- **План Разработки:**
    - Разбей процесс создания на этапы: создание структуры, метаданные, базовый UI, логика действий, обработка данных.
    - Предусмотри использование стандартных PHP-обработчиков из DataProcessor, где это возможно.
- **План Тестирования и Валидации:**
    - Запланируй использование сценария [mdc:script/engine/scenarios/SCN-AutomatedModuleValidation.scenario.json] или
      ручную валидацию по чек-листам.
    - Определи критерии успешного создания модуля.
- **План Документирования и Дообучения:**
    - Заведи локальный changelog для нового модуля.
    - Запланируй фиксацию любых сложностей или неясностей, встреченных в гайдах, для последующего их улучшения.
    - Если обнаружишь повторяющиеся проблемы при создании, начни собирать материал для TBD гайда 'Troubleshooting Module
      Creation Errors'.

## 3. Refine-LEARN (Итеративная Разработка, Тестирование и Фиксация Знаний)

- **Создание и Итерация:**
    - Создай базовую структуру и файлы модуля.
    - Постепенно добавляй UI, логику, обработку данных, тестируя каждый этап.
    - Используй `main-work.bat` [mdc:main-work.bat] и
      `invoke-scenario-engine.php` [mdc:script/engine/invoke-scenario-engine.php] для тестирования через сценарии (если
      применимо).
- **Фиксация Знаний (Lessons Learned):**
    - По ходу разработки документируй:
        - Любые отступления от гайдов и их причины.
        - Неочевидные моменты или проблемы и их решения.
        - Предложения по улучшению гайдов ([/docs/guides/module/]).
    - Сохраняй эту информацию в `lessons-learned.md` проекта ([/docs/development/lessons-learned.md]) и/или в
      черновике для 'Troubleshooting Module Creation Errors'.
- **Обновление Гайдов и Стандартов (Предложения):**
    - Если гайды неполные или неясные, сформулируй конкретные предложения по их улучшению или создай задачу на их
      доработку.
    - Если новый модуль реализует паттерн, который может быть полезен как стандарт, задокументируй его.
- **Валидация:**
    - Проведи финальную валидацию модуля по [/docs/guides/StrictModuleChecklist.md].

---

# Ключевые Ресурсы для Создания Нового Модуля

- **Все Гайды по Модулям:** [/docs/guides/module/README.json] (проработать последовательно!)
- **PHP Core Components:** DataProcessor [mdc:app/AiRudeDepot/Processors/DataProcessor.php],
  StorageHelper [mdc:app/AiRudeDepot/Processors/InstructionProcessor/StorageHelper.php],
  DataHub [mdc:app/AiRudeDepot/Storage/DataHub.php]
- **Сценарий Валидации:** [mdc:script/engine/scenarios/SCN-AutomatedModuleValidation.scenario.json]
- **Чек-листы:
  ** [/docs/guides/StrictModuleChecklist.md], [/docs/guides/module/GenericModuleDevelopment_Checklist.md]
- **Примеры Существующих Модулей:
  ** [mdc:implement-modules/primary-form/v2/], [mdc:implement-modules/landing-main-page/v2/]

---

# Типовые Сложности при Создании Модуля (Пополнять в ходе работы!)

- **Начальная настройка `_i/meta.json`:** Правильное определение `moduleId`, `version`, `title`.
- **Связывание через `_i/links.json`:** Корректное указание зависимостей или связанных элементов.
- **Отладка JSON синтаксиса:** Особенно во вложенных структурах `actions` или `pages`.
- **Интеграция с DataHub:** Правильное формирование адресов и понимание, как DataProcessor читает/пишет данные.
- **Понимание области видимости PHP обработчиков:** Как `WalkForOperations` или `WalkForForms` находят и обрабатывают
  инструкции в JSON.
- *(Сюда добавлять новые lessons-learned по мере их появления в ходе сессий создания модулей)*

---

# Интеграция Новых Знаний и Best Practices

- **Обязательно после сессии создания модуля:**
    - Обнови `lessons-learned.md` ([/docs/development/lessons-learned.md]) новыми открытиями.
    - Внеси предложения по улучшению гайдов [/docs/guides/module/] или стандартов.
    - Если собран материал для 'Troubleshooting Module Creation Errors', оформи его в виде черновика или задачи на
      создание этого гайда.
    - Убедись, что созданный модуль соответствует всем последним стандартам и может служить примером.

---

**Веди changelog модуля и lessons-learned непрерывно в ходе работы.**

**Этот промт — ваш инструмент для создания качественных модулей и одновременного улучшения процесса их разработки для
всей системы!**

# Пример использования сценария `SCN-CreateTask`

Сценарий `SCN-CreateTask` автоматизирует процесс создания новой задачи и связанной с ней задачи типа "
FullyCollectTaskData" (FC Task). Ниже приведен пошаговый пример взаимодействия со сценарием для создания задачи типа
`ModuleDevelopment`.

1. **Инициация сценария:**
   ```bat
   main-work.bat -Mode RunScenario -ScenarioId SCN-CreateTask
   ```

2. **Ввод типа задачи:** Система запросит тип создаваемой задачи.
    * Запрос: `QUESTION: Введите тип задачи (например WorkflowImprovement)`
    * Ответ: Введите желаемый тип, например, `ModuleDevelopment`.
      ```bat
      main-work.bat -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue ModuleDevelopment
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
      ```bat
      main-work.bat -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue yes
      ```

6. **Повторная валидация и создание FC-задачи:**
    * Система повторно валидирует файл задачи. Если все плейсхолдеры заменены, валидация пройдет успешно.
    * Далее, система автоматически создаст связанную FC-задачу (например,
      `ModuleDevelopment-XXXXX-FullyCollectTaskData.json`).

7. **Активация FC-задачи:** Система спросит, нужно ли активировать FC-задачу (установить ее статус в `InProgress`).
    * Запрос:
      `QUESTION: Введите 'yes' для установки статуса задачи ...ModuleDevelopment-XXXXX-FullyCollectTaskData.json в 'InProgress'`
    * Ответ: `yes`
      ```bat
      main-work.bat -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue yes
      ```

8. **Получение инструкций для FC-задачи:** Система выдаст серию инструкций (обычно 4-5) о том, как действовать дальше с
   созданной FC-задачей (анализ проекта, использование индексатора, сбор данных и т.д.). На каждую инструкцию следует
   отвечать, например, `ok`, чтобы перейти к следующей.
   ```bat
   # Пример ответа на одну из инструкций
   main-work.bat -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue ok
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
