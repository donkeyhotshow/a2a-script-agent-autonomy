индексы все тут index но не все досканированы. если надо то достканирую.
индекс по script/data в файле @data.index.json

Okay, I understand! Thank you for the clarifications.

* I'll disregard `fix-indexer.ps1` and the deleted `util-index-file-ops.ps1`.
* I'll focus on using `main-index.ps1` for interacting with the indexes.
* I note that the indexes are in the `index/` directory, with `index/script/data.index.json` being the specific index
  for `script/data/`.
* I will refer to `script/data/guides/indexing-usage-guide.json` as the standard for understanding how to use the
  indexer.

I've reviewed the content of `script/data/guides/indexing-usage-guide.json` (which you helpfully attached) to understand
the capabilities of `main-index.ps1`.

Let's continue with "Step 0: Обзор директории `script/data/`", but now I'll use `main-index.ps1` to get a better
overview of its contents, as you suggested.

First, I'll get general statistics about the `script/data/` index.

```bash
pwsh -File ./main-index.ps1 -IndexFile ./index/script/data.index.json -Mode GetStats
```

The statistics for `index/script/data.index.json` are:

* **FilePath**: `C:\apps\admin-app\index\script\data.index.json`
* **FileSizeInKB**: 111.06
* **TotalEntries**: 103
* **LastModified**: (Recent date)
* **SchemaVersion**: "1.0"
* **IndexRootPath**: "script/data/"
* **TotalUniqueFileTypes**: 3
* **TotalUniqueKeywords**: 317

This tells us there are 103 entries (files/directories) indexed under `script/data/`, and they comprise 3 unique file
types.

Next, I'll list the unique file types within `script/data/` using the index.

```bash
pwsh -File ./main-index.ps1 -IndexFile ./index/script/data.index.json -Mode ListTypes
```

The unique file types in `script/data/` according to the index are:

* `gitkeep`
* `json`
* `md`

This aligns with our expectation that this directory contains primarily documentation (`.md`) and configuration/data
files (`.json`).

Now, let's refine our plan for "Действие 0.2 (Анализ и Углубление)" and "Действие 0.3 (Чтение Ключевых Файлов)" for the
`script/data/` directory, using the indexer to guide us.

Our previous plan was to examine:

1. `script/data/standards/`
2. `script/data/guides/`
3. `script/data/templates/`
4. Superficially review `task_types/`, `agentic-processes/`, `processes/`, `process-management/`.

I can use `main-index.ps1` in `Query` mode with `-SearchField path` to list the files within these specific
subdirectories as they appear in the `index/script/data.index.json` index. This will give us a targeted list of files to
consider reading.

Let's start by listing the indexed files within `script/data/standards/`.

```bash
pwsh -File ./main-index.ps1 -IndexFile ./index/script/data.index.json -Mode Query -SearchTerm "standards/" -SearchField path
```

The indexer returned a list of 27 files under `script/data/standards/`. This is a comprehensive list.

Previously, we had identified the following as potentially interesting and were in the process of reading them (or
attempting to):

1. `script/data/standards/README.json` (Read successfully)
2. `script/data/standards/code-standards.json` (Read successfully)
3. `script/data/standards/code-development-process-standards.json` (Read successfully)
4. `script/data/standards/ai-module-collaboration-standard.json` (Timeout previously)
5. `script/data/standards/vertical-slice-architecture-standard.json` (Not attempted due to previous timeouts)
6. `script/data/standards/ui-core-standards.json` (Not attempted)
7. `script/data/standards/ui-templating-standards.json` (Not attempted)

Given that the timeout issues might persist for direct file reading, and you've emphasized using the indexer, I can
leverage the `ai_summary` field from the index results for the files we haven't read yet. This will give us a quick
overview without risking more timeouts.

Let's look at the `ai_summary` for the remaining files on our list:

* **`standards/ai-module-collaboration-standard.json` (id: 35)**
    * `ai_summary`: "Стандарт AI-коллаборации по модулям: строгий режим планирования, подтверждение, работа с
      scratchpad, протокол изменений JSON." (AI collaboration standard for modules: strict planning mode, confirmation,
      working with scratchpad, JSON change protocol.)

* **`standards/vertical-slice-architecture-standard.json` (id: 60)**
    * `ai_summary`: "Стандарт вертикальной слоевой архитектуры (VSA): организация кода вокруг фич, а не слоев, принципы,
      выгоды, общие компоненты." (Vertical Slice Architecture (VSA) standard: organizing code around features, not
      layers, principles, benefits, common components.)

* **`standards/ui-core-standards.json` (id: 58)**
    * `ai_summary`: "Стандарты для основных UI-элементов и архитектуры: PrimeVue, кастомные компоненты, стили,
      доступность, JSON UI." (Standards for core UI elements and architecture: PrimeVue, custom components, styles,
      accessibility, JSON UI.)

* **`standards/ui-templating-standards.json` (id: 59)**
    * `ai_summary`: "Стандарты создания и использования JSON-шаблонов для UI: схема, организация, переиспользование,
      динамический контент." (Standards for creating and using JSON templates for UI: schema, organization, reusability,
      dynamic content.)

These summaries give us a good high-level understanding.

**Summary of key standards from `script/data/standards/` relevant to our task (refactoring QTU module):**

* **Overall Process:** Development is documentation-driven and test-first, with a tight feedback loop between code and
  docs (`code-development-process-standards.json`). All operations should be fact-based, relying on documented sources (
  `operational-principles.json`, `ai-interaction-standard.json`).
* **Coding:** General principles of clean, testable code, with mentions of Laravel and PHP PSR standards, though many
  specifics are "TBD" (`code-standards.json`).
* **Modules & AI:** Specific standards for AI collaboration on modules, emphasizing planning and careful JSON changes (
  `ai-module-collaboration-standard.json`).
* **Architecture:** Potential use of Vertical Slice Architecture (`vertical-slice-architecture-standard.json`).
* **UI:** Standards exist for core UI elements (PrimeVue, JSON UI) and UI templating (`ui-core-standards.json`,
  `ui-templating-standards.json`).
* **Documentation:** Standards for structure, style, and linking are in place (`documentation-standards.json`,
  `documentation-style-guide.json`, `module-documentation-standard.json`).
* **Tasks & QTU:** Tasks are defined by `task-definition-standard.json`, and QTU scenarios by
  `question-to-user-standard.json`.

This gives us a solid foundation regarding standards.

Next, let's explore `script/data/guides/` using the indexer to list its contents.

```bash
pwsh -File ./main-index.ps1 -IndexFile ./index/script/data.index.json -Mode Query -SearchTerm "guides/" -SearchField path
```

The indexer shows several guides, mostly under `guides/module/` and a few others like `guides/reference/` and the
indexer guides themselves.

Key guides relevant to JSON UI modules and our task:

* **`guides/module/01-overview-creating-modules.md` (id: 0):** Overview of creating JSON UI modules.
* **`guides/module/02-file-structure.md` (id: 1):** Guide to directory and file structure for JSON UI modules. This
  seems highly relevant.
* **`guides/module/03-metadata.md` (id: 2):** Guide to module metadata and installer config (`_i/` directory).
* **`guides/module/04-ui-construction.md` (id: 3):** Guide to creating module UI with JSON (components, templates, data
  binding). This is also very relevant.
* **`guides/module/05-data-handling.md` (id: 4):** Guide to data handling in modules (`data/`, `program.json`).
* **`guides/module/06-actions-logic.md` (id: 5):** Guide to server actions (`actions/`).
* **`guides/module/07-build-merge.md` (id: 6):** Build and install process (`module:merge`).
* **`guides/module/08-validation.md` (id: 7):** Module validation (`module:validate`).
* **`guides/module/09-lifecycle-maintenance.md` (id: 8):** Module lifecycle and maintenance.
* **`guides/module/README.json` (id: 9):** Index for the module guides.
* **`guides/reference/ui-component-manager-categories-primevue.json` (id: 10):** Reference for UI components and
  managers.
* **`guides/indexing-usage-guide.json` (id: 93):** The guide for the indexer itself (which we've already consulted based
  on your attachment).
* **`guides/manual-index-tagging-guide.json` (id: 94):** Guide for manual tagging of indexed files.

From this list, the most immediately relevant for understanding the structure and development of modules (especially a
QTU module which involves UI and potentially data/actions) seem to be:

1. `guides/module/README.json` (to see how these guides are organized)
2. `guides/module/01-overview-creating-modules.md`
3. `guides/module/02-file-structure.md`
4. `guides/module/04-ui-construction.md`

Since we have the `ai_summary` for these from the indexer output, let's review those first to avoid potential read
timeouts, and then decide if full reading is necessary.

* **`guides/module/README.json` (id: 9)**
    * `ai_summary`: "JSON-оглавление раздела с руководствами по разработке, обновлению и отладке модулей JSON UI." (JSON
      table of contents for the section with guides on development, updating, and debugging JSON UI modules.)
    * This confirms it's an index for the module guides.

* **`guides/module/01-overview-creating-modules.md` (id: 0)**
    * `ai_summary`: "Документ с обзором процесса создания новых JSON UI модулей: от инициации задачи до валидации и
      поддержки." (Document with an overview of the process for creating new JSON UI modules: from task initiation to
      validation and support.)

* **`guides/module/02-file-structure.md` (id: 1)**
    * `ai_summary`: "Руководство по типовой структуре директорий и файлов при разработке JSON UI модуля." (Guide to the
      typical directory and file structure for developing a JSON UI module.)

* **`guides/module/04-ui-construction.md` (id: 3)**
    * `ai_summary`: "Руководство по созданию UI модуля с помощью JSON-структур: компоненты, шаблоны, data binding,
      include." (Guide to creating a module UI using JSON structures: components, templates, data binding, include.)

These summaries are very informative. `02-file-structure.md` and `04-ui-construction.md` seem particularly crucial for
understanding how to structure and build the QTU module.

Given the previous timeouts, I'll try reading `guides/module/README.json` first. If that works, I'll proceed to
`guides/module/02-file-structure.md` and then `guides/module/04-ui-construction.md`, as these seem most critical.

Read file:
My apologies, I made an error in the previous call by setting `start_line_one_indexed` to 0. It must be at least 1.

Let me try reading `script/data/guides/module/README.json` again with the correct parameters.

Read file: script/data/guides/module/README.json
The `script/data/guides/module/README.json` file has been read successfully. It lists the available guides for module
development.

Based on this README and our previous assessment, the following guides are of highest importance for understanding how
to structure and build the QTU module:

1. `./02-file-structure.md` (File Structure)
2. `./04-ui-construction.md` (UI Construction)

I will now attempt to read `script/data/guides/module/02-file-structure.md`.

Read file: script/data/guides/module/02-file-structure.md
The file `script/data/guides/module/02-file-structure.md` has been read. This is a very important guide.

**Key takeaways from `02-file-structure.md`:**

* **Source Location:** `script/data/implement/{module-name}/` (TBD: Verify Path - this seems to be a placeholder, the
  actual path for module sources needs confirmation, but `implement-modules/` was mentioned in another context).
* **Versioning:** Mandatory `vX/` subdirectory for all version-specific files.
* **Main Files/Directories (inside `vX/`):**
    * `page.json`: Recommended main UI entry point.
    * `data/`: For module data.
        * `program.json`: Frequently used for data/settings. Structure is module-dependent.
        * `blanks/`: Optional, for templates/skeletons.
    * `sections/`: Frequently used for reusable UI snippets included via `include`.
    * `templates/`: Recommended for reusable UI JSON snippets (e.g., `forms/`, `parts/`).
    * `programs/`: For JSON files with instructions/logic (TBD: Verify Usage).
    * `actions/`: For server action files.
    * `_i/`: **Mandatory**. For metadata (`meta.json`) and installer configs (`links.json`, `common.json`,
      `files-by-block.json`).
        * `common.json`: Example provided, lists key files by category.
        * `files-by-block.json`: Key for installer, registers files by logical blocks and categories.
    * `docs/`: Recommended for version-specific docs (`README.json` or `index.json` recommended here).
* **Deprecated Files (in module version dir):** `@specification.md`, `@memories.md`, `@scratchpad.md`. Global versions
  should be used.
* **Important Notes:** Examples are primary; installed structure might differ from source.
* Many "TBD: Verify Path/Tool Name/Example" placeholders exist, indicating this guide itself might need an update or
  relies on common project knowledge to fill in the blanks.

This guide provides a strong blueprint for the QTU module's directory structure.

Next, I'll read `script/data/guides/module/04-ui-construction.md` as it's critical for understanding how the UI of the
module (which is central to QTU) should be built.

Read file: script/data/guides/module/04-ui-construction.md
The `script/data/guides/module/04-ui-construction.md` file has been read. This is another critical guide, full of
details (and many "TBD" placeholders, similar to the file structure guide).

**Key takeaways from `04-ui-construction.md` (UI Construction):**

* **Primacy of Examples:** Constantly emphasizes studying existing, working modules and copying/adapting functional JSON
  snippets.
* **Main UI File:** `page.json` (or `index.json`, `layout.json`) defines the main UI structure.
* **Components:**
    * Specified by `"type"` or `"component"` key (check examples for standard).
    * Properties via `"props"`. Critical to check component docs and examples.
    * Children via `"children"` array.
* **Data Binding (`model`):**
    * Links to client-side form data, likely managed by a `FormManager`.
    * Structure: `{"form": "form_context_name", "field": "field_name_in_context", "default": "default_value"}`.
    * `program.json` data often initializes the form context.
* **Triggering Server Actions (`customHooks`):**
    * **Likely deprecated/incorrect:** Using a special prop like `action:operation`.
    * Standard mechanism: `customHooks` for DOM events (e.g., `click`).
    * Hook triggers `sendData` (from `ActionManager`) with
      `{"sendTo": "server_action_path", "form": "form_context_name"}`.
* **Form Grouping (`Form` Component):**
    * Form components **must be wrapped** in a `Form` component: `{ "type": "Form", "name": "form_context_name", ... }`.
    * The `name` prop sets the form context name, matching `model.form` in child components.
* **Reusing UI (`include` Operation):**
    * Primary way to avoid duplication and structure complex UI.
    * Syntax: `{"type": "operation", "action": "include", "source": "{module-name}/{path-within-version-no-json-ext}"}`.
    * `source` path is relative to the root of all modules (e.g., `script/data/implement/`).
    * Templates usually in `sections/` or `templates/` (with `forms/`, `parts/` subdirs).
* **UI Modularity (Templates + `include`):** Recommended to break UI into logical parts in `templates/` and include
  them.
* **Inline UI Definition:** Older approach, not recommended for non-trivial UI.
* **Dynamic Content/Conditions:** Sourced from `dataContext` or manager states.

Both `02-file-structure.md` and `04-ui-construction.md` are filled with "TBD: Verify..." placeholders. This means that
while they provide a good general direction, the most reliable source of truth will be examining existing, functional
modules, as repeatedly stated in the guides themselves.

We have now reviewed:

* Overall project statistics from the index.
* File types in `script/data/`.
* A list of standards and their AI summaries from `script/data/standards/`.
* A list of guides from `script/data/guides/`, read the module `README.json`, and then dived into the critical
  `02-file-structure.md` and `04-ui-construction.md` guides.

The "Step 0: Обзор директории `script/data/`" is largely complete in terms of understanding the documented structure and
process for modules. We have a good understanding of how modules *should* be built, according to these guides, though
with the caveat that many details are marked TBD and require checking actual examples.

What would you like to do next? We can:

1. Attempt to find and examine an existing QTU module example if one is known or can be found via the indexer (e.g.,
   querying for keywords like "QTU", "QuestionToUser" in paths or descriptions).
2. Proceed to analyze the existing `admin-panel-qtu-user-sessions-module` that we intend to refactor, keeping these new
   structural guidelines in mind.
3. Look into other subdirectories of `script/data/` (like `templates/`, `task_types/`, `processes/`) if you think they
   contain more critical information for the QTU module refactoring task.
4. Address any specific "TBD" items from the guides if you know where to find that information.
