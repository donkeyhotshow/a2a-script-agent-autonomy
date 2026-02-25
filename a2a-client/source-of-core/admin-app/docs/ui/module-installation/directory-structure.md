# Module Directory Structure

The JSON UI module (using Primary Form as a primary example) has a clearly organized directory structure that helps
separate different file types and
ensure a modular approach to development. This structure follows the principles of module organization in the JSON UI
system.

## Root Structure

```
module-name/             # Example: primary-form
│
├── _i/                  # Metadata and configuration files for installation
├── actions/             # Files with action (command) definitions
├── assets/              # Static resources (images, styles, etc.)
├── code/                # PHP code and business logic
├── commands/            # Predefined command sequences (if applicable)
├── data/                # Data files and models
├── programs/            # Specific configurations (e.g., program types)
├── sections/            # Reusable UI sections (Common in Landing Pages)
├── templates/           # JSON templates for UI components
├── validations/         # Validation rules
│
├── page.json            # Root file of the module page
└── ...                  # Other module-specific files/dirs
```

## Detailed Directory Description

### `_i/` - Installation Metadata

Contains configuration files used during module installation and registration in the system:

- `meta.json` - Core module metadata
- `files-by-block.json` - File structure by functional blocks
- `common.json` - Common files for all sections
- `links.json` - Routes and links
- `meta-admin.json` - Integration with the admin panel
- `storeBerforeReInstall.json` - Files to save during reinstallation
- `useAnyway.json` - Configuration for forced usage

For more details, see [Installation Metadata](./installation-meta-files.md).

### `actions/` - Action Definitions

Contains JSON files defining sequences of commands executed in response to UI events. Usually
organized into subfolders corresponding to functional sections:

```
actions/
├── program-section/       # Actions for the program section
│   ├── windowChange.json  # Handle window change
│   ├── stepNext.json      # Proceed to the next step
│   └── ...
├── result-section/        # Actions for the results section
│   └── ...
└── ...
```

Each action file contains a JSON array with a sequence of commands processed by the [`AiRudeDepot` engine].
For example, `windowChange.json` might contain commands to update state, save user selections, and
update the UI.
See also: [Server Actions Reference](../commands-and-operations/server-actions-reference.md)

### `assets/` - Static Resources

Contains static files used by the module:

```
assets/
├── images/             # Images
├── styles/             # CSS/SCSS files
└── fonts/              # Fonts
```

### `code/` - PHP Code and Business Logic

Contains PHP classes implementing specific business logic for the module:

```
code/
└── app/
    └── AiRudeDepot/
        └── Modules/
            └── PrimaryForm.php  # Example main module class
```

These classes usually integrate with the main system through AiRudeDepot mechanisms and provide module-specific
functionality that cannot be implemented solely through JSON configurations.

### `commands/` - Predefined Commands

Contains JSON files with predefined command sequences that can be called multiple times from different
locations using the `call` server action:

```
commands/
├── load-forms-and-return.json   # Load forms and return data
├── reset-step-commands.json     # Reset step commands
└── windows-select-options.json  # Options for window selection
```

These commands ensure logic reusability.

### `data/` - Data Files and Models

Contains JSON files with data and models used by the module:

```
data/
├── models/               # Data models
│   ├── windows.json      # Window model
│   └── programs.json     # Program model
├── program-section.json  # Data for the program section
├── program.json          # General program data
└── ...
```

These files define the data structure and initial state for various parts of the module.

### `programs/` - Program Configurations

Contains JSON files with configurations of available programs (specific example from `primary-form`):

```
programs/
├── NotPrototypeAnymore.json
├── StoryWriter.json
├── FilesWalker.json
└── ...
```

Each file defines a specific program that can be selected by the user in that particular module.

### `sections/` - Reusable UI Sections

Commonly used in Landing Page modules, this directory holds larger, reusable chunks of UI, often included in `page.json`
via the `include` operation.

```
sections/
├── header-section.json
├── features-section.json
└── footer-section.json
```

### `templates/` - JSON UI Templates

Contains JSON files defining the structure and appearance of reusable UI components or layouts:

```
templates/
├── layouts/                    # Layouts
│   ├── card-layout.json        # Card layout
│   └── grid-layout.json        # Grid layout
├── forms/                      # Form definitions
│   ├── program-control.json    # Program control
│   └── ...
└── parts/                      # Template parts
    └── program/                # Parts for the program section
        ├── navButtons.json     # Navigation buttons
        ├── windowCreateDialog.json  # Window creation dialog
        └── ...
```

These files contain declarative UI descriptions based on JSON, which are transformed into actual Vue components.
See [Component Syntax](../core-concepts/component-syntax.md).

### `validations/` - Validation Rules

Contains JSON files with validation rules:

```
validations/
├── window-name.json           # Window name validation
├── chatResponse-ban-list.json # Ban list for chat responses
└── ...
```

These rules are used to check user input and ensure data correctness, potentially used with [`FormManager`].

## Root Files

### `page.json`

The root page file, which defines the module's entry point:

```json
{
    "sources": {
        "card": "primary-form/templates/layouts/card-layout",
        "grid": "primary-form/templates/layouts/grid-layout"
    }
}
```

This file usually contains links to the main templates and data sources used in the module, or the top-level component
definition conforming to the [Template Schema](../core-concepts/template-schema.md).

## Interrelationships and Organization

Files in the module are organized according to the principle of separation of concerns:

1. **Data** (in `data/`) defines structure and initial state.
2. **Templates** (in `templates/`) define the structure and appearance of the UI.
3. **Actions** (in `actions/`) define interactivity and event handling (server-side command sequences).
4. **Commands** (in `commands/`) ensure logic reusability.
5. **Validations** (in `validations/`) ensure data integrity.
6. **Code** (in `code/`) implements complex business logic.

This organization adheres to a modular approach and ensures:

- **Separation of Concerns**: Each file type has a clear and single purpose.
- **Modularity**: Functional blocks can be developed and tested independently.
- **Reusability**: Common components and logic can be easily reused.
- **Scalability**: The module can be easily extended with new functions.

## Recommendations for Organizing a New Module

When creating a new module, it is recommended to follow this same structure:

1. Create the main directories (`_i`, `actions`, `templates`, `data`, etc.).
2. Define installation metadata in the `_i` directory.
3. Create basic UI templates in the `templates` directory.
4. Define data structures in the `data` directory.
5. Develop actions in the `actions` directory.
6. If necessary, add reusable commands in the `commands` directory.
7. Define validation rules in the `validations` directory.
8. For complex logic, add PHP classes in the `code` directory.

Following this structure will ensure compatibility with the JSON UI system and simplify the maintenance and future
development of the module.
