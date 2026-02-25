# 07 - Building and Installing the Module (`module:merge` - TBD: Verify Command)

This guide describes the process of building and installing a developed module version from the development directory (
`TBD: Verify Path (e.g., script/data/implement/)`) into the working directory (
`TBD: Verify Path (e.g., storage/aiInstaller/)`) from where the application will use it.

## 1. Command Purpose

The `TBD: Verify Command/Args (php artisan module:merge {module-name})` command is responsible for:

* Reading the version configuration from `TBD: Verify Path (e.g., storage/aiCore/module-versions.json)`.
* Determining the sequence of versions to merge for the specified module.
* Copying files from the corresponding version directories (
  `TBD: Verify Path (e.g., script/data/implement/{module-name}/vX/)`) to the target working directory (
  `TBD: Verify Path (e.g., storage/aiInstaller/{module-name}/)`).
* Merging files: Files from later versions overwrite files from earlier versions if names match.

## 2. Prerequisite: Version Configuration

**Critically Important!** Before running `module:merge` for a new module for the **first time**, or for a new version of
an existing module for the **first time**, you **must**:

1. **Open the file:** `TBD: Verify Path (e.g., storage/aiCore/module-versions.json)`
2. **Find or add** the entry for your `{module-name}` in the `modules` object.
3. **Add your new version number** (e.g., `"v1"`, `"v2"`) to the array of versions for that module.

**Always check and, if necessary, update `TBD: Verify Path (e.g., storage/aiCore/module-versions.json)` before
running `module:merge` for new versions! This is a mandatory prerequisite.**

**Example `module-versions.json` (adding v1 for `config` - TBD: Verify File Path & Structure):**

```json
{
    "modules": {
        "config": [
            "v1" // <-- Added
        ],
        "playground": [
            "v0",
            "v1"
        ],
        // ... other modules
    }
}
```

**What if you skip this step?**

If you try to run `module:merge {module-name}` without adding the corresponding version to `module-versions.json`, the
command will likely **fail to find merge instructions** and exit with an error, for example (TBD: Verify Error
Messages):

```bash
# Example potential error (text might differ)
Module configuration not found or version not listed for module: {module-name}
```

Or

```bash
# Example potential error
No versions specified for merge for module: {module-name}
```

## 3. Executing the Command

Run the command specifying the module name:

```bash
php artisan module:merge {module-name} # TBD: Verify Command
```
