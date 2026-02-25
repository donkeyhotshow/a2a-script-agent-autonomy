# Logo Component (`Logo.vue`)

**Source:** `resources/common/js/Elements/Primevue/components/Components/Logo.vue`

**Validation Rule:** `@install-modules/aiCore/validation/levels/00/components/Logo.json`

**Dependency:** `@inertiajs/vue3 Link`

## Purpose

Displays the application logo as an SVG graphic wrapped within an Inertia.js `Link` component, making the logo
clickable.

## Rendering

- Renders an Inertia `Link` component.
- Inside the link, it renders an `<svg>` element.
- The attributes of the `<svg>` (`class`, `viewBox`) and the `d` attribute of its inner `<path>` are sourced from the
  `component.props.svg` object in the JSON configuration.
- The `href` attribute for the Inertia `Link` is taken from `component.props.href`.
- **Includes a hardcoded `<span>`:** `barberxxl.com.ua` is displayed next to the SVG logo.

<!-- ```vue
// Logo.vue implementation
<template>
  <Link :href="component.props.href">
    <svg :class="component.props.svg.class" :viewBox="component.props.svg.viewBox">
      <path :d="component.props.svg.path" fill="var(--primary-color)"></path>
    </svg>
    <span class="...">barberxxl.com.ua</span> // Hardcoded span
  </Link>
</template>

<script>
import { Link } from '@inertiajs/vue3';
export default {
  // ... component definition
  props: {
    component: Object, // Expects props.href and props.svg
  },
  components: {
    Link
  }
}
</script>
``` -->

## JSON Configuration Structure

The `Logo` component expects the following structure in the JSON configuration:

<!-- ```json
{
  "type": "Logo",
  "props": {
    "href": "/dashboard", // Optional: Target URL for the link (defaults to "/")
    "svg": {             // Required: SVG data object
      "class": "h-8 w-auto text-primary", // Optional: CSS classes for <svg>
      "viewBox": "0 0 24 24",           // Required: SVG viewBox
      "path": "M12 ... Z"                // Required: SVG path data (d attribute)
    }
  }
}
``` -->

- `type`: (String, Required) Must be `"Logo"`.
- `props`: (Object, Required)
    - `href`: (String, Optional) The target URL for the Inertia `Link`. Defaults to `/` if not provided.
    - `svg`: (Object, **Required**) Contains the data for the SVG logo.
        - `class`: (String, Optional) CSS classes to apply to the `<svg>` element.
        - `viewBox`: (String, **Required**) The `viewBox` attribute for the `<svg>` element.
        - `path`: (String, **Required**) The path data (`d` attribute) for the `<path>` element inside the SVG.

## Usage Example (JSON)

<!-- ```json
{
  "type": "Logo", 
  "props": {
    "href": "/",
    "svg": {
      "class": "block h-8 w-auto",
      "viewBox": "0 0 316 316",
      "path": "M158 0C70.7 0 0 70.7 0 158s70.7 158 158 158 158-70.7 158-158S245.3 0 158 0zm0 ... " // Truncated path data
    }
  }
}
``` -->

## Dependencies

- `@inertiajs/vue3`: For the `Link` component.

<!-- mirror-status: outdated -->
<!-- source-size: 558 -->

