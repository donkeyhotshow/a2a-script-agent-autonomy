# ВАЖНО: PowerShell-скрипты (.ps1) утилизированы. Используйте только .bat и .php!

I will provide you with a structured prompt that you can use to initiate a new session with a more comprehensive system
exploration approach. This prompt is designed to guide the AI to gather essential context using the Scan-Plan-Refine
methodology based on the project's structure and standards, and then to actively manage tasks and scenarios.

Here is the prompt for initiating a new session:

<user_query>
Hello. Please act as an autonomous AI executor for the AI Task System based on the Scan-Plan-Refine methodology.

Your **primary goal is to manage and execute tasks and scenarios within this system, utilizing the available tools and
scripts (`main-work.bat`, `main.bat`, `main-index.bat`) as a human operator would.**

Follow these steps:

1. **Scan & Understand Core Mechanisms:** Systematically explore the key directories and files of the AI Task System to
   build a foundational understanding. **Focus not just on structure, but on *how* components interact.**
    * `script/engine/`:
        * `task_definitions/`: Examine a few sample task JSONs (e.g., a generic task, a task involving data collection).
        * `task_types/`: Look at a `*.task_type_data.json` and its corresponding `*.template.json`.
        * `scenarios/`: **Analyze key scenarios like `SCN-ActivateTask.scenario.json`,
          `SCN-IndexCollectTaskData.scenario.json` (or its equivalent for full data collection), and
          `SCN-CloseTask.scenario.json`. Understand their steps, context variables, and invoked actions. *Pay attention
          to how `context` variables are passed and modified through steps, and how `nextStepId` (
          or `onSuccess`/`onError`) directs flow.* **
        * `markers/`: Note the naming convention and structure of progress marker files. *Understand that marker files
          are the primary state persistence mechanism for scenario instances.*
    * `script/docs/standards/`: Identify key operational standards, especially:
        * `task-manager/task-definition-standard.json`
        * `ai-agent/operational-principles.json`
        * `ai-agent/question-to-user-standard.json`
        * `scenario-engine/scenario-standard.json`
        * **`ai-task-system-operation-standard.md` (if available, or similar documents outlining system operation).**
        * *Also scan `script/docs/processes/` for any documented operational workflows (e.g., related to task lifecycle,
          data handling, or error resolution) that complement the standards.*
    * Core Scripts:
        * `main.bat`: Understand its role as a general dashboard/module runner.
        * `main-work.bat` (and `script/main-work-dispatch.bat` if it's the active one): **Deeply analyze its modes**
        * `invoke-scenario-engine.php`: **Understand its argument parsing, marker loading/saving logic, step execution
          loop (Question, Action, QueryIndex, End), context management, and how it returns structured data to
          PowerShell. *Focus on how it determines the `markerContextIdentifier` (e.g., from `taskId` or 'default'),
          manages the `context` array (merging, updating), and how different step
          types (`processActionStep`, `processQueryIndexStep`, `processQuestionStep`) are dispatched and contribute to
          the overall scenario outcome and context modification. Note the structure of the JSON output it provides to
          PowerShell.* **
        * `main-index.bat`: Understand its query capabilities and output format. *Note how it constructs arguments
          for `script/engine/index/index-processor.php` and what output formats it supports. Understand the purpose of
          its different modes (e.g., `query-keywords`, `get-metadata`).*
    * `script/engine/state/system.state.json`: Understand its role in storing the `activeTask`.
    * `script/includes/`: Check for key helper scripts like `logging.ps1`, `PhpInterop.ps1`.
    * ***Control & Data Flow:** Map out the typical flow of control and data between PowerShell
      scripts (`main-work.bat`, `main-index.bat`) and the PHP
      engine (`invoke-scenario-engine.php`, `index-processor.php`). Understand how arguments, context, and results are
      passed back and forth (e.g., command-line arguments, JSON strings, Base64 encoded context).*

2. **Plan for Task Execution:** Based on the scan, formulate a detailed plan for how you will **autonomously manage a
   typical task lifecycle**:
    * **Task Activation:** How to identify a task ID (e.g., from a list, user request, or as a dependency) and **execute
      the command to run `SCN-ActivateTask` via `main-work.bat`, providing necessary inputs and verifying the update to
      `system.state.json`. *Ensure the `taskId` provided to `SCN-ActivateTask` is valid and exists
      in `task_definitions/`.* **
    * **Data Collection (if applicable):** How to determine the `taskQuery` (e.g., from `taskDefinition.json` ->
      `linkedFiles`, `keywords`, or task type specific logic),
      ***construct it correctly as per `main-index.bat` or `SCN-IndexCollectTaskData` input requirements (e.g., JSON
      payload if `main-index.bat` is called directly by a step, or specific context variables
      if `SCN-IndexCollectTaskData` is used)***, **execute the command for `SCN-IndexCollectTaskData` (or equivalent
      full collection scenario) via `main-work.bat`, and understand where `taskIndexResults` are stored/merged. *Verify
      that `projectRoot` is correctly passed if the data collection involves file system access or index queries
      spanning the project.* **
    * **Scenario Progression:** How to interpret `HaltedForInput` status from `main-work.bat`, extract the
      `questionToDisplay`, and **formulate the next `main-work.bat` command with `-UserInputValue` to continue the
      scenario. *Understand that `-UserInputValue` is crucial for `Question` steps and that the AI must provide the
      exact input expected by the scenario logic.* **
    * **Action Execution:** Understand that `Action` steps in scenarios will trigger PowerShell or PHP scripts, and
      their success/failure impacts scenario flow.
    * **Using Markers:** How to check marker status via `main-work.bat` (if a direct "show marker" mode exists) or by
      inferring from `RunScenario` behavior with and without `-ResetProgress`. **Understand that markers are primarily
      managed by `invoke-scenario-engine.php`. *Recognize when it might be appropriate to use `-ResetProgress`
      with `main-work.bat -Mode RunScenario` (e.g., to restart a failed scenario from the beginning, or if a scenario is
      designed to be idempotent and always run fresh, like some data collection scenarios). Base this decision on
      scenario design and task requirements, not arbitrary retries.* **
    * **Task Closure:** How to **execute the command for `SCN-CloseTask` via `main-work.bat` for a compleated task.**
    * **Error Handling:** How to interpret error statuses and messages from `main-work.bat` /
      `invoke-scenario-engine.php` and decide on next steps (e.g., retry, ask user, log error).
      *Consult `script/docs/standards/ai-agent/iterative-debugging-standard.json` or similar if facing persistent
      errors. Log errors encountered and decisions made for retries or escalations.*
    * **Tool Usage:** Clearly state which script (`main-work.bat`, `main-index.bat`) and mode you will use for each part
      of the lifecycle. *When planning commands, explicitly state the full `pwsh -File ./main-work.bat ...`
      or `pwsh -File ./main-index.bat ...` command structure with all necessary parameters and their intended values.
      Adhere to the `no-cat-in-pwsh` rule for any generated PowerShell commands.*
    * ***Adherence to System Workflow:** Ensure your planned actions align with the overall system workflows described
      in `script-workflow` (or `ai-task-system-operation-standard.md`) and any relevant documents
      in `script/docs/processes/`.*
    * ***Fact-Based Operations:** All decisions and actions must be based on information verifiable from the system's
      state, files, outputs, and documented standards/processes (see `fact-based-operations-rule`).*

3. **Refine & Execute:**
    * Outline how you will refine your understanding based on actual execution results. *This includes verifying the
      actual outcomes of your commands (e.g., checking for file creation/modification, updated marker status, changes
      in `system.state.json`).*
    * **State your readiness to pick a sample task (or ask the user for one) and attempt to drive it through its
      lifecycle using the tools and commands you've planned.**
    * **Propose a simple first task to manage, for example, activating an existing task or running a data collection
      scenario for a known task.**
    * ***Proactive Verification:** Before executing a step that modifies state or files, if unsure, consider a 'dry-run'
      thought process or use a read-only command to confirm prerequisites.*
    * ***Logging Intent and Actions:** For complex multi-step operations, briefly log your intent before executing a
      series of commands and summarize the outcome, aiding in traceability.*

Present your findings from the scan and your detailed execution plan. Explicitly reference the files, directories, and *
*specific commands** you intend to use (using `mdc:` for files/dirs).
</user_query>

# Пример использования сценария `SCN-CreateTask`

Сценарий `SCN-CreateTask` автоматизирует процесс создания новой задачи и связанной с ней задачи типа "FullyCollectTaskData" (FC Task). Ниже приведен пошаговый пример взаимодействия со сценарием для создания задачи типа `ModuleDevelopment`.

1.  **Инициация сценария:**
    ```bat
    main-work.bat -Mode RunScenario -ScenarioId SCN-CreateTask
    ```

2.  **Ввод типа задачи:** Система запросит тип создаваемой задачи.
    *   Запрос: `QUESTION: Введите тип задачи (например WorkflowImprovement)`
    *   Ответ: Введите желаемый тип, например, `ModuleDevelopment`.
        ```bat
        main-work.bat -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue ModuleDevelopment
        ```

3.  **Создание и валидация файла задачи:**
    *   Система скопирует соответствующий шаблон (например, `script/engine/task_types/ModuleDevelopment/ModuleDevelopment.template.json`) в новый файл определения задачи (например, `script/engine/task_definitions/ModuleDevelopment-XXXXX.json`).
    *   Далее, система попытается валидировать этот файл. Если в шаблоне есть плейсхолдеры, валидация сообщит об этом.

4.  **Редактирование файла задачи:** Система предложит отредактировать созданный файл.
    *   Запрос: `QUESTION: The task file C:\apps\admin-app\script\engine\task_definitions\ModuleDevelopment-XXXXX.json contains placeholder text. Please edit the file to fill in the details...`
    *   Действие: Откройте указанный `.json` файл и заполните все плейсхолдеры актуальными данными для вашей задачи.

5.  **Подтверждение редактирования:** После сохранения изменений, система спросит, завершено ли редактирование.
    *   Запрос: `QUESTION: Have you finished editing the ModuleDevelopment task file ...? Enter 'yes' to re-validate.`
    *   Ответ: `yes`
        ```bat
        main-work.bat -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue yes
        ```

6.  **Повторная валидация и создание FC-задачи:**
    *   Система повторно валидирует файл задачи. Если все плейсхолдеры заменены, валидация пройдет успешно.
    *   Далее, система автоматически создаст связанную FC-задачу (например, `ModuleDevelopment-XXXXX-FullyCollectTaskData.json`).

7.  **Активация FC-задачи:** Система спросит, нужно ли активировать FC-задачу (установить ее статус в `InProgress`).
    *   Запрос: `QUESTION: Введите 'yes' для установки статуса задачи ...ModuleDevelopment-XXXXX-FullyCollectTaskData.json в 'InProgress'`
    *   Ответ: `yes`
        ```bat
        main-work.bat -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue yes
        ```

8.  **Получение инструкций для FC-задачи:** Система выдаст серию инструкций (обычно 4-5) о том, как действовать дальше с созданной FC-задачей (анализ проекта, использование индексатора, сбор данных и т.д.). На каждую инструкцию следует отвечать, например, `ok`, чтобы перейти к следующей.
    ```bat
    # Пример ответа на одну из инструкций
    main-work.bat -Mode RunScenario -ScenarioId SCN-CreateTask -UserInputValue ok
    ```

9.  **Завершение FC-задачи и активация основной задачи:**
    *   После подтверждения всех инструкций, система автоматически:
        *   Установит статус FC-задачи в `Completed` и переместит ее файл в директорию `script/engine/task_definitions/completed/`.
        *   Установит статус основной задачи (например, `ModuleDevelopment-XXXXX`) в `InProgress`.
        *   Обновит глобальный параметр `activeTask` на ID основной задачи.

10. **Завершение сценария `SCN-CreateTask`:**
    *   Сценарий `SCN-CreateTask` завершится со статусом `Completed`.
    *   Сообщение: `Scenario finished with status: Completed`

После этого основная задача создана, активирована, и можно приступать к ее выполнению, начиная с шагов, описанных в FC-задаче (сбор данных, анализ и т.д.), используя сценарий `SCN-FullyCollectTaskData`.

---

**Используй этот файл как практическое руководство для превращения нерабочих модулей в рабочие и постоянного развития стандартов!**
