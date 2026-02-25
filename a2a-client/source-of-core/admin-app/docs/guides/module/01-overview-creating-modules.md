# Guide: Overview of Creating New JSON UI Modules

This document provides a **high-level overview** of the process for creating new modules for the TBD: Verify System
Name (JSON UI system?). For detailed information on each stage, please refer to the corresponding detailed guides.

## 1. Task Initiation

The process of creating a new module begins with an **explicit user request**, including the task assignment and a
reference to the specification or detailed description.

## 2. Reading Specifications (`.md` or `.json` Files)

Before starting work, **it is mandatory** to carefully study the specification file (`.md` or `.json` - TBD: Verify
Format) provided by the user to understand the requirements for data structure, UI, and actions.

## 3. Creating Module Files (in `TBD: Verify Path (e.g., script/data/implement/)`)

Based on the specification, the module source files are created in the directory
`TBD: Verify Path (e.g., script/data/implement/{module-name}/v{version-number}/)`.

* **More about file structure:** See [File Structure](./02-file-structure.md).
* **More about metadata:** See [Metadata](./03-metadata.md).

## 4. Creating the UI (`page.json`, `sections/` - TBD: Verify File Names)

The module's UI is defined by JSON structures, using components and the `include` mechanism (TBD: Verify Mechanism).

* **More about UI creation:** See [UI Construction](./04-ui-construction.md).
* **Component Index:** `TBD: Verify Path/Existence (e.g., ../reference/ui-component-manager-categories-primevue.json)`
* **Rendering System:** `TBD: Verify Path/Existence (RenderJson.json?)`, `TBD: Verify Path/Existence (Presets.json?)`,
  `TBD: Verify Path/Existence (VModel.json?)`.

## 5. Data and Settings (`TBD: Verify Path (e.g., data/program.json)`)

This file contains the main data, configuration, and initial state of the module.

* **More about data handling:** See [Data Handling](./05-data-handling.md).

## 6. Server Actions (`TBD: Verify Dir Name (actions/)`)

Files in this directory describe sequences of instructions for execution on the server.

* **More about server actions:** See [Actions Logic](./06-actions-logic.md).
* **Action Manager:**
  `TBD: Verify Path/Existence (e.g., ../../reference/ui-component-manager-categories-primevue.json#ActionManager)`.
* **Commands:** `TBD: Verify Path/Existence (e.g., ../../reference/commands-and-operations.json)`.

## 7. Installation Configuration and Metadata (`_i/`)

**Before building or testing** the module, configuration files must be created.

* **Creating `_i/` files:** Create the `_i/` directory and within it, at minimum, `meta.json`, `links.json` (for
  routing), and `common.json`. Other files (`files-by-block.json`, `css.json`, etc. - TBD: Verify File List) may be
  needed for the TBD: Verify Tool Name (AI Installer).
    * **More details:** [Metadata](./03-metadata.md) and
      `TBD: Verify Path/Existence (e.g., ../../processes/Installer-Overview.json)`.

## 8. Build and Installation (`TBD: Verify Command (module:merge)`)

After development is complete, the module version is built and installed into the working directory
`TBD: Verify Path (e.g., storage/aiInstaller/)`.

* **Command:** `TBD: Verify Command/Args (php artisan module:merge {module-name})`
* **Configuration:** `TBD: Verify Path (e.g., storage/aiCore/module-versions.json)`
* **More about the build process:** See [Build & Merge Process](./07-build-merge.md) and
  `TBD: Verify Path/Existence (../../processes/module-build-process.json)`.

## 9. Validation (`TBD: Verify Command (module:validate)`)

After installing the module, validation of the working files must be performed.

* **Command:** `TBD: Verify Command/Args (php artisan module:validate {module-name})`
* **More about validation:** See [Validation](./08-validation.md).

## 10. Lifecycle and Maintenance

The complete module lifecycle, including maintenance (e.g., cleaning up duplicates using
`TBD: Verify Command (module:cleanup-duplicates)`), is described in separate documents.

* **More about the lifecycle:** See [Lifecycle & Maintenance](./09-lifecycle-maintenance.md).
* **Main Document:** `TBD: Verify Path/Existence (../../processes/module-lifecycle-workflow.json)`.
