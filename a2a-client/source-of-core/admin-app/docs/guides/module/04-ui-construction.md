# 04 - UI Construction (`page.json`, `templates/`)

This guide explains how to create the user interface (UI) of a module using JSON structures within the AI Task System.

**Crucial Principle: Refer to Examples!**

The JSON-based UI system has specific conventions. Instead of guessing structures or relying solely on component
documentation, **always**:

1. **Study existing, working modules:** `implement-modules/login-form/v1/`, `implement-modules/primary-form/v1/`,
   `implement-modules/landing-main-page/v2/` are good starting points.
2. **Copy and adapt** working JSON snippets from these etalon modules.
3. **Compare** your JSON with examples, especially when encountering issues.

This is the most reliable way to avoid errors and understand the correct approaches.

## 1. Main UI File (`page.json`)

* **Purpose:** Defines the main UI structure of the module or its entry point. It is typically the first file loaded by
  the backend when rendering a module's page (e.g., by `PageModule::moduleRun`).
* **Filename:** While older modules might use `index.json` or `layout.json`, the current standard is `page.json`.
* **Location:** `implement-modules/{module-name}/vX/pages/page.json` (source) which gets installed to
  `storage/aiInstaller/modules/{module-name}/vX/pages/page.json`.
* **Structure:** A JSON object describing components and their properties. It forms a tree of nested components.
* **Example (`login-form/v1/pages/page.json`):
  ```json
  {
      "type": "Page",
      "title": "Login Form",
      "content": {
          "type": "Card",
          // ... props ...
          "children": [
              {
                  "type": "Form",
                  "name": "login-form",
                  // ... props ...
                  "children": [
                      // ... InputText and Password components ...
                      {
                          "type": "Button",
                          // ... props ...
                          "customHooks": {
                              "click": [
                                  {
                                      "action": "sendData",
                                      "data": {
                                          "sendTo": "login-form/actions/login", // Note: Corrected path relative to module
                                          "form": "login-form"
                                      }
                                  }
                              ]
                          }
                      }
                  ]
              }
          ]
      }
  }
  ```

## 2. Using Components

The UI is built from Vue components (often PrimeVue components or custom ones).

* **Specifying Component:** Use the `"type"` key. The value should be the component's registered name (e.g., `"Button"`,
  `"InputText"`, `"Card"`, `"Form"`). Refer to `/docs/guides/StrictModuleChecklist.md#3.1.` for rules on casing.
* **Properties (`props`):** Passed via the `"props"` object. Check component documentation and working examples for
  correct property names and values.
    * Example: `{ "type": "Button", "props": { "label": "Click Me", "icon": "pi pi-check" } }`
    * Data binding to `DataHub` from `props` is typically done using string values like `"{buffer:page.title}"` which
      are resolved by the backend during rendering.
* **Child Elements (`children`):** An array (`[]`) of JSON objects describing nested components.
* **Available Components:** Refer to PrimeVue documentation and any custom component libraries used by the project. The
  `component-map.json` and validation rules might provide hints but practical examples are best.
* **Rendering Process:** The backend (`DataProcessor` with modifiers like `WalkForOperations.php` and
  `WalkForForms.php`) processes `page.json`. It resolves `include` operations, prepares form data, and then passes the
  final JSON structure to the frontend, where Vue components render the UI.

## 3. Data Binding (`model` and `DataHub`)

For data-driven components like form inputs, a nested `"model"` object links the UI component to a specific form context
and field within the `DataHub` (managed client-side by a FormManager, initialized by backend data).

* **`model` Object Structure:**
  ```json
  "model": {
    "form": "form_context_name", 
    "field": "field_name_in_context",
    "default": "optional_default_value"
  }
  ```
* **Keys:**
    * `"form"`: (String, Required) Name of the form context (e.g., `"login-form"`). This name is defined by the `name`
      prop of the parent `Form` component.
    * `"field"`: (String, Required) Name of the field (key) within this form context's data object (e.g., `"username"`,
      `"password"`).
    * `"default"`: (Any type, Optional) An initial value for this field if no other data is loaded from `data/` files or
      `DataHub` buffers.
* **Relation to `data/` files and `WalkForForms.php`:** The `WalkForForms.php` processor, when processing `page.json`,
  attempts to load initial data for forms from `data/{form_context_name}.json` or similar conventions (e.g.,
  `data/program.json` with keys matching form fields). This data, along with any validation errors from
  `buffer:validationErrors`, populates the initial state of the form in `DataHub`, which is then used by the frontend
  FormManager.
* **Example (`login-form/v1/pages/page.json` - InputText for login):
  ```json
  {
      "type": "InputText",
      "props": {
          "placeholder": "Enter your login",
          "class": "mt-1 block w-full bg-surface-700 text-surface-0",
          "label": "Login"
      },
      "model": {
          "form": "login-form",
          "field": "login"
      }
  }
  ```
* **Mechanism:** On the frontend, a FormManager (or similar Vuex-based state management) maintains the state for each
  form context. UI components with `model` definitions bind to this state (two-way binding).

## 4. Triggering Server Actions (`customHooks` and `sendData`)

The standard mechanism for initiating server actions from the UI is through `customHooks` defined on components.

* **Structure:** Add a `customHooks` key to the component's JSON. Its value is an object where keys are event names (
  e.g., `"click"`, `"change"`), and values are arrays of client-side action objects.
* **`sendData` Client-Side Action:** This is the most common client-side action to trigger a backend server action.
    * `"action": "sendData"`: Instructs the frontend `ActionManager` to make a request to the backend.
    * `"data"`: Object containing parameters for the `ActionManager.sendData` call:
        * `"sendTo"`: (String, Required) Path to the server action JSON file, relative to the module's installed
          `actions/` directory. Example: `"login-form/actions/login"` will resolve to
          `storage/aiInstaller/modules/login-form/vX/actions/login.json`. The backend (`App::moduleActions` ->
          `DataProcessor::processActionFile`) uses this to locate and execute the server-side instruction JSON.
        * `"form"`: (String, Optional but common) Name of the form context (e.g., `"login-form"`) whose data should be
          collected and sent to the backend. This data becomes available in `DataHub` as `buffer:input` or accessible
          via `form:{form_name}` addresses in server instructions.

* **Example (`login-form/v1/pages/page.json` - Login Button):
  ```json
  {
      "type": "Button",
      "props": {
          "label": "Login",
          "icon": "pi pi-sign-in",
          "class": "btn-primary ml-auto"
      },
      "customHooks": {
          "click": [
              {
                  "action": "sendData",
                  "data": {
                      "sendTo": "login-form/actions/login",
                      "form": "login-form"
                  }
              }
          ]
      }
  }
  ```

## 5. Form Grouping (`Form` Component)

For data binding (`model`) and data collection for `sendData` to work correctly, input components and their submission
triggers are typically wrapped in a `Form` component.

* **Component:** `{ "type": "Form", ... }`
* **Key Prop (`name`):** `{ "type": "Form", "name": "form_context_name", ... }`
    * Defines a unique name for this form's context (e.g., `"login-form"`).
    * This `name` **must match** the `"form"` value in the `"model"` objects of child input components and the `"form"`
      value in `customHooks` that send this form's data.
* **Content (`children`):** Array containing all form controls (InputText, Password, Button with `customHooks`, etc.).
* **Example (`login-form/v1/pages/page.json` - Wrapping the form elements):
  ```json
  {
      "type": "Form",
      "name": "login-form", // This name is used in model.form and customHooks.data.form
      "props": { "class": "p-8 bg-surface-800 rounded-md shadow-lg" },
      "children": [
          // ... InputText for login ...
          // ... Password component ...
          // ... Button with customHook to sendData for login-form ...
      ]
  }
  ```

## 6. Reusing UI: The `include` Operation

The `include` mechanism allows inserting the content of one JSON file (a template or section) into another. This is
processed server-side by `WalkForOperations.php`.

* **Syntax:**
  ```json
  {
    "type": "operation",
    "action": "include",
    "source": "{module-slug}/templates/{type}/{template-filename-no-ext}" // Or path to sections, etc.
  }
  ```
* **Keys:**
    * `"type": "operation"`: Indicates this is an operation for `WalkForOperations.php`.
    * `"action": "include"`: Specifies the operation type.
    * `"source"`: Path to the file to be included. This path is resolved relative to the `storage/aiInstaller/modules/`
      directory. The `{module-slug}` is derived from the current module context (e.g., from its `$folder` property) or
      can be specified explicitly.
* **Example:** To include `storage/aiInstaller/modules/my-module/v1/templates/parts/common-header.json`, specify
  `"source": "my-module/templates/parts/common-header"`.
* **File Location:** Files for inclusion are typically located in `templates/` (often with subdirectories like `forms/`,
  `parts/`) or `sections/` within the module's version directory (`implement-modules/{module-name}/vX/`).

## 7. UI Modularity: Templates and `include` (Recommended Approach)

* **Principle:** Break down complex UIs into logical parts (full forms, reusable sections, small components) and extract
  them into separate JSON template files.
* **Structure:** Place these template files in the module's `templates/` or `sections/` directory.
* **Inclusion:** Insert these templates into `pages/page.json` (or other templates) using the
  `{"type": "operation", "action": "include", "source": "..."}` object.
* **Benefits:** Improves readability, maintainability, and reusability of UI code.

## 8. Inline UI Definition (Less Recommended)

Defining the entire UI structure directly within `pages/page.json` can lead to large and hard-to-manage files. It's
generally better to use `include` for modularity, except for very simple UIs.

## 9. Dynamic Content and Conditions

Conditional rendering (`v-if`, `v-for` like behavior) and dynamic content are achieved by how the backend processors (
like `WalkForOperations.php`) and action instructions manipulate the JSON structure before it's sent to the frontend, or
by how frontend components interpret data received from `DataHub` (e.g., an array of items to render a list, a boolean
to show/hide a panel).

## 10. Data Binding (Recap)

* Input fields bind to frontend form state via the `"model"` object.
* This frontend state is initialized by data prepared by the backend (`WalkForForms.php` loading from `data/` files and
  merging errors from `buffer:validationErrors`), all orchestrated through `DataHub`.

## 11. Event Handling (`customHooks` Recap)

* User interactions (clicks, changes) are handled via `customHooks`.
* Hooks trigger client-side actions (most commonly `sendData`), which in turn invoke server-side action JSON files via
  the frontend `ActionManager` and backend instruction engine.
