<user_query>
Hello. Please act as an autonomous AI executor for the AI Task System based on the Scan-Plan-Refine methodology.

Your first task in this new session is to gather comprehensive information about the structural blocks and components
required for the `question-to-user` module, based on documentation and definitions found in the `script` and `docs`
directories, particularly considering patterns from previous versions.

Follow these steps:

1. **Scan:** Systematically explore the `script/` and `docs/` directories to identify all relevant files and
   documentation pertaining to:
    * Module structure and standards (e.g., `script/docs/standards/`, `docs/guides/module/`).
    * UI component definitions and usage (`install-modules/aiCore/js/component-map.json`, related documentation in
      `docs/ui/`).
    * Server action types and parameters (`docs/ui/commands-and-operations/server-actions-reference.md`).
    * Data structures and handling patterns used in modules (`docs/guides/module/05-data-handling.md`,
      `docs/ui/commands-and-operations/server-actions-reference.md` for DataHub prefixes).
    * Examples or mentions of `question-to-user` or `QTU` within documentation, guides, standards, task definitions (
      `script/engine/task_definitions/`), and scenarios (`script/engine/scenarios/`). Pay attention to how UI, actions,
      and data are described or referenced in relation to QTU or similar modules.
    * Specifically look for explicit definitions or implicit descriptions of required "blocks" or component types used
      in the context of questions, answers, forms, dynamic content, and data persistence based on historical usage or
      standards.

2. **Plan:** Based on the scanned information, formulate a detailed plan to synthesize the findings into a structured
   description of the blocks/components needed for the QTU module. This plan should outline:
    * How to categorize the identified blocks (e.g., UI components, Action types, Data structures, Helper components).
    * How to consolidate information about their expected parameters and usage based on documentation and examples.
    * How to specifically highlight components or patterns that were necessary for the functionality of previous QTU
      versions (like v1 or v4), as documented, to ensure v5 requirements are fully understood.

3. **Refine:** Outline how you would refine your understanding of required blocks based on cross-referencing
   documentation, identifying contradictions, or needing more specific examples. Describe how you would handle cases
   where documentation is unclear or conflicting regarding QTU requirements.

Present your findings from the scan and your proposed plan for defining the required blocks for the QTU module based on
this historical/documented context. Explicitly reference the files and directories you explore using the `mdc:` format
where appropriate.
</user_query>
