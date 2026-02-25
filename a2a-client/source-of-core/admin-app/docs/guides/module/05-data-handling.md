# 05 - Data Handling (`data/program.json`, etc.)

This guide describes how the AI Task System modules work with data, particularly concerning the `data/` directory and
data access patterns. The central mechanism for data exchange is the **DataHub**, accessed via the *
*InstructionProcessor** API.

## 1. Data Storage Locations and Access Paths (`DataHub` Addressing)

Data can reside in various locations: JSON files, session storage, temporary buffers, Eloquent models, MySQL tables,
etc. Access to all these locations is unified through address strings parsed by the `StoragePathParser` class (located
at `app/AiRudeDepot/Processors/InstructionProcessor/StoragePathParser.php`). These addresses are used throughout the
system, especially in action instructions (`from`, `to`, `condition`, `value` fields) and UI bindings (`props`,
`model`). The `InstructionProcessor` (located at `app/AiRudeDepot/Processors/InstructionProcessor.php`) provides the
API (`get`, `set`, `save`, `remove`, `find`) used by instruction handlers (`StorageHelper.php`) to interact with the
`DataHub` based on these addresses.

**For a complete description of formats, see:
** [StoragePathParser.md](../../../docs-mirrors/app/AiRudeDepot/Managers/StoragePathParser.md) (describes DataHub
addressing and parsing) and [DataHub.md](../../../docs-mirrors/app/AiRudeDepot/Storage/DataHub.md) (overview of the
DataHub).

**Common Prefixes (Used in DataHub Addressing):**

* `file!path/to/file.json`: For JSON files within the `storage/aiInstaller/` directory, relative to the module's
  installed location (e.g., `file!modules/login-form/v1/data/program.json`). The path is relative to the AI Installer
  root.
* `buffer:bufferName.key`: For temporary data stored in transient buffers within the `DataHub` during the processing of
  a request or scenario step. Examples: `buffer:input` (data from UI), `buffer:output` (data to send back to UI),
  `buffer:validationErrors` (errors from validation), `buffer:actionResult` (result of an action call),
  `buffer:for.loopIndex` (index in a for loop).
* `model!ModelName`: For interacting with Laravel Eloquent models (e.g., `model!App\Models\User`). This typically
  requires the `DataManipulateHelper` to perform operations like `simulateCreateInstance`.
* `session:key.subkey`: For accessing PHP session data.
* `args:argName`: For accessing arguments passed to an instruction (e.g., in a `call` instruction).
* `input:fieldName`: Specifically for accessing data sent from the UI, typically collected from forms and placed into
  the `buffer:input` buffer.
* `output:key`: Specifically for placing data into the response sent back to the UI. This data is accumulated in the
  `buffer:output` buffer.
* `registry:key`: For accessing system registry settings.
* `config:key`: For accessing application configuration values.

**Variable Substitution:** Addresses can contain placeholders in single curly braces `{}` that are resolved by the
instruction execution engine using values from the `DataHub`. Example:
`file!modules/{buffer:currentModule}/data/program.json`.

## 2. Purpose of the `data/` Directory

* **Location:** `implement-modules/{module-name}/vX/data/` (source location before installation).
* **Primary Purpose:** Storing module configuration, initial state data, data schemas, or data-related templates (like
  JSON structures for lists or form blanks). These files are installed to `storage/aiInstaller/{module-name}/vX/data/`.
* **Flexibility:** The content and structure of the `data/` directory **can vary greatly** depending on the module's
  needs. It is common to find files like `program.json` for main configuration, or subdirectories with other JSON files.

## 3. Main Data File (`program.json`) - *Common but Not Mandatory Pattern*

* **Filename:** Often named `program.json`.
* **Purpose:** Contains the module's primary configuration, settings, or initial data state. When a page loads, the
  `WalkForForms.php` processor might attempt to load data files specified in the `"model": {"form": "form_name"}`
  definitions from this directory.
* **Structure:** Entirely dependent on the module's logic. It can be a JSON object `{}` or an array `[]`.
* **Example (Hypothetical for `config` module):**
  ```json
  {
    "settings": {
      "siteName": "My Application",
      "maintenanceMode": false
    },
    "availableThemes": ["light", "dark"]
  }
  ```
* **Important:** The presence of `program.json` is **not guaranteed**. Modules might fetch or store data differently (
  e.g., via server actions interacting with databases or other APIs).
* **Study Examples:** Examine `program.json` in working modules to understand how they structure data, particularly how
  keys align with form fields defined in UI pages:
    * [primary-form/v1/data/program.json](../../../implement-modules/primary-form/v1/data/program.json)
    * [login-form/v1/data/program.json](../../../implement-modules/login-form/v1/data/program.json)
    * [config/v1/data/program.json](../../../implement-modules/config/v1/data/program.json)
    * *(Look for other examples; note that not all modules use a `program.json`)*

## 4. Other Content in the `data/` Directory

The `data/` directory might contain other files or subdirectories.

* **Example (
  `playground/v1` - [implement-modules/playground/v1/data/blanks/status-item.json](../../../implement-modules/playground/v1/data/blanks/status-item.json)):
  **
    * `implement-modules/playground/v1/data/blanks/status-item.json`
    * **`status-item.json` Content:** This file contains a JSON structure representing a UI component template.
      ```json
      {
        "type": "div", // div component
        "props": {
          "class": "text-sm text-gray-700",
          "content": ""
        }
      } 
      ```
    * **Purpose:** In this case, `data/` contains a `blanks/` subdirectory with a **UI component template**, not a
      `program.json` data file. These templates are often loaded dynamically by actions (using `action: "update"`,
      `from: "file!modules/path/to/template.json"`) and added to the UI structure in `DataHub` buffers (using
      `action: "add"`).

## 5. Data Access and Initialization Flow

* **Page Loading and Form Initialization:** When a page defined in `pages/page.json` is loaded by
  `PageModule::moduleRun`, it undergoes processing by `DataProcessor` using modifiers like `WalkForOperations.php` and
  `WalkForForms.php`. `WalkForForms.php` specifically scans the page structure for components with a
  `"model": {"form": "form_name", ...}` definition. For each form, it attempts to load initial data from
  `file!modules/{$this->getSlug()}/data/{form_name}.json` (or similar conventions). It also merges validation errors
  found in the `DataHub` buffer `buffer:validationErrors` into the form data structure before passing it to the
  frontend.
* **Access in Actions:** Server actions defined in `actions/*.json` can access data from various sources using `DataHub`
  addresses in their instructions (`from`, `value`, `condition`). This is facilitated by the `InstructionProcessor` API
  called by the instruction handlers in `StorageHelper.php`.
    * **Submitted Form Data:** Data sent from the UI via `customHooks` and `sendData` is typically available in the
      `buffer:input` buffer and can be accessed using `form:form_name` or `input:fieldName` prefixes.
    * **Original Source Data:** Initial module data (e.g., from `data/program.json`) can be read directly using the
      `file!` prefix address (e.g., `from: "file!modules/config/v1/data/program.json"`).
* **UI Binding:** Data displayed in the UI is typically bound to the frontend state manager (e.g., Vuex store or
  similar), which is synchronized with the `DataHub` buffers like `buffer:output` or specific data structures prepared
  by server actions. Direct binding like `{data...}` within raw UI JSON templates is generally **not supported**.

## 6. Modifying Data

* `program.json` usually represents the **initial state/configuration**. Changes made to data during user interaction or
  server action execution are typically *not* saved back directly to the original `program.json` file.
* Dynamic data changes during runtime typically occur via:
    * **Server Actions:** Instructions within `actions/*.json` use the `InstructionProcessor` API (`set`, `save`,
      `remove`) to modify data in `DataHub` buffers, save data to persistent storage (databases via `model!` or
      `mysql!`, or files via `file!` followed by a `save` instruction), or update the frontend state via
      `buffer:output`.
    * **Client-Side State Management:** (e.g., Form data changes managed by a frontend form manager like PrimeVue's
      built-in mechanisms or a custom implementation).

## 7. Pattern: Form Initialization + Dynamic Load

A common task is to initialize a form with defaults, then load and display current data for some fields (e.g., user data
from session) while keeping others editable.

This is achieved by defining instructions in an action file that first populate a `DataHub` buffer with default values,
then conditionally overwrite specific fields with dynamically loaded data (e.g., from `session:` or `model!`), and
finally make this buffer available to the UI for form binding.

**Example (Conceptual flow in an action file - Based on `config` module):**

1. **Initialize Buffer with Defaults:** Use an `update` instruction with a `value` containing the default form structure
   and values, targeting a `buffer:` address (e.g., `buffer:formData`).
   ```json
   // Step 1: Initialize formData buffer with default values
   {
     "action": "update", 
     "to": "buffer:formData",
     "value": { 
       "apiKey": "", 
       "flags": { "newDashboard": false, "betaFeatureX": false },
       "theme": "default-theme",
       "userName": "",
       "userEmail": ""
     }
   }
   ```
2. **Conditionally Load and Overwrite:** Use one or more `update` instructions with a `condition` to check if dynamic
   data exists (e.g., `session:user`). If the condition is true, use the `from` field with a `DataHub` address (e.g.,
   `session:user.name`) and the `to` field targeting the corresponding key in the `buffer:formData` (e.g.,
   `buffer:formData.userName`).
   ```json
   // Step 2: Update parts of formData buffer with session data (if available)
   {
     "action": "update",
     "condition": [ "notEmpty", "session:user" ], 
     "batch": [
       { "from": "session:user.name", "to": "buffer:formData.userName" },
       { "from": "session:user.email", "to": "buffer:formData.userEmail" }
       // Other session fields could be here
     ]
   }
   ```
3. **Make Buffer Available to UI:** Ensure the final `buffer:formData` content is included in the response sent back to
   the UI, typically by using a final `return` instruction with the buffer as the `from` or `value`, or by updating a
   key in `buffer:output` with the buffer's content.
   ```json
   // Step 3: Return the populated buffer to the UI
   {
     "action": "return",
     "from": "buffer:formData"
   }
   ```

On the frontend, the UI component for the form must be configured to bind its fields (`model.field`) to the data
structure passed from the backend response. The frontend framework/manager is responsible for mapping the received data
to the form's local state.

**Important:**

* The specific `buffer:` keys used (e.g., `buffer:formData`) and the exact mechanism for passing data from the backend
  buffer to the frontend form state depend on the system's frontend implementation details (e.g., Vue components,
  FormManager, how the backend response is processed client-side).
* Ensure keys in the default `value` and the paths in conditional `update` instructions (`to` field) precisely match the
  `model.field` values expected by the frontend form components.

## 8. Related Documents

* [UI Construction](./04-ui-construction.md)
* Form Handling &
  Binding: [VModel.md](../../../docs-mirrors/resources/common/js/Elements/Primevue/VModel.md), [FormManager.md](../../../docs-mirrors/resources/common/managers/FormManager.md)
* [Actions Logic](./06-actions-logic.md) - **Crucial for understanding how data is processed on the server.**
* Action Manager: [ActionManager.md](../../../docs-mirrors/resources/common/managers/ActionManager.md)
* Data Handling Concepts: While a specific "DataConcepts" document was not located, refer
  to [StoragePathParser.md](../../../docs-mirrors/app/AiRudeDepot/Managers/StoragePathParser.md)
  and [DataHub.md](../../../docs-mirrors/app/AiRudeDepot/Storage/DataHub.md) for fundamental concepts.
* **Strict Module Structure Checklist:
  ** [../../engine/meta/StrictModuleChecklist.md](../../engine/meta/StrictModuleChecklist.md) - Provides a checklist
  that includes data handling requirements. 
