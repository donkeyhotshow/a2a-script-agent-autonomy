# Audit Checklist for implement-modules/question-to-user/v5/ Pages

This checklist is used to audit the JSON page definition files within the `implement-modules/question-to-user/v5/` module. Each page should be checked against these criteria to ensure consistency, correctness, and adherence to project standards as outlined in `docs/ROOT.md`.

## Checklist Items

### 1. JSON Structure & Validity
- **[ ] 1.1 Valid JSON:** The file is a valid JSON document.
- **[ ] 1.2 Schema Conformance:** The JSON structure conforms to the project's page schema (e.g., as per `docs/ui/json-template-schema.md` or other relevant page structure standards).
- **[ ] 1.3 Root Element:** The page has a defined root element or layout structure.
- **[ ] 1.4 Comments:** All comments (if any, e.g., `// end-of-line`) are correctly formatted and do not break JSON parsing (assuming a pre-processor handles comments as per project rules).

### 2. Component Usage
- **[ ] 2.1 Component Mapping:** All component types used are defined in `component-map.json` (or equivalent mapping mechanism).
- **[ ] 2.2 PrimeVue Wrappers:** Components are used via their established PrimeVue wrappers (e.g., `Button.vue`, `Card.vue`).
- **[ ] 2.3 Props Validity:** All component props are valid for the respective components and correctly typed (string, boolean, number, object, array).
- **[ ] 2.4 Props Naming:** Props follow consistent naming conventions.
- **[ ] 2.5 Required Props:** All required props for components are provided.

### 3. Content & Data
- **[ ] 3.1 Text Content:** All static text content (labels, titles, placeholders) is clear, concise, and free of typos.
- **[ ] 3.2 Localization:** Text content is prepared for localization if applicable (e.g., using keys or specific structures).
- **[ ] 3.3 Data Binding:** Dynamic data bindings are correctly configured.
- **[ ] 3.4 Placeholder Content:** No placeholder or lorem ipsum text remains in production-ready definitions.

### 4. Actions & Interactivity
- **[ ] 4.1 Client-Side Actions (`customHooks`):** `customHooks` are correctly defined and target existing client-side logic as per `docs/ui/core-concepts/module-actions.md`.
- **[ ] 4.2 Server-Side Actions (`instructions`):** Server-side actions are correctly defined as per `docs/ui/commands-and-operations/server-actions-reference.md`.
- **[ ] 4.3 Event Handling:** Event handlers are correctly defined and associated with appropriate components.

### 5. Modularity & Reusability
- **[ ] 5.1 Component Reusability:** Common UI patterns are implemented using reusable components/sub-schemas where possible.
- **[ ] 5.2 Self-Contained:** The page definition is reasonably self-contained or clearly defines its dependencies.

### 6. Accessibility (Basic)
- **[ ] 6.1 ARIA Labels:** Components have `aria-label` or equivalent for non-textual elements where appropriate.
- **[ ] 6.2 Keyboard Navigation:** Interactive elements are keyboard accessible (inherent from PrimeVue, but verify custom interactions).
- **[ ] 6.3 Focus Management:** Basic focus management is considered (inherent from PrimeVue).

### 7. Naming & Consistency
- **[ ] 7.1 File Naming:** The JSON page file itself follows project naming conventions.
- **[ ] 7.2 Internal IDs/Keys:** IDs or keys used within the JSON (e.g., for elements, actions) are unique and follow conventions.
- **[ ] 7.3 UI Consistency:** The page maintains UI consistency with other pages in the module and project.

### 8. Documentation & Metadata
- **[ ] 8.1 Page Purpose:** The purpose of the page is clear either from its name, content, or associated documentation.
- **[ ] 8.2 In-File Metadata:** Any required metadata within the JSON (e.g., version, author, description fields) is present and correct.

### 9. Adherence to `docs/ROOT.md`
- **[ ] 9.1 Backend-Driven UI:** The page definition aligns with the backend-driven UI principle.
- **[ ] 9.2 Separation of Concerns:** The page definition focuses on UI structure and presentation, not business logic.

---

## Audit Process Notes:
- For each item, mark: [X] = Pass, [O] = Fail, [N/A] = Not Applicable.
- Document any 'Fail' items with details and proposed fixes. 