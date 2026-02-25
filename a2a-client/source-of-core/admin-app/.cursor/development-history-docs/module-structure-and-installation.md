# Module Structure and Installation: Lessons Learned

This document summarizes observations and lessons learned regarding the module structure, installation process, and
runtime expectations within the system. It consolidates findings from the analysis of etalon modules (login-form/v1,
primary-form/v1, landing-main-page/v2) and the associated installer mechanism.

## 1. Module Discovery and the `_i/` Directory

- The installer scans the `install-modules/<installerDir>` directory for modules. A module must contain an `_i/`
  subdirectory to be recognized by the installer.
- Within the `_i/` directory, the existence of `meta.json` is essential. This file provides metadata such as the
  module's name, version, description, and other details, and is used as the label in the installer interface.
- Modules lacking required content in the `_i/` directory (for example, an empty `_i/` directory as seen in
  landing-main-page/v2) will not be detected by the system.

## 2. Installer-Specific Files in `_i/`

- **`_i/files-by-block.json`**:
    - *Purpose for the Installer*: Defines the installable "blocks" or "components" of a module. Each top-level key (
      e.g., `code`, `actions`, `templates`, etc.) becomes a selectable checkbox in the installer.
    - *Structure*: The value for each key is a JSON structure that lists files and subdirectories using a recursive
      key/string mapping (processed by logic similar to `extractFilePaths`).
    - *Runtime Expectation*: The installed files must re-create a directory structure (e.g., `actions/`, `data/`,
      `templates/`) that conforms to what runtime PHP classes (like `App.php` and `PageModule.php`) expect.

- **`_i/common.json`** (Optional):
    - Defines files common to the entire module.
    - These common files are installed if the module is chosen and at least one block (from `files-by-block.json`) is
      selected.
    - The JSON structure follows similar conventions, with keys as directory segments and string/array values for file
      names.

## 3. Runtime Expectations

- The installer's job is to copy files based on the definitions in `files-by-block.json` and `common.json` so that the
  resulting module directories match the structure required by the runtime system.
- For example, the files listed under the `actions` block should result in an `actions/` directory that the runtime PHP
  processors will use to locate action instructions.
- Additional files like `links.json`, `meta-admin.json`, or `storeBerforeReInstall.json` are often present to support
  extra functionalities (e.g., link management or file backup) but are not considered part of the bare-minimum structure
  for module detection and installation.

## 4. Comparison of Etalon Modules

- **login-form/v1 and primary-form/v1**:
    - These modules exhibit a complete `_i/` directory, including `meta.json`, `files-by-block.json`, and `common.json`,
      alongside supplementary files (`links.json`, `meta-admin.json`, etc.).
    - Their structure ensures they are detected and installed correctly by the system.

- **landing-main-page/v2**:
    - The `_i/` directory exists but is empty. As a result, the module is not recognized by the installer.
    - This case highlights the necessity of populating the `_i/` directory with at least the minimal required files (
      meta and file manifest) for proper module detection.

## 5. Conclusion

- Adhering to the strict module checklist is critical for ensuring that modules are correctly discovered, installed, and
  executed by both the installer and the runtime system.
- Etalon modules serve as practical examples of the required file structure and should be used as references for
  developing new modules.
- This document should be updated periodically as new insights are gathered and when module standards evolve. 
