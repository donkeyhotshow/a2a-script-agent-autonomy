# 08 - Module Validation (`module:validate` - TBD: Verify Command)

This guide describes the `TBD: Verify Command (php artisan module:validate)` command.

**Warning: Validator Under Development!**

The `module:validate` validator **is not a reliable tool** at this time (`TBD: Insert Current Date/Version`). It might
miss errors or report non-existent ones.

**Do not rely solely on it!** The primary verification method is **comparison with working examples** (
`TBD: Verify Path (e.g., script/data/implement/...)`) and **visual testing** of the module in the application.

Use the validator as a **secondary tool** that *might sometimes* find basic problems.

## 1. Intended Purpose (Planned Functionality)

* Check JSON syntax.
* Check existence of component `.vue` files.
* Check conformance of `props` and keys to component rules (from
  `TBD: Verify Path (e.g., storage/aiCore/validation/levels/...)`).
* Check for mandatory keys (e.g., `"model"`).
* (Planned) Check `include` paths.

## 2. Executing the Command

```bash
php artisan module:validate {module-name} # TBD: Verify Command/Args
```

* `{module-name}`: Name of the **installed** module in `TBD: Verify Path (e.g., storage/aiInstaller/)`.

## 3. Validation Process (TBD: Verify Process Steps)

The `TBD: Verify Command (php artisan module:validate {module?})` performs the following checks for the specified
module (or all modules) in the `TBD: Verify Path (e.g., storage/aiInstaller/)` directory:

1. **JSON Syntax:** Checks the syntax validity of all `.json` files in the module.
2. **Known Keys:** Compares all JSON keys against those allowed in
   `TBD: Verify Path (e.g., storage/aiCore/validation/master-known-keys.json)`.
3. **Value Patterns:** Checks value formats against regular expressions from
   `TBD: Verify Path (e.g., storage/aiCore/validation/master-value-patterns.json)`.
4. **Component Validation:** For each component (`"type"` or `"component"` - TBD: Verify Key) in UI JSON (e.g.,
   `index.json`, `page.json`):
    * **Existence Check:** Checks for the corresponding `.vue` file in search paths (see
      `TBD: Verify Class (ModuleValidate.php)` and section below).
        * **Base/HTML Components:** The validator **needs configuration** to either ignore base elements (e.g., `div`,
          `H3`, `label` - TBD: Verify List) for which separate `.vue` files or rules might not exist, or require a
          minimal description for them (e.g., in `validation/levels/00/`). *Current behavior needs checking
          in `ModuleValidate.php` code.*
    * **`model` Key Check:** If the component has a level >= L01 (according to its rules file in `validation/levels/` -
      TBD: Verify Level System), checks for the mandatory `"model"` key.
    * **Component Rules:** If a rules file is found for the component (
      `TBD: Verify Path Structure (e.g., storage/aiCore/validation/levels/{level}/components/{ComponentName}.json)`),
      checks conformance of `props`, `slots`, etc., against these rules.

## 4. Interpreting Output (Examples - TBD: Verify Output Formats)

* **Success (Example):**
  ```bash
  Validating module: config
  # ... (Checking files)
  Validation finished for module config. No errors found.
  ```
  *(Note: Absence of errors **does not guarantee** correctness!)*

* **Error: `.vue` Not Found (Example):**
  ```bash
  Validating module: some-module
  Checking file: .../page.json...
    -> Validating component: NonExistentComponent
    -> [ERROR] Component file not found for type: NonExistentComponent ...
  Validation finished ... Found X error(s).
  ```

* **Error: Invalid JSON (Example):**
  ```bash
  Validating module: broken-module
  Checking file: .../page.json...
    -> [ERROR] Invalid JSON syntax: ...
  Validation finished ... Found Y error(s).
  ```

* **Error: Missing `model` Key (Example - *Expected from Validator*):**
  ```bash
  Validating module: config
  Checking file: .../index.json...
    -> Validating component: InputText (at path: content.children[1].children[1])
    -> [ERROR] Required top-level key 'model' is missing for component requiring VModel binding.
  Validation finished ... Found Z error(s).
  ```

## 5. Validator Configuration (TBD: Verify Paths & Structure)

* **`TBD: Verify Path (e.g., storage/aiCore/validation/master-known-keys.json)`:** Contains the list of all allowed JSON
  keys. **Critically important to keep this file up-to-date**, adding new keys as they appear in modules.
* **`TBD: Verify Path (e.g., storage/aiCore/validation/master-value-patterns.json)`:** Contains regular expressions for
  checking the format of specific key values. **Also requires regular updates.**
* **`TBD: Verify Path (e.g., storage/aiCore/validation/levels/)`:** Contains rules for specific components, distributed
  by complexity levels.
* **`.vue` File Search Paths:** Defined directly in the `TBD: Verify Class (app/Console/Commands/ModuleValidate.php)`
  code. Need to ensure all directories with Vue components (e.g.,
  `TBD: Verify Path (resources/common/js/Elements/Primevue/Components/)`, `.../Containers/`, `.../VModel/`,
  `.../Inertia/` - TBD: Verify Dirs) are added to the search logic.

## 6. Conclusion

**Use the validator with extreme caution.** Prioritize checking against working examples and testing within the
application. 
