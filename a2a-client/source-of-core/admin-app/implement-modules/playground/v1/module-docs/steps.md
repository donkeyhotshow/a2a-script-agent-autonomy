# Standard Steps for Implementing a UI Module

This document outlines the typical steps involved in creating a new UI module, from initial definition to final
verification.

1. **Define Task Card (`task-card.md`)**
    * Clearly state the objective.
    * List associated UI (`page/`) and action (`actions/`) files.
    * Provide the complete JSON structure for the UI definition file.
    * Define the sequence of actions and their parameters for each action file (`actions/*.json`), including `target`,
      `params`, `output`, and `condition` where applicable.
    * Include detailed implementation notes and verification steps.

2. **Update Scratchpad (`@scratchpad.md`)**
    * Create a new task entry referencing the `task-card.md`.
    * Set initial status (e.g., `[ ] Planned`) and priority.

3. **Create UI Definition File (`page/*.json`)**
    * Create the file specified in the task card.
    * Copy the JSON structure from the task card into this file.
    * Ensure correct component types, IDs, properties (like `label`, `placeholder`), and action names are used.
    * Include necessary `imports` (e.g., `_i/common.json`).

4. **Create Common Actions File (`_i/common.json`)** (If needed)
    * Define any reusable action sequences referenced by multiple UI components.

5. **Plan Action Implementation**
    * Review the action file definitions in the task card.
    * Identify necessary PHP handlers (e.g., `sessionHandler`, `mysqlHandler`) and their methods.
    * Determine how data flows between actions (using `output: result`, `output: temp:variableName`, or direct
      parameters).
    * Confirm how UI updates will be handled (e.g., using Template Processing Pattern: `update` on template path +
      `save` on template file).

6. **Stub PHP Handlers** (If necessary for testing)
    * Create basic PHP classes/methods that simulate the expected behavior (e.g., return dummy data, log received
      parameters) if the actual backend logic isn't ready.

7. **Implement Actions (`actions/*.json`)**
    * Create each action file specified in the task card.
    * Translate the action definitions from the task card into the JSON file structure.
    * **Crucially:**
        * Use `action: "update"` and `action: "save"` for template modifications.
        * For status or log messages, append entries using `action: "add"` + `save`:
      ```json
      {
        "action": "add",
        "value": "✔ Operation completed: {buffer:resultMessage}\n",
        "to": "playground/my-page:content.children.#statusSection.children.#statusdiv.props.content",
        "how": "append"
      },
      {
        "action": "save",
        "from": "playground/ -page"
      }
      ```
    * Ensure correct `target` (PHP handlers, UI elements, file paths), `params` (using appropriate placeholders like
      `{input:variableName}`), and `output` specifications.

8. **Update Scratchpad (`@scratchpad.md`)**
    * Mark the task as `[-] In Progress`.
    * Add progress notes for file creation and implementation steps.

9. **Verification**
    * Load the UI page in the application.
    * Trigger each action (e.g., button clicks).
    * Check the browser's developer console for any errors.
    * Verify network requests to the backend, checking that the correct action file is called and the expected payload (
      with resolved `{input:...}` values) is sent.
    * Confirm that the PHP handlers (real or stubbed) receive the correct parameters.
    * Verify UI updates occur as expected *after* the action completes. For Template Processing, check the content of
      the saved `page/*.json` file to ensure the updates were written correctly.
    * Check any status messages or output areas defined in the UI.

10. **Refinement & Debugging**
    * Address any errors or unexpected behavior found during verification.
    * Adjust UI (`page/*.json`) or action (`actions/*.json`) files as needed.
    * Re-verify after making changes.

11. **Finalize & Document**
    * Ensure all code adheres to standards (`write-module-standard.md`).
    * Update the task card with any implementation details or changes discovered.
    * Mark the task as `[X] Completed` in the scratchpad.
    * Update `@memories.md` and `@lessons-learned.md` with relevant findings or patterns.

## Дополнительное обновление

- Обратите внимание: при обновлении значений буфера (например, в `actions/model-test-v1/delete-model-by-id.json`) теперь
  используется "to": "buffer:..." вместо "result": "buffer:..." для соблюдения шаблонного паттерна обновления UI.
