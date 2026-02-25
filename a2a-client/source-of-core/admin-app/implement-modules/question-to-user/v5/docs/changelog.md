# Changelog for Question-To-User v5 Module

This document tracks the changes made to the Question-To-User v5 module.

## [5.0.2] - Обновление документации и исправление ошибок

- **Документация**:
    - Полностью переписана основная документация модуля (`question-to-user-v5-documentation.md`) для отражения текущей
      архитектуры и функциональности QTU v5.
    - Обновлены `README.md`, `index.md`, `known-issues.md`, `code.md`, `data-schema.md` в соответствии с новым
      пониманием модуля и требованиями чек-листа.
- **Исправления**:
    - Устранены ошибки валидации JSON в нескольких файлах действий (`reset-main-work-scenario.json`,
      `save-ai-probe-answers.json`, `save-current-answers.json`, `submit-manual-response.json`, `submit-task.json`,
      `execute-main-work-scenario.json`) связанные с:
        - Недопустимым ключом `description` на верхнем уровне (перемещен в комментарии).
        - Некорректным использованием `action: "condition"` и `instructions_true`/`instructions_false` (рефакторинг на
          `action: "batch"` со строковыми условиями).
    - Частично исправлены ошибки валидации в `process-questions.json` (требуется дальнейшая работа).
- **UI**:
    - Реализовано использование `navigateTo` custom hook в `module-header.json` для навигации.

## [5.0.1] - Post-Refactoring & Finalization Pass

- Extensive refactoring based on `finalization-checklist.md` including:
    - Structural alignment and cleanup.
    - Kebab-case renaming of files and updates to references.
    - Standardization of UI components (pages, sections, templates) and removal of Vue-like syntax.
    - Refactoring of actions for direct UI file updates, correct DataHub usage, and command logic inlining.
    - Correction of `files-by-block.json`.
    - Updates to documentation and checklist completion.

## [5.0.0]

### Added

- Initial version of the v5 module.

### Changed

### Fixed

### Removed 
