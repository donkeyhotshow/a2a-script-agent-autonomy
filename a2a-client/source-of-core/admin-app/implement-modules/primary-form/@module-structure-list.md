# Структура модуля primary-form

## Корень
- @scratchpad.md
- storage-code-structure.md
- @memories.md
- linked-library/ (пусто)
- v1/
- v2/

---

## v1
- _i/
- code/
  - PrimaryForm.php
- data/
  - program.json
- pages/
  - page.json
- commands/ (пусто)
- programs/
  - StoryWriter.json
  - FilesWalker.json
  - Indexer.json
  - NotPrototypeAnymore.json
  - OutMustBecomeTarget.json
  - ElStudio.json
  - story/
- templates/
  - forms/
    - program-control.json
  - parts/
    - program/
      - windowRemoveDialog.json
      - windowCreateDialog.json
- assets/ (пусто)

---

## v2
- _i/
- code/
  - PrimaryForm.php
- data/
  - dialog-new-window.json
  - chat-response-form.json
  - program.json
  - text-storage-section.json
  - program-section.json
  - log.json
  - models/
    - windows.json
    - programs.json
  - blanks/
- pages/
  - page.json
- commands/
  - windows-select-options.json
  - reset-step-commands.json
  - program-section/
- validations/
  - chatResponse-ban-list.json
  - validate.json
  - window-name.json
- actions/
  - program-section/
  - text-storage-section/
- templates/
  - forms/
    - checkbox-section.json
    - program-control.json
    - result-section.json
  - parts/
    - program/
      - navButtons.json
      - requestToChat.json
      - windowCreateDialog.json
      - windowRemoveDialog.json
- assets/ (пусто) 