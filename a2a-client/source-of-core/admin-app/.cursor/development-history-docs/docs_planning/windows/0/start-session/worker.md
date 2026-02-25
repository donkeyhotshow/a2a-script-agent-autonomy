I will provide you with a structured prompt that you can use to initiate a new session with a more comprehensive system
exploration approach. This prompt is designed to guide the AI to gather essential context using the Scan-Plan-Refine
methodology based on the project's structure and standards, and then to actively manage tasks and scenarios.

Here is the prompt for initiating a new session:

<user_query>
Hello. Please act as an autonomous AI executor for the AI Task System based on the Scan-Plan-Refine methodology.

Your **primary goal is to manage and execute tasks and scenarios within this system, utilizing the available tools and
scripts (`main-work.ps1`, `main.ps1`, `main-index.ps1`) as a human operator would.**

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
        * `main.ps1`: Understand its role as a general dashboard/module runner.
        * `main-work.ps1` (and `script/main-work-dispatch.ps1` if it's the active one): **Deeply analyze its modes (
          `RunScenario`, `ShowTask`, `ResetScenario`), how it constructs arguments for and invokes
          `invoke-scenario-engine.php`, and how it processes results (status, context updates, interaction with
          `system.state.json`). *Specifically note helper functions used to prepare arguments for PHP (
          e.g., `New-PhpScenarioArgs` or similar) and how `Invoke-ScenarioEngine` (or direct PHP calls) are made and
          their JSON results parsed. Understand how it uses `Get-ScenarioProgress` and `Save-SystemState`.* **
        * `invoke-scenario-engine.php`: **Understand its argument parsing, marker loading/saving logic, step execution
          loop (Question, Action, QueryIndex, End), context management, and how it returns structured data to
          PowerShell. *Focus on how it determines the `markerContextIdentifier` (e.g., from `taskId` or 'default'),
          manages the `context` array (merging, updating), and how different step
          types (`processActionStep`, `processQueryIndexStep`, `processQuestionStep`) are dispatched and contribute to
          the overall scenario outcome and context modification. Note the structure of the JSON output it provides to
          PowerShell.* **
        * `main-index.ps1`: Understand its query capabilities and output format. *Note how it constructs arguments
          for `script/engine/index/index-processor.php` and what output formats it supports. Understand the purpose of
          its different modes (e.g., `query-keywords`, `get-metadata`).*
    * `script/engine/state/system.state.json`: Understand its role in storing the `activeTask`.
    * `script/includes/`: Check for key helper scripts like `logging.ps1`, `PhpInterop.ps1`.
    * ***Control & Data Flow:** Map out the typical flow of control and data between PowerShell
      scripts (`main-work.ps1`, `main-index.ps1`) and the PHP
      engine (`invoke-scenario-engine.php`, `index-processor.php`). Understand how arguments, context, and results are
      passed back and forth (e.g., command-line arguments, JSON strings, Base64 encoded context).*

2. **Plan for Task Execution:** Based on the scan, formulate a detailed plan for how you will **autonomously manage a
   typical task lifecycle**:
    * **Task Activation:** How to identify a task ID (e.g., from a list, user request, or as a dependency) and **execute
      the command to run `SCN-ActivateTask` via `main-work.ps1`, providing necessary inputs and verifying the update to
      `system.state.json`. *Ensure the `taskId` provided to `SCN-ActivateTask` is valid and exists
      in `task_definitions/`.* **
    * **Data Collection (if applicable):** How to determine the `taskQuery` (e.g., from `taskDefinition.json` ->
      `linkedFiles`, `keywords`, or task type specific logic),
      ***construct it correctly as per `main-index.ps1` or `SCN-IndexCollectTaskData` input requirements (e.g., JSON
      payload if `main-index.ps1` is called directly by a step, or specific context variables
      if `SCN-IndexCollectTaskData` is used)***, **execute the command for `SCN-IndexCollectTaskData` (or equivalent
      full collection scenario) via `main-work.ps1`, and understand where `taskIndexResults` are stored/merged. *Verify
      that `projectRoot` is correctly passed if the data collection involves file system access or index queries
      spanning the project.* **
    * **Scenario Progression:** How to interpret `HaltedForInput` status from `main-work.ps1`, extract the
      `questionToDisplay`, and **formulate the next `main-work.ps1` command with `-UserInputValue` to continue the
      scenario. *Understand that `-UserInputValue` is crucial for `Question` steps and that the AI must provide the
      exact input expected by the scenario logic.* **
    * **Action Execution:** Understand that `Action` steps in scenarios will trigger PowerShell or PHP scripts, and
      their success/failure impacts scenario flow.
    * **Using Markers:** How to check marker status via `main-work.ps1` (if a direct "show marker" mode exists) or by
      inferring from `RunScenario` behavior with and without `-ResetProgress`. **Understand that markers are primarily
      managed by `invoke-scenario-engine.php`. *Recognize when it might be appropriate to use `-ResetProgress`
      with `main-work.ps1 -Mode RunScenario` (e.g., to restart a failed scenario from the beginning, or if a scenario is
      designed to be idempotent and always run fresh, like some data collection scenarios). Base this decision on
      scenario design and task requirements, not arbitrary retries.* **
    * **Task Closure:** How to **execute the command for `SCN-CloseTask` via `main-work.ps1` for a completed task.**
    * **Error Handling:** How to interpret error statuses and messages from `main-work.ps1` /
      `invoke-scenario-engine.php` and decide on next steps (e.g., retry, ask user, log error).
      *Consult `script/docs/standards/ai-agent/iterative-debugging-standard.json` or similar if facing persistent
      errors. Log errors encountered and decisions made for retries or escalations.*
    * **Tool Usage:** Clearly state which script (`main-work.ps1`, `main-index.ps1`) and mode you will use for each part
      of the lifecycle. *When planning commands, explicitly state the full `pwsh -File ./main-work.ps1 ...`
      or `pwsh -File ./main-index.ps1 ...` command structure with all necessary parameters and their intended values.
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

```
