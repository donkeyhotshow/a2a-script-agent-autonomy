# Documentation for Playground JSON Module

## Overview

This document provides a comprehensive analysis of the module code, specifically focusing on `mysql-test-v1.json` and
`model-test-v1.json`, including their UI structures, components, actions, and data handling mechanisms. It adheres to
standards for accessibility, TypeScript integration, and best practices as outlined in process-analysis-standard.md and
write-module-standard.md.

## Analysis of mysql-test-v1.json

### Structure

- **Root Element**: A `div` with responsive grid classes (`p-4 grid grid-cols-1 md:grid-cols-2 gap-4`), containing input
  and output sections.
- **Input Section**: A `div` with ID `inputSection`, housing forms for record data and parameters.
    - Forms: `mysqlDataForm` for fields like `name`, `value`, `category`; `mysqlParamForm` for `recordId`,
      `whereColumn` (a Select with options: id, name, email, etc.), and `whereValue`.
    - Buttons: Seven buttons (e.g., 'Save New') with `customHooks` triggering `sendData` actions to files like
      `mysql-test-v1/save-new-mysql`.
- **Output Section**: A `div` with ID `outputSection`, including elements for status (`mysqlStatus`) and output
  display (`mysqlOutput`).

### Data Flows and Algorithms

- **Actions**: Uses Template Processing Pattern for UI updates; buttons send data via `sendData`, handling CRUD
  operations on MySQL.
- **Accessibility**: Includes labels, semantic elements, and responsive design for keyboard navigation and screen
  readers.
- **TypeScript Aspects**: Props are structured for type safety (e.g., model binding).

## Analysis of model-test-v1.json

### Structure

- **Root Element**: Similar to mysql-test-v1.json, a `div` with a grid layout.
- **Input Section**: A `div` with ID `inputSection`, with forms for record data (`modelDataForm`) and parameters (
  `modelParamForm`).
    - Forms: Fields like `name`, `value`, `category` in `modelDataForm`; `recordId`, `whereColumn` (Select with
      options), and `whereValue` in `modelParamForm`.
    - Buttons: Seven buttons (e.g., 'Save New') linked to actions like `model-test-v1/save-new-model`.
- **Output Section**: A `div` with ID `outputSection`, for status (`modelStatus`) and output (`modelOutput`).

### Data Flows and Algorithms

- **Actions**: Similar to mysql-test-v1.json, with `sendData` for model operations; follows the same UI update patterns.
- **Accessibility**: Ensures ARIA-compatible elements and focus management.
- **TypeScript Aspects**: Structured props for form and field models.

## Common Patterns and Standards

- **Shared Algorithms**: Both files use iterative action sequences and placeholder handling (e.g., {input:
  variableName}).
- **Lessons Learned**: Cross-reference with @lessons-learned.md for best practices in UI design and data management.

This documentation serves as the basis for module edits.

## Comprehensive Module Description

### Module Overview

The Playground JSON Module is designed to test and demonstrate modular UI components and dynamic data actions within the
AI Installer system. It currently includes two main test pages:

- **mysql-test-v1.json**: Focuses on simulating MySQL operations, including creating, updating, loading, and counting
  records.
- **model-test-v1.json**: Simulates operations on model data with similar CRUD actions and dynamic UI updates.

### UI Structure

- **Layout**: Both pages employ a responsive grid layout using Tailwind CSS classes (e.g.,
  `grid grid-cols-1 md:grid-cols-2`) to ensure a mobile-first design.
- **Input Sections**: Each page has an input section featuring forms:
    - For `mysql-test-v1.json`, forms include `mysqlDataForm` for record data (fields like `name`, `value`, `category`)
      and `mysqlParamForm` for parameters (fields like `recordId`, a `Select` for `whereColumn`, and `whereValue`).
    - For `model-test-v1.json`, similar forms are used (`modelDataForm` and `modelParamForm`).
- **Action Buttons**: Both pages contain multiple buttons (e.g., 'Save New', 'Update by ID', etc.) with attached
  `customHooks` using the `sendData` action. These buttons now include ARIA labels to improve accessibility.
- **Output Sections**: Each page has an output section that displays status messages and results. Key elements include
  identifiers like `mysqlStatus`, `mysqlOutput`, `modelStatus`, and `modelOutput`.

### Data Flow and Action Handling

- **Template Processing Pattern**: The module uses a clear two-step UI update process: first, an `update` action
  modifies the in-memory template, and then a `save` action persists the changes to disk.
- **Custom Hooks and Data Binding**: Buttons use `customHooks` to trigger `sendData` actions, linking UI interactions
  with corresponding action files (e.g., `mysql-test-v1/save-new-mysql`). Form data is accessed using standardized
  placeholder syntax (`{input:fieldName}`) through a model binding approach.

### Standards and Compliance

- **Accessibility**: All interactive elements are enhanced with ARIA labels and are designed for keyboard navigation and
  screen reader support.
- **TypeScript-Like Integration**: Component properties and model bindings are structured to simulate type safety and
  maintainability, aligning with best practices in modular development.
- **Responsive Design**: The layout adapts to various screen sizes, ensuring a consistent user experience across
  devices.
- **Documentation and Traceability**: This module is fully documented through linked files such as `@memories.md` and
  `@lessons-learned.md`, providing a detailed history of changes and design decisions.

### Current State and Future Improvements

- **Stable Functionality**: The module is currently stable, with both test pages functioning correctly and data/actions
  properly bound according to the Template Processing Pattern.
- **Areas for Refinement**: Future updates may focus on refining PHP handler call syntax, enhancing accessibility
  further, and expanding formal TypeScript type definitions.
- **Baseline for Standards Revision**: This comprehensive description will serve as a fixed baseline for revising module
  type standards and guiding future development efforts.

## Action Files Overview

### Actions - MySQL Test (v1)

- **delete-mysql-by-id.json**:
    - Deletes a record from the MySQL test table where the record ID matches `{input:recordId}`.
    - Updates the UI by retrieving a status template from a blank item, appending a deletion confirmation, and updating
      the result title.
- **load-mysql-by-id.json**:
    - Uses `mysql!test_table/find/{input:recordId}` to retrieve a record by ID and encodes the result in JSON.
    - Updates the output area and appends a status message confirming the loaded record.
- **load-mysql-by-where.json**:
    - Retrieves records from the MySQL table based on a dynamic where clause `{input:whereColumn}` and
      `{input:whereValue}`.
    - Updates the UI with the JSON-encoded result and appends a status message indicating the criteria used.
- **update-mysql-by-id.json**:
    - Takes form data from `mysqlDataForm` to update a record in the MySQL table based on `{input:recordId}`.
    - Saves the updated record and updates the UI with a confirmation message stating the record was updated.
- **save-new-mysql.json**:
    - Inserts a new record into the MySQL test table using data from the input, then saves the change.
    - Updates the UI with a confirmation message indicating an implicit INSERT operation.

### Actions - Model Test (v1)

- **delete-model-by-id.json**:
    - Deletes a record from the model (using `model!TestModel/find/{input:recordId}`) based on the provided record ID.
    - Updates the UI by appending a deletion confirmation message and setting the result title.
- **update-model-by-id.json**:
    - Updates a model record using data from `modelDataForm` based on `{input:recordId}`.
    - Saves the changes and updates the UI with a message confirming the update.
- **save-new-model.json**:
    - Creates a new model record using data from `modelDataForm` and saves it to `model!TestDataModel`.
    - Updates the UI with a confirmation of the saved record.
- **load-model-by-id.json**:
    - Retrieves a model record by searching for `{input:recordId}` and encodes the result in JSON.
    - Updates the corresponding UI section and sets the result title to indicate successful loading.
- **load-model-by-where.json**:
    - Queries model records using a dynamic condition (similar to the MySQL counterpart) and updates the UI with the
      resulting JSON data.

### Actions - Session Test (v1)

- **load-from-session-to-content.json**:
    - Retrieves session data stored under `test-save-to-session`.
    - Updates a designated UI area in the session test page with the retrieved data and appends a status message.
- **save-to-session.json**:
    - Intended to save input data to session storage (structure follows similar patterns as other actions).
    - Though not fully detailed, it is expected to capture data from a form and store it for future retrieval.

---

This comprehensive description of action files, combined with the earlier UI and module descriptions, documents the
module in its current state. It serves as a baseline for evaluating and modifying the standards for module types and
their implementations. 
