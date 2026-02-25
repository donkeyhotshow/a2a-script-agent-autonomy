# UI Actions: `windowCreate.json`

[[toc]]

## File Overview

- **Description:** This action file defines the set of complex commands (executed via `customHooks`) triggered when a
  new window
  is created within the `@program-section`.
- **Trigger:** UI event (e.g., button click) signaling new window creation.
- **Context:** `@program-section` of the primary form.
- **Purpose:** Manages the creation, initialization, and state updates for a new window.

**See also:**

* [Command Reference](./reference.md)
* [Command Examples](./examples.md)
* [ActionManager Documentation](../../resources/managers/common/actionManager.md) (Processes these commands)
* [FormManager Documentation](../../resources/managers/form/formManager.md) (Handles `primary-form/data/*` paths)

## Action Breakdown (`windowCreate.json` Actions)

Here's a detailed breakdown of each action in the `windowCreate.json` array:

### 1. Action: `update` (Action 1)

- **Description:** Creates a new window template instance and stores it in `buffer:new`.
- **Details:**
  ```json
  {
      "action": "update",
      "from": "models/windows/template",
      "with": "create",
      "to": "buffer:new"
  }
  ```
- **Code Reference:**
    - [`ProcessInstruction::handleUpdate`](../../app/AiRudeDepot/Mod/ProcessInstruction.md#handleupdate)
    - [
      `DataManipulateHelper::applyDataTransformation`](../../app/AiRudeDepot/Support/DataManipulateHelper.md#applydatatransformation)

### 2. Action: `update` (Action 2)

- **Description:** Sets the `name` property of the new window instance (`buffer:new`) using `input:name`.
- **Details:**
  ```json
  {
      "action": "update",
      "from": "input:name",
      "to": "buffer:new.name"
  }
  ```
- **Code Reference:** [`ProcessInstruction::handleUpdate`](../../app/AiRudeDepot/Mod/ProcessInstruction.md#handleupdate)

### 3. Action: `update` (Action 3)

- **Description:** Sets `selectedWindow` in `primary-form/data/program-section` to the `id` of the new window (
  `buffer:new.id`).
- **Details:**
  ```json
  {
      "action": "update",
      "from": "buffer:new.id",
      "to": "primary-form/data/program-section:selectedWindow"
  }
  ```
- **Code Reference:** [`ProcessInstruction::handleUpdate`](../../app/AiRudeDepot/Mod/ProcessInstruction.md#handleupdate)

### 4. Action: `add` (Action 4)

- **Description:** Adds the new window instance (`buffer:new`) to the `models/windows` collection.
- **Details:**
  ```json
  {
      "action": "add",
      "from": "buffer:new",
      "to": "models/windows"
  }
  ```
- **Code Reference:** [
  `ProcessInstruction::handleAddToArray`](../../app/AiRudeDepot/Mod/ProcessInstruction.md#handleaddtoarray)

### 5. Action: `update` (Action 5)

- **Description:** Clears the `name` property in `buffer:new` (cleanup).
- **Details:**
  ```json
  {
      "action": "update",
      "value": "",
      "to": "buffer:new.name"
  }
  ```
- **Code Reference:** [`ProcessInstruction::handleUpdate`](../../app/AiRudeDepot/Mod/ProcessInstruction.md#handleupdate)

### 6. Action: `update` (Action 6)

- **Description:** Updates the `output:forms.dialog-new-window` UI output with `buffer:new` content (likely
  resets/closes the dialog).
- **Details:**
  ```json
  {
      "action": "update",
      "from": "buffer:new",
      "to": "output:forms.dialog-new-window"
  }
  ```
- **Code Reference:** [`ProcessInstruction::handleUpdate`](../../app/AiRudeDepot/Mod/ProcessInstruction.md#handleupdate)

### 7. Action: `update` (Action 7)

- **Description:** Resets `selectedProgram` in `primary-form/data/program-section` to `null` and enables it.
- **Details:**
  ```json
  {
      "action": "update",
      "value": null,
      "to": "primary-form/data/program-section:selectedProgram",
      "disabled": false
  }
  ```
- **Code Reference:** [`ProcessInstruction::handleUpdate`](../../app/AiRudeDepot/Mod/ProcessInstruction.md#handleupdate)

### 8. Action: `update` (Action 8)

- **Description:** Clears `requestToChat` in `primary-form/data/program-section`.
- **Details:**
  ```json
  {
      "action": "update",
      "value": "",
      "to": "primary-form/data/program-section:requestToChat"
  }
  ```
- **Code Reference:** [`ProcessInstruction::handleUpdate`](../../app/AiRudeDepot/Mod/ProcessInstruction.md#handleupdate)

### 9. Action: `save` (Action 9)

- **Description:** Saves the `primary-form/data/program-section` data changes.
- **Details:**
  ```json
  {
      "action": "save",
      "from": [
          "primary-form/data/program-section"
      ]
  }
  ```
- **Code Reference:**
    - [`ProcessInstruction::handleSave`](../../app/AiRudeDepot/Mod/ProcessInstruction.md#handlesave)
    - [`DataHub.php`](../../app/AiRudeDepot/DataHub.php) (Implied for persistence)

### 10. Action: `call` (Action 10)

- **Description:** Calls the command `primary-form/commands/windows-select-options` (likely updates UI options).
- **Details:**
  ```json
  {
      "action": "call",
      "from" : "primary-form/commands/windows-select-options"
  }
  ```
- **Code Reference:**
    - [`ProcessInstruction::processCall`](../../app/AiRudeDepot/Mod/ProcessInstruction.md#processcall)
    - [`ProcessInstruction::executeInstructions`](../../app/AiRudeDepot/Mod/ProcessInstruction.md#executeinstructions)
    - (Specific command handler PHP code for `windows-select-options`)

### 11. Action: `update` (Action 11)

- **Description:** Updates `output:forms.program-section` UI output with current `primary-form/data/program-section`
  state.
- **Details:**
  ```json
  {
      "action": "update",
      "from": "primary-form/data/program-section",
      "to": "output:forms.program-section"
  }
  ```
- **Code Reference:** [`ProcessInstruction::handleUpdate`](../../app/AiRudeDepot/Mod/ProcessInstruction.md#handleupdate)

### 12. Action: `update` (Action 12)

- **Description:** Sets `output:full` to `"1"` (likely a flag for UI refresh).
- **Details:**
  ```json
  {
      "action": "update",
      "value": "1",
      "to": "output:full"
   }
  ```
- **Code Reference:** [`ProcessInstruction::handleUpdate`](../../app/AiRudeDepot/Mod/ProcessInstruction.md#handleupdate)

## Overall Flow and Interaction

- **UI Interaction:** A user action in the UI (likely triggering a `customHook` associated with a component like a
  button) initiates the process.
- **Client-Side Hook:** The `customHook` likely calls an `ActionManager` method (e.g., `sendData`) or a specific
  application handler.
- **Server Request:** This triggers a request to the server (e.g., via Inertia POST), potentially carrying data like the
  desired window name (`input:name`).
- **Server-Side Processing (`ActionManager`/`AiRudeDepot`):** The server receives the request and `ActionManager` (
  within `AiRudeDepot`) processes the associated command sequence defined in `windowCreate.json` (as detailed above).
- **State Updates & Persistence:** The commands manipulate the state (e.g., `models/windows`, `primary-form/data/*`,
  `buffer:*`) and persist changes (`save` action).
- **UI Feedback (`output:*`):** Commands update `output:*` paths, signaling the necessary UI updates (e.g., closing
  dialogs, refreshing selectors, general refresh via `output:full`).
- **Inertia Response:** The server sends back the updated state/props via the Inertia response.
- **Client-Side Update:** The client-side framework (Vue/Inertia) updates the UI based on the received props, reflecting
  the new window and state changes.
