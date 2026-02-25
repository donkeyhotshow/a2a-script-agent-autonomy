# (Innactive standard/recheck)  Inertia.js Integration Standards

This document outlines the standards and conventions for using Inertia.js to connect the Laravel backend with the Vue 3
frontend in this project.

## Core Concepts

- **Frameworks:** Inertia.js bridges a Laravel 11 backend and a Vue 3 frontend.
- **Vue API:** **Strictly use the Vue 3 Options API** (`data`, `computed`, `methods`, etc.) for all frontend components.
  The Composition API is not used in this project.
- **SPA Experience:** Inertia.js is used to create a single-page application experience.

## Hub Manager Pattern

The project utilizes a central **"Hub Manager"** pattern instead of a direct StateManager approach mentioned in older
documentation.
`injec: ['hub']`

- **Central Access:** A `hub` manager is typically injected into Vue components (accessible via `this.hub` ).
- **Sub-Managers:** This `hub` provides access to specialized managers responsible for specific domains:
    - `notifyManager`: Handles global event emitting and listening (e.g.,
      `this.hub.notifyManager.emit('event', payload)`).
    - `formManager`: Manages form registration, state, validation, and submission (e.g.,
      `this.hub.formManager.registerForm(...)`, `this.hub.formManager.sendData(...)`).
    - Other managers (e.g., `logManager`, `themeManager`) are accessed similarly through the `hub`.
- **Registration:** These managers are typically registered and made globally available via a custom Vue plugin.

## Standard Inertia Properties

The standard properties provided by Inertia.js are available within components:

- `this.$inertia`: The Inertia instance.
- `this.$page`: Contains page props, component name, URL, etc.

## Backend Communication (Router)

Use the `router` imported from `@inertiajs/vue3` for making requests to the Laravel backend without full page reloads.

- **Methods:** Primarily use `router.post(url, data, options)` and `router.get(url, data, options)`.
- **Options:** Utilize the `options` object for callbacks like `onSuccess`, `onError`, `onFinish`, etc.

```javascript
// Example using router.post in a Vue component method
import { router } from '@inertiajs/vue3';

export default {
    data() {
        return {
            formData: { name: '', email: '' }
        };
    },
    methods: {
        saveProfile() {
            router.post('/profile/update', this.formData, {
                preserveScroll: true,
                onSuccess: (page) => {
                    console.log('Profile updated!', page.props.flash.success);
                    // Access other managers via hub if needed
                    this.hub.notifyManager.emit('profileUpdated');
                },
                onError: (errors) => {
                    console.error('Update failed:', errors);
                }
            });
        }
    }
};
``` 
