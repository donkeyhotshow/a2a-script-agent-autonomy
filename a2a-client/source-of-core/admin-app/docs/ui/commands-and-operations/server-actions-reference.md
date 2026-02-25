# Server Actions (Instructions) Reference

This document describes the server-side actions (instructions) that can be used in JSON files within a module's
`actions/` or `commands/` directory to manage data and control execution flow on the backend.

These instructions are processed by the `App\AiRudeDepot\Processors\InstructionProcessor\StorageHelper` trait. This
trait is used, notably, by the main modifier class
`App\AiRudeDepot\Processors\DataProcessor` ([See Modificator Documentation](../../../core/AiRudeDepot/Mod/Modificator.md))
to execute declarative logic defined in JSON.

The processing of instructions is closely linked to the `DataHub` storage
system ([See DataHub Documentation](../../../core/AiRudeDepot/Support/DataHub.md)), the `StoragePathParser` path
parser ([See StoragePathParser Documentation](../../../core/AiRudeDepot/Support/StoragePathParser.md)), and response
formulation via `StepResponse` ([See StepResponse Documentation](#stepresponse-object-and-execution-flow)).

## General Instruction Structure

Each instruction is a JSON object with the following common fields (not all fields are required for every instruction):

```json
{
  "action": "action_name",    // Required: Type of action to perform
  "from": "data_source",      // Path to data to read (Storage Address)
  "to": "data_target",        // Path to write data (Storage Address)
  "value": "some_value",        // Direct value (alternative to from)
  "condition": "condition_path", // Address of a boolean value for conditional execution
  "disabled": true/false,       // Flag to disable the instruction (default false)
  "batch": [ /* array of other instructions */ ], // For batch execution (within update)
  // ... other parameters specific to the action ...
}
```

- **`action`**: (String, required) Identifier of the command type (`update`, `save`, `add`, `remove`, `call`, `for`,
  `return`, `print_r`, `comment`, `assignId`).
- **`from` / `address`**: (String|Array<String>) Storage address(es) from which data is taken. Used by most actions. Can
  be a string or an array of strings. Parsed by `StoragePathParser`.
- **`to`**: (String) Storage address where data is written. Used by `update`, `add`. Parsed by `StoragePathParser`.
- **`value`**: (Any type) A direct value used instead of data from `from`. Can contain template variables `{...}` which
  are resolved before use (`DataHub::resolveInstruction`).
- **`args`**: (Object, optional) Used by the `call` action to pass arguments to the called instructions. (See `call`
  action and `args:` prefix for details on current implementation status).
- **`condition`**: (String|Array) Condition for executing the instruction. Processed by
  `DataManipulateHelper::evaluateCondition`.
    * **String:**
        * `"true"` / `"false"`: Literal values.
        * `"buffer:flag"`: Path to a boolean value in storage. The value will be cast to `bool`.
        * `"!buffer:flag"`: Inverted path to a boolean value.
    * **Array (`[operation, operand1, operand2?]`):**
        * `["equals", "path1", "path2"]`: `path1 === path2`
        * `["notEquals", "path1", "path2"]`: `path1 !== path2`
        * `["greaterThan", "path1", "path2"]`: `path1 > path2`
        * `["greaterThanOrEqual", "path1", "path2"]`: `path1 >= path2`
        * `["is_array", "path1", null]`: `is_array(path1)`
        * `["is_set", "path1", null]`: `isset(path1)`
        * `["notEmpty", "path1", null]`: `!empty(path1)` (Checks if the value is not `null`, `false`, `0`, `""`, `[]`).
        * `["isEmpty", "path1", null]`: `empty(path1)` (Checks if the value is `null`, `false`, `0`, `""`, `[]`).
- **`disabled`**: (Boolean) If `true`, the instruction is skipped.
- **`batch`**: (Array) Used within `update` to execute multiple `update` operations atomically.

### Data Path Formats (Storage Address)

Paths in `from`, `to`, `condition` parameters and in template variables `{...}` are parsed by
`StoragePathParser` ([See StoragePathParser Documentation](../../../core/AiRudeDepot/Support/StoragePathParser.md)).
Main prefixes:

- `module-name/data/file:key`: Data from a file in the `data/` folder of the current module.
- `models/model_name:key`: Access to global data models.
- `buffer:key`: Temporary data available within a single request (`DataHub`).
- `input:key`: Input data received from the frontend (e.g., from `data` in `customHooks` or `formData`).
- `output:path`: Data that will be included in the `StepResponse` for the frontend.
    - This prefix writes data directly to the `$data` array of the `StepResponse` object associated with the current
      server action execution. The frontend (e.g., Inertia.js setup) then uses this data.
    - **Common Conventional Keys for `output:`:**
        - `output:redirect`: (String) URL for a client-side redirect (e.g., `output:redirect="/dashboard"`). The
          `StepResponse` status is typically set to `REDIRECT`.
        - `output:component`: (String) Name of an Inertia component to render (e.g., `output:component="Auth/Login"`).
        - `output:full`: (Boolean) If `true`, often signals a full page reload during a redirect.
        - `output:flash.success` / `output:flash.error` / `output:flash.info`: (String) Messages to be displayed to the
          user (typically handled by frontend flash message systems). These are usually accompanied by corresponding
          `sessionData` in the `StepResponse`.
        - `output:forms.formId.fieldName`: Used to send back validation errors or updated field values for a specific
          form.
        - `output:commands`: (Array) An array of client-side command objects for the UI to execute (e.g., show modal,
          refresh data).
        - `output:data.<customKey>`: For general data to be passed to the frontend page props.
- `mysql!table`: Direct access to a MySQL table (legacy).
- `file!path`: Direct access to a file.
- `args:key`: Intended for reading arguments passed to a set of `call`-ed instructions. (See `args:` prefix description
  below and `call` action argument passing).

Curly braces `{...}` are used for substituting values from storage (`DataHub::resolveInstruction`).

## Action Types (`action`)

### Data Persistence and Scope for Template Rendering

**Critical Note:** When server actions generate data or UI components that need to be displayed by frontend templates (
e.g., Vue components rendered via Inertia), understanding data scope is essential.

* **`buffer:<key>` is Request-Scoped and Ephemeral:** Data written to `buffer:` exists only for the duration of the
  current server action execution sequence (typically a single HTTP request-response cycle). It is **not persisted**
  across different requests or between separate phases of rendering (e.g., an action POST request and a subsequent GET
  request that renders a page).

* **Use Persistent Storage for Template Data:** If an action generates content (like UI component definitions, lists of
  items, etc.) that a template needs to access for rendering, this content **must be saved to a persistent storage
  location**. This typically means using:
    * `file!path/to/data.json:some.key`: To save data into a JSON file that the template or its backing page component
      can later read.
    * `models/modelName`: To save data into the database via Eloquent models, which can then be fetched when rendering
      the page.

* **Incorrect Usage Example (for templates):**
  ```json
  // In an action (e.g., process-data.json executed on POST)
  {
    "action": "update",
    "value": [{"type": "text", "content": "Dynamic UI"}],
    "to": "buffer:dynamicPageContent" // WRONG if template needs this later
  }
  ```
  If a page template tries to include `buffer:dynamicPageContent` when it's rendered (potentially in a separate request
  or rendering phase), the buffer will be empty or contain unrelated data from the current request's context.

* **Correct Usage Example (for templates):**
  ```json
  // In an action (e.g., generate-ui.json executed on POST)
  [
    {
      "action": "update",
      "value": [{"type": "text", "content": "Dynamic UI Correctly Saved"}],
      "to": "file!module-name/data/dynamic-ui-for-template.json:content"
    },
    {
      "action": "save", // Ensure the file is saved
      "from": "file!module-name/data/dynamic-ui-for-template.json"
    }
  ]
  // In the page/section JSON that defines the template structure:
  // ...
  // {"type": "operation", "action": "include", "source": "file!module-name/data/dynamic-ui-for-template.json:content"}
  // ...
  ```

Always ensure that data meant for display in templates that are rendered independently of the action's immediate
response cycle is persisted appropriately.

### `update`

* **Purpose:** The main action for modifying data in storage (`DataHub`). Can read data from one location (`from`),
  optionally find (`find`) or transform (`with`) it, and write to another (`to`).
* **Parameters:**
    * `from` / `address`: (Optional, if `value` is present) Data source.
    * `to`: (Required) Target for writing data.
    * `value`: (Optional, if `from` is present) Direct value to write.
    * `find`: (Object, optional) Parameter for searching within data from `from`. Uses
      `DataManipulateHelper::searchInData` ([See DataManipulateHelper Documentation](../../../core/AiRudeDepot/Helpers/DataManipulateHelper.md)).
        * `value`: Value or `{path}` to search for.
        * `return`: (Optional) What to return from the found element (`key`, `value` (default), or a path within the
          element).
    * `with`: (String|Array, optional) Function name or array [class, method] to transform data *after* getting from
      `from`/`value` and *before* writing to `to`. Uses
      `DataManipulateHelper::applyDataTransformation` ([See DataManipulateHelper Documentation](../../../core/AiRudeDepot/Helpers/DataManipulateHelper.md)).
    * `batch`: (Array, optional) Array of other `update` instructions for batch execution.
    * `condition`, `disabled`.
* **Logic:**
    1. Checks `condition`.
    2. If `batch`, recursively executes each instruction in `batch`.
    3. If not `batch`:
        * Gets data from `value` or `from` (via `handleSource`, which can use `find` and `with`).
        * Writes the result to the `to` address in `DataHub`.
* **Examples:**

```json
    // Simple copy from input to buffer
    {
      "action": "update",
      "from": "input:userId",
      "to": "buffer:currentUserId"
    }
    // Write a specific value
    {
      "action": "update",
      "value": true,
      "to": "buffer:isProcessed"
    }
    // Find by value and write the key
{
  "action": "update",
      "from": "models/users",
      "find": {
        "value": "{buffer:currentUserId}",
        "return": "key"
      },
      "to": "buffer:userIndex"
    }
    // Batch update
{
  "action": "update",
  "batch": [
        { "from": "input:name", "to": "primary-form/data/user:name" },
    { "value": true, "to": "primary-form/data/state:formUpdated" }
  ]
}
```

### `save`

* **Purpose:** Saving data from temporary storage (`DataHub`) to persistent storage (e.g., file or model).
* **Parameters:**
    * `from`: (String|Array<String>, required) `DataHub` address(es) pointing to the data to be saved (e.g.,
      `models/someModel` or `module-name/data/someFile`). **Do not use `buffer:` here!**
    * `condition`, `disabled`.
* **Logic:** For each address in `from`, calls `DataHub::save()`, which delegates saving to the appropriate storage
  module (File, Mysql, etc.).
* **Examples:**

```json
{
  "action": "save",
  "from": "primary-form/data/user-profile"
}
    {
      "action": "save",
      "from": [
        "models/windows",
        "primary-form/data/program-section"
      ]
    }
```

### `add`

* **Purpose:** Adding an element to an existing array or concatenating strings at the `to` address in `DataHub`.
* **Parameters:**
    * `from` / `address` / `value`: Data source to add.
    * `to`: (Required) Address of the array/string to add to.
    * `how`: (String, optional) `'append'` (default) or `'prepend'`.
    * `limit`: (Number, optional) Maximum size of the array after adding.
    * `condition`, `disabled`.
* **Logic:** Gets source data, gets target, modifies target (append/prepend/limit), writes back to `DataHub`.
* **Example:**

```json
{
      "action": "add",
      "from": "buffer:newLogEntry",
      "to": "primary-form/data/activity-log"
    }
    {
      "action": "add",
      "from": "input:latestEvent",
      "to": "buffer:eventHistory",
      "how": "prepend",
      "limit": 10
    }
```

### `remove`

* **Purpose:** Removing data from storage (`DataHub`) and saving the changes.
* **Parameters:**
    * `from` / `to`: (String|Array<String>, required) Address(es) to remove.
    * `condition`, `disabled`.
* **Logic:** For each address, calls `DataHub::remove()` and then `DataHub::save()`.
* **Example:**

```json
{
      "action": "remove",
      "from": "buffer:tempUserData"
    }
     {
      "action": "remove",
      "to": ["buffer:item1", "buffer:item2"]
    }
    ```

### `call`

*   **Purpose:** Calling another sequence of commands. These commands are typically defined in a separate JSON file (an array of instructions) or can be an array of instruction objects provided directly.
*   **Parameters:**
    *   `from` / `address` / `target`: (String or Array, required if `value` not used) Address of the file containing the JSON array of instructions, or a `DataHub` path that resolves to an array of instructions.
    *   `value`: (Array, required if `from`/`address`/`target` not used) A direct array of instruction objects to execute.
    *   `args`: (Object, optional) An object where keys are argument names and values are the data (or paths to data) to be passed to the called instructions.
    *   `condition`, `disabled`.
*   **Logic:**
    1.  Loads/retrieves the array of instruction objects from `target`/`from`/`value` (via `handleSource`).
    2.  **Argument Passing (Current Implementation):**
        *   The `StorageHelper::processCall` method, which handles the `call` action, **does not currently have built-in logic to automatically process the `args` parameter** from the `call` instruction and make these arguments directly available via the `args:paramName` prefix within the *called* instructions.
        *   **Recommended Workaround:** To pass arguments to a called set of instructions, you must manually prepare a known `buffer:` location before the `call` instruction. The called instructions then need to be written to read from this specific buffer.
        ```json
        // Example: Preparing arguments in a buffer before calling
        [
          {
            "action": "update",
            "to": "buffer:my_module_call_args",
            "value": {
              "userId": "{input:userId}",
              "mode": "edit"
            }
          },
          {
            "action": "call",
            "target": "my-module/actions/process-item" 
            // process-item.json would then read from "buffer:my_module_call_args.userId"
          },
          { // Optional: Clean up the temporary buffer after the call
            "action": "update",
            "to": "buffer:my_module_call_args",
            "value": null // Or use "remove" action
          }
        ]
        ```
    3.  Executes the loaded/provided instructions recursively via `StorageHelper::executeInstructions`.
    4.  The `StepResponse` from the called instructions is merged into the `StepResponse` of the `call` action.
*   **Example:**
```json
{
  "action": "call",
  "from": "primary-form/commands/reset-form"
}
```

### `for`

* **Purpose:** Iterating over an array/object from `DataHub`, executing instructions for each element.
* **Parameters:**
    * `from` / `address`: (String, required) Address of the iterable array/object.
    * `instructions`: (Array, required) Instructions to execute on each iteration.
    * `to`: (String, optional) Address to write the array of results (if child instructions write to `buffer:for.list`).
    * `condition`, `disabled`.
* **Logic:** Iterates over data from `from`. On each iteration, writes the item to `buffer:for.currentItem`, index/key
  to `buffer:for.currentIndex`, executes `instructions`. Optionally collects results in `to`.
* **Example:**
  ```json
  {
    "action": "for",
    "from": "input:items",
    "instructions": [
      {
        "action": "update",
        "from": "buffer:for.currentItem.name",
        "to": "buffer:tempNames.{buffer:for.currentIndex}"
      }
    ]
  }
  ```

### `return`

* **Purpose:** Terminating the current sequence of instructions and adding data to the final response (`StepResponse`).
* **Parameters:**
    * `from` / `address` / `value`: Data source to return.
    * `halt`: (Boolean, optional) If `true`, stops further request processing.
    * `disabled`.
    * `status`: (String, optional) Sets the overall `StepResponse` status. Can be "ok", "error", "redirect", "halted".
      If not provided, defaults to "ok" unless `halt` is true and no data is returned (then "halted").
* **Logic:** Gets data, adds it to `StepResponse` (`addDataRecursive`), marks the response as `complete()` (stops the
  current instruction loop), optionally calls `halt()`. If `status` parameter is provided, sets the `StepResponse`
  status accordingly.
* **Example:**
  ```json
  {
    "action": "return",
    "from": "buffer:processedData"
  }
  {
    "action": "return",
    "value": { "status": "error", "message": "Failed" },
    "halt": true
  }
  ```

### `print_r`

* **Purpose:** Debugging action to output the value of a variable.
* **Parameters:**
    * `from` / `address` / `value`: Data source to output.
    * `disabled`.
* **Logic:** Gets data via `handleSource` and adds its string representation (using `print_r`) to the `history` of the
  `StepResponse` object with a `type` of `debug` or `info`.
* **Example:**
  ```json
  {
      "action": "print_r",
      "from": "buffer:currentUserData"
  }
  ```

### `comment`

* **Purpose:** Allows adding comments within the instruction list. The instruction is ignored during execution.
* **Parameters:** Any field can be included, but `comment` or `_comment` is typical.
* **Example:**
  ```json
  {
      "action": "comment",
      "_comment": "This next step processes user input."
  }
  ```

### `assignId`

* **Purpose:** Generates a unique ID and assigns it to a target location.
* **Parameters:**
    * `to`: (String, required) Storage address where the generated ID will be written.
    * `condition`, `disabled`.
* **Logic:** Generates a unique ID (likely using a helper function) and uses the `update` logic to write it to the `to`
  address.
* **Example:**
  ```json
  {
      "action": "assignId",
      "to": "buffer:newRecordId"
  }
  ```

## Dependencies (`Dependencies`)

## StepResponse Object and Execution Flow

All server-side actions (instructions) operate within the context of building a
`App\AiRudeDepot\App\StepResponse\StepResponse` object. This object standardizes the outcome of module execution and is
crucial for communication back to the frontend (via Inertia.js) and for controlling the execution flow.

For full details on the `StepResponse` class, its properties, and methods, refer to the source code documentation within
`app/AiRudeDepot/App/StepResponse/StepResponse.php` and
`app/AiRudeDepot/App/StepResponse/CommonResponseFunctions.php`. (A dedicated markdown document
`docs-mirrors/app/AiRudeDepot/App/StepResponse/StepResponse.md` also exists and should be consulted/updated).

### Key Components of `StepResponse`

When writing server actions, be aware of these `StepResponse` components that your actions can influence:

* **`$data` (Array):** The primary payload sent to the frontend. Populated by using the `output:yourKey` prefix in the
  `to` field of an `update` action, or by the `return` action.
* **`$history` (Array):** An array of execution steps, messages, and logs. Actions like `print_r` add to this. Crucially
  used for error reporting.
* **`$status` (`StepStatusEnum`):** The overall status of the execution (e.g., `OK`, `ERROR`, `REDIRECT`, `HALTED`). Can
  be set by various actions (e.g., `return` with a `status` parameter) or implicitly (e.g., an error in history might
  set status to `ERROR`).
* **`$halt` (Boolean):** A flag indicating if execution should stop prematurely. If set to `true` by an action (e.g.,
  `return` with `halt:true`, or an error handler calling `$response->halt()`), the `StorageHelper` processing loop will
  terminate further instruction execution in the current sequence.
* **`$sessionData` (Array):** Data to be flashed to the user's session (e.g., success/error messages for display after a
  redirect). Typically managed by actions that also set `output:flash.*`.

### Error Handling Conventions

When an error occurs during the execution of an instruction or a sequence of instructions:

1. **Log to History:** Add a descriptive error message to the `StepResponse`'s history. This is typically done by the
   `StorageHelper`'s `try-catch` blocks around instruction processing, or can be done manually within more complex
   custom action logic (if ever implemented as PHP methods).
    * Example (conceptual, as direct PHP is usually abstracted by JSON):
      `$currentStepResponse->addHistory("Detailed error message about what failed.", 'error', $exception->getTrace());`
2. **Set Status to Error:** Ensure the `StepResponse` status is set to `StepStatusEnum::ERROR`. This often happens
   automatically if `addHistory` is called with type `'error'`.
3. **Halt Execution:** Call `halt()` on the `StepResponse` (e.g., `$currentStepResponse->halt()`). This prevents
   subsequent instructions in the current JSON array from being processed.

The `StorageHelper` (specifically `executeInstructions` and individual action handlers like `processCall`,
`handleUpdate`) generally follows this pattern by wrapping instruction processing in `try-catch` blocks. If an exception
occurs, it logs to history, halts, and the overall `StepResponse` will reflect the error state.

Frontend code (e.g., Inertia error handling) should then be able to inspect the `StepResponse` (e.g., its status and
data payload like `output:flash.error` or specific error fields under `output:forms`) to react appropriately.

---
*Note: This documentation reflects the system's behavior based on analysis
of `StorageHelper.php`, `StoragePathParser.php`, `StepResponse.php`, and related classes. Specific details might evolve,
always refer to the source code for the ground truth.*

### `args:` Prefix (Under "Data Path Formats")

The `args:` prefix is recognized by `StoragePathParser` and is intended for use *within* a set of instructions that have
been invoked by a `call` action, allowing those instructions to read arguments passed by the caller.

* **Intended Usage:** `{"action": "update", "from": "args:myParameter", "to": "buffer:someValue"}`
* **Current Status & Limitations:**
    * `StoragePathParser::parse("args:myParam")` correctly identifies `Args` as the `moduleName` and `myParam` as the
      `storagePath`.
    * However, there is currently no concrete `App\AiRudeDepot\Storage\Data\Controllers\Args.php` module.
    * The `StorageHelper::processCall` method (which handles the
      `action": "call") does not automatically populate a context or buffer that an `Args
      ` module (or a special handling for `args:` in `DataHub`) would read from based on an `args: {}
      ` parameter in the `call` instruction itself.
    * **Effective Usage:** Due to the above, directly relying on `args:myParam` to pick up arguments from a `call`
      instruction's `args` field is not currently functional out-of-the-box.
    * **Recommendation:** Use the manual `buffer:` preparation method described in the `call` action's "Argument
      Passing" section. If you need to read values that were placed in `buffer:my_call_context.myParam`, you would use
      `from: "buffer:my_call_context.myParam"` in your called instructions.
