# JSON UI Examples (V1 Patterns)

This document provides practical examples illustrating common UI patterns built using the V1 JSON UI system. These
examples demonstrate the use of standard PrimeVue components, FormManager integration, customHooks for client-side
actions, and interaction with the backend via `sendData`.

> **Note:** These examples assume the necessary backend actions and data sources (`model` paths) are configured
> correctly. Styling relies on utility classes (Tailwind) and predefined component styles (`form-card`, `btn-primary`,
> etc.) as defined in the project's standards.

## Example 1: Detailed User Profile Form

This form demonstrates various input types for editing user profile information, structured within a Card component
using standard divs for sections.

```json
{
  "type": "Card",
  "props": { "class": "w-full max-w-3xl mx-auto mt-8 form-card" },
  "children": [
    { "type": "div", "props": { "class": "p-5 bg-primary-700 text-white rounded-t-lg flex justify-between items-center" }, "children": [
      { "type": "h2", "props": { "class": "text-xl font-semibold" }, "children": ["Edit User Profile"] },
      { "type": "Span", "props": { "class": "text-sm" }, "children": ["User ID: {user/id}"] }
    ] },
    { "type": "div", "props": { "class": "p-5 space-y-6" }, "children": [
      // Section 1: Basic Information
      { "type": "div", "props": { "class": "section-container border p-4 rounded-md" }, "children": [
        { "type": "h3", "props": { "class": "text-lg font-semibold mb-4 border-b pb-2" }, "children": ["Basic Information"] },
        { "type": "div", "props": { "class": "grid grid-cols-1 md:grid-cols-2 gap-4" }, "children": [
          {
            "type": "InputText",
            "props": { "label": "First Name", "required": true, "class": "w-full" },
            "model": { "form": "user-profile", "field": "firstName" }
          },
          {
            "type": "InputText",
            "props": { "label": "Last Name", "required": true, "class": "w-full" },
            "model": { "form": "user-profile", "field": "lastName" }
          },
          {
            "type": "InputText",
            "props": { "label": "Email Address", "required": true, "type": "email", "disabled": true, "class": "w-full" },
            "model": { "form": "user-profile", "field": "email" }
          },
          // Removed Calendar, use simple InputText for DOB if needed
          {
            "type": "InputText",
            "props": { "label": "Date of Birth (YYYY-MM-DD)", "placeholder": "YYYY-MM-DD", "class": "w-full" },
            "model": { "form": "user-profile", "field": "dateOfBirth" }
          }
        ]}
      ]},
      // Section 2: Address Information
      { "type": "div", "props": { "class": "section-container border p-4 rounded-md" }, "children": [
         { "type": "h3", "props": { "class": "text-lg font-semibold mb-4 border-b pb-2" }, "children": ["Address Information"] },
        { "type": "div", "props": { "class": "space-y-4" }, "children": [
          {
            "type": "InputText",
            "props": { "label": "Street Address", "class": "w-full" },
            "model": { "form": "user-profile", "field": "address.street" }
          },
          { "type": "div", "props": { "class": "grid grid-cols-1 md:grid-cols-3 gap-4" }, "children": [
            {
              "type": "InputText",
              "props": { "label": "City", "class": "w-full" },
              "model": { "form": "user-profile", "field": "address.city" }
            },
            {
              "type": "InputText",
              "props": { "label": "State/Province", "class": "w-full" },
              "model": { "form": "user-profile", "field": "address.state" }
            },
            {
              "type": "InputText",
              "props": { "label": "Postal Code", "class": "w-full" },
              "model": { "form": "user-profile", "field": "address.zip" }
            }
          ]},
          // Removed Select, use simple InputText for Country
          {
            "type": "InputText",
            "props": { "label": "Country", "class": "w-full" },
            "model": { "form": "user-profile", "field": "address.country" }
          }
        ]}
      ]},
      // Section 3: Preferences (Using Checkbox and RadioButton)
      { "type": "div", "props": { "class": "section-container border p-4 rounded-md" }, "children": [
         { "type": "h3", "props": { "class": "text-lg font-semibold mb-4 border-b pb-2" }, "children": ["Preferences"] },
         { "type": "div", "props": { "class": "p-4 space-y-4" }, "children": [
            {
              "type": "div", "props": { "class": "flex items-center" }, "children": [
                // Assuming InputSwitch is a simple wrapper or standard
                { "type": "Checkbox", "props": { "binary": true, "class": "mr-2" }, "model": { "form": "user-profile", "field": "prefs.darkMode" } },
                { "type": "Span", "children": ["Enable Dark Mode Interface"] }
              ]
            },
            {
              "type": "div", "props": { "class": "font-medium" }, "children": ["Email Notification Frequency:"]
            },
            { "type": "div", "props": { "class": "flex flex-wrap gap-4" }, "children": [
                { "type": "div", "props": { "class": "flex items-center" }, "children": [
                    { "type": "RadioButton", "props": { "inputId": "freq1", "name": "frequency", "value": "daily", "class": "mr-1" }, "model": { "form": "user-profile", "field": "prefs.emailFrequency" } },
                    { "type": "label", "props": { "for": "freq1" }, "children": ["Daily"] }
                ]},
                { "type": "div", "props": { "class": "flex items-center" }, "children": [
                    { "type": "RadioButton", "props": { "inputId": "freq2", "name": "frequency", "value": "weekly", "class": "mr-1" }, "model": { "form": "user-profile", "field": "prefs.emailFrequency" } },
                    { "type": "label", "props": { "for": "freq2" }, "children": ["Weekly"] }
                ]},
                { "type": "div", "props": { "class": "flex items-center" }, "children": [
                    { "type": "RadioButton", "props": { "inputId": "freq3", "name": "frequency", "value": "never", "class": "mr-1" }, "model": { "form": "user-profile", "field": "prefs.emailFrequency" } },
                    { "type": "label", "props": { "for": "freq3" }, "children": ["Never"] }
                ]}
            ]}
         ]}
      ]},
      // Action Buttons
      { "type": "div", "props": { "class": "flex justify-end space-x-3 mt-6 border-t pt-4" }, "children": [
        {
          "type": "Button",
          "props": { "label": "Cancel", "class": "p-button-secondary" },
          "customHooks": { "click": [ { "action": "navigate", "data": { "to": "/users" } } ] }
        },
        {
          "type": "Button",
          "props": { "label": "Save Changes", "class": "btn-primary", "icon": "pi pi-check" },
          "customHooks": { "click": [ { "action": "sendData", "data": { "sendTo": "users/update", "form": "user-profile" } } ] }
        }
      ]}
    ]}
  ]
}
```

**Documentation References (Example 1):**

* Components Used:
    * `Card`, `div`, `h2`, `span`, `h3`, `InputText`, `Checkbox`, `RadioButton`, `label`, `Button`: Primarily documented
      in PrimeVue section - [docs/ui/resources/elements/primevue/README.md](../../resources/elements/primevue/README.md)
* Form Management (`model`): Concept and
  usage - [docs/ui/resources/managers/FormManager.md](../../resources/managers/FormManager.md)
* Client Actions (`customHooks`, `navigate`, `sendData`): Core
  concepts - [docs/ui/json-ui/core-concepts/module-actions.md](../core-concepts/module-actions.md), Command
  details - [docs/ui/json-ui/commands-and-operations/ui-documentation.md](../commands-and-operations/ui-documentation.md)
* Styling (`form-card`, `btn-primary`, `p-button-secondary`, Tailwind): General
  guidelines - [docs/standards/storage-design-guidelines.md](../../../standards/storage-design-guidelines.md)

## Example 2: Product List with Filtering and Actions (V1 Revised)

This example uses DataTable to display a list of products with V1-confirmed features: pagination, sorting, standard text
filtering, and row actions.

```json
{
  "type": "div",
  "props": { "class": "card p-4" },
  "children": [
    { "type": "div", "props": { "class": "mb-4 flex justify-between items-center" }, "children": [
      { "type": "h3", "props": { "class": "text-xl font-semibold" }, "children": ["Product Catalog"] },
      { "type": "Button", "props": { "label": "Add New Product", "icon": "pi pi-plus", "class": "btn-success" },
        "customHooks": { "click": [ { "action": "navigate", "data": { "to": "/products/create" } } ] }
      }
    ] },
    {
      "type": "DataTable",
      "props": {
        "value": "api/products",
        "paginator": true, "rows": 15, "rowsPerPageOptions": [15, 30, 50], "rowHover": true, "responsiveLayout": "scroll",
        "class": "p-datatable-sm",
        "filters": "state:productFilters", // Assumes filters state is managed
        "loading": "state:productsLoading",
        "dataKey": "id",
        "sortField": "name", "sortOrder": 1
      },
      "children": [
        // Column for Product Name with Filtering and Sorting
        { "type": "Column", "props": {
            "field": "name", "header": "Name", "sortable": true, "filter": true, "filterPlaceholder": "Search by name...", "style": "min-width: 200px"
          }
        },
        // Column for SKU with Filtering
        { "type": "Column", "props": {
            "field": "sku", "header": "SKU", "sortable": true, "filter": true, "filterPlaceholder": "Search by SKU...", "style": "width: 150px"
          }
        },
        // Column for Price
        { "type": "Column", "props": { "field": "price", "header": "Price", "sortable": true, "dataType": "numeric", "style": "width: 100px" }, "children": [
            // Simple display, formatting assumed done backend or via simple filter if available
            { "type": "template", "slot": "body", "template": { "type": "Span", "children": ["${row.price}"] } }
        ]},
        // Column for Status (Using Tag)
        { "type": "Column", "props": { "field": "status", "header": "Status", "sortable": true, "filter": true, "filterPlaceholder": "Search status...", "style": "width: 120px" },
          "children": [
             { "type": "template", "slot": "body", "template": {
                "type": "Tag",
                "props": { "severity": "{row.status === 'active' ? 'success' : 'danger'}" },
                "children": ["{row.status}"]
             }}
          ]
        },
        // Column for Actions
        { "type": "Column", "props": { "header": "Actions", "bodyStyle": "text-align: center", "style": "width: 150px" },
          "children": [ { "type": "template", "slot": "body", "template": {
            "type": "div", "props": { "class": "flex justify-center gap-2" },
            "children": [
              // Edit Button
              { "type": "Button", "props": { "icon": "pi pi-pencil", "class": "p-button-sm p-button-secondary", "title": "Edit Product" },
                "customHooks": { "click": [ { "action": "navigate", "data": { "to": "/products/edit/{row.id}" } } ] }
              },
              // Delete Button with Confirmation
              { "type": "Button", "props": { "icon": "pi pi-trash", "class": "p-button-sm p-button-danger", "title": "Delete Product" },
                "customHooks": { "click": [ {
                    "action": "confirm",
                    "data": {
                      "header": "Confirm Deletion",
                      "message": "Are you sure you want to delete the product '{row.name}'?",
                      "icon": "pi pi-trash",
                      "acceptLabel": "Delete", "rejectLabel": "Cancel", "acceptClass": "p-button-danger",
                      "accept": { "action": "sendData", "data": { "action": "products/delete", "productId": "{row.id}" } }
                    }
                } ] }
              }
            ]
          } } ]
        }
      ]
    }
  ]
}
```

**Documentation References (Example 2):**

* Components Used:
    * `div`, `h3`, `Button`, `DataTable`, `Column`, `template`, `span`, `Tag`: Primarily PrimeVue
      components - [docs/ui/resources/elements/primevue/README.md](../../resources/elements/primevue/README.md)
* Form Management (`model` for filters): If filters use a
  form - [docs/ui/resources/managers/FormManager.md](../../resources/managers/FormManager.md)
* Client Actions (`customHooks`, `navigate`, `confirm`, `sendData`):
  Concepts - [docs/ui/json-ui/core-concepts/module-actions.md](../core-concepts/module-actions.md), Command
  details - [docs/ui/json-ui/commands-and-operations/ui-documentation.md](../commands-and-operations/ui-documentation.md)
* Styling (`card`, `btn-success`, `p-button-sm`, `p-button-secondary`, `p-button-danger`, Tailwind): General
  guidelines - [docs/standards/storage-design-guidelines.md](../../../standards/storage-design-guidelines.md)

## Example 3: Order Details View (Read-Only - V1 Revised)

Demonstrates displaying structured information using Cards and standard elements.

```json
{
  "type": "div",
  "props": { "class": "p-4 md:p-6 space-y-6" },
  "children": [
    // Header
    { "type": "div", "props": { "class": "flex justify-between items-center pb-4 border-b" }, "children": [
      { "type": "h2", "props": { "class": "text-2xl font-semibold" }, "children": ["Order Details"] },
      { "type": "div", "props": { "class": "flex gap-2" }, "children": [
        { "type": "Button", "props": { "label": "Print Invoice", "icon": "pi pi-print", "class": "p-button-secondary", "disabled": true } /* Print action needs specific implementation */ },
        { "type": "Button", "props": { "label": "Back to Orders", "icon": "pi pi-arrow-left", "class": "p-button-outlined" },
          "customHooks": { "click": [ { "action": "navigate", "data": { "to": "/orders" } } ] }
        }
      ]}
    ]},
    // Main Content Grid
    { "type": "div", "props": { "class": "grid grid-cols-1 lg:grid-cols-3 gap-6" }, "children": [
      // Left Column (Order Info, Customer Info)
      { "type": "div", "props": { "class": "lg:col-span-2 space-y-6" }, "children": [
        // Order Information Card
        { "type": "Card", "props": { "class": "order-info-card" }, "children": [
          { "type": "div", "props": { "class": "p-4" }, "children": [
            { "type": "h3", "props": { "class": "text-lg font-semibold mb-3" }, "children": ["Order Information"] },
            { "type": "div", "props": { "class": "grid grid-cols-2 gap-3 text-sm" }, "children": [
              { "type": "Span", "props": { "class": "font-medium text-gray-600" }, "children": ["Order ID:"] },
              { "type": "Span", "children": ["{order.id}"] },
              { "type": "Span", "props": { "class": "font-medium text-gray-600" }, "children": ["Order Date:"] },
              { "type": "Span", "children": ["{order.createdAt}"] }, // Direct display
              { "type": "Span", "props": { "class": "font-medium text-gray-600" }, "children": ["Status:"] },
              { "type": "Tag", "props": { "severity": "{order.statusSeverity}" }, "children": ["{order.statusLabel}"] },
              { "type": "Span", "props": { "class": "font-medium text-gray-600" }, "children": ["Total Amount:"] },
              { "type": "Span", "props": { "class": "font-semibold" }, "children": ["${order.total}"] } // Direct display
            ]}
          ]}
        ]},
        // Customer Information Card
        { "type": "Card", "props": { "class": "customer-info-card" }, "children": [
          { "type": "div", "props": { "class": "p-4" }, "children": [
            { "type": "h3", "props": { "class": "text-lg font-semibold mb-3" }, "children": ["Customer Information"] },
             { "type": "div", "props": { "class": "grid grid-cols-2 gap-3 text-sm" }, "children": [
              { "type": "Span", "props": { "class": "font-medium text-gray-600" }, "children": ["Name:"] },
              { "type": "Span", "children": ["{customer.name}"] },
              { "type": "Span", "props": { "class": "font-medium text-gray-600" }, "children": ["Email:"] },
              { "type": "Span", "children": ["{customer.email}"] },
              { "type": "Span", "props": { "class": "font-medium text-gray-600" }, "children": ["Phone:"] },
              { "type": "Span", "children": ["{customer.phone | default('N/A')}"] },
              { "type": "Span", "props": { "class": "font-medium text-gray-600" }, "children": ["Shipping Address:"] },
              { "type": "p", "props": { "class": "whitespace-pre-line" }, "children": ["{customer.shippingAddress}"] } // Use <p> for potentially multi-line address
            ]}
          ]}
        ]}
      ]},
      // Right Column (Items List)
      { "type": "div", "props": { "class": "lg:col-span-1 space-y-6" }, "children": [
        // Items List Card
        { "type": "Card", "props": { "class": "items-list-card" }, "children": [
          { "type": "div", "props": { "class": "p-4" }, "children": [
            { "type": "h3", "props": { "class": "text-lg font-semibold mb-3" }, "children": ["Items Ordered ({order.items.length})"] },
            // Simple list - assumes items array available as order.items
            { "type": "div", "props": { "class": "space-y-2 max-h-96 overflow-y-auto" }, "children": [
               // Actual iteration needs server-side processing or a dedicated list component.
               // This shows the desired *output structure* for items.
               { "type": "div", "props": { "class": "flex justify-between text-sm border-b pb-1" }, "children": [
                 { "type": "Span", "children": ["{order.items[0].name} (x{order.items[0].quantity})"] }, { "type": "Span", "children": ["${order.items[0].lineTotal}"] }
               ]},
                { "type": "div", "props": { "class": "flex justify-between text-sm border-b pb-1" }, "children": [
                 { "type": "Span", "children": ["{order.items[1].name} (x{order.items[1].quantity})"] }, { "type": "Span", "children": ["${order.items[1].lineTotal}"] }
               ]}
               // ... conceptually repeat for more items
            ]},
             { "type": "div", "props": { "class": "flex justify-between text-sm font-semibold mt-3 pt-2 border-t" }, "children": [
                 { "type": "Span", "children": ["Subtotal:"] }, { "type": "Span", "children": ["${order.subtotal}"] }
             ]},
              { "type": "div", "props": { "class": "flex justify-between text-sm mt-1" }, "children": [
                 { "type": "Span", "children": ["Shipping:"] }, { "type": "Span", "children": ["${order.shippingCost}"] }
             ]},
             { "type": "div", "props": { "class": "flex justify-between text-sm font-bold mt-2 pt-2 border-t" }, "children": [
                 { "type": "Span", "children": ["Total:"] }, { "type": "Span", "children": ["${order.total}"] }
             ]}
          ]}
        ]}
      ]}
    ]}
  ]
}
```

**Documentation References (Example 3):**

* Components Used:
    * `div`, `h2`, `Button`, `Card`, `h3`, `span`, `Tag`, `p`: Primarily PrimeVue or basic HTML
      elements - [docs/ui/resources/elements/primevue/README.md](../../resources/elements/primevue/README.md)
* Client Actions (`customHooks`, `navigate`):
  Concepts - [docs/ui/json-ui/core-concepts/module-actions.md](../core-concepts/module-actions.md), Command
  details - [docs/ui/json-ui/commands-and-operations/ui-documentation.md](../commands-and-operations/ui-documentation.md)
* Styling (`p-button-secondary`, `p-button-outlined`, Tailwind): General
  guidelines - [docs/standards/storage-design-guidelines.md](../../../standards/storage-design-guidelines.md)

## Example 4: Basic Dashboard Widgets (V1 Verified)

Dashboard widgets using Card, Grid, and basic PrimeIcons.

```json
{
  "type": "div",
  "props": { "class": "dashboard p-4 space-y-6" },
  "children": [
    { "type": "div", "props": { "class": "flex justify-between items-center" }, "children": [
        { "type": "h2", "props": { "class": "text-2xl font-semibold" }, "children": ["Dashboard"] }
      ]
    },
    { "type": "div", "props": { "class": "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" }, "children": [
      // Widget 1: Total Sales
      { "type": "Card", "props": { "class": "stats-card" }, "children": [
          { "type": "div", "props": { "class": "p-4 flex items-center" }, "children": [
            { "type": "i", "props": { "class": "pi pi-dollar text-green-500 text-3xl mr-4" } },
            { "type": "div", "children": [
              { "type": "Span", "props": { "class": "block text-gray-500 font-medium" }, "children": ["Total Sales (Month)"] },
              { "type": "Span", "props": { "class": "block text-xl font-semibold" }, "children": ["{dashboard.salesMonth}"] },
              { "type": "Span", "props": { "class": "text-sm text-green-500" }, "children": ["{dashboard.salesTrend}"] }
            ]}
          ]}
      ]},
      // Widget 2: New Orders
      { "type": "Card", "props": { "class": "stats-card" }, "children": [
          { "type": "div", "props": { "class": "p-4 flex items-center" }, "children": [
             { "type": "i", "props": { "class": "pi pi-shopping-cart text-blue-500 text-3xl mr-4" } },
             { "type": "div", "children": [
              { "type": "Span", "props": { "class": "block text-gray-500 font-medium" }, "children": ["New Orders (Today)"] },
              { "type": "Span", "props": { "class": "block text-xl font-semibold" }, "children": ["{dashboard.ordersToday}"] },
              { "type": "Span", "props": { "class": "text-sm text-gray-500" }, "children": ["Processing: {dashboard.ordersProcessing}"] }
            ]}
          ]}
      ]},
      // Widget 3: Pending Tasks
      { "type": "Card", "props": { "class": "stats-card" }, "children": [
          { "type": "div", "props": { "class": "p-4 flex items-center" }, "children": [
            { "type": "i", "props": { "class": "pi pi-list text-orange-500 text-3xl mr-4" } },
            { "type": "div", "children": [
              { "type": "Span", "props": { "class": "block text-gray-500 font-medium" }, "children": ["Pending Tasks"] },
              { "type": "Span", "props": { "class": "block text-xl font-semibold" }, "children": ["{dashboard.tasksPending}"] },
              { "type": "Span", "props": { "class": "text-sm text-red-500" }, "children": ["{dashboard.tasksOverdue} Overdue"] }
            ]}
          ]}
       ]},
       // Widget 4: Active Users
       { "type": "Card", "props": { "class": "stats-card" }, "children": [
          { "type": "div", "props": { "class": "p-4 flex items-center" }, "children": [
            { "type": "i", "props": { "class": "pi pi-users text-purple-500 text-3xl mr-4" } },
             { "type": "div", "children": [
              { "type": "Span", "props": { "class": "block text-gray-500 font-medium" }, "children": ["Active Users (Now)"] },
              { "type": "Span", "props": { "class": "block text-xl font-semibold" }, "children": ["{dashboard.usersActive}"] },
               { "type": "Span", "props": { "class": "text-sm text-gray-500" }, "children": ["Peak: {dashboard.usersPeak} ({dashboard.usersPeakTime})"] }
            ]}
          ]}
       ]}
    ]}
  ]
}
```

**Documentation References (Example 4):**

* Components Used:
    * `div`, `h2`, `Card`, `i` (PrimeIcons), `span`: Basic
      elements - [docs/ui/resources/elements/primevue/README.md](../../resources/elements/primevue/README.md)
* Data Display (`{...}`): Basic templating, see examples and potentially server-side documentation.
* Styling (`stats-card`, Tailwind): General
  guidelines - [docs/standards/storage-design-guidelines.md](../../../standards/storage-design-guidelines.md)

</rewritten_file>
