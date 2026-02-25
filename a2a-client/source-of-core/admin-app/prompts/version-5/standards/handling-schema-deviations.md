# Handling Schema Deviations Standard

This standard outlines the process to follow when encountering significant deviations from established standards during the processing of schema files (e.g., in `prompts/` directories).

Based on the [`@fact-based-operations-rule.mdc`](/docs/ai-agent/operational-principles.mdc) and the reminder in [`component-structure.md`](/docs/ui/core-concepts/component-syntax.md), the sequence of actions is as follows:

1.  **Identify the Deviation:** Recognize that a schema file exhibits a significant deviation from the documented standards. This could include:
    -   For files of type `Instructions`: Any deviation from the strict rules defined in [`instruction-file-standard.md`](/docs/ui/core-concepts/instruction-file-standard.md).
    -   For other file types (UI, Validations, etc.): Basic structural issues (e.g., not valid JSON, missing top-level `type` if expected, `type` not in `component-map.json` for UI components).

2.  **Document Missing/Questionable Information:** Clearly articulate what specific information is missing from the documentation or what aspects of the file's structure/usage are questionable and why.

3.  **Query User for Clarification (via QTU):**
    -   **For files of type `Instructions`:** Use QTU **ONLY** to clarify unclear connections or usage (e.g., `call` to another file, `file!` address usage). The query **MUST** focus on the purpose and role of the connection/usage, not on the general structure or syntax which is covered by `instruction-file-standard.md`.
    -   **For other file types:** Do **NOT** raise a QTU for structural deviations or undocumented aspects. Simply document the deviation in `FILE_CHECKLIST.md`.

4.  **Halt Processing:** Immediately cease automatic correction attempts and further processing of the current file and potentially the batch of files **IF** a QTU has been raised for an `Instructions` file.

5.  **Resume After Clarification:** Once the user provides clarification, confirmation, or new documentation through the QTU system for an `Instructions` file, incorporate this information as a new established fact and resume the processing task accordingly.

This process ensures adherence to the principle of fact-based operations and prevents the introduction of incorrect or undocumented structures into the codebase. It specifically tailors the QTU process to the deep analysis required for `Instructions` files while maintaining a lighter approach for other schema types. 