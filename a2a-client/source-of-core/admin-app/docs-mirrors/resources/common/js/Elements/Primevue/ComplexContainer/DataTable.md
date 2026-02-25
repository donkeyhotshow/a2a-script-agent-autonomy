# DataTable.vue (Complex Container)

**Source:** `resources/common/js/Elements/Primevue/ComplexContainer/DataTable.vue`

## Purpose

Wraps the PrimeVue [`<p-datatable>`](https://primevue.org/datatable/) component along with related components like [
`<p-column>`](https://primevue.org/column/) and [`<p-paginator>`](https://primevue.org/paginator/). It provides a
powerful way to display and interact with tabular data, driven by JSON configuration.

## Rendering

- **Main Structure:** Renders the core `<p-datatable>` component.
- **Data & Configuration:** All configuration properties for the `<p-datatable>` (including the data source `value`,
  pagination settings `paginator`, `rows`, selection model `selection`, filters `filters`, `dataKey`, etc.) are passed
  directly via the `component.props` object. _(
  Validated: `storage/aiInstaller/sakai-dashboard/demo/%21crud-section.json`)_
    - **Binding Syntax:** Note that props requiring dynamic binding (like `value`, `filters`, `selection`) often use a
      Vue-like binding syntax within the JSON string value (e.g., `":value": "products"`, `":filters": "filters"`,
      `"model:selection": "selectedProducts"`). This assumes these variables (`products`, `filters`, `selectedProducts`)
      exist in the parent component's context where the JSON UI is rendered. _(Validated: same source)_
- **Columns:** Column definitions are provided as an array within `component.children`. Each child object with
  `"type": "Column"` renders a `<p-column>`. _(Validated: same source)_
    - Configuration for each `<p-column>` (`field`, `header`, `sortable`, `style`, `selectionMode`, etc.) is passed via
      the `props` object of that specific `Column` child. _(Validated: same source)_
    - Custom rendering for column parts (header, body, filter, editor) is achieved by nesting a
      `{"type": "Template", "props": {"slot": "..."}, "children": [...]}` component within the `children` of a `Column`.
      _(Validated: same source)_
- **Slots within Columns:** When using a nested `Template` for custom rendering (e.g., `slot: "body"`), the data for the
  current row and other context is available via `slotProps` (e.g., `slotProps.data.fieldName`). _(Validated: same
  source)_

## Props (Consumed by this Wrapper)

- `component`: (Object, Required) The JSON object describing the DataTable.
    - `component.props`: (Object, **Required**) Contains all configuration properties for the underlying
      `<p-datatable>`, mirroring its props API. Key examples: _(
      Validated: `storage/aiInstaller/sakai-dashboard/demo/%21crud-section.json`)_
        - `value` / `:value`: (String | Array, **Required**) The data array or variable name holding the data. _(
          Validated: same source)_
        - `dataKey`: (String, Required for selection/state preservation) The unique key field in the row data. _(
          Validated: same source)_
        - `paginator` / `:paginator`: (Boolean) Enable pagination. _(Validated: same source)_
        - `rows` / `:rows`: (Number) Rows per page. _(Validated: same source)_
        - `filters` / `:filters`: (Object | String) Filter model object or variable name. _(Validated: same source)_
        - `selection` / `model:selection`: (Object | Array | String) Selection model or variable name. _(Validated: same
          source)_
        - `selectionMode`: (String) 'single' or 'multiple'.
        - `sortField` / `:sortField`, `sortOrder` / `:sortOrder`: Sorting configuration.
        - `filterDisplay`: (String) 'menu' or 'row'.
        - `loading` / `:loading`: (Boolean) Loading state.
        - `paginatorTemplate`, `rowsPerPageOptions`, `currentPageReportTemplate`: Paginator configuration strings. _(
          Validated: same source)_
        - Other `<p-datatable>` props...
    - `component.children`: (Array, **Required**) An array where each element is a column definition object, typically
      `{"type": "Column", "props": {...}, "children": [...]}`. _(
      Validated: `storage/aiInstaller/sakai-dashboard/demo/%21crud-section.json`)_
        - Each `Column`'s `props` object contains configuration for `<p-column>` (e.g., `field`, `header`, `sortable`,
          `style`, `selectionMode`). _(Validated: same source)_
        - A `Column`'s `children` array can contain a `Template` object for custom rendering. _(Validated: same source)_
    - `component.attrs`: (Object, Optional) Standard HTML attributes (e.g., `class`, `style`) applied to the root
      `<div>` wrapper (if DataTable.vue uses one) or potentially the `<p-datatable>` itself.

## Column Template Slots & Context

- To customize column rendering, add a child `Template` to a `Column` definition:
  ```json
  { 
    "type": "Column", 
    "props": { "field": "price", "header": "Price" },
    "children": [
      {
        "type": "Template",
        "props": { "slot": "body" }, // or "header", "filter", "editor"
        "children": [ // Define components to render here
          { "type": "Text", "props": { "content": "${{ slotProps.data.price }}" } }
        ]
      }
    ]
  }
  ```
- Inside the `Template`'s `children`, you can access:
    - `slotProps.data`: The entire data object for the current row (for `body` and `editor` slots).
    - `slotProps.field`: The field name for the current column.
    - Other relevant props depending on the slot (`filterModel`, `filterCallback` for `filter`; `rowIndex` for
      `editor`).

## Usage (JSON Example)

> **Source:** `storage/aiInstaller/sakai-dashboard/demo/%21crud-section.json`

_Examples removed as requested. Please refer to the cited source file for usage examples._

## Dependencies

- `primevue/datatable`, `primevue/column`, `primevue/paginator`
- `../Component.vue` (for rendering slot content)
- Potentially other components used within slots (@Button.md, @Image.md, @Tag.md etc.)

<!-- mirror-status: outdated -->
<!-- source-size: 4801 -->

