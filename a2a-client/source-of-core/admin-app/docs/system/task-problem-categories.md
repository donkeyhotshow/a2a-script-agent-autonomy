# Categories of AI Task System Problems

This document outlines the different types of problems and objectives that can be formalized as tasks within the AI Task
System. Understanding these categories helps in defining new tasks and utilizing the system effectively.

Based on the analysis of task definitions and system scripts (`main.ps1`, `main-work.ps1`, `main-index.ps1`, and related
components), the following primary categories of task problems have been identified:

---

## 1. Component Validation and Improvement

**Description:** Tasks in this category focus on analyzing existing system components (such as JSON modules, scripts,
configuration files, etc.) to identify issues, errors, non-compliance with standards, or areas for enhancement. The goal
is often to generate reports, checklists, or propose specific changes.

**Examples:**

- Fixing syntax errors in configuration files.
- Validating JSON module structure against a schema.
- Identifying code smells or areas that need refactoring.
- Generating a checklist of improvements needed for a module.

**Relevant System Components/Concepts:**

- Task Definitions (e.g., `JsonModuleDeepCheck-*.json`, `TASK-QTU-FIX-JSON-SYNTAX-*.json`)
- Task Types (defining validation logic and data collection)
- Scenarios for validation and analysis (interacting with components)
- Indexer (`main-index.ps1`) for collecting data about components
- Relevant standards (e.g., JSON schemas, coding standards)

**Key Considerations:**

- Requires access to the component's source code or data.
- Often involves comparing the component against a defined standard or schema.
- May require running validation scripts or tools.
- Output is typically a report, a list of issues, or an enhancement checklist.

---

## 2. Conceptual Design and Planning

**Description:** This category includes tasks aimed at designing new features, modules, or system behaviors, or
significantly enhancing existing ones at a conceptual level. The focus is on defining requirements, user interaction
flows, underlying logic, and outlining the implementation plan.

**Examples:**

- Designing the user interface and dialogue flow for a new module.
- Defining the steps and logic for a new scenario.
- Planning the integration of a new external tool or service.
- Outlining the conceptual structure of a new data processing pipeline.

**Relevant System Components/Concepts:**

- Task Definitions (e.g., `QaJsonModuleAndProposeImprovement-*.json`)
- Task Types (defining the scope and goals of the design work)
- Scenario definitions (as the output of the design process or defining the process itself)
- Documentation (guides, standards) to inform the design
- User Input (via QTU scenarios) to gather requirements or feedback

**Key Considerations:**

- Focuses on *what* needs to be built and *how* it should conceptually work, rather than the low-level implementation
  details.
- Often involves analyzing existing system behavior and user needs.
- May require brainstorming and exploring different approaches.
- Output is typically a design document, a detailed plan, or updated task definitions for implementation.

---

## 3. System Integration and Workflow Improvement

**Description:** Tasks in this category deal with connecting different parts of the AI Task System, integrating external
tools or services, and optimizing the automated workflows defined by scenarios and scripts. The goal is to ensure smooth
data flow, efficient execution, and proper interaction between components.

**Examples:**

- Integrating the indexer output into scenario context data.
- Streamlining the process of collecting data for a task.
- Connecting a new data source to the system's processing pipeline.
- Improving the error handling and reporting within scenarios.
- Automating a manual step in a workflow.

**Relevant System Components/Concepts:**

- Main scripts (`main.ps1`, `main-work.ps1`, `main-index.ps1`)
- Scenario Engine (`invoke-scenario-engine.php`) and partials
- Scenario Definitions (defining the workflow steps)
- Task Context and Data Merging (how data flows between steps and is stored)
- PHP Core Components (DataProcessor, InstructionProcessor, etc.)
- System State (`system.state.json`)

**Key Considerations:**

- Requires a deep understanding of how system components interact.
- Often involves modifying scripts, scenario definitions, and core PHP logic.
- Focuses on the automated flow of execution and data.
- Output is typically updated scripts, scenario definitions, or core system code.

---

## 4. Direct Code/Data Fixing

**Description:** This category encompasses tasks that require precise and often straightforward corrections to existing
code or data files. The problem is usually well-defined (e.g., a specific bug, an incorrect value, a small code
adjustment), and the solution involves making targeted edits.

**Examples:**

- Fixing a specific bug reported by a validator or during testing.
- Correcting a wrong parameter value in a configuration file.
- Adjusting a regular expression pattern.
- Implementing a small, localized code change.

**Relevant System Components/Concepts:**

- Task Definitions (e.g., `TASK-QTU-FIX-JSON-SYNTAX-*.json`)
- `edit_file` tool (for applying the fix)
- Validation tools/scripts (to verify the fix)
- Version control (for tracking changes)

**Key Considerations:**

- The scope of the change is usually limited.
- The required modification is typically clear and unambiguous.
- Verification of the fix is crucial.
- Does not typically involve significant conceptual design or architectural changes.

---

## 5. Documentation and Knowledge Management

**Description:** Tasks in this category are focused on creating, reviewing, updating, and organizing the system's
documentation, standards, guides, and captured knowledge (like lessons learned). The goal is to ensure that information
about the system is accurate, comprehensive, accessible, and up-to-date.

**Examples:**

- Writing or updating guides for developers (e.g., on module creation, scenario design).
- Documenting system standards and principles.
- Summarizing lessons learned during development or task execution.
- Reviewing existing documentation for clarity and completeness.
- Organizing documentation files and directories.

**Relevant System Components/Concepts:**

- Documentation files (in `docs/`, `script/docs/`)
- Standards files (in `script/docs/standards/`)
- Lessons Learned file (`docs/development/lessons-learned.md`)
- Task Definitions (e.g., `SYSTEM-ENHANCE-DOCUMENTATION-*.json`)
- Task Types (defining the documentation goals)

**Key Considerations:**

- Requires strong writing and organizational skills.
- Involves gathering information from code, task definitions, scenarios, and system behavior.
- Adherence to documentation standards is important.
- Output is typically updated or new markdown files, JSON standards, or other documentation formats.

---

This categorization is intended to be a living document and may be refined as the system evolves and new types of tasks
are introduced. 
