# Standard: Creating Installer Modules

This standard outlines the recommended process for creating new modules compatible with the AI Installer system, based
on the development experience with the `question-to-user` and `playground` modules.

## Phase 1: Planning & Design

1. **Initiation (Plan Mode):**
    * Start every new module request in **Plan Mode** (`@scratchpad.md`).
    * Clearly define the **Current Task**.
2. **Requirements Gathering:**
    * Identify the module's core purpose, scope (e.g., Level 1 display, Level 2 interaction), and specific
      functionalities.
    * Determine necessary data sources (e.g., `data/module-data.json`, `session:key`, `mysql!table`) and their
      structure.
    * List required UI elements (Inputs, Buttons, Display areas with IDs) and user interactions.
    * Document these under **Understanding** in the scratchpad.
3. **Technical Approach Selection:**
    * Evaluate implementation options:
        * **PHP Helper Class (`code/ModuleName.php`):** Suitable for complex logic, server-side rendering, direct
          DB/Eloquent calls, or when JSON actions are insufficient.
        * **JSON Actions (`actions/actionName.json`):** Preferred for simpler interactions, UI updates via template
          processing, data manipulation, and leveraging framework actions (`update`, `save`, `remove`, `call`, etc.).
    * Consider using existing UI component capabilities (e.g., PrimeVue Select handling options) to simplify action
      logic.
4. **Module-Specific Standard (Optional):**
    * If the module involves specific data structures or complex workflows, create a dedicated standard file (e.g.,
      `module-name-standard.md`) to document them.
5. **Clarification & Confidence:**
    * Generate clarifying **Questions** in the scratchpad to resolve ambiguities (e.g., input data sources, output
      targets, specific action syntax).
    * Iterate with the user until **Confidence** reaches >= 95-100%.
    * Outline the **Next Steps** for implementation.

## Phase 2: Scaffolding (Agent Mode)

1. **Activation:** Switch to **Agent Mode** (`@scratchpad.md`).
2. **Directory Structure:**
    * Create the main module directory: `storage/aiInstaller/{module-name}/`
    * Create standard subdirectories inside: `actions/`, `code/` (if using PHP), `data/`, `data/blanks/`, `sections/`,
      `templates/`, `_i/`. (Version subdirectories like `v1/` can be added if needed).
3. **Installer Files (`_i/`):**
    * Create `_i/meta.json`: Define `id`, `displayName`, `version`, `description`.
    * Create `_i/links.json`: Define required links (`id`, `type`, `label`, `path`). Use placeholders if specifics
      aren't confirmed, but get actual values ASAP.
    * Create `_i/common.json`: Initialize structure to register core module files. This is the primary registration file
      for files loaded by default with the module. (`_i/files-by-block.json` is for optional/dynamically loaded blocks).
4. **Basic UI & Data Files:**
    * Create a layout/page file (e.g., `index.json`, `page.json` or specific `{page-name}.json` in the root or a
      dedicated `ui/` subfolder) defining the overall page structure using standard components (`type: "div"`,
      `type: "Form"`, etc.).
    * Create section files (`sections/section-name.json`) for distinct parts of the UI (if using includes).
    * Create template files (`templates/template-name.json`) for reusable UI blocks or dynamic content areas that
      actions will modify.
    * Create blank JSON files for UI components (`data/blanks/component-name.json`) if they will be dynamically
      populated.
    * Create initial data files (`data/module-data.json`) if needed.
    * Create an empty data file for storing user input/state if required (e.g., `data/form-state.json`).
5. **Registration (`_i/common.json`):**
    * Register all created core files under the appropriate keys (relative paths from the module root, without
      extension):
        * Root Page/Layout files: `""` array (e.g., `["index"]`) or `"ui"` array (e.g., `["ui/page"]`)
        * Sections: `"sections"` array (e.g., `["sections/header", "sections/content"]`)
        * Templates: `"templates"` array (e.g., `["templates/user-card"]`)
        * Data Files (including Blanks): `"data"` array (e.g., `["data/module-config", "data/blanks/new-item"]`)
        * Actions: `"actions"` array (e.g., `["actions/save-data", "actions/load-data"]`)
        * Code (PHP): `"code"` array (e.g., `["code/ModuleName"]`)
        * CSS: `"css"` array (e.g., `["css/module-styles"]`)
    * Ensure paths match the actual file locations.
6. **Registration:**
    * Register all created files under the appropriate keys in `_i/files-by-block.json`:
        * Layouts: `""` or `"layout"`
        * Sections: `"sections"`
        * Templates: `"templates"`
        * Data Files: `"data"`
        * **Blank Templates: Also in `"data"`**
        * Actions: `"actions"`
        * Code (PHP): `"code"`
        * Meta files: `"meta"`

## Phase 3: Implementation (Agent Mode)

1. **Core Logic:**
    * Implement the main functionality defined in the plan.
    * **If JSON Actions:**
        * Create action files (`actions/actionName.json`) as top-level JSON arrays `[...]`.
        * Structure logic clearly using comments (`"action": "comment"`).
        * Use standard actions (`update`, `save`, `remove`, `call`, `for`, `return`).
        * **Placeholders:** Use `{...}` syntax to reference dynamic data. Key placeholders include:
            * `{input:fieldName}`: Accesses data sent from the client `sendData` action, where `fieldName` corresponds
              to the `name` attribute of an input element within the specified `form` or a key in the direct payload. *
              *This is the standard method for accessing client input.**
            * `{session:key}` or `{session:key.nestedProperty}`: Accesses data stored in the user's session.
            * `{buffer:varName}`: Accesses data stored temporarily by a preceding action's `result: "buffer:varName"` or
              similar `output`. Useful for chaining action results.
            * `{result}` or `{result:propertyName}`: Accesses data returned by the *immediately preceding* action.
            * *(Avoid `{form:...}` unless specifically documented as necessary for a particular context).*
        * **Input Data Handling Clarification:**
            * If `sendData` uses `"form": "formId"`, access fields using `{input:fieldName}` (e.g.,
              `{input:textToSave}`).
            * If `sendData` uses `"forms": ["formId1", "formId2"]`, data *might* be nested (e.g.,
              `{input:formId1.fieldName}`). Verify this if using multiple forms.
            * If `sendData` passes a direct payload (e.g., `data: {"myKey": "myValue", "sendTo": ...}`), access it via
              `{input:myKey}`.
        * **File I/O:** Use `action: "update"` to stage changes to a buffer or target file path (e.g.,
          `to: "{module}/data/some-file"`), followed by `action: "save"` to persist (e.g.,
          `from: "{module}/data/some-file}`).
        * **Session I/O:**
            * Write to session: Use `action: "update"`, `to: "session!yourKey"`, and provide data via `from` (e.g.,
              `{input:fieldName}`) or `value` (e.g., `{"field": "{input:fieldName}"}`).
            * Read from session: Use `session:yourKey` or `session:yourKey.nestedProperty` in the `from` field of an
              `update` or other actions.
        * **UI Updates (Template Processing Pattern - Confirmed & Preferred):** This pattern ensures persistent UI
          changes by modifying the template file itself.
            * **Step 1: Update Template In Memory:** Use one or more `update` actions to modify specific properties of
              elements within the target template file.
                * The `to` path **must** specify the template file (using `{module}/{template_file}` or
                  `{module}/path/to/{template_file}`) followed by the property path within the JSON structure (e.g.,
                  `:content.children.1.children.#elementId.props.content`).
                * Targeting elements by `id` (e.g., `:path.elementId.props.someProp`) is recommended for robustness over
                  relying purely on array indices.
                * The `from` field provides the new value (e.g., `session:data.value`, `{buffer:loadedData}`,
                  `input:newValue`) or use the `value` field for static content.
                * *Example:*
                  `{"action": "update", "from": "session:test-save-to-session.textToSave", "to": "playground/save-session-test:content.children.1.children.1.props.content"}` (
                  Updates the content prop of a specific div based on session data).
            * **Step 2: Save Template To Disk:** After all `update` actions targeting the template, use a final
              `action: "save"` action.
                * The `from` path **must** be the path to the template file itself. Example:
                  `playground/save-session-test`.
                * This action writes the in-memory changes to the disk, triggering the UI refresh with the updated
                  template content.
                * *Example:* `{ "action": "save", "from": "playground/save-session-test" }`
            * **(Alternative/Legacy) Direct UI Update:** Using `to: "output:result.elementId.prop"` sends update
              instructions back to the client's `output.result` buffer. This method is **not recommended** for
              persistent changes as it's less reliable and harder to manage than the Template Processing Pattern.
        * **PHP Handler Calls:** The exact syntax remains somewhat uncertain, but the assumed pattern is
          `"action": "call"` with target `"to": "<|path|>"`. Data is passed via `"value": {...}` and results received
          via `"from": "buffer:key"` or similar. Requires confirmation through testing or clearer documentation.
        * **Database Interaction (`mysql!`)**: The exact behavior of actions like `save`, `update`, `remove` with
          `mysql!table/where...` targets needs further verification. It's assumed they might perform implicit
          operations, but explicit handler calls might be more reliable. Use with caution and prefer PHP handlers for
          complex DB logic until fully documented.
        * **PHP Handler Calls:** Syntax remains somewhat uncertain. The assumed pattern is
          `{"action": "call", "target": "handler:HandlerAlias::method"}` or `handler:App\Namespace\Class::method`. Pass
          data via `"params": {...}` or `"arguments": [...]`. Receive results via `"result": "buffer:key"`. Requires
          confirmation through testing or framework documentation.
    * **If PHP Helper:**
        * Create the class file (`code/ModuleName.php`).
        * Follow the standard structure (`moduleRun`, `moduleActions`, specific action methods).
        * Implement logic within the appropriate methods.
        * Return commands for UI updates using the `output:result...` structure for the client to handle, or implement
          Template Processing logic within the PHP code.
2. **UI Trigger Integration:**
    * Modify UI elements (e.g., Buttons) to trigger the implemented logic using `customHooks`.
    * Use the `sendData` client action:
      `"customHooks": { "click": [{ "action": "sendData", "data": { "sendTo": "{actionName}", "form": "{formId}" / * or direct payload * / } }] }`.
    * *(Note: Use `data.sendTo`, not `data.action` based on recent examples).*
3. **Registration:**
    * Register new action files (`actions/...`) in the `"actions"` array or code files (`code/...`) in the `"code"`
      array in `_i/common.json`.

## Phase 4: UI Refinement (Agent Mode)

1. **Component Usage:** Structure the UI using standard components defined with `type` and `props` (e.g.,
   `{ "type": "div", "props": { "class": "..." } }`). Use appropriate components like `InputText`, `Button`, `Form`,
   `Textarea`, `Panel`, `Card`, etc.
2. **Consistency:** Ensure the UI aligns with examples and patterns from the core framework or other modules.
3. **Props:** Adjust component properties (`class`, `label`, `icon`, `severity`, `id`, `content`, `placeholder`, `name`,
   etc.) for desired appearance and behavior. Add `ariaLabel` for accessibility. Use
   `model: { "form": "formId", "field": "fieldName" }` for binding inputs to forms.

## Phase 5: Testing & Verification

1. **Testing:** Thoroughly test the module's functionality through the UI.
2. **Verification:** Specifically verify:
    * Data saving/loading (Session, MySQL, Files).
    * Correct UI updates based on actions (Verify the **Template Processing Pattern** correctly modifies and saves the
      template file, leading to UI refresh).
    * Correct parsing and usage of input/form data (using `{input:fieldName}`).
    * Correct functioning of session (`session!`, `session:`), file, or database interactions.
    * Correct functioning of underlying framework features being tested.
3. **Refactoring:** Improve code/action structure based on testing, user feedback, or better understanding of the
   framework.
4. **Corrections:** Fix any bugs or errors identified.
5. **Renaming:** If necessary, rename the module, ensuring updates to the directory name, `_i/meta.json`,
   `_i/links.json`, `_i/common.json`, and any internal path references.

## Phase 6: Documentation (Agent Mode)

1. **`@memories.md`:** Ensure a detailed, chronological record of all development steps, decisions, and changes is
   maintained with version tags (e.g., `[vX.Y.Z] Development: ...`). Be specific about refactoring reasons and syntax
   changes (e.g., adopting Template Processing, confirming `{input:...}`).
2. **`@lessons-learned.md`:** Capture key insights, solutions to problems, useful patterns, and corrections with
   timestamps and relevant tags (e.g.,
   `[YYYY-MM-DD HH:MM] TemplateProcessing: Issue: UI not updating persistently -> Fix: Used update action on template path (module/file:path.#id.prop) followed by save action on template path (module/file) -> Why: Ensures changes are saved to disk, triggering reliable UI refresh. #action #ui`).
   Document confirmed syntax patterns (e.g., Template Processing, `{input:...}` input handling, `session:` access).
3. **Module Standard:** Update the module-specific standard (if created) to reflect the final implementation.
4. **This Standard:** Update `write-module-standard.md` if the process reveals new best practices or refinements.
   *Continuously expand this file with maximum relevant detail based on ongoing experience.*

## Module Writing Standard

This document outlines the standard process and considerations for creating new data modules or UI test pages within the
AI Installer framework.

### Planning & Design

1. **Define Purpose:** Clearly state the module's goal (e.g., "Test Session Storage", "Manage MySQL Data", "Display
   System Logs").
2. **Identify Data Sources:** Specify where the module reads from and writes to (e.g., `session!`, `mysql!test_table`,
   `logs!system`, `template!path/to/template.json`).
3. **Design UI (if applicable):**
    * Create a `.json` file in `storage/aiInstaller/playground/` (for test pages) or an appropriate location for core
      UI.
    * Structure the UI logically (e.g., columns, sections).
    * Define necessary elements: forms (`type: "Form"`), input fields (with `props.name` matching `{input:...}` usage,
      `props.id`, `props.label`, `props.ariaLabel`), buttons (with specific `props.id` if needed, `props.label`,
      `props.ariaLabel`), display areas (divs with `props.id` like `outputArea`, `statusMessage`). Use standard
      component types (e.g., `InputText`, `Button`).
    * Assign `customHooks.click` to buttons. Use the `sendData` action:
      `{"action": "sendData", "data": {"sendTo": "{action-name}", "form": "{formId}"}}`. Note the `sendTo` should point
      to the action file path.
4. **Plan Actions:**
    * For each user interaction (button click), define a corresponding action file (`.json`) in `{module}/actions/`.

### Implementation

1. **Create UI File:** Implement the `.json` UI definition designed in the planning phase.
2. **Register UI File:** Add the relative path (without extension) to `storage/aiInstaller/_i/common.json` under the
   `interface` key. For core UI, registration might differ.
3. **Create Action Files:**
    * Implement each `.json` action file.
    * Use the standard action format:
      `{"comments": "...", "actions": [{"action": "...", "from": "...", "to": "...", "value": "..."}]}`.
    * **Data Handling:**
        * Use addresses like `session!key`, `mysql!table/where/...`, `template!path/to/template:property.path` for
          `from` and `to` fields.
        * Access data sent from forms using `{input:fieldName}` placeholders within `from`, `to`, or `value` fields.
          Ensure `fieldName` matches the `name` attribute of the input element in the form.
        * If `sendData` payload contains `form: "formId"`, data *might* still be accessible via `{input:fieldName}`
          directly, not requiring a `form:` prefix in the action. This is the observed behavior and preferred
          assumption.
        * If `sendData` payload contains `forms: ["formId1", "formId2"]`, data might be nested under form IDs, e.g.
          `input:formId1.fieldName` (confirm exact mechanism).
        * Static values can be provided using `value: \"...\"`.
        * The general `{placeholder}` syntax can be used for dynamic values from various sources (context, previous
          actions, session, buffers), although specifics need full documentation.
    * **UI Updates (Template Processing Pattern - Preferred):**
        * To update the UI persistently, first stage the changes in memory using `action: \"update\"` targeting the
          template path and specific properties (e.g.,
          `to: \"playground/mysql-data-module-test:children.#mysqlOutput.children\"`, targeting the children of the
          element with `id="mysqlOutput"`). The `from` can be a data source (e.g., `mysql!test_table/where/...`), a
          buffer (`buffer:someData`), or a static `value`.
        * After all staging `update` actions, add a final `action: \"save\"` with the `from` field set to the template
          path (e.g., `from: \"playground/mysql-data-module-test\"`). This writes the staged changes back to the
          template file, triggering the UI refresh.
    * **Backend Interaction:**
        * Actions like `save` to `mysql!table` might implicitly trigger INSERT or UPDATE based on context (
          presence/absence of `id` or `where` clauses). Verify this behavior.
        * `remove` action likely requires a specific target like `mysql!table/where/...`.
        * PHP handler interactions (`target: handler:HandlerName::method` or `handler:App\\Namespace\\Class::method`)
          are inferred; confirm actual implementation.

### Verification

1. **Load UI:** Access the page/module through the application's navigation.
2. **Test Interactions:** Click buttons, fill forms, trigger all defined actions.
3. **Check UI Updates:** Verify that display areas (`div`s) update correctly *after* the action completes (specifically,
   after the template `save` action finishes).
4. **Check Data Sources:** Inspect the underlying data (Session storage, Database tables) to confirm create, read,
   update, delete (CRUD) operations were successful.
5. **Verify Input Handling:** Ensure data entered in forms is correctly passed and used in actions (check database
   entries, displayed outputs).
6. **Document Patterns:** Note any confirmed patterns (like Template Processing), tricky behaviors, or successful
   implementations in `@lessons-learned.md` and `@memories.md`.

#### UI Updates & Template Processing Pattern

When an action needs to update the user interface *persistently* (i.e., the changes should remain visible after the
action completes, potentially reflecting new data loaded or state changes), the **Template Processing Pattern** should
be used:

1. **`update` Action:** Modify the relevant parts of the target UI template file *in memory*. This typically involves
   targeting a specific element (e.g., a `div`) within the template's structure (usually referenced by its file path,
   e.g., `page/mysql-data-module-test.json`) and updating its properties (e.g., `content`). Use placeholders like
   `{result:...}` or `{temp:...}` to insert dynamic data fetched or calculated by preceding actions.
2. **`save` Action:** Save the modified template file back to the disk. The `target` for this action is the file path of
   the UI template (e.g., `page/mysql-data-module-test.json`).

**Example:** Loading data and displaying it in a `div` with ID `mysqlOutput` inside `mysql-data-module-test.json`:

```json
[
  {
    "action": "update",
    "to": "",
    "from": "" // Store result temporarily
  },
  {
    "action": "remove",
    "to": "", // Target specific element's content in the template
    "value": { "content": "Loaded: {temp:recordData.name}" } // Use temp variable
  },
  {
    "action": "save",
    "from": "page/mysql-data-module-test.json" // Save the whole template
  }
]
```

Avoid using `output: commands` or direct `output: elementId.property` for persistent UI updates, as these may not
reflect reliably across different contexts or might be overwritten. Use the Template Processing Pattern for clarity and
guaranteed persistence.

**Additions for Status Messages:**

* Use `action: "add"` to append status messages or log entries to a UI element rather than replacing content. This is
  useful for showing a running history of operations.
  ```json
  {
    "action": "add",
    "value": "✔ Operation completed: {buffer:resultMessage}\n",
    "to": "playground/my-page:content.children.#statusSection.children.#statusdiv.props.content",
    "how": "append"
  },
  {
    "action": "save",
    "from": "playground/my-page"
  }
  ```
* To append entries to a list, target the `props.children` array of a container element:
  ```json
  {
    "action": "add",
    "value": {
      "type": "div",
      "props": { "content": "New status: {buffer:statusText}" }
    },
    "to": "playground/my-page:content.children.#statusSection.children.#statusList.props.children"
  },
  {
    "action": "save",
    "from": "playground/my-page"
  }
  ```

#### Input Data Handling

Actions receive input data primarily through the `params` object or directly referenced in fields like `from`, `to`,
`value`, etc. Dynamic values are inserted using placeholders:

* **`{input:variableName}`:** Represents data passed directly in the `sendData` payload from the client-side trigger (
  e.g., a button click passing form field values). The `variableName` corresponds to the key in the `sendData` object or
  the `name` attribute of the form field if `form` or `forms` is used in `sendData`. This is the standard way to access
  client-sent data.
* **`{form:formId/fieldName}`:** (Potentially deprecated/ambiguous - prefer `{input:...}`) Historically used to
  reference values managed by a `FormManager`. Avoid unless specifically required and confirmed.
* **`{buffer:variableName}` / `{temp:variableName}`:** References data stored temporarily by a preceding action's
  `output: buffer:variableName` or `result: buffer:variableName` property within the *same* action sequence. (Note:
  `temp:` might be an alias or older form of `buffer:`).
* **`{result}` / `{result:propertyName}`:** References data returned by the *immediately preceding* action's
  `output: result` or `output: result:propertyName` property.
* **`{session:key}`:** Accesses data stored in the user's session.

**Best Practice:** Use `{input:variableName}` for data coming directly from the UI interaction trigger. Use
`{buffer:...}` or `{result:...}` for chaining data between actions in a sequence.

#### Action Handlers

* Specify the PHP handler using `target: handler:HandlerAlias::method` or
  `target: handler:App\\Namespace\\Class::method`.
* The exact mapping mechanism (`HandlerAlias` to `HandlerClass`) and the preferred syntax (`::` vs `/`) are still under
  investigation but assumed to follow a convention. Stick to `::` as seen in examples.
* Pass data using `params: {...}`.

### Action File Structure (`actions/*.json`)

```json
[
  {
    "action": "actionType", // e.g., read, update, save, command, condition
    "to": "targetResource", // e.g., handler:..., page/template.json, elementId.property, temp:variable
    "from": "sourceResource", // e.g., handler:..., page/template.json, elementId.property, temp:variable
    "condition": "buffer:someFlag" // Optional: Condition to execute action
  }
  // ... more actions in sequence
]
```

## Пример: Сохранение и загрузка данных в сессии

В этом примере показан полный цикл: сохранение данных из формы в сессию и последующая загрузка и отображение их в UI.

### UI-файл: `save-session-test.json`

- Форма `Form` с `formId: "saveSessionForm"`.
- Поле ввода `InputText` с `props.name: "textToSave"`, `model: { "form": "saveSessionForm", "field": "textToSave" }`.
- Кнопка "Save to Session" с `customHooks.click`:
  ```json
  {
    "action": "sendData",
    "data": {
      "sendTo": "save-to-session",
      "form": "saveSessionForm"
    }
  }
  ```
- Кнопка "Load Session Data to div" с `customHooks.click`:
  ```json
  {
    "action": "sendData",
    "data": {
      "sendTo": "session-test-v1/load-from-session-to-content"
    }
  }
  ```

### Action-файл: `actions/save-to-session.json`

```json
[
  {
    "action": "update",
    "to": "session!test-save-to-session",
    "from": "{input:textToSave}"
  }
]
```

### Action-файл: `actions/load-from-session-to-content.json`

```json
[
  {
    "action": "update",
    "from": "session:test-save-to-session",
    "to": "playground/save-session-test:content.children.1.children.1.props.content"
  },
  {
    "action": "save",
    "from": "playground/save-session-test"
  }
]
```

**Вывод:** используйте шаблонный паттерн (update + save) и `{input:fieldName}` для работы с данными из формы в сессии.

## Дополнение: Обновленная синтаксическая информация для обновления буфера

- При обновлении буфера в action файлах, таких как `actions/model-test-v1/delete-model-by-id.json`, используется ключ
  `"to": "buffer:..."` вместо `"result": "buffer:..."`. Это изменение необходимо для подтверждения использования
  шаблонного паттерна Template Processing Pattern для UI обновлений.
