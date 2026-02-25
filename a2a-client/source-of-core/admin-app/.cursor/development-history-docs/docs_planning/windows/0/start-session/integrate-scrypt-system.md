I will provide you with a structured prompt that you can use to initiate a new session with a more comprehensive system
exploration approach. This prompt is designed to guide the AI to gather essential context using the Scan-Plan-Refine
methodology based on the project's structure and standards.

Here is the prompt for initiating a new session:

```
<user_query>
Hello. Please act as an autonomous AI executor for the AI Task System based on the Scan-Plan-Refine methodology.

Your first task in this new session is to perform an initial system scan and context gathering. Use the available tools to explore the project based on the provided project layout and the core components of the AI Task System.

Follow these steps:

1.  **Scan:** Systematically explore the key directories and files of the AI Task System to build a foundational understanding of its structure and contents. Focus on:
    *   `script/engine/`: Explore task definitions, task types, scenarios, and markers.
    *   `script/docs/standards/`: Identify key operational and development standards.
    *   `index/`: Understand the indexed data structure.
    *   `install-modules/`: Explore the structure of installable modules.
    *   `resources/`: Explore the structure of resources including backend, common, and frontend.
    *   Other relevant directories identified in the project layout.
    *   Specifically examine files like `main.ps1`, `main-work.ps1`, `invoke-scenario-engine.php`, and the core standards JSON files.

2.  **Plan:** Based on the scanned information, formulate a detailed plan for how you would approach a typical task within this system, considering:
    *   How to identify the relevant task definition and task type.
    *   How to locate applicable standards, scenarios, and documentation.
    *   How to use progress markers.
    *   How different components (scripts, scenarios, task types, standards) relate to each other.

3.  **Refine:** Outline how you would refine your understanding and plan based on new information or unexpected issues encountered during task execution.

Present your findings from the scan and your proposed plan for handling tasks in this system. Explicitly reference the files and directories you explore using the `mdc:` format where appropriate.
</user_query>
```

This prompt provides a clear instruction for the AI to start by scanning the system using the provided structure and
then develop a plan, incorporating the Scan-Plan-Refine approach and referencing key system components. It should help
in establishing a solid understanding early in the session.
