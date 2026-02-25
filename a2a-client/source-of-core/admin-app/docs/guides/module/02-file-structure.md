# 02 - Module File Structure

This guide describes the **typical** directory and file structure when developing an AI Task System module. **Always
check existing working modules (e.g., `implement-modules/login-form/v1/`, `implement-modules/primary-form/v1/`) for
current practices.**

## 1. Source Module Location (Development)

Source files for the module under development are located in:

* `implement-modules/{module-name}/` (e.g., `implement-modules/my-new-module/`)

## 2. Versioning (`vX/`)

Inside the module directory, it is **mandatory** to create a subdirectory for each version (`v1/`, `v2/`). All
version-specific files are placed **inside** `vX/`.

## 3. Main Files and Directories (inside `vX/`)

Below is a **typical**, but **not necessarily exhaustive**, set of files and directories. **Their presence, exact names,
and structure may vary—check examples!**

* **`pages/page.json`** (Recommended)
    * **Purpose:** Defines the main UI structure or entry point of the module. **Using `page.json` in a `pages/`
      subdirectory is recommended for new modules.** Older modules might have `page.json`, `index.json`, or
      `layout.json` in the version root.
    * **Details:** See [UI Construction](./04-ui-construction.md)
    * **Examples:** `implement-modules/login-form/v1/pages/page.json`,
      `implement-modules/primary-form/v1/pages/page.json`.

* **`data/`** (Commonly Used)
    * **Purpose:** Directory for module data (e.g., initial form values, configurations) or data-related templates.
    * **`program.json`:** (Frequently Used) A common file for main data/settings, though not mandatory. **Its structure
      is entirely module-dependent. May be absent if data is loaded differently.**
    * **`blanks/`:** (Example) Subdirectory might contain JSON templates/skeletons (e.g., `status-item.json` in
      `implement-modules/playground/v1/data/blanks/`).
    * **Details:** See [Data Handling](./05-data-handling.md)
    * **Examples:** `implement-modules/login-form/v1/data/login-form.json`,
      `implement-modules/config/v1/data/program.json`.

* **`sections/`** (Frequently Used)
    * **Purpose:** For reusable UI JSON snippets included in `pages/page.json` or `templates/` via
      `{"type": "operation", "action": "include", "source": "..."}`. These are processed by `WalkForOperations.php`.
    * **Details:** See [UI Construction](./04-ui-construction.md)
    * **Examples:** `implement-modules/landing-main-page/v2/sections/`.

* **`templates/`** (Recommended for UI)
    * **Purpose:** Contains reusable UI JSON snippets, typically larger or more structured than those in `sections/`.
      Included via `{"type": "operation", "action": "include", "source": "..."}`.
    * **Recommended Structure:**
        * `forms/`: For full form definitions (e.g., `login-form.json`).
        * `parts/`: For smaller UI parts (e.g., `action-buttons.json`, `header.json`).
    * **Details:** See [UI Construction](./04-ui-construction.md)
    * **Examples:** `implement-modules/login-form/v1/templates/forms/`, `implement-modules/config/v1/templates/parts/`.

* **`programs/`** (Less Common / Specialized Usage)
    * **Purpose:** For storing JSON files with reusable sets of server-side instructions not directly tied to a UI
      action or a simple command. Their usage is specialized and should be based on clear examples if required.
    * **Examples:** Check modules for the presence and specific use-cases of this directory.

* **`actions/`** (Commonly Used)
    * **Purpose:** Directory for server-side action JSON files. These contain arrays of instructions processed by the
      backend instruction engine.
    * **Details:** See [Actions Logic](./06-actions-logic.md).
    * **Example file:** `save-settings.json`, `process-login.json`.
    * **Examples:** `implement-modules/login-form/v1/actions/`, `implement-modules/config/v1/actions/`.

* **`_i/`** (Mandatory)
    * **Purpose:** Directory for metadata (`meta.json`) and configuration files for the **AI Installer** (`links.json`,
      `common.json`, `files-by-block.json`, `css.json`, `meta-admin.json`, `useAnyway.json`). This directory is crucial
      for the **AI Installer** to discover, understand, and install the module correctly. The files within specify how
      the module integrates into the system.
    * **`files-by-block.json` (Key File for Installer and Runtime)**:
        * **Purpose:** This file serves a dual purpose: configuring the **AI Installer** and informing the **runtime PHP
          module system** about the module's structure.
        * **For the AI Installer:** It defines logical blocks or components of the module (e.g., `mainCode`,
          `loginFormRelatedFiles`). Top-level keys become selectable items in the installer UI. Nested objects and
          arrays within these blocks define which files (from `actions/`, `templates/`, `data/`, `code/`, `pages/` etc.)
          belong to each block and how they should be copied/structured during installation. The installer uses this
          structure to copy files from the source module location (`implement-modules/{module-name}/vX/`) to the
          installed location (`storage/aiInstaller/modules/{module-name}/vX/`).
        * **For the Runtime System:** The structure defined in `files-by-block.json` (and subsequently created in
          `storage/aiInstaller/modules/`) is the structure the PHP runtime classes (like `App.php`, `PageModule.php`,
          and the module's specific PHP class in `code/`) **expect** to find. The module's PHP class, via its
          `public $folder = 'module-name';` property, provides the base slug (e.g., `login-form`) that the runtime
          system uses to construct full paths to load pages (`modules/{module-slug}/vX/pages/page.json`), actions (
          `modules/{module-slug}/vX/actions/action-name.json`), data (`modules/{module-slug}/vX/data/data-file.json`),
          etc., within the `storage/aiInstaller/` directory. Ensuring the file structure defined in
          `files-by-block.json` matches what the PHP code attempts to load is critical.
        * **Common Blocks/Categories:** See
          the [Strict Module Structure Checklist](../../engine/meta/StrictModuleChecklist.md) for a detailed list of
          common blocks (e.g., `code`, `actions`, `templates`, `pages`, `data`) and file categories recognized by the
          system.
    * **`common.json` (Installer File):** Lists key individual files of the module by category (e.g., main page file,
      primary data file) for the installer's reference and potentially for default selections.
    ```json
    // Example: implement-modules/login-form/v1/_i/common.json
    {
        "pages": [
            "pages/page.json"
        ],
        "data": [
            "data/login-form.json"
        ],
        "actions": [
            "actions/login.json",
            "actions/logout.json"
        ],
        "code": [
            "code/LoginForm.php"
        ]
    }
    ```
    * **`meta.json` (Installer File):** Contains essential metadata like module `name`, `version`, `description`,
      `author`, and frontend `dependencies`.
    * **`links.json` (Installer File):** Defines permanent links/routes for the module.
    * **`css.json` (Installer File):** Configuration for CSS processing and inclusion.
    * **`meta-admin.json` (Installer File):** Additional metadata, possibly for admin panel integration.
    * **`useAnyway.json` (Installer File):** Specific usage to be confirmed by installer logic, but observed in etalon
      modules. Might list files that should always be included regardless of block selection.
    * **Other `.json` files:** May exist for specific installer or tool configurations.
    * **Details:** See [Metadata](./03-metadata.md) and
      the [Strict Module Structure Checklist](../../engine/meta/StrictModuleChecklist.md).
    * **Examples:** `implement-modules/login-form/v1/_i/`, `implement-modules/config/v1/_i/`.

* **`docs/`** (Recommended for version-specific docs)
    * **Purpose:** Directory for documentation specific **only to this version** of the module.
    * **`README.md` or `index.md`:** (Recommended) Main description of the module version, its files, workflow. Should
      contain examples pointing to source files.
    * **`known-issues.md`:** (Optional) List of known issues or limitations.
    * **Examples:** `implement-modules/login-form/v1/docs/README.md`.

* **Deprecated Files (Do Not Use in New Modules):**
    * **`@specification.md`, `@memories.md`, `@scratchpad.md`:** These files within the module version directory are *
      *deprecated**. Use the global `@memories.json` and `@scratchpad.json`. Version-specific requirements should be
      documented in the `docs/` subdirectory (e.g., `docs/README.md` or `docs/changelog.md`).

## 4. Important Notes

* **Examples are Primary:** The structure may evolve. **Always** prioritize the structure of **successfully working
  modules** (like `implement-modules/login-form/v1/`) over this description.
* **Development vs. Installation:** The structure of the **installed** module in `storage/aiInstaller/modules/` will
  reflect the organization defined in `_i/files-by-block.json` and may differ slightly from the source module structure
  in `implement-modules/` (e.g., source might have extra development notes not part of installed blocks).
  See [Build & Merge Process](./07-build-merge.md).

## 5. `files-by-block.json`: Format and Purpose (Focused Explanation)

As mentioned in Section 3, `_i/files-by-block.json` is critical for the **AI Installer** and **Runtime System**. This
section focuses on its typical format.

- **Top-level keys** are logical **block names** chosen by the module developer (e.g., `coreLogic`,
  `userProfileSection`, `adminFeatures`). These appear as selectable options in the AI Installer.
- Inside each block, keys are **file categories** that usually correspond to the standard directory names: `pages`,
  `actions`, `templates`, `data`, `code`, `validations`, `state`, `docs`, `assets`, `_i` (for including parts of `_i`
  itself if needed).
- The value for each category can be:
    - An **array of strings**, where each string is a file path relative to the module version root (e.g.,
      `"pages/main.json"`, `"actions/users/create.json"`).
    - An **object**, where keys are subdirectory names and values are again arrays of file paths relative to that
      subdirectory, or further nested objects. This allows mirroring a deeper directory structure.

**Example (Conceptual, based on `login-form/v1/_i/files-by-block.json` principles):**

```json
{
  "mainLoginFunctionality": {
    "pages": [
      "pages/page.json"
    ],
    "actions": [
      "actions/login.json",
      "actions/logout.json"
    ],
    "templates": {
        "forms": [
            "templates/forms/login-form-fields.json"
        ]
    },
    "data": [
      "data/login-form.json" 
    ],
    "code": [
      "code/LoginForm.php"
    ],
    "docs": [
        "docs/README.md",
        "docs/login-module.md"
    ]
  },
  "passwordRecoveryFeature": { // Example of an optional block
    "pages": [
        "pages/password-reset-request.json",
        "pages/password-reset-form.json"
    ],
    "actions": [
        "actions/request-password-reset.json",
        "actions/process-password-reset.json"
    ]
  }
}
```

- **Relation to `_i/common.json`:** `files-by-block.json` provides a comprehensive, block-based file inventory for
  selective installation and defining the module's runtime structure. `_i/common.json` typically lists a smaller set of
  key/entry-point files for the module, perhaps for quick reference by the installer or for defining default files if no
  specific blocks are chosen. They are complementary.
