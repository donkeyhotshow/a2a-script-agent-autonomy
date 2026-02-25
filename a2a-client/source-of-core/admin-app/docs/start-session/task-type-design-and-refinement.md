Здравствуйте. Эта сессия предназначена для проектирования, улучшения и дообучения определений типов задач (Task Types) в
системе.

**Ваша цель — не просто создать или модифицировать Task Type, а на каждом шаге:**

- Глубоко анализировать существующие типы задач, их шаблоны (`*.template.json`) и файлы метаданных (
  `*.task_type_data.json`).
- Понимать, как Task Types определяют структуру, поведение и контекст для задач, и как они интегрируются со сценариями и
  гайдами.
- Планировать новые Task Types или улучшения с учётом чёткого определения `customFields`, связей со
  стандартами/сценариями, и полезных встроенных `prompts` для исполнителей.
- Фиксировать lessons-learned, новые паттерны проектирования Task Types, и решения в changelog/lessons-learned и/или
  отдельном гайде по Task Types.
- Обновлять стандарты (например, `task_type_data.schema.json`, если необходимо) и документацию по Task Types.

---

# Scan-Plan-Refine-LEARN: Живой цикл развития Определений Типов Задач

## 1. Scan (Анализ существующих Task Types и их использования)

- Изучи директорию [mdc:script/engine/task_types/] – выбери несколько Task Types для детального анализа (например,
  `JsonModuleDeepCheck`, `Refactoring`, `Generic`).
- Для каждого анализируемого Task Type, изучи его:
    - `*.template.json`: поля по умолчанию, плейсхолдеры, `customFields`, `linkedFiles`, `guidanceNotes`.
    - `*.task_type_data.json`: `taskTypeId`, `relevantStandards`, `relevantGuides`, `commonScenarios`,
      `typeSpecificData` (особенно `customFieldsDefinition`), и встроенные `prompts`.
- Проанализируй схему `task_type_data.schema.json` ([mdc:script/engine/schemas/task_type_data.schema.json]), чтобы
  понять все возможные поля и их назначение в `*.task_type_data.json`.
- Исследуй, как сценарии (например,
  `SCN-GenerateTaskType` [mdc:script/engine/scenarios/SCN-GenerateTaskType.scenario.json], если он существует и
  используется для этого) создают экземпляры задач на основе этих шаблонов.
- Пойми, как `main-work.ps1` [mdc:main-work.ps1] или другие сценарии могут использовать информацию из
  `*.task_type_data.json` при обработке задач определённого типа (например, для выбора релевантных сценариев или
  гайдов).

## 2. Plan (Планирование нового Task Type или улучшения существующего)

- **Определение Цели:** Чётко сформулируй, какую новую категорию задач будет представлять новый Task Type, или какие
  проблемы решает улучшение существующего.
- **Проектирование `*.template.json`:**
    - Определи стандартные поля (`title`, `description`, `goal`, `keywords`, `acceptanceCriteria`, `status`,
      `priority`). Используй плейсхолдеры для динамических данных.
    - Спроектируй `customFields`, необходимые для этого типа задач.
    - Определи `linkedFiles`, которые должны быть по умолчанию связаны с задачами этого типа.
    - Напиши полезные `guidanceNotes` для пользователей/AI, которые будут выполнять задачи этого типа.
- **Проектирование `*.task_type_data.json`:**
    - Определи `taskTypeId`, `title`, `description`.
    - Подбери `relevantStandards`, `relevantGuides`, `commonScenarios`.
    - Детально опиши каждый `customField` в `typeSpecificData.customFieldsDefinition` (name, type, description,
      required).
    - Разработай информативные встроенные `prompts` (например, `internalAnalysisPrompt`, `planningPrompt`), которые
      помогут AI или пользователю при работе с задачами этого типа.
- **План Интеграции:**
    - Как задачи этого типа будут создаваться? (например, обновление `SCN-GenerateTaskType` или создание нового сценария
      генерации).
    - Как они будут обрабатываться? Какие сценарии будут с ними работать?

## 3. Refine-LEARN (Реализация, тестирование, фиксация знаний)

- Создай или обнови файлы `*.template.json` и `*.task_type_data.json`.
- Убедись, что `*.task_type_data.json` соответствует схеме `task_type_data.schema.json`.
- **Тестирование:**
    - Протестируй создание задач нового/обновлённого типа. Проверь, что все поля из шаблона корректно заполняются.
    - Протестируй обработку задач этого типа: как используются `customFields`, `guidanceNotes`, встроенные `prompts` из
      `task_type_data.json`.
    - Убедись, что `linkedFiles` и `commonScenarios` релевантны и полезны.
- **Документирование и Lessons Learned:**
    - Задокументируй новый/обновлённый Task Type: его назначение, структуру, кастомные поля, как его использовать.
    - Зафиксируй в `lessons-learned.md` ([/docs/development/lessons-learned.md]) или в специальном гайде по Task
      Types все открытия, сложности, и best practices, выявленные в ходе работы.
    - Если в ходе работы возникли идеи по улучшению `task_type_data.schema.json` или общих стандартов по Task Types,
      зафиксируй их.

---

# Ключевые ресурсы и стандарты для работы с Task Types

- **Существующие Task Types:** [mdc:script/engine/task_types/]
- **Схема для `task_type_data.json`:** [mdc:script/engine/schemas/task_type_data.schema.json]
- **Пример сценария генерации (если есть):**
  `SCN-GenerateTaskType` ([mdc:script/engine/scenarios/SCN-GenerateTaskType.scenario.json])
- **Общие стандарты задач:** [mdc:script/docs/standards/task-manager/task-definition-standard.json]
- **Гайд по Task Types (если есть):** [/docs/guides/task-types/README.md] (если отсутствует — зафиксируй
  lessons-learned и оформи задачу на его создание)

---

# Типовые сложности и lessons-learned при работе с Task Types

- Недоопределение или переопределение `customFields` (слишком много или слишком мало специфичных полей).
- Неясные или бесполезные `guidanceNotes` в шаблоне или встроенные `prompts` в `task_type_data.json`.
- Несоответствие между `customFields` в `*.template.json` и их описанием в `customFieldsDefinition` в
  `*.task_type_data.json`.
- Отсутствие или нерелевантность `relevantGuides` или `commonScenarios`.
- Сложности с автоматической генерацией задач этого типа, если не продуман сценарий генерации.
- `*.task_type_data.json` не соответствует схеме `task_type_data.schema.json`.
- *(Добавляй новые lessons-learned по мере появления!)*

---

# Интеграция новых знаний и best practices

- После каждого цикла работы над Task Type:
    - Обнови `lessons-learned.md` или отдельный гайд по Task Types.
    - Зафиксируй новые паттерны проектирования Task Types, best practices, и типовые ошибки.
    - Если выявлены пробелы в документации по Task Types или в схеме `task_type_data.schema.json`, оформи предложения
      или задачу на их доработку.
    - Проверь, что созданный/обновлённый Task Type хорошо документирован и может служить примером.

---

**Веди changelog и lessons-learned по Task Types непрерывно!**

**Этот промт — ваш инструмент для создания и улучшения Определений Типов Задач, ключевого элемента гибкости и
управляемости системы!**

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
