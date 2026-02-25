## 2. Client-Side Actions (`customHooks`)

These actions are defined in the `customHooks` property of components and are executed **on the client** (in the user's
browser), usually with the help of [`ActionManager`](../../resources/managers/common/actionManager.md).

### `customHooks` Structure

```json
"customHooks": {
  "eventName": [ // e.g., "click", "change", "mouseover"
    {
      "action": "clientActionName", // e.g., "navigateTo", "sendData"
      "data": { /* Parameters for this action */ }
    },
    // ... multiple actions can be specified for one event
  ]
}
```

### Main Types of Client-Side Actions

#### `navigateTo`

**Purpose:** Navigation within the application or to external resources.

**`data` Parameters:**

* `route` (string, optional): Internal Inertia route (e.g., `"/users/profile"`).
* `url` (string, optional): External URL (e.g., `"https://example.com"`).
* `fragment` (string, optional): ID of an element on the current page for smooth scrolling (e.g., `"section-about"`).
* `target` (string, optional): How to open the URL (e.g., `"_blank"` for a new tab).
* `behavior` (string, optional): Scrolling behavior when using `fragment` (`"smooth"` or `"auto"`).

**Examples:**

```json
// Navigate to an internal route
{ "action": "navigateTo", "data": { "route": "/settings" } }

// Scroll to an anchor
{ "action": "navigateTo", "data": { "fragment": "contact-form", "behavior": "smooth" } }

// Open an external URL in a new tab
{ "action": "navigateTo", "data": { "url": "https://docs.primevue.org/", "target": "_blank" } }
```

#### `sendData`

**Purpose:** Initiating a request to the server to execute a **server-side action**.

**`data` Parameters:**

* `action` (string, required): Name of the **server-side action** to execute (e.g., `"my-module/save-item"`).
* `form` (string, optional): Name of the form (attribute `name`) whose data should be sent. `ActionManager` will
  retrieve it from `FormManager`.
* `field` (string, optional): Name of the field whose value should be sent (if not sending the entire form).
* `payload` (any type, optional): Additional static data to send to the server.

**Example:**

```json
// Send form data on click
{ 
  "action": "sendData", 
  "data": { 
    "action": "profile/update-user", // Server-side action
    "form": "userProfileForm"        // Send data from this form
  }
}

// Send the value of a specific field when a Select changes
{ 
  "action": "sendData", 
  "data": { 
    "action": "program/change-window", // Server-side action
    "form": "programControl",         // Form name
    "field": "selectedWindow"        // Send the value of this field
  }
}
```

#### `copyToClipboard`

**Purpose:** Copying the value of a form field to the clipboard.

**`data` Parameters:**

* `form` (string, required): Form name.
* `field` (string, required): Field name within the form.

**Example:**

```json
{ 
  "action": "copyToClipboard", 
  "data": { 
    "form": "program-section", 
    "field": "requestToChat" 
  }
}
```

#### `toggleClass`

**Purpose:** Adding or removing a CSS class from an element.

**`data` Parameters:**

* `class` (string, required): Name of the class to toggle.
* `selector` (string, optional): CSS selector of the target element (if not specified, applies to the current element).
* `target` (string, optional): `vAddress` of the target component (alternative to `selector`).

**Example:**

```json
// Toggle the 'hidden' class on the element #mobile-menu
{ 
  "action": "toggleClass", 
  "data": { "class": "hidden", "selector": "#mobile-menu" }
}
```

#### `changeAttribute`

**Purpose:** Changing an element's attribute (currently only `class` is supported).

**`data` Parameters:**

* `attribute` (string, required): Attribute name (currently only `"class"`).
* `value` (string, required): Value (class name).
* `add` (boolean, required): `true` to add the class, `false` to remove.
* `target` (string, required): `vAddress` of the target component.
* `emitter` (string, optional): `vAddress` of the component initiating the event (used for hover effects, etc.).

**Example (show button on hover over input field):**

```json
// In customHooks of a Textarea (vAddress: "myTextarea")
"mouseover": [
  {
    "action": "changeAttribute",
    "emitter": "myTextarea", // Who initiates
    "data": {
      "target": "copyButton", // Which element to apply to
      "attribute": "class",
      "value": "opacity-0", // Which class to remove
      "add": false
    }
  }
]
```

#### `alert`

**Purpose:** Displaying a standard browser `alert`.

**`data` Parameters:**

* `message` (string, required): Message text.

**Example:**

```json
{ "action": "alert", "data": { "message": "Action completed!" } }
```

#### `closeDialog`

**Purpose:** Closing the currently active dialog window (assumes the presence of `ModalManager` or equivalent).

**`data` Parameters:** None required.

**Example:**

```json
{ "action": "closeDialog" }
```

### Additional Information

> See [Examples](./examples.md) for usage examples.
> Implementation details can be found in [`ActionManager.js`](../../resources/managers/common/actionManager.md).

## Examples from Real Modules

See the [examples.md](examples.md) file for detailed examples of using commands and operations from existing modules
in the system. 
