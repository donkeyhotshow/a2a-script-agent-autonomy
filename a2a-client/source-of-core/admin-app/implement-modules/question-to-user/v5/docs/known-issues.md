# Known Issues for Question-To-User v5 Module (as of recent refactoring)

This document lists known issues and limitations for the QTU v5 module, particularly after the recent major refactoring
and documentation update.

## 1. Condition Evaluation Mismatch (Validator vs. PHP Runtime)

* **Status**: Critical / Core Issue
* **Issue**: There's a fundamental mismatch in how `condition` strings are handled:
    * **PHP Runtime (`DataManipulateHelper::evaluateCondition`)**: Treats string conditions strictly as direct DataHub
      paths (e.g., `"my.var"`, `"!my.flag"`). It does **not** parse logical operators (`&&`, `||`, `includes`) from
      within these strings. Complex logic (AND, equals, isEmpty, etc.) **must** be written using an array syntax (e.g.,
      `["and", "pathA", "pathB"]`). This is evident in working examples like `authenticate.json`.
    * **JSON Validator (`validate:module-json`)**: Uses a regex (`/^(?:!?[a-zA-Z0-9_$.\/:\-]+|{[^}]+})?$/`) for string
      conditions. This regex can pass single-braced complex strings (e.g., `"{varA && varB}"`) because the inner content
      matches `[^}]+`. However, such a string, while potentially passing validation, is **not correctly evaluable by the
      PHP runtime**.
* **Impact**:
    * Several files (e.g., `process-questions.json`, `execute-main-work-scenario.json` before recent fix)
      contain/contained complex string conditions (e.g., using `&&`, `||`, `| includes:`). These will **not work as
      intended at runtime** and need refactoring to the array syntax.
    * The validator may misleadingly pass conditions that are syntactically acceptable to its regex but semantically
      incorrect for the PHP execution engine.
* **Next Steps**:
    * **Identify all complex string conditions** across all JSON action/command files in the module.
    * **Refactor these conditions to the array syntax** supported by `DataManipulateHelper.php`.
    * **If `DataManipulateHelper.php` lacks necessary operators** (e.g., for `OR`, `NOT` on array sub-conditions,
      `INCLUDES`), these operators must be added to the PHP helper, or the JSON logic must be re-structured (e.g., using
      intermediate buffer variables) to achieve the desired outcome with existing operators.
    * Consider adjusting the validator's condition regex or logic to better align with the PHP runtime's capabilities or
      to specifically flag complex string expressions that should be arrays.

## 2. Action File Validation & Complexity (Specific Files)

* **`actions/process-questions.json`**:
    * **Status**: Partially Addressed / Blocked by Tooling & Condition Mismatch
    * **Issue**: This is a very large and complex action file.
        * **Newly Confirmed (Validation Output):** The latest validation run (showing 47 errors total for the module) highlights **13 specific errors** in `process-questions.json` where `condition` values do not match the validator's expected pattern (`/^(?:!?[a-zA-Z0-9_$.\\/:\\-]+|{[^}]+})?$/`). These errors (e.g., conditions like `{!{buffer:textBlockTpl} || !{buffer:textBlockTpl.type}}` or `{buffer:questionCondition && !({buffer:questionCondition.someCheck})}`) are direct manifestations of the core "Condition Evaluation Mismatch" (detailed in Point 1). While some such conditions might pass the validator's loose regex if simply wrapped in `{}`, they are **not correctly evaluable by the PHP runtime** and require refactoring to array syntax. This refactoring is complex due to missing operators (like OR) in `DataManipulateHelper.php` for direct translation.
        * **NOT ADDRESSED (Blocked):** The previously discussed issue of `action: "update"` (or other actions) containing an invalid `batch: [...]` key within them (i.e., a `batch` key inside another action, not `action: "batch"` itself). This structure needs to be unrolled. This is critically blocked because `read_file` consistently truncates the file (e.g., showing only ~200 of ~767 lines), preventing reliable automated refactoring or even full manual review through tooling.
        * **RESOLVED:** The file contained `options: {"deepMerge": true}` which was reported as an unknown key. These have been removed.
    * **Impact**: The `process-questions.json` action is non-functional. Its size and the **critical `read_file` truncation make it impossible for automated tools to fully refactor or analyze.** The condition logic issue is critical.
    * **Next Steps**: 
        1.  **CRITICAL: Address the `read_file` truncation issue (Tooling). Without a full view of the file, progress is severely hampered.**
        2.  Once file access is reliable, refactor all incorrectly used `batch` keys.
        3. Systematically refactor all complex string conditions to array syntax. This will likely require enhancements
           to `DataManipulateHelper.php` or significant logical restructuring in the JSON if helper enhancements are not
           feasible.

* **`actions/load-question-set.json` - Dynamic Component Type**:
    * **Status**: Unresolved / Design Question
    * **Issue**: The validator flags `type: "{buffer:for.currentItem.type}"` as a disallowed component type. This
      implies that component types cannot be dynamically set from a buffer variable when defining UI elements within
      this action.
    * **Impact**: If static types are required, the current method of generating UI from `questionSetData` is flawed.
      The action would need significant redesign to map dynamic type strings to static component definitions, or the
      validator/UI rendering engine needs to support dynamic types.
    * **Next Steps**: Clarify if dynamic component types are intended to be supported. If yes, validator/engine
      adjustment is needed. If no, `load-question-set.json` needs redesign.

* **General Action Schema Compliance**:
    * **Status**: Mostly Addressed
    * **Issue**: Most initial schema issues (root `description`, old conditional structures) have been fixed. However,
      vigilance is needed.
    * **Next Steps**: Continue to use validation tools (`php artisan validate:module-json`) after changes.

## 3. UI Component Validation Issues

* **`Select` Component Properties**:
    * **Status**: Unresolved / Likely Validator Schema Issue
    * **Issue**: The validator reports that standard properties for `Select` components like `props.options`,
      `props.optionLabel`, and `props.optionValue` are unknown. It also flags `props.required` and `props.showClear` as
      unknown for `Select`.
    * **Impact**: These are essential for `Select` functionality. If these props are truly disallowed, `Select`
      components are unusable. This is likely an issue with the validator's schema for `Select` components being
      incomplete.
    * **Next Steps**: Review and correct the `Select` component schema used by the validator. Do not remove these
      properties from UI definitions as it will break them.

* **Intermittent/Contradictory Prop Validation (e.g., Button `label`/`text`)**
    * **Status**: Observed / Concerning
    * **Issue**: The validator has given contradictory errors for button properties, sometimes flagging `label` as
      unknown and suggesting `text`, and later flagging `text` as unknown and listing `label` as valid. This makes it
      difficult to reliably fix related errors.
    * **Impact**: Wasted effort changing props back and forth. Undermines confidence in the validation process.
    * **Next Steps**: Investigate the stability and consistency of prop validation. Ensure the schema for components
      like `Button` is definitive.

## 4. Validation File Schema Mismatch

* **`validations/ai-probe-validation.json`**:
    * **Status**: Unresolved / Likely Validator Configuration Issue
    * **Issue**: The validator reports errors like "Node at 'root' is missing or has an invalid 'type'" and "Disallowed
      component type: 'required'" for this file. The file defines validation rules (e.g.,
      `{"field": "X", "type": "required"}`), not UI components. This suggests the validator is incorrectly applying the
      UI component schema to validation definition files.
    * **Impact**: Validation definition files cannot be correctly validated.
    * **Next Steps**: Ensure validation definition files (`*.validation.json` or similar pattern) are associated with
      their own correct schema within the validator's configuration, distinct from UI component schemas.

## 5. Tooling Limitations

* **`edit_file` Tool with Large Files/Changes**:
    * **Status**: Known Limitation / Blocker
    * **Issue**: The automated `edit_file` tool sometimes struggles with large files or applying multiple changes accurately. `read_file` is also **critically truncating** large files like `process-questions.json` (e.g., showing only ~200 of ~767 lines, and in some cases even less of other files) even when `should_read_entire_file` is true.
    * **Impact**: Requires workarounds, smaller incremental changes, or manual intervention. **Actively blocking** automated refactoring of large, problematic files like `process-questions.json`.
    * **Next Steps**: This truncation issue with `read_file` needs to be addressed at the tool level. For now, manual editing or very targeted AI edits (if possible) are the only ways to proceed with `process-questions.json`.

* **`QuestionToUser.php`**:
    * **Status**: Minimal Implementation
    * **Issue**: Role in v5 (JSON action-heavy) needs clarification or it might be vestigial.
    * **Next Steps**: Evaluate necessity for v5. Document or remove.

## 7. Documentation Synchronization

* **Status**: Ongoing
* **Issue**: Keeping all docs in sync with implementation is crucial as module evolves.
* **Next Steps**: Regularly review/update docs with code changes.

## 8. Missing `tags` Key in Action Files (New - Validation Output)

* **Status**: Newly Discovered
* **Issue**: The validator reports `Component 'instructions' at path 'root': Missing required top-level key 'tags'.` for numerous (11 in the latest run) action files (e.g., `list-system-scenarios.json`, `load-ai-probe-questions.json`, etc.). This typically affects files that define a set of instructions, possibly those with `type: "Instructions"` or similar.
    * **Required Structure**: The `tags` key must be an object, not just an empty array. The validator suggests the following structure:
        ```json
        "tags": {
          "keywords": [],
          "ai_summary": "",
          "features": []
        }
        ```
* **Impact**: Files fail validation. Functionality might be unaffected if `tags` are not actively used by the runtime for these specific actions, but validation compliance is required.
* **Next Steps**: Add the specified `tags` object structure to the root level of all affected action files. Ensure any files previously updated with `"tags": []` are corrected to this new structure.

This list should be updated as new issues are discovered or existing ones are resolved. 
