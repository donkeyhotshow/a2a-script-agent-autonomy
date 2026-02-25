# Module Installation File Format

This document describes the configuration files located within the special `_i/` directory (
`storage/aiInstaller/your-module-name/_i/`), which are essential for the system (`InstallerController`) to discover,
register, install, and update a JSON UI module.

**Source:** Information primarily based on analysis of the `InstallerController` and existing modules like
`sakai-core`. (Previous detailed step-by-step guides moved to `docs_planning`).

## Overview

The `_i/` directory contains metadata and instructions for the installer.

```bash
# Example structure (e.g., for a basic module like landing-main-page)
storage/aiInstaller/my-basic-module/
├── page.json
├── ... (other content files like about-us.json)
├── sections/
│   └── header-section.json
├── assets/
│   └── logo.png
└── _i/                 # <--- Installer instructions directory
    ├── meta.json
    ├── links.json
    ├── blocks.json
    ├── files-by-block.json
    ├── common.json
    ├── useAnyway.json
    └── meta-admin.json
```

## Key Files in `_i/`

### `_i/meta.json`

* **Purpose:** Contains essential metadata about the module for identification.
* **Structure:** JSON object with fields:
    * `name` (string): Human-readable module name.
    * `description` (string): Brief description.
    * `version` (string): Module version (e.g., `1.0.0`).
    * `author` (string): Author or development team.
    * `dependencies` (object, optional): Frontend dependencies (e.g., library versions). Not to be confused with module
      dependencies which might be handled differently.
* **Example (`landing-main-page/_i/meta.json`):**

```json
{
        "name": "Barber Landing",
        "description": "The main landing page module for the application.",
        "version": "1.0.0",
        "author": "Admin App Team",
        "dependencies": {
            "primevue": "^4.0.0",
            "tailwindcss": "^3.0.0"
        }
    }
    ```

### `_i/links.json`

*   **Purpose:** Defines permanent links (permalinks) for accessing module pages and for display in navigation (e.g., top bar).
*   **Structure:** JSON array of objects, each describing a link. Key fields:
    *   `id` (string): Unique link identifier.
    *   `type` (string): Link type (e.g., `quest` for public, `admin` for admin panel, `external` for outside links).
    *   `label` (string): Display text for the link in UI.
    *   `path` (string): URL path for internal links (`quest`, `admin`). Can include `#fragment`.
    *   `url` (string): Full URL for `external` links.
    *   `icon` (string, optional): Icon class (e.g., `pi pi-home`).
    *   `parent` (string, optional): `id` of the parent link for menu hierarchy.
    *   `link` (string, optional): If `path` is an alias, `link` points to the actual target path.
*   **Processing:** Used by `InstallerController` to update the `PermanentLinkManager` system and navigation files (e.g., `storage/ai/top-bar-links/quest.json`, `admin.json`).
*   **Example (fragment from `landing-main-page/_i/links.json`):**
  ```json
    [
        {
            "id": "home-admin",
            "type": "admin",
            "label": "Barbershop Landing",
            "path": "/admin/landing-main-page",
            "icon": "pi pi-home"
        },
        {
            "id": "about-us-quest-direct",
            "type": "quest",
            "label": "About Us",
            "path": "/landing-main-page/about-us",
            "icon": "pi pi-info-circle"
        },
        {
            "id": "services-tattoo-direct",
            "type": "quest",
            "label": "Tattoo Services",
            "path": "/landing-main-page/services#tattoo-services",
            "icon": "pi pi-palette",
            "parent": "services-quest-direct" // Indicates parent link
        }
    ]
    ```

### `_i/blocks.json`, `_i/files-by-block.json`, `_i/common.json`, `_i/useAnyway.json`, `_i/meta-admin.json`

*   **Purpose:** These files provide more detailed configuration for the installation process, likely defining logical module blocks, rules for file handling/overwriting during updates, common settings, and admin-specific metadata.
*   **`files-by-block.json` Importance:** This file **must be kept up-to-date** during development. Any new files added to module directories like `actions/`, `data/`, `templates/`, `code/`, etc., must be registered here immediately for the system to recognize them.
*   **Further Details:** The exact structure and usage require deeper analysis of the `InstallerController` or examination of prototype modules (e.g., `@storage/aiInstaller/sakai-core`).

### Missing Files (Illustrative)

*   `storeBerforeActions.json`: This file relates to saving data/configuration during updates and might be more relevant in complex, dynamic modules compared to basic static ones. Its necessity depends on the module's specific requirements.

## Verification

Before finalizing module creation, verify compliance with project standards using checklists:

*   [Module Verification Checklist](../../../checklists/verifications/verify-module.md)
*   [UI Component Standards](../../../standards/component-standards.md) (if applicable)
*   [Project Development Processes](../../../processes/README.md)

## Related Documentation

*   [Module Structure](./README.md)
*   [Module Installation](../module-installation/README.md)
*   [UI Resources Overview](../../resources/README.md) (Covers [Elements](../../resources/elements/), [Components](../../resources/components/), [Constants](../../resources/constants/), [Imports](../../resources/imports/))
*   Refer to prototype modules like `@storage/aiInstaller/sakai-core` for concrete examples.
