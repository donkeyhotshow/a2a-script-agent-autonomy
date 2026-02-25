# 06 - Server Actions and Logic (`actions/`)

This guide describes how to define and use server actions within the AI Task System modules. Server actions are the
primary way to implement custom backend logic for a module, interacting with data, external services, and controlling
the flow.

**Principle: Study Working Examples!**

Defining and triggering server actions is a **complex part of the system with many variations**. It is **critically
important** to study how this is implemented in existing modules before writing your own actions. Pay close attention to
the structure of the JSON instructions, the `DataHub` addresses used, and how data flows between instructions.

* [primary-form/v1/actions/](../../../implement-modules/primary-form/v1/actions/)
* [login-form/v1/actions/](../../../implement-modules/login-form/v1/actions/)
* *(Look for other examples)*

## 1. Purpose and Location

* **Purpose:** The `actions/` directory contains JSON files describing sequences of instructions to be executed on the *
  *server** in response to UI events or other system triggers (e.g., scenario steps). These JSON files are processed by
  the central instruction execution engine.
* **Location:** `implement-modules/{module-name}/vX/actions/` (source location before installation). These files are
  installed to `storage/aiInstaller/{module-name}/vX/actions/`.
* **Structure:** Subdirectories **are recommended** for grouping actions by functionality or pages (e.g.,
  `actions/mysql-test-v1/`, `actions/user-profile/`). Filenames typically reflect the action's purpose (e.g.,
  `save-settings.json`, `process-login.json`).

## 2. Action File Format (`.json`) and Instruction Engine

* **Format:** An action file is a JSON **array** (`[]`) of instructions.
* **Content:** Each element in the array is a JSON object (`{}`) representing a single instruction for the execution
  engine.
* **Execution Flow:** When a server action is triggered (e.g., via `customHooks` and `sendData` from the UI, leading to
  `App::moduleActions` and `DataProcessor::processActionFile`), the system loads the corresponding action JSON file and
  passes the array of instructions to the instruction execution engine (primarily implemented in
  `app/AiRudeDepot/Processors/InstructionProcessor/StorageHelper.php`'s `executeInstructions` and `processInstruction`
  methods). This engine iterates through the instructions, processing each one sequentially (unless flow is altered by
  `condition`, `for`, `call`, `return`).
* **Instruction Object Structure:** Each instruction object has a main `action` key specifying the type of operation (
  e.g., `update`, `save`, `call`, `for`, `return`, `print_r`, `condition`). The specific keys available and required
  depend heavily on the `action` type.
    * **Important:** **Do not guess keys and their values!** Study the official
      reference ([server-actions-reference.md](../../../docs/ui/commands-and-operations/server-actions-reference.md))
      and **working examples** in existing modules.
* **Data Interaction (`from`, `to`, `value`, `condition`):** Instructions interact with data using `DataHub` addresses.
  These addresses are parsed by `StoragePathParser.php` and resolved by the `InstructionProcessor.php` API methods (
  `get`, `set`, `save`, `remove`, `find`).
    * **DataHub Addresses:** See [Data Handling](./05-data-handling.md) for a detailed description of `DataHub`
      prefixes (like `buffer:`, `file!`, `session:`, `model!`, `input:`, `output:`) and their usage.
    * **Variable Substitution:** Addresses can contain placeholders in single curly braces `{}` that are resolved by the
      instruction execution engine using current values from the `DataHub`. Example:
      `"to": "file!modules/{buffer:currentModule}/data/status.json"`.
* **Conditionals:** Many instructions support a `condition` key, whose value is evaluated by
  `DataManipulateHelper::evaluateCondition` before the instruction is executed. This allows for conditional logic within
  the action flow.
* **Data Transformations:** The `with` key can be used with instructions like `update` to apply transformations (e.g.,
  hashing passwords, encoding JSON) to data using `DataManipulateHelper::applyDataTransformation`.

## 3. Triggering Actions from UI (`customHooks`)

The recommended mechanism for triggering server actions from the UI is using the `customHooks` system defined on UI
components.

* **Principle:** A UI component (e.g., a button) defines a `customHook` for a relevant event (e.g., `click`). This hook
  contains a client-side action (e.g., `sendData`) that instructs the frontend `ActionManager` to send a request to the
  backend, specifying the server action file to execute (`sendTo`).
* **Hook Structure:**
  ```json
  "customHooks": {
    "click": [ // DOM Event or Component Event
      {
        "action": "sendData", // Client-side action recognized by frontend ActionManager
        "data": {
          "sendTo": "{module-slug}/actions/{path/to/action/file}", // Path to the server action JSON, relative to storage/aiInstaller/modules/
          "form": "{form_context_name}"     // Optional: Name of the form context whose data should be collected and sent in the request body.
        }
      }
    ]
  }
  ```
* **Data Transfer:** When `sendData` is triggered with a `form` specified, the frontend collects the current data from
  that form context and sends it in the request body to the backend. On the backend, this data becomes available in the
  `DataHub` under the `buffer:input` buffer and can be accessed by server action instructions using `input:fieldName` or
  `form:form_name` addresses.
* **Backend Entry Point:** The backend receives this request (typically via a central API endpoint), identifies the
  target module and action file based on the `sendTo` path, loads the action JSON (
  `storage/aiInstaller/modules/{module-slug}/actions/...`), and starts the instruction execution engine (
  `DataProcessor::processActionFile`).
* **Example (`login-form/v1`):** A login button might have a `customHook` for `click` that triggers `sendData` with
  `sendTo: "login-form/actions/process-login"` and `form: "loginForm"`. The `process-login.json` action file then
  accesses the submitted username and password using addresses like `input:username` or `form:loginForm.password`.

## 4. Available Instructions and Operations

The instruction execution engine supports a variety of built-in actions. This is not an exhaustive list, but covers
common operations. Refer to the official reference for completeness.

* **`update`**: Copies data from a `from` or `value` source to a `to` target address in `DataHub`. Supports `condition`,
  `with`, `keyPath`.
* **`save`**: Persists data at a specified `from` address (typically used after `update` to a persistent location like
  `file!`, `model!`).
* **`remove`**: Removes data at a specified `from` or `address`.
* **`for`**: Executes a sequence of nested `instructions` for each item in a list specified by `from`. Provides access
  to the current item and index via `DataHub` buffers (e.g., `buffer:for.item`, `buffer:for.index`).
* **`call`**: Executes a sequence of nested `instructions` or calls another action file (
  `from: file!modules/.../actions/...json`). Allows passing arguments via `args` or placing them in a `buffer:args`.
* **`return`**: Terminates the current action execution and returns data (`from` or `value`) to the caller (e.g., the
  UI). This is the primary way to send a final response.
* **`print_r`**: For debugging. Outputs the value at `from` to the step response.
* **`condition`**: Can be used as a top-level instruction to conditionally execute a `batch` of nested instructions.
* **`batch`**: An array of nested instructions to be executed sequentially. Often used within `condition`, `for`,
  `call`.
* **`comment`**: Adds a comment to the execution trace (for debugging/logging).
* **`log`**: Writes a message or data to the system logs.

**Reference:** ([server-actions-reference.md](../../../docs/ui/commands-and-operations/server-actions-reference.md)).

## 5. Debugging Server Actions

* **`print_r` Instruction:** Insert `{"action": "print_r", "from": "buffer:someVariableToDebug"}` into your action JSON
  to see the value of `someVariableToDebug` in the execution log.
* **Analyze `StepResponse`:** Examine the `StepResponse` object generated by the backend after executing an action or
  scenario step. This contains logs from `print_r` and other execution details.
* **Server Logs:** Check the application's server logs (e.g., `storage/logs/laravel.log`) for errors or log messages
  from the `log` instruction.
* **Network Requests:** Use browser developer tools to inspect the request payload sent from the UI (`sendData`) and the
  response received from the backend.

## 6. Returning Data/Commands to UI (`return`, `output:`)`

To send data or commands back to the frontend after a server action completes:

* **`return`**: **Recommended for the final response.** Use a final `return` instruction with `from` or `value`
  specifying the data to send back (e.g.,
  `{"action": "return", "value": {"status": "success", "message": "Operation complete."}}`). This data will be available
  to the frontend handler that triggered the action.
* **`update` with `to: "output:someKey"`**: Adds data to the `buffer:output` buffer. The entire `buffer:output` is
  typically included in the final response sent to the UI. Can be used to accumulate data in the response object
  throughout the action execution before the final `return`.
* **Sending UI Commands:** UI commands (like showing a toast notification, redirecting, updating a UI component's data)
  are typically sent back as a structured object within the data returned by `return` or placed in `buffer:output`. The
  frontend framework (e.g., a custom `ActionManager` on the client-side) then processes this structure.
    * **Example:**
      `{"action": "return", "value": {"commands": [{"command": "notify", "type": "success", "detail": "Saved!"}]}}`.

## 7. Server Action Example: Saving Form Data

> **Important:** Server action JSON files (`actions/`) should **not** contain direct client-side UI actions (e.g.,
`toast`, `alert`, `console.log`). These actions should be triggered by the frontend based on the response received from
> the server action.

```json
// Example: config/actions/save-config.json
[
  {
    "action": "update",
    "to": "file!modules/config/v1/data/program.json", // Persistent storage location using file! prefix
    "from": "form:config-form"   // Data source from DataHub buffer:input (collected from UI form)
  },
  {
    "action": "save",             // Persist the data at the target location specified in the previous step's 'to'
    "from": "file!modules/config/v1/data/program.json" // The 'from' field here specifies what to save (the data now at this location)
  },
  {
    "action": "return",           // Return response to client
    "value": { 
      "status": "success",        // Indicate success
      "message": "Configuration saved.",
      "commands": [ // Optional: Include commands for the frontend
        {"command": "notify", "type": "success", "detail": "Configuration updated successfully!"}
      ]
    }
  }
]
```

**Explanation:**

- The `update` instruction takes data from the `form:config-form` address in `DataHub` (which contains the submitted
  form data) and places it at the `file!modules/config/v1/data/program.json` address in `DataHub`'s file storage
  section. Note that this does *not* immediately write to the file system.
- The `save` instruction is explicitly needed to write the data currently staged at the
  `file!modules/config/v1/data/program.json` address from `DataHub`'s memory to the actual file system.
- The final `return` instruction sends a response back to the frontend, including a status, a message, and an optional
  command to show a success notification.

## 8. Client-Side Response Handling Example (Conceptual Vue/Inertia)

```javascript
// In the Vue component triggering sendData (Vue.js/Custom ActionManager context)
// Assuming sendData is called via a frontend ActionManager that handles the fetch/XHR request

// Example response handler (conceptual)
function handleServerResponse(responseData) {
  if (responseData && responseData.status === 'success') {
    // Process commands if they exist
    if (responseData.commands && Array.isArray(responseData.commands)) {
      responseData.commands.forEach(command => {
        // Dispatch commands to a frontend command handler
        processFrontendCommand(command);
      });
    }
    // Optional: Handle message or update UI based on other data in responseData
  } else if (responseData && responseData.status === 'error') {
    // Handle error status (e.g., show error notification)
    if (responseData.message) {
      processFrontendCommand({ command: 'notify', type: 'error', detail: responseData.message });
    }
    // Process error-specific commands or data
  }
}

function processFrontendCommand(command) {
  // Example: Dispatching to a notification system
  if (command.command === 'notify') {
    // Use a client-side notification system (e.g., PrimeVue Toast)
    this.$toast.add({ 
      severity: command.type || 'info',
      summary: command.summary || '',
      detail: command.detail || command.message || '',
      life: command.life || 3000
    });
  } 
  // Add handlers for other commands like 'redirect', 'updateUI', etc.
}

// The call to sendData would look something like this:
// this.$actionManager.sendData({ sendTo: "config/actions/save-config", form: "configForm" }).then(handleServerResponse);
```

## 9. Updating UI After Save

After successfully saving data via a server action, the frontend UI needs to be updated to reflect the changes. This can
be done by:

1. **Refetching Data:** Triggering another action to load the updated data from the server.
2. **Client-Side State Update:** If the server response includes the updated data (e.g., in the `return` value or
   `buffer:output`), use frontend logic to update the relevant parts of the UI state (e.g., updating the form data in
   the frontend form manager or a component's local state).
3. **Full Page Reload:** In some cases, a full or partial page reload might be necessary (less ideal for user
   experience).

## 10. Error Handling Pattern

Server actions should explicitly handle potential errors and return an error status to the frontend using the `return`
instruction.

**Example Server Action Error Response:**

```json
"<censored !>"
```


## 11. Related Documents

* [Data Handling](./05-data-handling.md) - **Essential for understanding `DataHub` addressing.**
* [UI Construction](./04-ui-construction.md) - Covers `customHooks` for triggering actions.
* Action Manager: [ActionManager.md](../../../docs-mirrors/resources/common/managers/ActionManager.md) - Details the
  client-side action dispatcher.
* Instruction
  Reference: [server-actions-reference.md](../../../docs/ui/commands-and-operations/server-actions-reference.md) -
  Comprehensive list of available instruction types and their parameters.
* **Strict Module Structure Checklist:
  ** [../../engine/meta/StrictModuleChecklist.md](../../engine/meta/StrictModuleChecklist.md) - Includes requirements
  for actions and commands.
