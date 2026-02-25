# UI Elements V1: Basic Components

This document lists common, basic UI components available for use in JSON templates. For more complex components,
see [UI Elements V2](./elements-v2.md).

**Important:** The list of supported component `type`s and their corresponding rendering wrappers is primarily defined
in [`storage/aiCore/component-map.json`](../../../../storage/aiCore/component-map.json). While the initial lookup in
this map often ignores case, it's **recommended to use PascalCase** for component types (e.g., `"Button"`,
`"InputText"`) and **lowercase** for basic HTML tags (e.g., `"div"`, `"Span"`) in your JSON structure, as case might
matter for dynamic loading within wrappers. For a complete list of properties (`props`) for a specific component, refer
to the PrimeVue documentation or the source code of the corresponding Vue component wrapper (found in
`resources/common/js/Elements/Primevue/`).

**Note on Rendering:** Components are rendered via different category wrappers (e.g., `Component`, `Container`,
`VModelComponent`, `ComplexContainer`, `Customs`) based on the mapping in `component-map.json`. This determines how
props and children are handled. See [`rendering-pipeline.md`](./rendering-pipeline.md) for details.

## Basic HTML Tags and Layout

### `div`

Standard HTML `<div>`. Rendered via the `Tag` wrapper.

* **Type:** `div` (lowercase)
* **Typical `props`:** `class`, `style`.
* **Example:**
  ```json
  {
    "type": "div",
    "props": { "class": "p-4 border rounded" },
    "children": [
        { "type": "Span", "props": { "content": "Content inside div" } }
    ]
  }
  ```

### `span`

Standard HTML `<span>`. Rendered via the `Tag` wrapper.

* **Type:** `span` (lowercase)
* **Typical `props`:** `class`, `style`, `content`.
* **Example:**
  ```json
  { "type": "Span", "props": { "class": "text-red-500 font-bold", "content": "Error Message!" } }
  ```

### `Column` (Container)

Used for layout structuring, typically within a `Grid` (see V2 Elements) or with flexbox classes. Mapped to `Container`
in `component-map.json`.

* **Documentation:** *Documentation for Column component wrapper is missing.*
* **Actual Rendering:** Rendered via `resources/common/js/Elements/Primevue/Container.vue`.
* **Example (from `storage/ai/landing-main-page/sections/features-section.json`, inside a `Grid`):**
  ```json
  {
    "type": "Column", // PascalCase Recommended
    "props": {
      "class": "col-span-12 md:col-span-6 lg:col-span-4 p-2", // Apply column sizing, padding, etc.
      "style": "border-radius: 10px; background: var(--surface-ground);" // Optional styles
    },
    "children": [
      // ... Content of the column ...
      { "type": "div", "props": { "content": "Column Content" } }
    ]
  }
  ```

### `Row` Usage Note

The component type `"Row"` was not found in usage examples. Layouts requiring a row direction are typically implemented
using a `"div"` component with appropriate flexbox classes (e.g., `"class": "flex flex-row gap-2"`) in its `props`.

## Basic Form Elements (Primarily VModelComponent)

These components typically require a `model` property for data binding via `hub.formManager`. Their `type` is mapped to
the `VModel` category wrapper in `component-map.json`.

### `InputText`

Single-line text input.

* **Type:** `InputText` (PascalCase Recommended)
* **Typical `props`:** `placeholder`, `disabled`, `class`.
* **Model:** Required. Links to `hub.formManager`.
* **Documentation:** *Documentation missing.*
* **Example:**
  ```json
  {
    "type": "InputText",
    "props": { "placeholder": "Enter your username" },
    "model": { "form": "loginForm", "field": "username" }
  }
  ```

### `Textarea`

Multi-line text input.

* **Type:** `Textarea` (PascalCase Recommended)
* **Typical `props`:** `placeholder`, `rows`, `cols`, `autoResize`, `disabled`, `class`.
* **Model:** Required.
* **Documentation:** *Documentation missing.*
* **Example:**
  ```json
  {
    "type": "Textarea",
    "props": { "placeholder": "Enter your message", "rows": 5, "autoResize": true },
    "model": { "form": "contactForm", "field": "message" }
  }
  ```

### `Dropdown` / `Select`

Dropdown selection list.

* **Type:** `Select` or `Dropdown` (PascalCase Recommended - Check specific registration)
* **Typical `props`:** `options` (array of {label, value}), `placeholder`, `filter`, `showClear`, `optionLabel`,
  `optionValue`, `disabled`, `class`.
* **Model:** Required.
* **Documentation:** *Documentation missing.*
* **Example:**
  ```json
  {
    "type": "Select", // Use PascalCase (or Dropdown)
    "props": {
      "placeholder": "Select a City",
      "options": [
        { "label": "New York", "value": "NY" },
        { "label": "Rome", "value": "RM" },
        { "label": "London", "value": "LDN" }
      ],
      "optionLabel": "label", // Key for display text
      "optionValue": "value", // Key for actual value
      "filter": true
    },
    "model": { "form": "addressForm", "field": "city" }
  }
  ```

### `Checkbox`

Checkbox input.

* **Type:** `Checkbox` (PascalCase Recommended)
* **Typical `props`:** `label`, `binary` (true for single boolean), `value` (value when checked, used if not binary),
  `disabled`, `class`.
* **Model:** Required.
* **Documentation:** *Documentation missing.*
* **Example (Boolean):**
  ```json
  {
    "type": "Checkbox",
    "props": { "label": "I agree to the terms", "binary": true },
    "model": { "form": "registerForm", "field": "agreedToTerms" }
  }
  ```
* **Example (Multiple Selection - Model field should be an array):**
  ```json
  {
    "type": "Checkbox",
    "props": { "label": "Option A", "value": "A" },
    "model": { "form": "preferencesForm", "field": "selectedOptions" }
  },
  {
    "type": "Checkbox",
    "props": { "label": "Option B", "value": "B" },
    "model": { "form": "preferencesForm", "field": "selectedOptions" }
  }
  ```

## Common Interactive & Display Elements

### `Button`

Standard interactive button. Rendered via the `Component` wrapper.

* **Type:** `Button` (PascalCase Recommended)
* **Typical `props`:** `label`, `icon`, `severity`, `disabled`, `rounded`, `outlined`, `text`, `class`, `style`.
* **Documentation:** *Documentation missing.*
* **Example:**
  ```json
  {
    "type": "Button",
    "props": {
      "label": "Submit",
      "icon": "pi pi-check",
      "severity": "success",
      "class": "mr-2"
    }
    // See elements-v2.md for complex Button examples (e.g., with dialogConfig)
  }
  ```

### `Image`

Displays an image. Rendered via the `Component` wrapper.

* **Type:** `Image` (PascalCase Recommended)
* **Typical `props`:** `src`, `alt`, `width`, `height`, `class`.
* **Example:**
  ```json
  {
    "type": "Image",
    "props": {
      "src": "/path/to/image.jpg",
      "alt": "Descriptive text",
      "width": "100",
      "class": "rounded"
    }
  }
  ```

### `Icon`

Displays an icon from an icon library (likely PrimeIcons). Rendered via the `Component` wrapper.

* **Type:** `Icon` (PascalCase Recommended)
* **Typical `props`:** `name` (e.g., "pi pi-home"), `class`, `style`.
* **Example:**
  ```json
  {
    "type": "Icon",
    "props": {
      "name": "pi pi-user",
      "class": "text-primary text-xl"
    }
  }
  ```

### `Tag`

Displays a small tag element, often used for status indicators or categories. Rendered via the `Container` wrapper.

* **Type:** `Tag` (PascalCase Recommended)
* **Typical `props`:** `value`, `severity`, `icon`, `rounded`, `class`.
* **Documentation:** *Documentation missing.*
* **Example:**
  ```json
  {
    "type": "Tag",
    "props": {
      "value": "Active",
      "severity": "success",
      "icon": "pi pi-check-circle"
    }
  }
  ```

## HTML Tags List

The definitive list of supported basic HTML tags (rendered via `Tag.vue`) can be found in the [
`template-schema.md`](./template-schema.md) document.

---

* Go back to: [JSON UI Core Concepts Overview](./README.md)
* See next: [UI Elements V2](./elements-v2.md)
