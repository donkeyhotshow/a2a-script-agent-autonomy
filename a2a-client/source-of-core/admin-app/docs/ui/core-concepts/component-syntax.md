# Component Syntax in JSON UI

## Introduction

This document describes the correct syntax for describing components in JSON UI. Strict adherence to this syntax
is necessary for the application to function correctly.

## Basic Syntax

### Key Property `type`

**Important:** All components are defined via the `"type"` property, **not** `"_element"`. Although the system often
processes the `type` value case-insensitively when searching in [
`component-map.json`](../../../../storage/aiCore/component-map.json), it is recommended to use **PascalCase** for
components (e.g., `"Button"`, `"Card"`) and **lowercase** for basic HTML tags (`"div"`, `"Span"`), as case **may be
important** for the dynamic loading of the component within its wrapper.

```json
{
  "type": "Button",
  "props": {
    "label": "Click Me"
  }
}
```

### Component Structure

The standard JSON UI component includes the following main properties:

| Property      | Type                | Description                                        |
|---------------|---------------------|----------------------------------------------------|
| `type`        | `String`            | **Required** property defining the component type. |
| `props`       | `Object`            | Component properties passed as props.              |
| `content`     | `String` or `Array` | Text content (for simple components).              |
| `children`    | `Array`             | Array of child components.                         |
| `customHooks` | `Object`            | Object containing event handlers.                  |

## Correct Syntax Examples

### Simple Button Component

```json
{
  "type": "Button",
  "props": {
    "label": "Submit",
    "icon": "pi pi-send",
    "class": "p-button-primary"
  }
}
```

### Link Component with Content

```json
{
  "type": "Link", // Assuming 'Link' is a defined type (e.g., renders as 'a')
  "props": {
    "href": "/contact-us",
    "class": "text-blue-600 hover:underline"
  },
  "content": "Contact Us"
}
```

### Component with Child Elements

```json
{
  "type": "Card",
  "props": {
    "title": "Product Information"
  },
  "children": [
    {
      "type": "Image", // Assuming 'Image' is a defined type (e.g., renders as 'img')
      "props": {
        "src": "/images/product.jpg",
        "alt": "Product Image"
      }
    },
    {
      "type": "Span",
      "props": {
        "class": "mt-2"
      },
      "content": "Product description..."
    }
  ]
}
```

### Component with Event Handlers

```json
{
  "type": "Button",
  "props": {
    "label": "Details"
  },
  "customHooks": {
    "click": [
      {
        "action": "navigateTo",
        "data": {
          "route": "/details"
        }
      }
    ]
  }
}
```

## Common Errors

### Incorrect: Using `_element` instead of `type`

```json
{
  "_element": "Button", // ❌ INCORRECT!
  "props": {
    "label": "Button"
  }
}
```

### Correct:

```json
{
  "type": "Button", // ✓ CORRECT (PascalCase recommended for components)
  "props": {
    "label": "Button"
  }
}
```

## Syntax Validation

Before using a JSON schema, it is recommended to:

1. Check the syntax using a JSON validator.
2. Verify the components used against available documentation.
3. Test the schema in a development environment before using it in production.

## Related Sections

* [UI Elements V1](./elements-v1.md)
* [UI Elements V2](./elements-v2.md)
* [Template Schema](./template-schema.md) 
