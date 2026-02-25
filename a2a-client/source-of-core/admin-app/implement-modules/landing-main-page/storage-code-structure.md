# Module Development Structure using Versioned Steps

This document outlines a structure for developing modules in sequential steps, using versioned directories (`v1`, `v2`,
etc.) to represent each development phase. This approach facilitates incremental development and allows for merging
these steps into a final module structure.

## Core Concept: Phased Development with Overlay Merge

* **Module Directory**: Each module resides in its own root directory, named after the module (e.g.,
  `landing-main-page/`).
* **Versioned Steps (`vX/`)**: Inside the module directory, subdirectories `v1`, `v2`, `v3`, etc., represent distinct
  development phases or steps. Each step builds upon the previous ones.
* **Incremental Content**: Each `vX` directory should ideally contain only the files **added or modified** during that
  specific development step.
* **Overlay Merge**: A process (e.g., an Artisan command `php artisan module:merge {module-id}`) merges the contents of
  `v1`, `v2`, `v3`... sequentially into a target directory (often the module's root directory itself or a dedicated
  `dist/` or `merged/` subfolder).
* **File Replacement**: During the merge, files from later steps (e.g., `v3`) **overwrite** files with the same relative
  path from earlier steps (e.g., `v1`, `v2`).
* **Final Structure**: The merged result represents the complete, up-to-date module.

## Recommended Structure

```text
{module-id}/                     # Root directory for the module (e.g., landing-main-page)
├── v1/                          # Step 1: Initial setup, core layout, essential sections
│   ├── templates/
│   │   ├── layout.json          # Base layout template
│   │   └── sections/
│   │       ├── hero-section.json
│   │       └── footer-section.json
│   ├── code/
│   │   └── ModuleClassName.php
│   └── README.md        # (Optional) Notes for Step 1
│
├── v2/                          # Step 2: Add new pages/sections, basic assets
│   ├── templates/
│   │   ├── page.json            # Adds a main page template
│   │   └── sections/
│   │       └── features-section.json # Adds a new section
│   ├── assets/
│   │   └── style.v2.css
│   └── README.step2.md        # (Optional) Notes for Step 2
│
├── v3/                          # Step 3: Introduce data, internal logic
│   ├── data/
│   │   └── products.json
│   ├── _i/                      # Internal helper files
│   │   └── config.json
│   └── README.step3.md        # (Optional) Notes for Step 3
│
├── v4/                          # Step 4: Refinements, additional features/pages
│   ├── templates/
│   │   └── page.json            # Refines/overwrites page template from v2
│   ├── assets/
│   │   └── script.js
│   └── README.step4.md        # (Optional) Notes for Step 4
│
├── docs/                        # General, non-versioned documentation (Optional)
│   ├── index.md                 # Overview of the final merged module
│   └── architecture.md          # High-level design choices
│
└── cleanup_duplicates.ps1       # (Optional) Script to clean identical files from vX folders
└── merge_module.sh              # (Optional) Example merge script (or use Artisan command)
```

**Explanation of Key Directories/Files:**

* **`{module-id}/`**: The main container for the module.
* **`vX/`**: Represents a distinct phase of development. Contains only the changes for that phase.
    * Standard subdirectories like `templates/`, `code/`, `assets/`, `data/`, `_i/` are used as needed within each `vX`
      folder.
    * `README.stepX.md`: Optional file to document the goals, changes, or decisions made during that specific step.
* **`docs/` (Optional)**: A place for *general* documentation describing the module *after* all steps are merged. This
  is separate from the step-specific READMEs.
* **Helper Scripts (Optional)**: Scripts like `cleanup_duplicates.ps1` or merge scripts can live alongside the versioned
  steps.

## Merge Process

The merge process takes the contents of `v1`, then overlays `v2`, then `v3`, and so on, into the target location. The
`MergeModuleVersions` Artisan command created previously can handle this if configured with the correct source (
`{module-id}/vX`) and target paths.

## Naming Conventions

* Use **kebab-case** for file/directory names within `vX` folders, except for PHP classes.
* Use **PascalCase** for PHP class names (`MyModuleCode.php`).

## Benefits

* **Clear Progression**: Easy to see the development history step-by-step.
* **Incremental Development**: Focus on one phase at a time.
* **Reduced Redundancy**: Avoids duplicating unchanged files across versions (if maintained correctly).
* **Reproducible Build**: The merge process deterministically creates the final module state.

## Related Documents

* [Glossary](../../glossary.md)
* [Design Guidelines](./storage-design-guidelines.md)
* [General Issues](../../reference/general-issues.md)
* [Debugging](../../processes/storage-debugging.md)
