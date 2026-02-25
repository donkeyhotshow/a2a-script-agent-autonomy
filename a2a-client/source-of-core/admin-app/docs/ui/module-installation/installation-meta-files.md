# Installation Meta Files (`_i` Directory)

The `_i` directory contains metadata and configuration files necessary for installing and registering a module within
the system.
These files define the module's structure, its dependencies, routing, and other important aspects.

## File Overview

| File                         | Description                                                |
|------------------------------|------------------------------------------------------------|
| `meta.json`                  | Core module metadata (name, version, author, dependencies) |
| `files-by-block.json`        | Organization of module files by functional blocks          |
| `links.json`                 | Definition of routes and links for the module              |
| `common.json`                | Common files used across all sections of the module        |
| `meta-admin.json`            | Metadata for integration with the admin panel              |
| `storeBerforeReInstall.json` | Specifies files that should be saved during reinstallation |
| `useAnyway.json`             | Configuration for forcing the use of the module            |

## Detailed Description

### `meta.json`

Contains basic information about the module:

```json
{
    "name": "Primary Form Module",
    "description": "Handles the primary user forms across the application.",
    "version": "1.0.0",
    "author": "Admin App Team",
    "dependencies": {
        "primevue": "^4.0.0",
        "tailwindcss": "^3.0.0"
    }
}
```

**Key Fields:**

- `name`: Module name
- `description`: Brief description of functionality
- `version`: Module version (semantic versioning)
- `author`: Developer/team
- `dependencies`: External dependencies with specified versions

### `files-by-block.json`

Defines the structure of module files organized by functional blocks. Each block contains information about related
action files, templates, commands, data, etc.

```json
{
    "program-section": {
        "actions": {
            "program-section": [
                "windowCreate.json",
                "windowChange.json",
                "stepPrev.json",
                // other actions
            ]
        },
        "templates": {
            "forms": "program-control.json",
            "parts/program": [
                "navButtons.json",
                // other template parts
            ]
        },
        "commands": [
            "reset-step-commands.json",
            "windows-select-options.json"
        ],
        "data": [
            "program-section.json"
        ],
        "code": [
            "PrimaryForm.php"
        ],
        "tests": [
            "programSectionTest.json"
        ],
        "validations": [
            "window-name.json"
        ]
    },
    // other functional blocks
}
```

This file plays a key role in:

- Organizing the module into logical blocks
- Simplifying navigation through module files
- Automatically determining dependencies between different parts of the module
- Ensuring modularity and the possibility of component reuse

### `links.json`

Defines routes and links for navigating to the module:

```json
[
    {
        "id": "home-admin",
        "type": "admin",
        "label": "Primary Form",
        "path": "/admin/primary-form",
        "icon": "pi pi-home"
    },
    {
        "id": "home-quest-direct",
        "type": "quest",
        "label": "Home",
        "path": "/primary-form/page",
        "icon": "pi pi-home"
    },
    {
        "id": "home-quest-indirect",
        "type": "quest",
        "label": "Home",
        "link": "/primary-form/page",
        "path": "/primary-form",
        "icon": "pi pi-home"
    }
]
```

**Route Element Fields:**

- `id`: Unique route identifier
- `type`: Route type (`admin` or `quest`)
- `label`: Display name
- `path`: URL path
- `link` (optional): Alternative path for redirect
- `icon`: Icon (uses PrimeVue format)

### `common.json`

Defines common files and resources used in all sections of the module:

```json
{
    "": [
        "page.json"
    ],
    "data": [
        "blanks/cb.json",
        "program.json"
    ],
    "templates": {
        "layouts": [
            "grid-layout.json",
            "card-layout.json"
        ]
    },
    "commands": [
        "load-forms-and-return.json"
    ],
    "programs": [
        "NotPrototypeAnymore.json",
        "StoryWriter.json",
        // other programs
    ]
}
```

This file allows:

- Defining common resources available throughout the module
- Specifying the module's root files (`page.json` is specified in the root)
- Organizing resources by category (data, templates, commands, programs)

### `meta-admin.json`

Contains metadata for integrating the module with the admin panel:

```json
{
    "permalink": {
        "path": "admin/forms",
        "module": "primary-form",
        "metadata": {
            "title": "Forms Management",
            "description": "Manage user interaction forms.",
            "handles_subpaths": false
        }
    },
    "menu": {
        "label": "Forms Management",
        "path": "/admin/forms",
        "order": 5
    }
}
```

**Main Sections:**

- `permalink`: Settings for the permanent URL and page metadata
    - `path`: URL path
    - `module`: Module identifier
    - `metadata`: Page metadata (title, description, subpath handling flag)
- `menu`: Settings for display in the admin panel menu
    - `label`: Display name of the menu item
    - `path`: Path for navigation
    - `order`: Order in the menu

### `storeBerforeReInstall.json`

Specifies files that should be saved during module reinstallation (to avoid losing user data):

```json
{
    "data/models": [
        "windows.json",
        "programs.json"
    ]
}
```

This is particularly important for saving:

- User settings
- Generated data
- Customizations made after installation

### `useAnyway.json`

Configuration file for forcing the use of the module; may contain parameters that override
standard behavior. In this case, the file is empty (`{}`), meaning default settings are used.

## File Interrelation

Files in the `_i` directory work together to define the complete module configuration:

1. `meta.json` defines basic information and dependencies.
2. `files-by-block.json` organizes files by functional blocks.
3. `common.json` adds common resources used in all blocks.
4. `links.json` and `meta-admin.json` provide integration with the routing system and admin panel.
5. `storeBerforeReInstall.json` protects critical data during updates.
6. `useAnyway.json` allows overriding standard behavior.

## Usage in the Installation Process

During module installation, the system performs the following steps:

1. Reads `meta.json` to check compatibility and dependencies.
2. Processes `files-by-block.json` and `common.json` to analyze the file structure.
3. Registers routes from `links.json`.
4. Configures the admin interface based on `meta-admin.json`.
5. Copies module files to the appropriate directories.
6. Applies saved data from the previous installation according to `storeBerforeReInstall.json` (during reinstallation).

## Recommendations for Creation

When creating a module, it is recommended to:

1. Start with defining `meta.json` and basic information about the module
2. Plan the structure of functional blocks for `files-by-block.json`
3. Define common resources in `common.json`
4. Configure routing through `links.json`
5. Add integration with the admin panel in `meta-admin.json`
6. Specify critical data in `storeBerforeReInstall.json`

Such an order ensures a sequential and complete module configuration for correct operation in the system. 
