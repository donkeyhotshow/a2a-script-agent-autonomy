# 03 - Module Metadata and Installer Configuration (`_i/`)

Inside the module version directory (`TBD: Verify Path (e.g., script/data/implement/{module-name}/vX/_i/)`), the `_i/`
directory stores files related to module metadata and its installation configuration via the **TBD: Verify Tool Name (AI
Installer)**.

## 1. Main Metadata File (`meta.json`)

This file is **recommended** and contains basic information about the module. **Its presence is important for system
integration (e.g., for the AI Installer).**

* **Purpose:** Describes the module, its version, author, dependencies.
* **Structure (Example from `playground/v1/_i/meta.json` - TBD: Verify Example Path/Relevance):**
  ```json
  {
      "name": "Playground JSON Module",
      "description": "Core functionalities required by the application.",
      "version": "1.0.0",
      "author": "Admin App Team",
      "dependencies": {
          "primevue": "^4.0.0",
          "tailwindcss": "^3.0.0"
      }
  }
  ```
* **Keys (TBD: Verify Set of Required/Recommended Keys):**
    * `name`: (String) Human-readable module name.
    * `description`: (String) Brief description of the module's purpose.
    * `version`: (String) Module version (semantic versioning recommended).
    * `author`: (String) Author or development team.
    * `dependencies`: (Object) Module dependencies (e.g., versions of UI libraries).

## 2. Installer Configuration Files (AI Installer)

The `_i/` directory also contains JSON files defining how the TBD: Verify Tool Name (AI Installer) should install and
integrate the module. **Creating the necessary files (at least `links.json` for routing) is an important step during
module development.**

* **Purpose:** Describe module components, common files, permalinks, CSS, assets, etc., for the installation process.
* **Examples from `playground/v1/_i/` (TBD: Verify Example Path/Relevance & File List):** `common.json`, `links.json`,
  `files-by-block.json`, `css.json`, `meta-admin.json`, `useAnyway.json`.
* **Structure and Usage:** Their exact structure and purpose are defined in the AI Installer documentation. They are
  used by the `TBD: Verify Class Name (InstallerController)` and its helper classes during installation.
* **Details:** Refer to the main installer documentation:
    * **`TBD: Verify Path/Existence (e.g., ../../processes/AI-Installer-Overview.json)`** (Describes the purpose of
      `links.json`, `common.json`, etc.)
    * `TBD: Verify Path/Existence (e.g., ../../reference/Installer-Controller-Documentation.json)`
* **Example `common.json` (from `contact-form/v1` - TBD: Verify Example Path/Relevance & Structure):** Should list key
  module files by category for the installer.
  ```json
  {
      "": [
          "page.json" // TBD: Verify file name
      ],
      "data": [
          "data/submissions.json" // TBD: Verify dir/file name
      ],
      "actions": [
          "actions/receive-submission.json" // TBD: Verify dir/file name
      ],
      "templates": []
  }
  ```
  *Source (TBD: Verify Path):* `script/data/implement/contact-form/v1/_i/common.json`
* **Example `links.json` (from simulated `config/v1` - TBD: Verify Example Relevance & Structure):** Defines the route
  for the module.
  ```json
  [
    {
      "id": "config-admin",
      "type": "admin", // TBD: Verify type values
      "label": "Configuration",
      "path": "/admin/config/index", // TBD: Verify path structure
      "icon": "pi pi-cog", // TBD: Verify icon set/values
      "module": "config"
    }
  ]
  ```
* **Important:** The `TBD: Verify Command (module:merge)` command (See [Build & Merge Process](./07-build-merge.md)) *
  *copies** the `_i/` directory but **does not directly use** the content of these configuration files. They are
  intended for the **TBD: Verify Tool Name (AI Installer)**.

## 3. Purpose of the `_i/` Directory

* **Purpose:** Contains files for the build system (`TBD: Verify Command (module:merge)`) and other tools, which are *
  *not** part of the UI or main data of the module.
* **Recommendation:** Using `_i/` and `meta.json` is **recommended**, but technically might be optional (check current
  examples).
* **Location:** `TBD: Verify Path (e.g., script/data/implement/{module-name}/vX/_i/)`.

## 4. Typical Keys in `meta.json`

Below are keys that are **frequently** encountered. **The set of mandatory and optional keys, as well as their exact
format, may change. Always check `meta.json` in working modules (
e.g., `primary-form`, `landing-main-page`, `sakai-core` - TBD: Verify Example Modules)!**

* **`name`** (String, Usually Required)
    * **Description:** Module name.
    * **Example:** `"name": "config"`
* **`version`** (String, Usually Required)
    * **Description:** Module version (semantic versioning recommended).
    * **Example:** `"version": "1.0.0"`
* **`description`** (String, Recommended)
    * **Description:** Brief description.
    * **Example:** `"description": "Module for managing application-wide configuration settings."`
* **`author`** (String, Recommended)
    * **Description:** Author.
    * **Example:** `"author": "AI Assistant Simulation"`
* **`dependencies`** (Array or Object, Optional - TBD: Verify Format/Usage)
    * **Description:** Module dependencies. **Format and usage can vary significantly—check examples.**
    * **Example (array):** `"dependencies": []`
    * **Example (object):** `"dependencies": { "core-ui": "v2" }`
* **Other Keys:** Other keys (`permalink`, `menu`, etc.) might be present, specific to older versions or particular
  modules. **Their relevance and necessity must be verified against examples.**

## 5. Example `meta.json` (from simulated `config` - TBD: Verify Example Relevance)

```json
{
  "name": "config",
  "version": "1.0.0",
  "description": "Module for managing application-wide configuration settings.",
  "author": "AI Assistant Simulation",
  "dependencies": []
}
```

## 6. Related Documents

* **AI Installer Overview:** `TBD: Verify Path/Existence (e.g., ../../processes/AI-Installer-Overview.json)`
* **File Structure:** [File Structure](./02-file-structure.md). 
