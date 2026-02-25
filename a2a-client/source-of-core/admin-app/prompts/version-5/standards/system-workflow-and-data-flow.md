# System Workflow and Data Flow Standard (Draft v5)

This document outlines the high-level architecture and the primary chains of cause and effect within the system, based on facts documented in other version 5 standards.

## 1. Key Components

-   **User Interface (UI):** Files defining the visual elements and user interactions (Pages, Sections, Templates). Structured using components from `component-map.json` and standard HTML tags (see `template-schema.md` for list), with properties (`props`), children, model binding (`model`) which interacts with `hub.formManager` on the client, and dynamic rendering. (See `component-structure.md`, `elements-v1.md`)
-   **Client Actions:** Logic executed directly in the browser, often triggered by user interaction via `customHooks`. Processed by `hub.actionManager`. The primary role discussed in standards is triggering server-side logic using the `sendData` action. Client actions can also interact with other client-side managers like `hub.formManager` (for data retrieval/updates) and `hub.toastManager` (for notifications). (See `component-structure.md`, `module-actions.md`, `managers.md`)
-   **Server Actions (Instructions):** Files defining sequential server-side logic for data manipulation, calls to external systems (implicitly via `call` targets), and state management. Structured as arrays of instruction objects with actions (`update`, `save`, `call`, `for`, `return`, etc.), addresses (`buffer:`, `input:`, `output:`, `file!`, `models:`), conditions, and batches. Executed by the `InstructionProcessor`. (See `instruction-file-standard.md`, `server-actions-reference.md`)
-   **DataHub / Storage:** The in-memory and persistent storage layer accessed by Instructions via addresses. `buffer:` is volatile, `file!` and `models:` are persistable via the `save` action. (`buffer:`, `input:`, `output:` are resolved by `DataHub::resolveInstruction`; `file!` and `models:` interact with persistent storage layers). (See `instruction-file-standard.md`, `low-level-storage.md`, `server-actions-reference.md`)
-   **StepResponse:** The object returned by the server after executing Instructions. Contains data (`$data` populated by `output:`), history (`$history`), status (`$status`), and halt flags (`$halt`). Processed by the frontend (likely `hub.actionManager` or related logic) to update UI or trigger further actions, including displaying validation errors (from `buffer:validationErrors` sent via `output:`), processing `output:commands`, and potentially handling `$history` and `$sessionData` via logging or notification managers. (See `instruction-file-standard.md`, `server-actions-reference.md`, `managers.md`)
-   **Scenarios:** Orchestrate sequences of steps, which may include executing Instructions files. (Implicit role based on file names like `execute-main-work-scenario.json`, `reset-main-work-scenario.json`, `SCN-...scenario.json` examples)

## 2. Workflow: From UI Interaction to Server Response

This chain describes how user actions in the UI lead to server-side processing and a response back to the UI. (Sources: `instruction-file-standard.md`, `component-structure.md`, `ui-documentation.md`, `server-actions-reference.md`, `template-schema.md`, `rendering-pipeline.md`, `elements-v1.md`, `managers.md`)

1.  **User Interaction:** A user performs an action in the UI (e.g., clicks a button, submits a form).
2.  **Client Action Trigger:** A `customHook` in the relevant UI component captures the interaction (e.g., `click` hook on a button). Client actions are processed by `hub.actionManager`. (See `managers.md`)
3.  **`sendData` Call:** The `customHook` executes the `sendData` client action (processed by `hub.actionManager`). This action collects relevant data (e.g., form data bound by `model`, retrieved via `hub.formManager`, additional `payload`) and prepares a request to the server. (See `ui-documentation.md`, `managers.md`, `elements-v1.md`)
4.  **Server Action Invocation:** The `sendData` request is received by the server. The `data.action` (or `data.sendTo`) field within the `sendData` payload specifies the target Instructions file or server endpoint to execute. The server-side `InstructionProcessor` is responsible for loading and executing this file. (See `ui-documentation.md`, `instruction-file-standard.md`)
5.  **Instructions Execution:** The specified Instructions file is loaded and executed sequentially on the server by the `InstructionProcessor`. (See `instruction-file-standard.md`)
6.  **Data Manipulation:** Instructions modify data within the `DataHub` using actions like `update`, `add`, `remove`. Input data from `sendData` is available via the `input:` prefix. (See `instruction-file-standard.md`, `server-actions-reference.md`)
7.  **Conditional Logic and Flow Control:** `condition` fields determine which instructions are executed. `for` loops iterate over data to apply instructions. `call` executes other Instructions files. (See `instruction-file-standard.md`, `server-actions-reference.md`)
8.  **Persistence:** The `save` action is used to explicitly write changes from in-memory storage (`update` to `file!`/`models:`) to persistent storage (files, database). The `remove` action also includes saving changes to persistent storage after removal. (See `low-level-storage.md`, `server-actions-reference.md`)
9.  **Validation:** Validation logic, now often implemented as Instructions (see `validation-conversion-logic.md`), is executed. Instructions use `condition` and `batch` to set validation flags (`buffer:validationFailed`) and error messages (`buffer:validationErrors`). Results are stored in the `DataHub`. (See `validation-conversion-logic.md`, `instruction-file-standard.md`)
10. **StepResponse Population:** Instructions use the `output:` prefix to place data intended for the frontend into `StepResponse.$data` (including validation errors from `buffer:validationErrors` via `output:`). The `return` action can set the `StepResponse` status and halt execution. (See `instruction-file-standard.md`, `server-actions-reference.md`)
11. **Server Response:** The server returns the `StepResponse` object to the client.
12. **Client-Side Processing:** The frontend receives the `StepResponse`. It reads `$data` and other fields. If `$data` contains a UI update (e.g., via `output:component`, `output:redirect`), the rendering pipeline (`RenderJson` -> `Presets` -> Wrappers) updates the UI based on the new JSON structure. Client-side managers (`hub.actionManager`, `hub.toastManager`, etc.) likely process other aspects of the `StepResponse`, such as executing commands from `output:commands`, displaying notifications based on `output:flash.*` and potentially using `$history` for logging or detailed error displays. (See `rendering-pipeline.md`, `managers.md`, `server-actions-reference.md`)

## 3. Inter-Instruction Communication and Data Flow

-   Instructions can call other Instructions using the `call` action. Data is passed to called instructions **not** via the `args` parameter in `call` (as it is not automatically processed), but by manually preparing the necessary data in a known `buffer:` location before the `call` instruction. The called instructions then read from this buffer. Results from called instructions are merged into the caller's context. (See `instruction-file-standard.md`, `server-actions-reference.md`)
-   Data is the primary means of communication. Instructions read from and write to the `DataHub` using defined addresses. Understanding data paths and their persistence is crucial. (See `instruction-file-standard.md`, `low-level-storage.md`)
-   **Data for Template Rendering:** Data that needs to be available for frontend templates to render (especially if the rendering happens in a separate request or phase from the Instruction execution) **must be saved to persistent storage** (`file!`, `models:`) using the `save` action. `buffer:` data is ephemeral and will not be available for subsequent template rendering requests. (See `server-actions-reference.md`)

## 4. Role of Scenarios

-   Scenarios define higher-level workflows, orchestrating the execution of multiple Instructions files or other system steps in a defined sequence. (Inferred from scenario examples and main-work.ps1's role)
-   Scenario context can influence Instruction execution (e.g., providing `taskId`, `userInputValue` available via `input:` or other addresses).

## 5. Validation Workflow (Specific Chain)

(Source: `validation-conversion-logic.md`, `instruction-file-standard.md`)

1.  Validation logic is defined as a sequence of Instructions.
2.  Typically called by a UI component's `customHooks` (e.g., on form submission) or another Instruction.
3.  Instructions use `condition` fields (mapping original validation rules like `required`, `minLength`) to check input data (`input:...`).
4.  If a condition is met (validation fails), an `update` action within a `batch` sets `buffer:validationFailed` to `true` and adds a specific error message to `buffer:validationErrors`. (See `instruction-file-standard.md` for `batch` and `condition` details)
5.  After all validation instructions, the state of `buffer:validationFailed` determines if validation passed or failed.
6.  The validation results (`buffer:validationFailed`, `buffer:validationErrors`) are typically included in the `StepResponse.$data` (via `output:`) to be consumed by the UI for displaying validation errors. (See `server-actions-reference.md` for `output:` details)

## 6. Key Data Addresses and Persistence

-   `buffer:`: Transient, exists for the duration of a single request/instruction sequence. Used for temporary data, intermediate results, validation state. Changes made to `buffer:` are not automatically saved to persistent storage.
-   `input:`: Read-only, data received from the client via `sendData` or provided by the calling context (e.g., scenario).
-   `output:`: Write-only within Instructions, used to populate `StepResponse.$data` sent back to the client.
-   `file!{path}`: Access files. `update` modifies in-memory representation; `save` is **MANDATORY** to write changes to disk. The `remove` action on a `file!` address also saves the changes to disk.
-   `models/{name}`: Access global models. `update` modifies in-memory; `save` is **MANDATORY** to persist changes to the database. The `remove` action on a `models/` address also persists the changes to the database.
-   `args:`: Intended for reading arguments passed to called instructions, but **not currently functional**. Use `buffer:` for passing arguments via `call`. (See `server-actions-reference.md`)

## 7. Error Handling Chain

1.  Errors during Instruction execution **SHOULD** be caught.
2.  Error details **SHOULD** be logged to `StepResponse.$history`. (Processed on client by logging/notification managers, or for detailed display. Mechanism not fully detailed in current standards). (See `server-actions-reference.md`, `managers.md`)
3.  `StepResponse.$status` **SHOULD** be set to `ERROR`. (See `instruction-file-standard.md`, `server-actions-reference.md`)
4.  `StepResponse.$halt` **SHOULD** be set to `true` to stop further Instructions. (See `instruction-file-standard.md`, `server-actions-reference.md`)
5.  The frontend receives the `StepResponse` with `ERROR` status and history, and can display error information to the user. (See `managers.md`)

## 8. Documenting Context (Requirement)

As per `instruction-file-standard.md`, the analysis of each Instructions file **MUST** include documenting how it is called and how its results are used within the module workflow.

*(This document synthesizes information from: `component-structure.md`, `instruction-file-standard.md`, `low-level-storage.md`, `validation-conversion-logic.md`, `handling-schema-deviations.md`, `server-actions-reference.md`, `ui-documentation.md`, `rendering-pipeline.md`, `module-actions.md`, `managers.md`, `elements-v1.md`, `elements-v2.md`, `template-schema.md`, and observed patterns in scenario/action file names. Always refer to the primary source documents and code for absolute ground truth.)* 