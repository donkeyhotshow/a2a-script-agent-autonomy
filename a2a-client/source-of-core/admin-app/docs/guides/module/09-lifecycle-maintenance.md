# 09 - Module Lifecycle and Maintenance

This guide provides a brief overview of the complete module lifecycle and maintenance tasks.

## 1. Complete Lifecycle

Module development is an iterative process.

* **Main Document:** For a full description of all stages (from idea to archival), see:
    * `TBD: Verify Path/Existence (../../processes/module-lifecycle-workflow.json)`
* **Recommendation:** Familiarize yourself with `module-lifecycle-workflow.json` to understand the full context.

## 2. Maintenance: Duplicate Cleanup (`module:cleanup-duplicates` - TBD: Verify Command)

During version development, files can be duplicated. This command helps find them and prepare them for removal.

* **Command:** `TBD: Verify Command/Args (php artisan module:cleanup-duplicates {module-name})`
* **Purpose:** Finds files in the **latest** version (`TBD: Verify Path (e.g., script/data/implement/.../vX/)`) that are
  identical to files in **previous** versions and generates a script to delete the older duplicates.
* **Process Overview (TBD: Verify Process):**
    1. Analyzes versions from `TBD: Verify Path (e.g., storage/aiCore/module-versions.json)`.
    2. Compares file hashes.
    3. Creates a PowerShell script (e.g., in `TBD: Verify Path (e.g., script/ps1/cleanup/)`) with `Remove-Item`
       commands.
    4. **Important:** The generated script **is not executed automatically**. **Review it manually** before running.
* **When to Use:** Typically after completing work on a version.
* **Details:** See `TBD: Verify Path/Existence (../../processes/module-lifecycle-workflow.json)`.

## 3. Other Maintenance Aspects

* **Dependencies:** Keep track of `dependencies` in `_i/meta.json` (See [Metadata](./03-metadata.md)).
* **Refactoring:** Improve code and structure over time.
* **Archival:** The process should be described in
  `TBD: Verify Path/Existence (../../processes/module-lifecycle-workflow.json)`.

## 4. Related Documents

* **Main Lifecycle Document:** `TBD: Verify Path/Existence (../../processes/module-lifecycle-workflow.json)`
* **Version Configuration:** `TBD: Verify Path (e.g., storage/aiCore/module-versions.json)` 
