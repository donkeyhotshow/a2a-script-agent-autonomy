Thank you for providing the contents of the `/c:/apps/admin-app/docs/guides/module` directory. This set of documents (
`01-overview-creating-modules.md`, `02-file-structure.md`, `03-metadata.md`, `04-ui-construction.md`,
`05-data-handling.md`, `06-actions-logic.md`, `07-build-merge.md`, `08-validation.md`, `09-lifecycle-maintenance.md`,
`README.json`) seems to be the comprehensive guide for working with modules.

I will now use these documents as the primary source of truth regarding module structure, development, and best
practices. This is exactly the kind of documented information we need for fact-based operations.

To fully integrate the knowledge from these guides, I will start by reading the foundational documents that cover the
overview and file structure. This will provide a solid context for understanding the subsequent, more detailed guides.

Read file: docs/guides/module/01-overview-creating-modules.md

Read file: docs/guides/module/02-file-structure.md
I have now read the `01-overview-creating-modules.md` and `02-file-structure.md` guides. These provide a much clearer
and authoritative view of the intended module structure and development process.

Here are the key takeaways that align with and refine our previous findings:

* **Module Source Location:** Source files are in `script/data/implement/{module-name}/v{version-number}/`.
* **Versioning (`vX/`):** Mandatory subdirectory for each version.
* **Mandatory `_i/`:** Confirmed as mandatory inside `vX/`.
* **Key `_i/` Files:**
    * `meta.json`: Confirmed for metadata (name, version, etc.).
    * `links.json`: Used for routing (confirmed our observation from InstallerController).
    * `common.json`: Used by the installer to list **key module files by category** (this contradicts our previous
      finding that `common.json` listed *common* files. The example structure in `02-file-structure.md` for
      `common.json` looks more like a simplified version of `files-by-block.json`).
    * `files-by-block.json`: Confirmed as a **key file for registering module files by logical blocks** for the
      installer. The example structure shows top-level keys as block names (e.g., `"main-section"`) and nested keys for
      file categories (`"actions"`, `"templates"`, `"data"`), which then contain arrays of file paths.
* **Standard Directories (inside `vX/`):** `page.json` (or similar), `data/`, `sections/`, `templates/`, `programs/`,
  `actions/`, `_i/`, `docs/`. The guide emphasizes that this is typical, but actual structure may vary.
* **Deprecated Files:** `@specification.md`, `@memories.md`, `@scratchpad.md` in the module version directory are
  deprecated.

**Refinement of our understanding of `_i/common.json` vs. `_i/files-by-block.json`:**

The `02-file-structure.md` guide suggests that `common.json` lists "key module files by category for the installer" and
provides an example that looks very similar in structure to the `files-by-block.json` examples we've seen. It also
states that `files-by-block.json` "registers module files by logical blocks."

This indicates that **both `common.json` and `files-by-block.json` in the `_i/` directory are used by the installer to
get lists of files, but they might serve slightly different organizational purposes or be processed in different stages
or for different aspects of the installation.** The guide's description of `common.json` as listing "key module files by
category" seems to overlap significantly with the purpose of `files-by-block.json`.

**Next Steps based on the Guides:**

1. **Re-examine `StrictModuleChecklist.md`**: We need to adjust the description of `_i/common.json` based on the guide's
   definition and example. The guide's example structure for `common.json` is different from our previous inference that
   it was for *common* files not tied to specific blocks.
2. **Prioritize Guide Information**: From now on, the information in these `/docs/guides/module` files will take
   precedence over our inferences from code analysis, unless the code clearly demonstrates a different current practice.
3. **Continue Reading Guides**: To fully understand the module system, we should continue reading the remaining guides:
    * `03-metadata.md` (will provide more details on `meta.json` and likely `_i/` files).
    * `04-ui-construction.md` (how to build the UI with JSON).
    * `05-data-handling.md` (how data works).
    * `06-actions-logic.md` (how server actions work).
    * `07-build-merge.md` (details on the build/installation process).
    * `08-validation.md` (how validation is implemented).
    * `09-lifecycle-maintenance.md` (overall module lifecycle).

Let's start by reading `03-metadata.md`.

Read file: docs/guides/module/03-metadata.md
I have now read the `03-metadata.md` guide. This guide provides more detail on the `_i/` directory and its contents.

Here's what it adds to our understanding:

* **`_i/` Purpose:** Stores files related to module metadata and **installation configuration** via the AI Installer.
  These files are *not* part of the UI or main data.
* **`meta.json`:** Confirmed as **recommended** and important for system integration (especially the installer). The
  guide lists typical keys: `name`, `description`, `version`, `author`, `dependencies`. It emphasizes checking working
  modules for the latest required/recommended keys.
* **Installer Configuration Files:** Explicitly states that `_i/` contains JSON files defining *how* the installer
  should install and integrate the module. It lists examples found in `playground/v1/_i/`: `common.json`, `links.json`,
  `files-by-block.json`, `css.json`, `meta-admin.json`, `useAnyway.json`.
* **`common.json` and `links.json` Examples:** Provides examples of the structure for `common.json` and `links.json`,
  reiterating that their exact structure and purpose are defined in the installer documentation. The `common.json`
  example again shows a structure mapping categories to file lists, reinforcing that it's related to file registration
  for the installer.
* **Build Process (`module:merge`):** Notes that the `module:merge` command *copies* the `_i/` directory but doesn't
  directly use the content of these configuration files; they are for the *installer*.

**Updated Understanding of `_i/` Files and Installation:**

It's becoming clearer that the `_i/` directory is the interface between the module source code and the installer/build
system.

* `meta.json` provides general information.
* `files-by-block.json` (and potentially `common.json`) tell the **installer** which files belong to which logical
  blocks and should be copied to the installation directory (`storage/ai/`) when those blocks are selected.
* `links.json` tells the **installer** how to create permanent links/routes for the module.
* Other files like `css.json` or `meta-admin.json` likely configure other installer-specific actions (e.g., CSS
  processing, admin menu entries).

The `03-metadata.md` guide still points to "AI Installer documentation" and "Installer Controller Documentation" (
currently marked as TBD) for the definitive structure and purpose of these files, but our analysis of
`InstallerController.php` and `SchemaHelper.php` has given us that missing piece of information about how
`files-by-block.json` and `common.json` are processed via `extractFilePaths`.

**Next Steps:**

1. **Refine `StrictModuleChecklist.md` (again)**: Based on `03-metadata.md`, we should further refine the description of
   the files in `_i/`, emphasizing their role for the *installer* and listing the commonly encountered ones from the
   guide's examples (`meta.json`, `links.json`, `common.json`, `files-by-block.json`, `css.json`, `meta-admin.json`,
   `useAnyway.json`), noting which are essential for basic discovery/installation.
2. **Continue Reading Guides**: The next logical guide is `04-ui-construction.md`, which should explain how the UI is
   built using JSON, components, and includes. This is directly relevant to the `question-to-user/v5` module's form
   interface.

Let's update the checklist first, incorporating the clearer distinction between files essential for *any* module vs.
those specifically for the *installer* features.

Отлично, `StrictModuleChecklist.md` обновлен с учетом информации из `03-metadata.md`. Теперь он более точно отражает
роль `_i/` директории и файлов в ней для инсталлятора.

Следующим шагом, как мы планировали, будет чтение руководства по построению UI: `04-ui-construction.md`. Это напрямую
связано с задачей создания формы для модуля `question-to-user/v5`.

Read file: docs/guides/module/04-ui-construction.md
I have now read the `04-ui-construction.md` guide. This document is highly relevant to creating the
`question-to-user/v5` module's interface.

Here's a summary of the key points regarding UI construction:

* **JSON Structure:** UI is defined using nested JSON objects representing components and their properties.
* **`page.json` (or similar):** The main file defining the UI structure.
* **Components:** Defined using the `"type"` or `"component"` key (check examples for standard). Properties are passed
  via the `"props"` object. Child components are in the `"children"` array.
* **Data Binding (`"model"`):** Used for form inputs to link to client-side form data managed by a `FormManager`.
  Requires `"form"` (form context name) and `"field"` (field name within the form data). Data from `program.json` is
  typically used for initial form data.
* **Server Actions (`"customHooks"`):** Server actions are triggered via `"customHooks"`, mapping DOM events (e.g.,
  `"click"`) to action objects. The `"sendData"` action is used to send form data to a server action file (specified by
  `"sendTo"`).
* **Form Grouping (`"Form"` component):** Form components (`InputText`, `Button`, etc.) should be wrapped in a `"Form"`
  component. The `"Form"` component's `"name"` prop matches the `"form"` value in the `"model"` objects of its children,
  defining the form context.
* **UI Reusability (`"operation": "include"`):** The `"include"` operation allows inserting JSON content from one file
  into another. The `source` path is relative to the modules root (`script/data/implement/`), in the format
  `{module-name}/{path-within-version-no-json-ext}`.
* **Modularity (Templates):** Recommended to break down UI into template files (in `templates/`, often with `forms/` and
  `parts/` subdirectories) and include them in `page.json`.

**Applying this to `question-to-user/v5`:**

* We will need a `page.json` (or similar) file to define the main layout.
* The form for capturing user answers will likely involve components like `InputText`, `TextArea`, or `RadioButton`,
  each with a `"model"` object linking to a form context (e.g., `"question-answers-form"`) and specific field names (
  e.g., `"answer_to_q1"`).
* We will need a `"Form"` component to wrap these input fields, with its `name` matching the form context name in the
  `"model"` objects.
* A button (e.g., `"Button"`) will be needed to submit the answers, using a `"customHooks"` `"click"` event to trigger a
  `"sendData"` action.
* This `"sendData"` action will point to a server action file (e.g., in `actions/`) that will handle saving the
  submitted data.
* The initial questions themselves could potentially be loaded from a data file (e.g., in `data/`) and maybe rendered
  dynamically using loops (though the guide mentions dynamic content is TBD). Alternatively, the AI could generate the
  UI JSON with questions directly embedded.

**Next Steps:**

The next logical guides to read are:

1. `05-data-handling.md`: This will explain how data is managed and structured, which is crucial for understanding how
   the initial questions are loaded and how the user answers will be stored.
2. `06-actions-logic.md`: This will detail how server actions are written in JSON, which we'll need for saving the user'
   s answers.

Let's continue with `05-data-handling.md`.

Read file: docs/guides/module/05-data-handling.md
I have finished reading the `05-data-handling.md` guide. This document provides essential information on how data is
managed within the module system, which is crucial for our `question-to-user/v5` module.

Here are the key takeaways:

* **Data Locations & Access Paths:** Data can be in files, session, buffers, database, etc. Access uses prefixes like
  `file!`, `model!`, `session:`, `buffer:`.
* **`data/` Directory:** Primarily for module configuration, initial state, or data-related templates. Its structure is
  flexible.
* **`program.json`:** A common (but not mandatory) file in `data/` for primary configuration/initial state.
* **Form Initialization:** When a module loads, the system likely reads initial data (e.g., from `data/program.json`)
  for forms based on the `"model"` definitions in the UI JSON. This data is then used to initialize the frontend form
  state (likely via a `FormManager`).
* **Data Access in Actions:** Server actions can access submitted form data using a prefix like `form:{form_name}` or
  read original source data using `file!path/to/file`.
* **Direct UI Binding Limitation:** Direct binding like `{data...}` in UI templates is generally *not* supported. Data
  is accessed via includes, data binding concepts (`"model"`), or component props.
* **Modifying Data:** `program.json` is for initial state. Dynamic changes happen via server actions saving to
  persistent storage or client-side state managers.
* **Form Initialization + Dynamic Load Pattern:** A common pattern involves initializing a form buffer with defaults in
  a server action, then selectively overwriting with dynamic data (e.g., from session), and finally using this buffer to
  populate the form fields on the frontend.

**Applying this to `question-to-user/v5`:**

* The AI-generated questions and their initial state could potentially be stored in a file like `data/questions.json`
  within the module.
* The user's answers would be captured via form fields bound using the `"model"` object (e.g.,
  `"model": {"form": "answersForm", "field": "q1_answer"}`).
* When the user submits the form, the `"sendData"` action would collect the data from the `"answersForm"` context.
* The server action triggered by `"sendData"` would then need to save this submitted data. The guide mentions saving to
  databases or persistent storage. For our goal of having the AI process the answers from files, the server action
  should save the submitted JSON data to a designated file, perhaps using a `file!` prefix in an instruction within the
  action.
* We might need a mechanism to associate the saved answers file with the specific set of questions that was presented.

**Next Steps:**

The most critical remaining guide for our immediate task is `06-actions-logic.md`, which will explain how to write the
JSON instructions for server actions. This is where we'll learn how to implement the saving of user answers to a file.

Let's read `06-actions-logic.md`.

Read file: docs/guides/module/06-actions-logic.md
I have read the first 250 lines of the `06-actions-logic.md` guide. This document is exactly what we need to understand
how to implement the saving of user answers in our `question-to-user/v5` module.

Here are the key points from the portion I've read:

* **Purpose of `actions/`:** Contains JSON files with sequences of instructions for server-side execution triggered by
  UI events.
* **Location:** `script/data/implement/{module-name}/vX/actions/`. Subdirectories are recommended for organization.
* **Action File Format:** A JSON **array** of Instructions objects.
* **Instruction Object:** Has keys like `"action"`, `"from"`, `"to"`, `"value"`, `"condition"`, etc. The available keys
  depend on the `"action"`.
* **Data Sources/Destinations:** Use prefixes like `buffer:`, `input:`, `output:`, `form:{form_name}`, and paths like
  `{module}/{path}` (e.g., `config/data/program`).
* **Variable Substitution:** Use single curly braces `{}` to substitute values from form data or buffers into paths (
  e.g., `{form:configForm.targetModule}`).
* **Key Actions:**
    * `"update"`: Moves/copies data from `"from"`/`"value"` to `"to"`.
    * `"save"`: **Persists data that has already been placed at a persistent storage address** (e.g., using a preceding
      `"update"` action to a `file!` or module path). The guide mentions `\"from\": \"config/data/program\"` in the
      `"save"` action, suggesting it might also need the target address.
    * `"return"`: Terminates execution and sends data (`"from"`/`"value"`) back to the client. Recommended for sending
      the final result and UI commands.
* **Triggering Actions:** Recommended via `"customHooks"` on UI components, using the `"sendData"` action in the hook
  which points to the server action file (`"sendTo"`) and the form context (`"form"`).
* **Data Transfer:** The system automatically collects data from the specified form context (`data.form`) and makes it
  available server-side via the `form:{form_context_name}` prefix.

**Implementing Answer Saving in `question-to-user/v5`:**

Based on this, the server action to save user answers would likely:

1. Receive the submitted form data using `form:{form_context_name}` (where `{form_context_name}` matches the `name` of
   the `"Form"` component in the UI).
2. Use an `"update"` action to move this data to a persistent storage location. For saving to a file, this location
   would likely be a path using the `file!` prefix or a module-relative path that the system resolves to a file.
3. Use a `"save"` action, targeting the same persistent storage location, to actually write the data to the file.
4. Use a `"return"` action to send a response back to the client (e.g.,
   `{"status": "success", "message": "Answers saved."}`).

**Remaining Portion of the Guide:**

The remaining lines (251-268) likely contain examples or further details on error handling, updating UI after saving, or
other related concepts. I should read those to ensure I have the complete context from this guide.

Read file: docs/guides/module/06-actions-logic.md
I have now finished reading the `06-actions-logic.md` guide. The remaining sections confirmed and expanded upon the
initial part:

* **Error Handling:** Server actions should return errors using `"return"` with `"status": "error"` and a `"message"`.
  Client-side code should check for this status and display the message (e.g., using a toast notification).
* **Updating UI After Save:** Recommend refetching data or manually updating state client-side after a successful save
  to ensure the UI reflects the changes.
* **Related Documents:** Lists other relevant reference documents (though many are TBD).

**Applying this to `question-to-user/v5` (Saving Answers):**

The process for saving user answers is now clearer:

1. **UI:** A form with input fields (each with a `"model"` binding to a form context) and a submit button.
2. **Submit Button Hook:** The button's `"customHooks"` will use `"action": "sendData"` pointing to a server action
   file (e.g., `question-to-user/actions/save-answers.json`) and the form context name.
3. **Server Action (`save-answers.json`):**
    * Receive form data via `form:{form_context_name}`.
    * Use an `"update"` action to place the received data at the desired file path (e.g., using a `file!` prefix:
      `"to": "file!path/to/save/answers.json"`). We'll need to determine the specific file path convention (perhaps
      including a task ID or timestamp in the filename).
    * Use a `"save"` action with the same target path (`"from": "file!path/to/save/answers.json"`) to write the data to
      the file.
    * Include a `"return"` action with `{"status": "success", "message": "Your answers have been saved."}` (or an error
      message if something went wrong).

**Remaining Guides:**

We still have a few guides left:

* `07-build-merge.md`: Details the build and installation process.
* `08-validation.md`: How validation is implemented.
* `09-lifecycle-maintenance.md`: Overall module lifecycle.

While `07`, `08`, and `09` are less critical for the immediate task of building the form and save action for
`question-to-user/v5`, they are important for a complete understanding of the module system and for future tasks. Given
the instruction to "write everything down," it would be beneficial to read them to add to our knowledge base and
potentially identify more best practices or requirements for the checklist.

Let's proceed with reading `07-build-merge.md`.

Read file: docs/guides/module/07-build-merge.md
I have read the `07-build-merge.md` guide. This document explains the process of getting a module from the development
directory (`script/data/implement/`) to the working directory from which the application runs it (
`storage/aiInstaller/`).

Here are the key points:

* **Command:** The `php artisan module:merge {module-name}` command is used.
* **Purpose:** Copies files from the module's versioned development directories to the installer's working directory.
  Later versions overwrite files from earlier ones.
* **Prerequisite:** **Crucially**, before running `module:merge` for a new module or version for the first time, the
  module name and version **must be added** to the `storage/aiCore/module-versions.json` file. Skipping this step will
  cause the merge command to fail.

**Applying this to `question-to-user/v5`:**

Once we have developed the source files for `question-to-user/v5` in `script/data/implement/question-to-user/v5/`, we
will need to:

1. Add `"question-to-user": ["v5"]` (or add `"v5"` if `"question-to-user"` already exists) to
   `storage/aiCore/module-versions.json`.
2. Run `php artisan module:merge question-to-user`.

This guide doesn't directly impact the structure of the module files themselves, but it outlines a mandatory step in the
development workflow.

**Remaining Guides:**

* `08-validation.md`: How validation is implemented.
* `09-lifecycle-maintenance.md`: Overall module lifecycle.

Let's continue with `08-validation.md`.

Read file: docs/guides/module/08-validation.md
I have read the `08-validation.md` guide. This document describes the `php artisan module:validate` command, but
importantly, highlights that the validator is **not reliable** at this time and should only be used as a secondary tool.

Here's what it covers:

* **Purpose:** Intended to check JSON syntax, component existence, prop conformance, mandatory keys (like `"model"`),
  and include paths.
* **Execution:** Run with `php artisan module:validate {module-name}` on an *installed* module.
* **Process:** Performs checks like JSON syntax validation, comparing keys against a master list (
  `master-known-keys.json`), checking value patterns (`master-value-patterns.json`), and validating components (
  existence of `.vue` files, mandatory `"model"` key for certain components, and rules from `validation/levels/`).
* **Configuration:** Mentions configuration files (`master-known-keys.json`, `master-value-patterns.json`,
  `validation/levels/`) and the need to update them.
* **Warning:** Emphasizes that the validator is currently unreliable and manual comparison with working examples and
  visual testing are the primary verification methods.

**Applying this to `question-to-user/v5`:**

While the validator exists, we cannot rely on it for strict correctness. The primary methods for ensuring the
`question-to-user/v5` module's UI and actions are correct will be:

1. **Strict adherence to the `StrictModuleChecklist.md`**.
2. **Close comparison with working examples**, particularly `login-form/v1` and `primary-form/v1`, for UI structure,
   `"model"` binding, `"customHooks"`, and server action JSON.
3. **Visual testing** in the application after installation.

This guide reinforces the importance of studying existing code and documentation over relying on automated checks in
their current state.

**Remaining Guide:**

The last guide is `09-lifecycle-maintenance.md`, which covers the overall module lifecycle. Let's read this to complete
our understanding of the module system from the provided documentation.

Read file: docs/guides/module/09-lifecycle-maintenance.md
I have now read the final guide, `09-lifecycle-maintenance.md`. This document provides a brief overview of the module
lifecycle and maintenance tasks.

Here are the key points:

* **Complete Lifecycle:** Refers to a main document (`module-lifecycle-workflow.json` - TBD) for the full description.
* **Duplicate Cleanup:** The `php artisan module:cleanup-duplicates {module-name}` command finds and prepares a script
  to remove duplicate files in older versions that are identical to files in the latest version. This script requires
  manual review before execution.
* **Other Maintenance:** Mentions tracking dependencies in `_i/meta.json`, refactoring, and archival (details in the
  main lifecycle document).

This guide doesn't add new structural requirements for module files but describes tools and processes for managing
modules over their lifespan and across versions.

**Overall Summary of Module Documentation Knowledge:**

We have now read all the provided `/docs/guides/module` documents. We have a comprehensive understanding of:

* The overall module creation process (`01-overview-creating-modules.md`).
* The typical file and directory structure, including the mandatory `vX/` and `_i/` directories (
  `02-file-structure.md`).
* The purpose and common files within the `_i/` directory, including `meta.json`, `files-by-block.json`, `common.json`,
  and `links.json`, and how they relate to the installer (`03-metadata.md`, refined by our code analysis).
* How to construct the UI using JSON, components, data binding with `"model"`, triggering actions with `"customHooks"`,
  and reusing UI with `"operation": "include"` (`04-ui-construction.md`).
* How data is handled, including storage locations, access paths, the role of `data/` and `program.json`, and data
  initialization in forms (`05-data-handling.md`).
* How to write server actions using JSON instruction arrays, including data sources/destinations, key actions like
  `"update"` and `"save"`, and returning responses with `"return"` (`06-actions-logic.md`).
* The process of building and installing modules using `php artisan module:merge` and the prerequisite of updating
  `module-versions.json` (`07-build-merge.md`).
* The existence and limitations of the `php artisan module:validate` command (`08-validation.md`).
* Basic lifecycle and maintenance tasks like duplicate cleanup (`09-lifecycle-maintenance.md`).

We have also refined our `StrictModuleChecklist.md` based on these guides and our code analysis, and created a
`lessons-learned/module-structure-and-installation.md` document.

**Moving Forward with `question-to-user/v5`:**

We now have a strong foundation of knowledge from the official documentation. We can proceed with planning the
`question-to-user/v5` module based on this understanding.

Recall the task requirements: the module should process questions from the AI, allow the user to enter answers, save
these answers to files, and the AI will process the saved files later.

Based on the documentation and our refined checklist, the key steps for creating `question-to-user/v5` will involve:

1. **Defining the module structure:** Create the `script/data/implement/question-to-user/v5/` directory and the standard
   subdirectories (`_i/`, `data/`, `actions/`, `pages/`, `templates/`, `docs/`).
2. **Creating `_i/` files:**
    * `_i/meta.json`: Add basic module metadata.
    * `_i/files-by-block.json`: Define blocks for the installer (e.g., `main-ui`, `data`, `actions`).
    * `_i/common.json` (if needed): List any common files for the installer.
    * `_i/links.json`: Define the route to access the module's UI.
3. **Designing the UI (`pages/`, `templates/`):**
    * Create `pages/main.json` as the main entry point.
    * Design the form using components (e.g., `Div`, `H2` for questions, `TextArea` or `InputText` for answers, `Button`
      for submit).
    * Wrap form inputs in a `"Form"` component with a specified `name`.
    * Bind input fields using the `"model"` object, referencing the form name and unique field names for each answer.
    * Use `"operation": "include"` to structure the UI and reuse parts if necessary.
4. **Handling Data (`data/`):**
    * Potentially create a file like `data/questions.json` if the initial questions are to be stored within the module
      source.
5. **Implementing the Save Action (`actions/`):**
    * Create a server action file (e.g., `actions/save-answers.json`).
    * This action will take form data (`form:{form_context_name}`).
    * It will use `"action": "update"` to prepare the data for saving, targeting a specific file path (e.g.,
      `file!path/to/save/answers_{taskId}_{timestamp}.json`).
    * It will use `"action": "save"` to write the data to the target file path.
    * It will use `"action": "return"` to send a success or error response to the client.
6. **Connecting UI to Action:** The submit button in the UI will have a `"customHooks"` `"click"` event triggering
   `"action": "sendData"` to the `save-answers.json` action.
7. **Documenting:** Create/update files in `docs/` (e.g., `docs/README.md`, `docs/data-schema.md`) to describe the
   module's purpose, structure, UI, data format, and action logic.
8. **Installer Configuration:** Update `storage/aiCore/module-versions.json` and run
   `php artisan module:merge question-to-user` for testing.

Do you have any initial questions about this plan, or would you like to refine any of these steps before we begin
generating the files? We can start with designing the JSON structure for the UI, including how the questions and answer
fields will be represented.
