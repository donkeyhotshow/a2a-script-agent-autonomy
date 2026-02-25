# Overview: Primevue Component Documentation Structure (Detailed)

This documentation area covers custom Vue components that wrap PrimeVue elements for use within the dynamic JSON UI
system. The organization aims to group components by their primary role and complexity.

## Categories

### 1. `Components/`

- **Purpose:** Wrappers for relatively simple, often presentation-focused PrimeVue components.
- **Characteristics:**
    - Typically map one-to-one with a core PrimeVue element (e.g., `<p-button>`, `<p-divider>`).
    - Configuration is primarily done via `component.props` and `component.attrs`.
    - Little to no internal state management within the wrapper itself.
    - Usually don't rely heavily on complex slots or direct interaction with state managers like FormManager.
- **Examples:** @Button.md, @Icon.md, @divider.md, @Image.md, @Avatar.md

### 2. `Containers/`

- **Purpose:** Components whose main function is to contain, group, or structure other components, often related to
  layout or form structure, but without managing complex internal state themselves.
- **Characteristics:**
    - Often render standard HTML tags (like `div`, `fieldset`, `label` via @Tag.md) or simple layout wrappers.
    - Content is typically passed via `component.children`.
    - May use `component.props` or `component.attrs` for styling and layout hints (e.g., CSS classes).
- **Examples:** @Fieldset.md, @Fluid.md, @IconField.md, @InputGroup.md, @Label.md (via @Tag.md), @Row.md (Unvalidated),
  @ScrollPanel.md

### 3. `ComplexContainer/`

- **Purpose:** Wrappers for more complex PrimeVue components that manage structured content, often involving slots, item
  collections, or specific child component types.
- **Characteristics:**
    - Often wrap PrimeVue components with multiple named slots (e.g., Card, Toolbar) or those that require structured
      data/children (e.g., DataTable requires Columns, Accordion requires Panels).
    - Configuration might involve nested structures within `component.props` (like `props.slots` or `props.items`) or
      specific expectations for `component.children` types.
- **Examples:** @Accordion.md, @Card.md, @Carousel.md, @DataTable.md, @Grid.md, @Splitter.md, @Tabs.md, @Toolbar.md

### 4. `VModel/`

- **Purpose:** Input components specifically designed to integrate with the
  `@docs/ui/resources/managers/FormManager.md`.
- **Characteristics:**
    - Expect a `component.model` object defining the `form` and `field` for two-way data binding.
    - Render PrimeVue input elements (e.g., `<p-inputtext>`, `<p-checkbox>`, `<p-dropdown>`).
    - Handle the connection to the `FormManager` state.
    - May have sub-directories for organization (e.g., `Input/`, `Select/`, `Checkbox/`).
- **Examples:** @InputText.md, @Checkbox.md, @Select.md, @AutoComplete.md (Conceptual), @FileUpload.md (Conceptual)

# Overview: Rude Primevue Component Documentation Structure (Basic)

This documentation for PrimeVue component wrappers is organized into four main categories based on their primary
function and interaction pattern:

1. **`Components/`**: Basic, self-contained component wrappers (e.g., Button, Icon, divider). Often map directly to a
   single PrimeVue component with minimal extra logic.
2. **`Containers/`**: Components primarily used for layout or grouping other components, but without complex internal
   state management (e.g., Grid, Column, Fieldset, Panel).
3. **`ComplexContainer/`**: Layout or grouping components that often manage more complex internal structures, slots, or
   interactions (e.g., DataTable, Accordion, Tabs, Card).
4. **`VModel/`**: Components designed specifically to integrate with `@docs/ui/resources/managers/FormManager.md` using
   `v-model` or similar data binding for form inputs (e.g., InputText, Checkbox, Select, AutoComplete).

Refer to specific component files within these directories for detailed usage. 
