# JSON UI Examples (V1 Complex Patterns)

This document provides examples of more complex UI patterns built using confirmed V1 components and functionalities,
such as TabView and interactions involving multiple components.

> **Note:** These examples rely on the standard V1 feature set including FormManager, ActionManager, customHooks (
`sendData`, `navigate`, `confirm`), and core PrimeVue components adapted for JSON UI.

## Example 1:

```json

```

**Documentation References (Example 1 - Tabs):**

* Components Used:
    * `Card`, `div`, `h2`, `InputText`, `Textarea`, `Button`, `Checkbox`, `label`, `Password`: Primarily PrimeVue
      components - [docs/ui/resources/elements/primevue/README.md](../../resources/elements/primevue/README.md)
* Form Management (`model`): Usage for `user-settings` and `change-password`
  forms - [docs/ui/resources/managers/FormManager.md](../../resources/managers/FormManager.md)
* Client Actions (`customHooks`, `sendData`):
  Concepts - [docs/ui/json-ui/core-concepts/module-actions.md](../core-concepts/module-actions.md), Command
  details - [docs/ui/json-ui/commands-and-operations/ui-documentation.md](../commands-and-operations/ui-documentation.md)
* Styling (`form-card`, `btn-primary`, Tailwind): General
  guidelines - [docs/standards/storage-design-guidelines.md](../../../standards/storage-design-guidelines.md)

## Example 2: Product Filtering with Dynamic Update

This example demonstrates a common V1 pattern where changing a filter (e.g., category dropdown) triggers a `sendData`
call to fetch updated results for a DataTable, simulating dynamic filtering.

```json
{
  "type": "div",
  "props": { "class": "p-4 md:p-6 space-y-4" },
  "children": [
    { "type": "h2", "props": { "class": "text-2xl font-semibold" }, "children": ["Products"] },
    // Filter Bar
    { "type": "Card", "props": { "class": "filter-bar" }, "children": [
      { "type": "div", "props": { "class": "p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end" }, "children": [
        {
          "type": "InputText",
          "props": { "label": "Search by Name/SKU", "placeholder": "Enter keyword...", "class": "w-full" },
          "model": { "form": "product-filters", "field": "searchTerm" }
        },
        {
          "type": "Select", // Using Select (Dropdown) - options assumed loaded initially
          "props": {
            "label": "Filter by Category", // Static or initially loaded options
            "placeholder": "All Categories", "class": "w-full"
          },
          "model": {  "optionLabel": "name", "optionValue": "id","form": "product-filters", "field": "categoryId", "options": { "action": "include","type": "operation", "source": "lookups/productCategories" } },
          // V1 Pattern: Trigger data refresh on change
          "customHooks": {
            "change": [
              { "action": "sendData", "data": { "action": "products/fetch", "form": "product-filters", "target": "productData" } }
            ]
          }
        },
        { "type": "Button", "props": { "label": "Apply Search", "icon": "pi pi-search", "class": "btn-primary w-full md:w-auto" },
           "customHooks": {
             "click": [
               { "action": "sendData", "data": { "sendTo": "products/fetch", "form": "product-filters", "target": "productData" } }
             ]
           }
        }
      ]}
    ]},
    // Product Table
    { "type": "Card", "props": { "class": "mt-4" }, "children": [
      { "type": "div", "props": { "class": "p-4" }, "children": [
        {
          "type": "DataTable",
          "props": {
            "value": "state:productData", // Data updated by filter actions
            "paginator": true, "rows": 10,
            "loading": "state:productLoading",
            "dataKey": "id"
            // Server-side sorting/pagination would require more complex V2 hooks or lazy loading setup
          },
          "children": [
            { "type": "Column", "props": { "field": "name", "header": "Name" } },
            { "type": "Column", "props": { "field": "categoryName", "header": "Category" } },
            { "type": "Column", "props": { "field": "price", "header": "Price" } },
            { "type": "Column", "props": { "header": "Actions", "style": "width: 100px" }, "children": [
               { "type": "template", "slot": "body", "template": {
                  "type": "Button", "props": { "icon": "pi pi-pencil", "class": "p-button-sm p-button-secondary" },
                  "customHooks": { "click": [ { "action": "navigate", "data": { "to": "/products/edit/{row.id}" } } ] }
               }}
            ]}
          ]
        }
      ]}
    ]}
  ]
}
```

**Documentation References (Example 2 - Filtering):**

* Components Used:
    * `div`, `h2`, `Card`, `InputText`, `Select`, `Button`, `DataTable`, `Column`, `template`: Primarily PrimeVue
      components - [docs/ui/resources/elements/primevue/README.md](../../resources/elements/primevue/README.md)
* Form Management (`model` for filters): `product-filters`
  form - [docs/ui/resources/managers/FormManager.md](../../resources/managers/FormManager.md)
* Client Actions (`customHooks`, `sendData` on change/click, `navigate`):
  Concepts - [docs/ui/json-ui/core-concepts/module-actions.md](../core-concepts/module-actions.md), Command
  details - [docs/ui/json-ui/commands-and-operations/ui-documentation.md](../commands-and-operations/ui-documentation.md)
* Data Targeting (`target: "productData"`): Assumes state management for data updates, related to `sendData`.
* Styling (`filter-bar`, `btn-primary`, Tailwind): General
  guidelines - [docs/standards/storage-design-guidelines.md](../../../standards/storage-design-guidelines.md)

## Example 3: Simple Approval Workflow UI

Demonstrates using buttons with `confirm` and `sendData` to simulate a basic approval/rejection flow for an item (e.g.,
a submitted article).

```json
{ пример имеет нерабочие аргументы 
  "type": "Card",
  "props": { "class": "w-full max-w-2xl mx-auto mt-8" },
  "children": [
    // Header Section
    { "type": "div", "props": { "class": "p-4 border-b" }, "children": [
      { "type": "h3", "props": { "class": "text-lg font-semibold" }, "children": ["Review Submitted Article"] }
    ]},
    // Content Display (Read-only)
    { "type": "div", "props": { "class": "p-4 space-y-3" }, "children": [
      { "type": "div", "children": [ { "type": "strong", "children": ["Title: "] }, "{article.title}" ] },
      { "type": "div", "children": [ { "type": "strong", "children": ["Author: "] }, "{article.authorName}" ] },
      { "type": "div", "children": [ { "type": "strong", "children": ["Submitted: "] }, "{article.submittedDate}" ] },
      { "type": "div", "props": { "class": "mt-2 p-3 bg-gray-50 border rounded" }, "children": [
         { "type": "h4", "props": { "class": "font-medium mb-1" }, "children": ["Content Preview:"] },
         { "type": "p", "props": { "class": "text-sm text-gray-700" }, "children": ["{article.contentPreview | default('No preview available.')}"] }
      ]}
    ]},
    // Action Footer
    { "type": "div", "props": { "class": "p-4 border-t bg-gray-50 flex justify-end space-x-3" }, "children": [
      // Reject Button
      {
        "type": "Button",
        "props": { "label": "Reject", "icon": "pi pi-times", "class": "p-button-danger" },
        "customHooks": {
          "click": [
            {
              "action": "confirm",
              "data": {
                "header": "Confirm Rejection",
                "message": "Are you sure you want to reject this article?",
                "icon": "pi pi-exclamation-triangle",
                "acceptLabel": "Yes, Reject", "rejectLabel": "Cancel", "acceptClass": "p-button-danger",
                "accept": {
                  "action": "sendData",
                  "data": { "sendTo": "articles/reject", "articleId": "{article.id}", "reason": "Rejected via UI" } // Can send optional data
                }
              }
            }
          ]
        }
      },
      // Approve Button
      {
        "type": "Button",
        "props": { "label": "Approve", "icon": "pi pi-check", "class": "p-button-success" },
        "customHooks": {
          "click": [
             {
              "action": "confirm",
              "data": {
                "header": "Confirm Approval",
                "message": "Approve this article for publication?",
                "icon": "pi pi-check-circle",
                "acceptLabel": "Yes, Approve", "rejectLabel": "Cancel", "acceptClass": "p-button-success",
                "accept": {
                  "action": "sendData",
                  "data": { "sendTo": "articles/approve", "articleId": "{article.id}" }
                }
              }
            }
          ]
        }
      }
    ]}
  ]
}
```

**Documentation References (Example 3 - Approval):**

* Components Used:
    * `Card`, `div`, `h3`, `strong`, `h4`, `p`, `Button`: Basic and PrimeVue
      elements - [docs/ui/resources/elements/primevue/README.md](../../resources/elements/primevue/README.md)
* Client Actions (`customHooks`, `confirm`, `sendData` within `accept`):
  Concepts - [docs/ui/json-ui/core-concepts/module-actions.md](../core-concepts/module-actions.md), Command
  details - [docs/ui/json-ui/commands-and-operations/ui-documentation.md](../commands-and-operations/ui-documentation.md)
* Styling (`p-button-danger`, `p-button-success`, Tailwind): General
  guidelines - [docs/standards/storage-design-guidelines.md](../../../standards/storage-design-guidelines.md)
