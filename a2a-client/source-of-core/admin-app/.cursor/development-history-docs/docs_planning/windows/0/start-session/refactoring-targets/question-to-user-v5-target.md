# Target State: question-to-user Module (v5 - Refactored)

This document outlines the target structure, functionality, and components for the refactored `question-to-user`
module (v5). It will be updated as refactoring decisions are made.

## I. Core Goal

The primary goal of the refactored `question-to-user` (QTU) module is to provide a clear, simple, and robust interface
for:

1. Displaying dynamically generated questions to a user.
2. Capturing user responses for various input types.
3. Managing sets of questions and answers (loading, saving).

This refactoring aims to simplify existing complexities, improve maintainability, and ensure adherence to current system
standards.

## II. Module Components & Structure (Initial State / Basis for Refactoring)

This section describes the components as understood from the pre-refactoring state (based on merged v1-v4, now baseline
for v5). Decisions on simplification will modify this target.

### A. Main User Interface (Entry Point: `/question-to-user/page`)

* **Page Definition**: `pages/page.json`
    * **Responsibility**: Serves as the main entry point for users to interact with the question-answering
      functionality.
    * **Current Structure**: Uses a `Grid` layout and includes the `sections/question-display.json`.
    * **Target for Refactoring**: Review necessity of `Grid` if only one main section. Ensure clarity and focus.

* **Primary UI Section**: `sections/question-display.json`
    * **Responsibility**: Contains all core UI elements for displaying questions, managing answers, and interacting with
      QTU actions.
    * **Current Components**:
        1. **Panel Header**: "Questions (v2 - Dynamic Inputs)" - *Target: Update to reflect v5 and refactoring goals.*
        2. **Instructional Text**: "Please answer the following:"
        3. **"Load Questions" Button (File Source)**: Initiates the `processQuestions` server action, configured to load
           questions from `data/questions.json`.
        4. **Dynamic Question Area**: Loaded via include from `templates/question-area.json`. This is the core
           interactive part.
            * *Target for Refactoring: This area will be populated by the stateless `processQuestions` action, likely
              via a DataHub buffer, not by modifying `question-area.json`.*
        5. **Answer Set Management**:
            * Input and Button for "Load Answer Set From File" (action: `loadAnswerSet`).
            * Input and Button for "Save Answer Set As File" (action: `saveAnswerSetAs`).
            * *Target for Refactoring: Evaluate if this file-based load/save is essential for the core QTU flow or if it
              can be an auxiliary feature. Consider DataHub alternatives for primary answer state.*
        6. **Footer Buttons**:
            * "Save Answers" (action: `saveAnswers`).
            * "Clear All Answers" (action: `clearAnswers`).
            * "Reset to Defaults" (action: `resetToDefaults`).
            * *Target for Refactoring: Ensure these actions are intuitive and necessary for the primary workflow,
              operating on a well-defined answer state (e.g., in a DataHub buffer).*

### B. Core Templates

* **Template**: `templates/question-area.json`
    * **Responsibility**: Defines how individual questions and their corresponding input fields are rendered within the
      dynamic question area of `question-display.json`.
    * **Current State**: It's a simple placeholder `div` with an empty `children` array:
      `{"type": "div", ..., "children": []}`. The `processQuestions.json` action *dynamically overwrites this file on
      disk* by populating its `children` with generated UI panels for questions. This is highly unconventional.
    * **Target for Refactoring**:
        * This file, in its current role as a dynamically overwritten placeholder, should likely be eliminated or
          repurposed.
        * The refactored `processQuestions.json` will generate the UI structure for this area as a JSON object in
          memory.
        * The `sections/question-display.json` (or its equivalent) will then dynamically include this generated
          structure (e.g., from a `DataHub` buffer like `buffer:generatedQuestionUI`) instead of including this
          modifiable file.
        * If a static root component is still needed for the area where questions are injected, it could be defined
          directly within `sections/question-display.json` or as a truly static, non-modified template.

### C. Server-Side Actions (`actions/*.json`) - Type 1 (StorageHelper-based)

* **`processQuestions.json`**: Fetches/processes questions to be displayed.
    * **Current State Analysis (Highly Problematic)**:
        * **Modifies Template File**: Critically, this action *dynamically modifies and saves* the
          `templates/question-area.json` file on disk by injecting generated UI elements into its `children`.
            * *Consequences*: Stateful template, concurrency issues, caching problems, difficult debugging.
        * **Extreme Verbosity**: Uses a very large `switch` statement with repetitive `update/batch` blocks for each
          input type (string, textarea, integer, boolean, choice, radio, checkbox_list, filePath, directoryPath).
        * **Relies on `data/blanks/*.json`**: Loads numerous individual JSON files as templates for each input type,
          with verbose error checking for each.
        * **Relies on `context:currentQuestions` / `dataSource`**: Expects the calling environment to provide raw
          question data (e.g., from `data/questions.json` if file source, or other context).
        * **Category Grouping & Conditional Display**: Implements UI grouping and conditional display of questions.
    * **Target for Refactoring (High Priority)**:
        * **Stateless Operation**: MUST be changed to a stateless operation. It should generate and return a complete
          JSON UI structure representing the questions. This structure can then be placed into a `DataHub` buffer that
          the UI can reactively display. **It must NOT modify template files.**
        * **Simplify Input Type Handling**: Drastically reduce verbosity. Consolidate or generalize the
          `data/blanks/*.json` templates. Aim for fewer, more configurable base templates for inputs. Explore
          data-driven approaches or helper `call` instructions if JSON actions allow.
        * **Maintain Useful Features (if desired)**: Category grouping and conditional display are useful; implement
          cleanly within the new stateless structure.
        * **Clarify Input Source**: Clearly document how `context:currentQuestions` or other `dataSource` parameters are
          used.
* **`saveAnswers.json`**: Saves the user's current answers.
    * **Current State Analysis**: Takes answers from `form:responses`. Updates
      `question-to-user/data/answers-to-user-1` (in-memory DataHub representation) and saves to disk.
    * **Target for Refactoring**: Review data persistence. Consider abstracting active answers to a central `DataHub`
      location (e.g., `buffer:qtu.activeAnswers`). File persistence could then be a more explicit operation from this
      buffer.
* **`loadAnswerSet.json`**: Loads answers from a specified file.
    * **Current State Analysis**: Reads file, updates `answers-to-user-1.json` (in-memory and disk), triggers
      `processQuestions` to refresh UI.
    * **Target for Refactoring**: Load into the abstract active answers buffer. UI refresh to align with stateless
      `processQuestions` (e.g., re-running it with current context to update the UI buffer).
* **Other Type 1 related actions**: `saveAnswerSetAs.json`, `clearAnswers.json`, `resetToDefaults.json`,
  `validateAnswers.json`.
    * *Target: Review, simplify, ensure alignment with refactored data model and stateless operations.*

### D. AI-Related Components (`ai/`) - Used by Type 2 Actions

* **Prompts (`ai/prompts/*.prompt.txt`)**: e.g., `analyze_general_text_for_entities.prompt.txt`.
    * Provide clear instructions and output format specifications to the AI.
    * Contextualized using `{{placeholders}}`.
* **Parsers (`ai/parsers/*.json`)**: e.g., `analyze_general_text_for_entities.parser.json`.
    * JSON Schemas used to validate the AI's structured JSON response.
* **Usage**: This pair (prompt + parser schema), used by actions like `analyzeTextWithAI.json`, enables robust and
  extensible AI interaction. This forms part of the "Advanced QTU / Session-Based" system.

### E. Advanced QTU / Session-Based System (Type 2 Actions & Scenarios)

* **Actions (`actions/*.json`)**: `initializeQtuSession.json`, `analyzeTextWithAI.json`,
  `checkSessionContinuation.json`, `determineNextInteraction.json`,  `generateSuggestionsWithAI.json`,
  `finalizeQtuSession.json`, `prepareInitialUIData.json`, `updateAssociatedTask.json`.
    * **Distinct Instruction Engine**: These actions use a different JSON instruction schema (e.g.,
      `type: "datastore:create"`, `type: "api:call"`, `itemId: "{{...}}"`, `{{module:...}}`) than Type 1 actions. This
      indicates at least two distinct JSON-based workflow/action processing systems in the project.
    * **Functionality**: Support stateful, persistent QTU sessions, AI analysis, dynamic interaction flows.
* **Scenario (`scenarios/SCN-QTU-AdvancedContextHarvesting.scenario.json`)**:
    * **V4 Legacy**: This scenario explicitly calls `v4` versions of the Type 2 actions.
    * **Orchestration**: Uses a scenario engine (steps: `CallAction`, `DisplayForm`, `Loop`, etc.) to run complex
      workflows.
    * **Independent UI**: Manages its own UI interactions (e.g., tries to display `v4/pages/dialog-initial.json`).
    * **Missing Page**: The `v4/pages/dialog-initial.json` this scenario tries to display is NOT present in `v5`,
      meaning the scenario is currently broken.
* **Strategic Considerations**: This entire v4 system (Type 2 actions, v4 scenario) is largely distinct from the simpler
  Type 1 Q&A flow. It needs a clear strategic decision regarding its place in v5 (separate module, `v4_legacy/`
  subdirectory, or careful integration/simplification).

### F. Data Files (`data/`)

* **`data/questions.json`**:
    * **Structure**: Array of question objects (`id`, `type`, `text_ru`, `options`).
    * **Usage**: Default questions for the Type 1 Q&A flow, read by `processQuestions.json` (when using file source).
* **`data/answers-to-user-1.json`**:
    * **Structure**: JSON object, initially empty (`{}`). Populated with `{"questionId": "answerValue", ...}`.
    * **Usage**: Default answer storage for Type 1 flow.
* **`data/blanks/*.json`**:
    * **Structure**: Small, individual JSON UI snippets for input types.
    * **Usage**: Loaded by Type 1 `processQuestions.json` to build UI (problematic).
    * **Target**: Consolidate/eliminate as part of making `processQuestions.json` stateless.

### G. Other Page Definitions (Potentially v4 or Ancillary)

* **`pages/form-for-define-task.json`**: Empty in `v5` (copied from merged). *Target: Determine original purpose and if
  still needed.*
* **`pages/task-overview.json`**: Non-standard structure. *Target: Determine original purpose and if still needed or can
  be refactored/removed.*

### H. Internal Metadata (`_i/`)

* **`_i/meta.json`**: Module metadata. *Target: Update for v5.* (`name`, `version`, `description`, `tags`,
  `lastUpdated`, `primaryScenario` if applicable to v5).
* **`_i/files-by-block.json`**: Lists module files.
* **`_i/links.json`**: Defines UI navigation links. *Target: Update for v5.* (`id`, `label`, `path`, `description`).

### I. Other Action Types (e.g., PHP Handler-based)

* **`actions/submit-task.json`**:
    * **Structure**: Uses a different schema: `actionId`, `description`, `handler` (e.g., "SubmitTaskHandler"),
      `parameters` (array), `response`.
    * **Processing**: Suggests processing by a dedicated PHP handler class (`SubmitTaskHandler.php`) rather than the
      Type 1 (StorageHelper) or Type 2 (Scenario/Workflow) engines.
    * **Functionality**: Appears to define how to submit or update a task, potentially related to
      `pages/form-for-define-task.json`.
    * **V3 Reference**: Contains a `redirectTo` path pointing to `v3/pages/task-overview.json`, indicating potential
      version legacy.
    * **Strategic Consideration**: This represents a potential third action processing mechanism. Its necessity for the
      core simplified QTU v5 needs to be determined. If not core, it might belong to a separate task management module
      or be part of the v4 legacy system.

## III. Key Refactoring Principles for QTU v5 Core (Type 1 Flow)

* **Stateless Actions**: `processQuestions.json` MUST NOT modify files. It should return JSON UI structure.
* **Simplified Data Flow**: Centralize active answer data (e.g., in a `DataHub` buffer) rather than direct file
  reads/writes by multiple actions for the primary state.
* **Clear UI Responsibility**: `sections/question-display.json` should dynamically include UI generated by actions (
  e.g., from a buffer).
* **Consolidate Templates**: Eliminate or vastly simplify `data/blanks/*.json`.
* **Decouple**: Reduce tight coupling between actions and specific filenames like `answers-to-user-1.json` for the
  primary answer state.

## IV. Strategic Decisions for Overall Module Direction

1. **Define Core `question-to-user` v5**: Is it *only* the simplified Type 1 Q&A flow? The initial UI (
   `pages/page.json`) points to this.
2. **Handle Advanced v4 System**: What to do with the v4 scenario and Type 2 actions found in the v5 module files?
    * Move to a separate module (e.g., "AiConversationalEngine")?
    * Place in a `v4_legacy/` subdirectory for reference, acknowledging it's broken in its current state in v5?
    * Extract useful concepts for a *new* advanced interaction module/scenario system that uses the refactored v5 QTU
      core as a UI component?
3. **Instruction Engines**: There are at least two distinct JSON instruction engines. Can/should they be reconciled or
   unified? If not, their domains must be clearly documented. The Type 1 engine seems tied to `StorageHelper.php`.
4. **Ancillary Pages/Actions**: Determine the fate of `form-for-define-task.json`, `task-overview.json`, and less
   critical Type 1 actions (like `validateAnswers.json`).

---
*(This document will evolve as refactoring progresses.)*
