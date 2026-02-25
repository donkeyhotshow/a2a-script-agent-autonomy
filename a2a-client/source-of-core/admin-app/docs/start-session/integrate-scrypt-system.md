# ВАЖНО: PowerShell-скрипты (.ps1) утилизированы. Используйте только .bat и .php!

Все примеры команд ниже обновлены: используйте main-work.bat, main-index.bat и main.bat вместо .ps1.

I will provide you with a structured prompt that you can use to initiate a new session with a more comprehensive system
exploration approach. This prompt is designed to guide the AI to gather essential context using the Scan-Plan-Refine
methodology based on the project's structure and standards.

Here is the prompt for initiating a new session:

```plaintext
<user_query>
Hello. Please act as an autonomous AI executor for the AI Task System based on the Scan-Plan-Refine methodology.

Your first task in this new session is to perform an initial system scan and context gathering. Use the available tools to explore the project based on the provided project layout and the core components of the AI Task System.

Follow these steps:

1.  **Scan:** Systematically explore the key directories and files of the AI Task System to build a foundational understanding of its structure and contents. Focus on:
    *   **Core Scripts**: `main.bat` (mdc:main.bat), `main-work.bat` (mdc:main-work.bat), `main-index.bat` (mdc:main-index.bat).
    *   **Engine Directory (`C:\apps\app-manager\engine/`)**:
        *   `actions/powershell/` (mdc:C:\apps\app-manager\engine/actions/powershell): For reusable PowerShell actions (устарело, только для истории).
        *   `task_definitions/` (mdc:C:\apps\app-manager\engine/task_definitions): For individual task instances.
        *   `task_types/` (mdc:C:\apps\app-manager\engine/task_types): For task templates and type-specific configurations.
        *   `scenarios/` (mdc:C:\apps\app-manager\engine/scenarios): For workflow automation definitions.
        *   `markers/` (mdc:engine/markers): For scenario progress tracking.
        *   `state/` (mdc:C:\apps\app-manager\engine/state): For system-wide state like `system.state.json` (mdc:C:\apps\app-manager\engine/state/system.state.json) holding `publishedTaskId`.
        *   `compleated/` (mdc:C:\apps\app-manager\engine/compleated): For archived compleated task files.
        *   PHP engine components like `invoke-scenario-engine.php` (mdc:C:\apps\app-manager\engine/invoke-scenario-engine.php) and files in `partials/` (mdc:C:\apps\app-manager\engine/partials) that implement scenario execution.
    *   **Documentation and Standards (`script/docs/`)**:
        *   `standards/` (mdc:script/docs/standards): Key operational, data structure, and development standards.
        *   General documentation relevant to system operation and architecture.
    *   **Index System**:
        *   `index/` (mdc:index): Understand the structure of indexed data.
        *   How `main-index.bat` (mdc:main-index.bat) is used for querying this data.
    *   `install-modules/` (mdc:install-modules): Structure of installable modules.
    *   `resources/` (mdc:resources): Structure of resources including backend, common, and frontend.
    *   Other relevant directories identified in the project layout.
    *   Specifically examine files like `main.bat`, `main-work.bat`, `invoke-scenario-engine.php`, and the core standards JSON files.

2.  **Plan:** Based on the scanned information, formulate a detailed plan for how you would approach a typical task lifecycle within this system, considering:
    *   **Core Script Usage**: How `main.bat` (mdc:main.bat), `main-work.bat` (mdc:main-work.bat), and `main-index.bat` (mdc:main-index.bat) are used to list, manage, execute, and gather information for tasks.
    *   **Task Identification**: How to identify the relevant task definition (e.g., in `C:\apps\app-manager\engine/task_definitions/` (mdc:C:\apps\app-manager\engine/task_definitions)) and its corresponding task type (in `C:\apps\app-manager\engine/task_types/` (mdc:C:\apps\app-manager\engine/task_types)).
    *   **Published Task Concept**: Understanding the `publishedTaskId` in `C:\apps\app-manager\engine/state/system.state.json` (mdc:C:\apps\app-manager\engine/state/system.state.json) and how it's managed by `SCN-PublishTask.scenario.json` (mdc:C:\apps\app-manager\engine/scenarios/SCN-PublishTask.scenario.json) and `SCN-UnpublishTask.scenario.json` (mdc:C:\apps\app-manager\engine/scenarios/SCN-UnpublishTask.scenario.json).
    *   **Task Workflow Execution**:
        *   How to use scenarios (e.g., `SCN-ActivateTask.scenario.json` (mdc:C:\apps\app-manager\engine/scenarios/SCN-ActivateTask.scenario.json) to set status to "InProgress", `SCN-CloseTask.scenario.json` (mdc:C:\apps\app-manager\engine/scenarios/SCN-CloseTask.scenario.json) for completion and archiving) via `main-work.bat` (mdc:main-work.bat).
        *   The role of PowerShell actions in `C:\apps\app-manager\engine/actions/powershell/` (mdc:C:\apps\app-manager\engine/actions/powershell) — устарело, только для истории.
        *   The significance of task statuses (e.g., "Planned", "InProgress", "Completed") and how they are updated in task JSON files.
        *   The process of archiving compleated tasks to `C:\apps\app-manager\engine/compleated/` (mdc:C:\apps\app-manager\engine/compleated).
    *   **Information Gathering**: Locating applicable standards (mdc:script/docs/standards), existing scenarios (mdc:C:\apps\app-manager\engine/scenarios), and project documentation.
    *   **Progress Tracking**: How progress markers in `engine/markers/` (mdc:engine/markers) are used by the scenario engine.
    *   **Inter-component Relationships**: How different components (core scripts, BAT-обёртки, PHP engine, scenarios, task definitions, task types, standards, state files) interrelate to form the complete system.

3.  **Refine:** Outline how you would refine your understanding and plan based on new information or unexpected issues encountered during task execution.

Present your findings from the scan and your proposed plan for handling tasks in this system. Explicitly reference the files and directories you explore using the `mdc:` format where appropriate.
```

This prompt provides a clear instruction for the AI to start by scanning the system using the provided structure and
then develop a plan, incorporating the Scan-Plan-Refine approach and referencing key system components. It should help
in establishing a solid understanding early in the session.

# Пример использования сценария `SCN-CreateTask`

Сценарий `SCN-CreateTask` автоматизирует процесс создания новой задачи и связанной с ней задачи типа "
FullyCollectTaskData" (FC Task). Ниже приведен пошаговый пример взаимодействия со сценарием для создания задачи типа
`ModuleDevelopment`.

ключевые игроки которые добавлены в PATH :
C:\apps\bin\main-index.bat
C:\apps\bin\main-work.bat
C:\apps\bin\main.bat

1. **Инициация сценария:**
   ```bat
   main-work.bat -Mode RunScenario -ScenarioId SCN-CreateTask
   ```
 пипец сколько поменялось , что прийдется новый файл делать, в процессте реинтеграции сценарного движка 


10. **Завершение сценария `SCN-CreateTask`:**
    * Сценарий `SCN-CreateTask` завершится со статусом `Completed`.
    * Сообщение: `Scenario finished with status: Completed`

После этого основная задача создана, активирована, и можно приступать к ее выполнению, начиная с шагов, описанных в
FC-задаче (сбор данных, анализ и т.д.), используя сценарий `SCN-FullyCollectTaskData`.

---

**Используй этот файл как практическое руководство для превращения нерабочих модулей в рабочие и постоянного развития
стандартов!**
