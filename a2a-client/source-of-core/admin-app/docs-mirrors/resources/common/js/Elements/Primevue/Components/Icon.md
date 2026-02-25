# Icon Component (`Icon.vue`)

**Source:** `resources/common/js/Elements/Primevue/components/Components/Icon.vue`

**Validation Rule:** `@install-modules/aiCore/validation/levels/00/components/Icon.json`

## Purpose

Renders an icon element (`<i>`) using CSS classes, typically from icon fonts like PrimeIcons (`pi pi-*`) or
FontAwesome (`fas fa-*`).

## Rendering

- Renders a simple `<i>` HTML element.
- Binds the CSS classes provided in the JSON configuration directly to the `<i>` tag's `class` attribute.
- **Important:** It uses `component.props.class` from the JSON configuration, **not** `$attrs`.

<!-- ```vue
// Icon.vue implementation
<template>
  <i :class="component.props.class"></i>
</template>

<script>
export default {
  name: 'CustomIcon',
  props: {
    component: Object,
  },
}
</script>
``` -->

## JSON Configuration Structure

The `Icon` component expects the following structure in the JSON configuration:

<!-- ```json
{
  "type": "Icon", 
  "props": { 
    "class": "pi pi-check text-green-500" // Required: CSS classes for the icon
  }
  // Note: Other keys like 'name', 'style', 'attrs' are ignored by Icon.vue
}
``` -->

- `type`: (String, Required) Must be `"Icon"`.
- `props`: (Object, Required)
    - `class`: (String, **Required**) The CSS class(es) defining the icon and its appearance (e.g., `"pi pi-user"`,
      `"pi pi-spin pi-spinner text-primary"`, `"fas fa-star text-yellow-500"`).

## Usage Examples (JSON)

<!-- ```json
// Example 1: Basic PrimeIcon
{
  "type": "Icon", 
  "props": { 
    "class": "pi pi-user"
  }
}

// Example 2: Spinning PrimeIcon with color
{
  "type": "Icon",
  "props": { 
    "class": "pi pi-spin pi-spinner text-primary"
  }
}

// Example 3: FontAwesome Icon (assuming FA is included in the project)
{
  "type": "Icon",
  "props": { 
    "class": "fas fa-thumbs-up text-green-500 mr-2"
  }
}
``` -->

## Dependencies

- An Icon Font Library (e.g., PrimeIcons, FontAwesome) must be correctly included and configured in the project for the
  specified icon classes to work.

<!-- mirror-status: outdated -->
<!-- source-size: 176 -->

