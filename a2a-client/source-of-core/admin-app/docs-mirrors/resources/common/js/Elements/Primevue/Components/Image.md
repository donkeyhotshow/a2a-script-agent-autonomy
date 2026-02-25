# Image Component (`Image.vue`)

**Source:** `resources/common/js/Elements/Primevue/components/Components/Image.vue`

**Validation Rule:** `@install-modules/aiCore/validation/levels/00/components/Image.json`

**Underlying Component:** [PrimeVue Image](https://primevue.org/image/)

## Purpose

Renders an image using the `Image` component from the PrimeVue library. Provides a simple wrapper to integrate the
PrimeVue component into the JSON UI structure.

## Rendering

- Imports and renders the `Image` component from `primevue/image`.
- Passes specific properties from the JSON configuration (`component.props`) to the underlying PrimeVue `Image`
  component.

<!-- ```vue
// Image.vue implementation
<template>
  <Image :alt="component.props.alt"
         :class="component.props.class"
         :src="component.props.src"
         :style="component.props.style" />
</template>
<script>
import Image from 'primevue/image'

export default {
  // ... component definition
  props: {
    component: Object,
  },
}
</script>
``` -->

## JSON Configuration Structure

The `Image` wrapper expects the following structure in the JSON configuration:

<!-- ```json
{
  "type": "Image", 
  "props": { 
    "src": "/path/to/your/image.jpg", // Required: Image source URL
    "alt": "Descriptive text",          // Optional: Alt text
    "class": "w-full h-auto rounded", // Optional: CSS classes for the container
    "style": { "maxWidth": "300px" }    // Optional: Inline styles for the container
  }
}
``` -->

- `type`: (String, Required) Must be `"Image"`.
- `props`: (Object, Required)
    - `src`: (String, **Required**) The source URL for the image.
    - `alt`: (String, Optional) Alternative text for accessibility.
    - `class`: (String, Optional) CSS classes to apply to the image container (`p-image`).
    - `style`: (Object | String, Optional) Inline styles to apply to the image container (`p-image`).

**Note:** Other PrimeVue `Image` props like `width`, `height`, or `preview` are **not** directly exposed by this
`Image.vue` wrapper. To use them, you would typically apply styling via the `class` or `style` props, or the `Image.vue`
wrapper would need to be modified.

## Usage Examples (JSON)

<!-- ```json
// Example 1: Basic Image
{
  "type": "Image", 
  "props": { 
    "src": "/assets/logo.png",
    "alt": "Company Logo"
  }
}

// Example 2: Image with custom styling
{
  "type": "Image",
  "props": { 
    "src": "/images/profile.jpg",
    "alt": "User profile picture",
    "class": "rounded-full border-2 border-primary",
    "style": "width: 50px; height: 50px; object-fit: cover;"
  }
}
``` -->

## Dependencies

- `primevue/image`: The underlying PrimeVue component.

<!-- mirror-status: outdated -->
<!-- source-size: 348 -->

