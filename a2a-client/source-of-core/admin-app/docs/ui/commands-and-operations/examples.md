********`this is executed on the server`********

# Command and Operation Examples

Explanations - schemas involved on the server support templating `{}` (see `DataHub::resolveAddress`).

This document provides practical examples of using commands (`customHooks`) and structural operations (`include`).

**See also:**

## Table of Contents

3. [Examples of Structural Operations (`include`)](#examples-of-structural-operations-include)

## Examples of Complex Commands (Executed on the Server)

### Example 1: Handling Window Change (`windowChange.json`)

This sequence from the `primary-form` module is executed when the selected window changes.

```json
[
    {
        "action": "update",
        "batch": [
            {
                "from": "input",
                "to": "primary-form/data/program-section:selectedWindow"
            },
            {
                "from": "models/windows",
                "find": {
                    "value": "{primary-form/data/program-section:selectedWindow}"
                },
                "to": "buffer:selectedWindowInstance"
            },
            {
                "from": "models/windows",
                "find": {
                    "value": "{primary-form/data/program-section:selectedWindow}",
                    "return": "key"
                },
                "to": "buffer:selectedWindowIndex"
            },
            {
                "from": "buffer:selectedWindowInstance.selectedProgram",
                "to": "primary-form/data/program-section:selectedProgram"
            },
            {
                "from": "primary-form/data/program-section",
                "to": "output:forms.program-section"
            }
        ]
    },
    {
        "disabled": true,
        "action": "add",
        "condition": "primary-form/data/state/program:log",
        "from": "primary-form/data/program-section",
        "key": "id",
        "to": "primary-form/data/state/log"
    },
    {
        "action": "save",
        "from": "primary-form/data/program-section"
    }
]
```

**What happens:**

1. Batch update (`update`/`batch`):
    * Writes the newly selected window (`input`) to `selectedWindow`.
    * Finds (`find`) and saves the full window object and its index to the buffer (`buffer:`).
    * Updates `selectedProgram` based on data from the found window.
    * Sends the updated section data (`program-section`) to PHP (`output:`).
2. Save (`save`): The command saves the updated `program-section` data.

### Example 2: Step Back (`stepBack.json`)

Commands for the "Back" button in a step-by-step process.

```json
[
    {
        "action": "update",
        "batch": [
            {
                "from": "models/windows",
                "find": {
                    "attr": "id",
                    "value": "{primary-form/data/program-section:selectedWindow}"
                },
                "to": "buffer:selectedWindowInstance",
                "comment": "require index for read state array"
            },
            {
                "from": "buffer:selectedWindowInstance.state",
                "to": "buffer:state"
            },
            {
                "value": true,
                "to": "primary-form/data/program-section:stepBack"
            },
            {
                "from": "primary-form/data/program-section",
                "to": "output:forms.program-section"
            }
        ]
    },
    {
        "action": "save",
        "from": "primary-form/data/program-section"
    }
]

```

**What happens:**

1. Batch update (`update`/`batch`):
    * Finds the current window instance (`find`) and stores it in the buffer.
    * Copies the `state` array from the window instance to the buffer.
    * Sets the `stepBack` flag to `true`.
    * Sends the updated `program-section` data to PHP (`output:`).
2. Save (`save`): Saves the updated `program-section` data.

### Example 3: Window Creation (`windowCreate.json`)

See the detailed breakdown of this command
in [./example-server-command-window-create.md](./example-server-command-window-create.md).

******************`this is executed on the client`******************

2. [Examples of Simple Actions (`customHooks`)](#examples-of-simple-actions-customhooks---client)

## Examples of Simple Actions (`customHooks` - Client)

These actions are executed directly in the user's browser.

### Example 1: Navigation to a Section (Anchor)

```json
{
  "type": "Button",
  "props": {
    "label": "Our Services",
    "class": "p-button-text p-button-lg"
  },
  "customHooks": {
    "click": [
      {
        "action": "navigateTo",
        "data": {
          "fragment": "services",
          "behavior": "smooth"
        }
      }
    ]
  }
}
```

**What happens:** On click, the button smoothly scrolls the page to the element with `id="services"`.

### Example 2: Toggling a CSS Class

```json
{
  "type": "Button",
  "props": {
    "icon": "pi pi-bars",
    "class": "p-button-rounded p-button-text lg:hidden"
  },
  "customHooks": {
    "click": [
      {
        "action": "toggleClass",
        "data": {
          "class": "hidden",
          "selector": "#mobile-menu"
        }
      }
    ]
  }
}
```

**What happens:** The button toggles (adds/removes) the CSS class `hidden` on the element with ID `#mobile-menu`.

### Example 3: Navigating to an External URL

```json
{
  "type": "Button",
  "props": {
    "label": "Book Online",
    "icon": "pi pi-calendar",
    "class": "p-button-primary"
  },
  "customHooks": {
    "click": [
      {
        "action": "navigateTo",
        "data": {
          "url": "https://booking.example.com",
          "target": "_blank"
        }
      }
    ]
  }
}
```

**What happens:** The button opens the specified `url` in a new browser tab.

### Example 4: Navigating to an Internal Application Route

```json
{
  "type": "Button",
  "vAddress": "navigate-button-demo",
  "props": {
      "label": "Go to Documentation",
      "icon": "pi pi-external-link",
      "class": "p-button-primary"
  },
  "customHooks": {
      "click": [
          {
              "action": "navigateTo",
              "data": {
                  "route": "/landing-main-page/page"
              }
          }
      ]
  }
}
```

**What happens:** The button initiates navigation to the internal route `/landing-main-page/page` using Inertia.

### Example 5: Copying Text from a Form Input

```json
{
  "type": "Button",
  "vAddress": "button-unique-address-001",
  "props": { "icon": "pi pi-copy", /* ... */ },
  "customHooks": {
    "click": [
      {
        "action": "copyToClipboard",
        "data": {
          "form": "program-section",
          "field": "requestToChat"
        }
      }
    ]
  }
}
```

**What happens:** The button copies the value of the `requestToChat` field from the form `program-section` (managed by
`FormManager`) to the clipboard.

### Example 6: Sending Data to the Server (`sendData`)

```json
{
  "type": "Select",
  "name": "window-selector",
  // ... props and model ...
  "customHooks": {
    "change": [
      {
        "action": "sendData",
        "data": {
          "action": "program-section/windowChange",
          "form": "program-section",
          "field": "selectedWindow"
        }
      }
    ]
  }
}
```

**What happens:** On change, the client action `sendData` sends a POST request to the server, indicating the server
action `program-section/windowChange` and passing the current value of the `selectedWindow` field from the form
`program-section`.

## Examples of Structural Operations (`include`, `add` - Server)

These operations are executed when building UI on the server.

### Example 1: Page Composition from Sections

```json
{
  "type": "div",
  "props": {
    "class": "landing-page"
  },
  "children": [
    {
      "type": "operation",
      "action": "include",
      "source": "landing-page/sections/header"
    },
    {
      "type": "operation",
      "action": "include",
      "source": "landing-page/sections/hero"
    },
    {
      "type": "operation",
      "action": "include",
      "source": "landing-page/sections/services"
    },
    {
      "type": "operation",
      "action": "include",
      "source": "landing-page/sections/gallery"
    },
    {
      "type": "operation",
      "action": "include",
      "source": "landing-page/sections/testimonials"
    },
    {
      "type": "operation",
      "action": "include",
      "source": "landing-page/sections/contact"
    },
    {
      "type": "operation",
      "action": "include",
      "source": "landing-page/sections/footer"
    }
  ]
}
```

**What happens:** The main file of the page includes (`include`) multiple sections, each defined in
a separate JSON file (for example, `landing-page/sections/header.json`). This allows building UI from modular blocks.

### Example 2: Nested Inclusions

```json
{
  "type": "div",
  "props": {
    "class": "form-container"
  },
  "children": [
    {
      "type": "operation",
      "action": "include",
      "source": "forms/common/header"
    },
    {
      "type": "operation",
      "action": "include",
      "source": "forms/user-edit/sections"
    }
  ]
}

{
  "type": "div",
  "props": {
    "class": "form-sections"
  },
  "children": [
    {
      "type": "operation",
      "action": "include",
      "source": "forms/user-edit/sections/personal-info"
    },
    {
      "type": "operation",
      "action": "include",
      "source": "forms/user-edit/sections/address"
    }
  ]
}
```

**What happens:** Demonstration of nested inclusions, where one file (`forms/user-edit/sections.json`) itself uses
`include`.

### Example 3: Adding UI Blocks with `add`

The `add` operation is useful when you need to add content from another file to an existing array `children`, without
replacing the `operation` element itself.

```json
// Main file (for example, program-control.json)
{
    "type": "Form",
    "name": "program-section",
    "props": { /* ... */ },
    "children": [
        // ... other form fields ...
        {
            "type": "InputText",
            "name": "someField",
            /* ... */
        },
        {
            "type": "operation",
            "action": "add", // Adding content from requestToChat.json
            "source": "primary-form/templates/parts/program/requestToChat"
        },
        {
            "type": "operation",
            "action": "add", // Adding content from navButtons.json
            "source": "primary-form/templates/parts/program/navButtons"
        }
        // ... possibly, other fields ...
    ]
}

// File primary-form/templates/parts/program/requestToChat.json
// (Content of this file will be added to children of the main file)
{
    "type": "div",
    "props": {"class": "request-section"},
    "children": [
        {"type": "Textarea", "props": {"placeholder": "Your request..."}},
        {"type": "Button", "props": {"label": "Send Chat"}}
    ]
}

// File primary-form/templates/parts/program/navButtons.json
// (Content of this file will also be added to children of the main file)
{
    "type": "div",
    "props": {"class": "navigation-buttons"},
    "children": [
        {"type": "Button", "props": {"label": "Back", "icon": "pi pi-arrow-left"}},
        {"type": "Button", "props": {"label": "Forward", "icon": "pi pi-arrow-right"}}
    ]
}

```

**What happens:** The content of files `requestToChat.json` and `navButtons.json` (in this case, this is `div` with
nested elements) will be added to the `children` array of the main `Form` on the server before sending it to the client.
The `operation` elements remain in the final JSON.

## Combining Approaches
