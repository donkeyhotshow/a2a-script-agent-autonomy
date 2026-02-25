# UI Elements V2: Advanced Components

This document lists more advanced or less commonly used UI components available for use in JSON templates. For simpler,
more common components, see [UI Elements V1](./elements-v1.md).

**Important:** The list of supported component `type`s and their corresponding rendering wrappers is primarily defined
in [`storage/aiCore/component-map.json`](../../../../storage/aiCore/component-map.json). While the initial lookup in
this map often ignores case, it's **recommended to use PascalCase** for component types (e.g., `"Accordion"`, `"Grid"`,
`"Card"`) and **lowercase** for basic HTML tags (e.g., `"div"`, `"Span"`) in your JSON structure, as case might matter
for dynamic loading within wrappers. For a complete list of properties (`props`) for a specific component, refer to the
PrimeVue documentation or the source code of the corresponding Vue component wrapper (found in
`resources/common/js/Elements/Primevue/`).

**Note on Rendering:** Components are rendered via different category wrappers (e.g., `Component`, `Container`,
`VModelComponent`, `ComplexContainer`, `Customs`) based on the mapping in `component-map.json`. This determines how
props and children are handled. See [`rendering-pipeline.md`](./rendering-pipeline.md) for details.

## Advanced Containers and Layout

(Examples are illustrative; actual `props` may differ)

### Implementation Details

Implementation details involve Vue component wrappers that translate the JSON schema into actual UI elements. This
abstraction layer handles rendering, state management, and event handling.

### `Panel` (Container)

Container with a border and optional header. Rendered via the `Container` wrapper.

* **Type:** `Panel` (PascalCase Recommended)
* **Typical `props`:** `header` (string), `toggleable` (boolean), `collapsed` (boolean).
* **Documentation:** *Documentation missing.*
* **Example:**
  ```json
  { 
    "type": "Panel", 
    "props": { "header": "Settings Section", "toggleable": true },
    "children": [ 
        { "type": "Span", "props": { "content": "Panel Content" } } 
    ]
  }
  ```

### `Card` (ComplexContainer)

Container for displaying content in a card format. Rendered via the `ComplexContainer` wrapper.

* **Type:** `Card` (PascalCase Recommended)
* **Structure:** Uses `props` for `header`, `title`, `subtitle`, `footer`. Child components go in the `children` array
  for the main content area. `title` can also be an array of components.
* **Documentation:** [
  `docs/ui/resources/elements/primevue/components/ComplexContainer/Card.md`](../../resources/elements/primevue/components/ComplexContainer/Card.md)
* **Example:**
  ```json
  {
    "type": "Card", 
    "props": {
      "header": "Card Header Text",
      "title": "Main Title Text",
      "subtitle": "Subtitle Text",
      "footer": "Footer Text",
      "class": "shadow-lg my-4"
    },
    "children": [ 
      { "type": "Span", "props": { "content": "This is the main content of the card." } },
      { "type": "Button", "props": { "label": "Action" } }
    ]
  }
  ```

### `Accordion` (ComplexContainer)

* **Status:** Currently under development/review. The component
  `resources/common/js/Elements/Primevue/ComplexContainer/Accordion.vue` and its documentation
  `docs/ui/resources/elements/primevue/components/ComplexContainer/Accordion.md` may require updates for consistency.
* **Documentation:** [
  `docs/ui/resources/elements/primevue/components/ComplexContainer/Accordion.md`](../../resources/elements/primevue/components/ComplexContainer/Accordion.md)
* **Structure:** Uses an `items` array. Each item in the array should be a component (e.g., `div`) where the
  `props.header` defines the accordion tab header text, and the `children` define the content of the panel.
* **Example (from `storage/ai/landing-main-page/about-us.json`):**
  ```json
  {
    "type": "Accordion",
    "props": {
        "class": "faq-accordion",
        "activeIndex": 0 // Index of initially open panel
    },
    "items": [
        {
            "type": "div", // Each panel is a div
            "props": {
                "header": "Question 1?" // Header text is a prop of the panel div
            },
            "children": [
                {
                    "type": "div", // Content is nested inside the panel div
                    "props": {
                        "content": "<p>Answer to question 1.</p>"
                    }
                }
            ]
        },
        {
            "type": "div",
            "props": {
                "header": "Question 2?"
            },
            "children": [
                {
                    "type": "div",
                    "props": {
                        "content": "<p>Answer to question 2.</p>"
                    }
                }
            ]
        }
        // ... more items ...
    ]
  }
  ```

### `Grid` (ComplexContainer)

Used for creating grid layouts. Mapped to `ComplexContainer` in `component-map.json`.

* **Documentation:** *Documentation for Grid component wrapper is missing.*
* **Actual Rendering:** Rendered via `resources/common/js/Elements/Primevue/ComplexContainer/Grid.vue`.
* **Example (from `storage/ai/landing-main-page/sections/features-section.json`):** Shows a Grid containing multiple
  Column components. Layout classes (e.g., `col-span-*`) are typically applied to the `Column` props.
  ```json
  {
    "type": "Grid", // PascalCase Recommended
    // Props like 'class' for gap, etc., could potentially be added here
    "children": [
      {
        "type": "Column",
        "props": {
          "class": "col-span-12 md:col-span-6 lg:col-span-4 p-2", // Apply column sizing and padding here
          "style": "border-radius: 10px; background: var(--surface-ground);" // Example style
        },
        "children": [
          {
            "type": "div",
            "props": { "content": "Content for Column 1", "class": "p-4" }
          }
        ]
      },
      {
        "type": "Column",
        "props": {
          "class": "col-span-12 md:col-span-6 lg:col-span-4 p-2"
        },
        "children": [
          {
            "type": "div",
            "props": { "content": "Content for Column 2", "class": "p-4" }
          }
        ]
      },
      {
        "type": "Column",
        "props": {
          "class": "col-span-12 lg:col-span-4 p-2"
        },
        "children": [
          {
            "type": "div",
            "props": { "content": "Content for Column 3", "class": "p-4" }
          }
        ]
      }
      // ... more columns if needed ...
    ]
  }
  ```

### `Tabs` (ComplexContainer)

Displays content in a tabbed interface. Rendered via the `ComplexContainer` wrapper.

* **Type:** `Tabs` (PascalCase Recommended)
* **Structure:** Requires an `items` array. Each item in the array defines a tab with `props` (containing at least
  `header` as a string) and `children` (containing the content for that tab's panel).
* **Documentation:** [
  `docs/ui/resources/elements/primevue/components/ComplexContainer/Tabs.md`](../../resources/elements/primevue/components/ComplexContainer/Tabs.md)
* **Example:**
  ```json
  {
    "type": "Tabs",
    "props": { 
      "class": "w-full", 
      "activeIndex": 0 
    },
    "items": [
      {
        "props": { "header": "Tab 1 Title" },
        "children": [
          { "type": "Span", "props": { "content": "Content for the first tab." } }
        ]
      },
      {
        "props": { "header": "Tab 2 Title" },
        "children": [
          { "type": "InputText", "props": { "placeholder": "Input for second tab" }, "model": {"form": "myForm", "field": "tab2Input"} }
        ]
      }
    ]
  }
  ```

## Complex Interaction Patterns

### Extended Button Example (`dialogConfig`)

Example showing a Button that opens an inline dialog containing a form.

* **Structure:** The `dialogConfig` property is added to the `Button` component definition. It defines the dialog
  structure (`type: "Dialog"`), its fields (`fields` array), and actions (`actions` array).
* **Interaction:** Clicking the main button opens the dialog. Clicking the 'Submit' button inside the dialog triggers
  the `sendData` client action defined in its `customHooks`. This action calls the specified server action (e.g.,
  `storage/aiInstaller/.../someAction.json`) and includes data from the form defined within the dialog (`dialogForm`).
  The `closeDialog` action is also called.
* **Relevant Docs:** [
  `docs/ui/json-ui/commands-and-operations/ui-documentation.md`](../commands-and-operations/ui-documentation.md)

```json
{
  "type": "Button", // PascalCase Recommended
  "props": {
    "label": "Open Edit Dialog",
    "icon": "pi pi-pencil"
  },
  "dialogConfig": { // Specific property for Button component wrapper
    "type": "Dialog", // Defines the component to render inside the dialog frame
    "props": {
      "header": "Edit Details",
      "modal": true,
      "style": "width: 50vw"
    },
    "fields": [ // Array defining form elements inside the dialog
      {
        "type": "InputText", // PascalCase Recommended
        "props": { "label": "Item Name" },
        "model": { "form": "dialogForm", "field": "itemName" } // Uses a specific form name for the dialog
      },
      {
        "type": "Textarea", // PascalCase Recommended
        "props": { "label": "Description", "rows": 3 },
        "model": { "form": "dialogForm", "field": "description" }
      }
    ],
    "actions": [ // Array defining action buttons inside the dialog footer
      {
        "type": "Button", // PascalCase Recommended
        "props": { "label": "Cancel", "icon": "pi pi-times", "severity": "secondary" },
        "customHooks": {
          "click": [{ "action": "closeDialog" }] // Client action to close dialog
        }
      },
      {
        "type": "Button", // PascalCase Recommended
        "props": { "label": "Submit", "icon": "pi pi-check", "severity": "primary" },
        "customHooks": {
          "click": [
            {
              "action": "sendData", // Client action: send data to server
              "data": { // Payload for sendData
                "sendTo": "programChange", // REAL Server action name/path
                "form": "dialogForm" // Include data from this dialog-specific form
              }
            },
            { "action": "closeDialog" } // Client action: Close dialog after sending
          ]
        }
      }
    ]
  }
}
```

## Related Documentation

* [UI Elements V1](./elements-v1.md) (Simpler Components)
* [Template Schema](./template-schema.md)
* [Component Syntax](./component-syntax.md)
* [`component-map.json`](../../../../storage/aiCore/component-map.json)

---

* Go back to: [JSON UI Core Concepts Overview](./README.md)
* See previous: [UI Elements V1](./elements-v1.md)
* See next: [Module Actions](./module-actions.md)
