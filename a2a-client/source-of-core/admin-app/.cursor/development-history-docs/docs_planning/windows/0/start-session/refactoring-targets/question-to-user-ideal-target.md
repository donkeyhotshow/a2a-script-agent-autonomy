# Ideal Target State: question-to-user Module (v5 - Refactored to Best Practices)

This document outlines an ideal target structure, functionality, and components for a refactored `question-to-user` (
QTU) module. It draws inspiration from well-structured modules like `primary-form/v1` and aims for simplicity,
robustness, statelessness, and maintainability.

## I. Core Goal

The primary goal of the ideal QTU module is to provide a clear, simple, and robust interface for:

1. Displaying dynamically defined sets of questions to a user.
2. Capturing user responses for various input types.
3. Managing the current set of answers in a clean, reactive way.
4. Allowing persistence of question/answer sets as needed, but decoupled from the core display/interaction logic.

This ideal module will be easy to understand, integrate, and extend.

## II. Ideal Module Components & Structure

### A. Main User Interface (Entry Point: `pages/page.json`)

* **Page Definition**: `implement-modules/question-to-user/v5/pages/page.json`
    * **Responsibility**: Serves as the main declarative entry point for the QTU UI.
    * **Ideal Structure**:
        * A simple, static JSON definition (like `primary-form/v1/pages/page.json`).
        * Defines the overall page layout (e.g., using `Grid`, `Panel`).
        * Includes the primary QTU interaction section using an operation:
          `{"type": "operation", "action": "include", "source": "question-to-user/sections/main-qtu-interface"}`.
        * May include other static sections or controls if necessary.

### B. Primary UI Section (`sections/main-qtu-interface.json`)

* **File**: `implement-modules/question-to-user/v5/sections/main-qtu-interface.json`
    * **Responsibility**: Contains all core UI elements for displaying questions, managing answers, and triggering QTU
      actions. This is the main interactive component.
    * **Ideal Structure**:
        * A declarative JSON UI definition (e.g., a `Form` or a `div` acting as a form container).
        * **Controls to Load/Manage Question Sets**:
            * Button: "Load Default Questions" -> `customHook` -> `sendData` to `actions/loadQuestionSet` (passes
              parameters like a default question set ID).
            * (Optional) Input + Button: "Load Question Set by ID/Path" -> `customHook` -> `sendData` to
              `actions/loadQuestionSet`.
        * **Dynamic Question Display Area**:
            * A placeholder component or operation that dynamically includes the generated UI for questions:
              `{"type": "operation", "action": "include", "source": "buffer:qtu.generatedUI"}`.
            * This `buffer:qtu.generatedUI` will be populated by the `actions/loadQuestionSet` (or similar) action.
        * **Answer Management Controls**:
            * Button: "Save Answers" -> `customHook` -> `sendData` to `actions/saveCurrentAnswers`.
            * (Optional) Input + Button: "Save Answers As..." -> `customHook` -> `sendData` to
              `actions/saveCurrentAnswersAs` (passes filename/ID).
            * Button: "Clear Answers" -> `customHook` -> `sendData` to `actions/clearCurrentAnswers`.
        * Input elements for questions will be part of the structure loaded into `buffer:qtu.generatedUI`. Their `model`
          property will bind to fields within a data structure representing the current answers (e.g.,
          `model:qtu.activeAnswers.field_name`).

### C. Server-Side Actions (`actions/*.json`) - Stateless & Data-Centric

* **Core Principle**: Actions are stateless, operate on data in `DataHub` (buffers or files via `DataHub` paths), and
  return data (e.g., updated form data, or data for UI generation) to the client. **They DO NOT modify UI template files
  directly.**

* **`actions/loadQuestionSet.json` (Example - Replaces `processQuestions.json`)**
    * **Responsibility**: Loads question definitions, prepares initial answer data, and generates the JSON UI structure
      for display.
    * **Input**: Parameters like `questionSetId` or `questionDefinitionSource`.
    * **Ideal Logic**:
        1. Load question definitions (e.g., from `question-to-user/data/question_sets/[questionSetId].json`).
        2. Load any existing/default answers for this set (e.g., from `buffer:qtu.activeAnswers` if reloading, or
           `question-to-user/data/default_answers/[questionSetId].json`).
        3. **Generate UI Structure**: Iterate through question definitions and construct a complete JSON object
           representing the UI for these questions (including appropriate input types, labels, and pre-filled answer
           values from step 2). This JSON object is built in memory.
        4. **Output to Buffer**: Update `buffer:qtu.generatedUI` with this generated JSON UI structure.
        5. **Update Answer State**: Ensure `model:qtu.activeAnswers` (or a similar DataHub address for form data) is
           initialized or updated with the current answer values for the loaded questions.
        6. Return status and potentially the `model:qtu.activeAnswers` to sync the client-side `FormManager`.

* **`actions/saveCurrentAnswers.json`**
    * **Responsibility**: Saves the current state of answers.
    * **Input**: `form:qtuAnswers` (or similar, representing the submitted form data).
    * **Ideal Logic**:
        1. Update `buffer:qtu.activeAnswers` (or the primary `DataHub` address for current answers) with
           `form:qtuAnswers`.
        2. (Optional, if persistence is desired by this action) `save` the `DataHub` address for `qtu.activeAnswers` to
           its backing file (e.g., `question-to-user/data/user_answer_sets/current.json`).
        3. Return success/status.

* **`actions/clearCurrentAnswers.json`**
    * **Responsibility**: Clears the current answers.
    * **Ideal Logic**:
        1. Clear or reset `buffer:qtu.activeAnswers`.
        2. Re-run a simplified `loadQuestionSet` (or a new dedicated action) to regenerate the UI in
           `buffer:qtu.generatedUI` with empty answer fields, effectively refreshing the display.
        3. Return success/status.

### D. Data Files (`data/`)

* **`data/question_sets/` (Directory)**:
    * Contains JSON files, each defining a set of questions (e.g., `default_set.json`, `survey_alpha.json`).
    * Structure of each file: An array of question definition objects (`id`, `text`, `inputType`, `options`,
      `validationRules`, etc.).
* **`data/user_answer_sets/` (Directory, optional for default save location)**:
    * Stores saved sets of answers if file persistence is used.
    * Structure of each file: A JSON object mapping question `id` to answer value (e.g.,
      `{"Q001": "yes", "Q002": ["opt1"]}`).
* **`data/qtu_state.json` (Example central state file, optional)**:
    * Could be the backing file for `buffer:qtu.activeAnswers` or `model:qtu.activeAnswers`.
    * Stores the live, current set of answers being worked on.

### E. Internal Metadata (`_i/`)

* **`_i/meta.json`**: Standard module metadata (name, version, description). No `primaryScenario` unless a specific,
  simple scenario is built for this ideal QTU.
* **`_i/links.json`**: Defines UI navigation link if the QTU page is directly accessible.

## III. Key Design Principles for Ideal QTU Module

* **Stateless UI Definitions**: All JSON files defining UI (`page.json`, `sections/*.json`) are static and declarative.
* **Stateless Actions**: Server-side actions do not modify UI definition files. They process data and return data or UI
  structures (as data) to the client.
* **Reactive UI Updates**: The client-side UI (Vue components, FormManager) reacts to changes in `DataHub` (buffers or
  models) to update the display.
    * For QTU, the `sections/main-qtu-interface.json` would include content from `buffer:qtu.generatedUI`. When an
      action updates this buffer, the UI re-renders that portion.
    * Form inputs bind to a `model` (e.g., `model:qtu.activeAnswers`), and `FormManager` handles keeping this in sync.
* **Clear Separation of Concerns**:
    * UI structure (pages, sections).
    * UI generation logic (in `actions/loadQuestionSet`).
    * Answer data management (in `DataHub` buffers/models, persisted by actions).
    * Question definitions (in `data/question_sets/`).
* **Data-Driven UI Generation**: The `actions/loadQuestionSet` dynamically builds the UI JSON based on question
  definitions, rather than relying on many small, static "blank" template files.
* **Minimal File I/O during Interaction**: Core interactions update in-memory `DataHub` buffers/models. File saving is
  an explicit step.

## IV. Relationship to Current `question-to-user/v5`

This "ideal target" serves as a blueprint. Refactoring the current `question-to-user/v5` would involve:

1. Moving the v4 legacy system (Type 2 actions, scenario, AI files) to a `_v4_legacy` folder.
2. Fundamentally re-writing `actions/processQuestions.json` to become the new `actions/loadQuestionSet.json` following
   the stateless, UI-generating principles.
3. Eliminating `templates/question-area.json` as a dynamically modified file.
4. Modifying `sections/question-display.json` (or renaming it to `sections/main-qtu-interface.json`) to include UI from
   `buffer:qtu.generatedUI`.
5. Refactoring other Type 1 actions (`saveAnswers`, `loadAnswerSet`, etc.) to align with the new data flow and
   statelessness.
6. Revising data file structures (`data/questions.json` -> `data/question_sets/default_set.json`, etc.).
7. Ensuring `_i/meta.json` and `_i/links.json` reflect the simplified, core QTU v5.

This "ideal target" document will be placed at
`implement-modules/question-to-user/v5/docs/refactoring-targets/question-to-user-ideal-target.md`. 
