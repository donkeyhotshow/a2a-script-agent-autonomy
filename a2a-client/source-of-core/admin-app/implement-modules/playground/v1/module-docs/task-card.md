# Task Card: MySQL Playground Module

**Objective:** Create a simple UI page to interact with a MySQL table (`test_table`) allowing users to add, view,
update, and delete records. Implement the backend actions using the standard AI Installer action format.

**ID:** `mysql-data-module-test`

**Related Files:**

* **UI Definition:** `storage/aiInstaller/playground/mysql-data-module-test.json`
* **Actions:**
    * `storage/aiInstaller/playground/actions/mysql-add-record.json`
    * `storage/aiInstaller/playground/actions/mysql-count-records.json`
    * `storage/aiInstaller/playground/actions/mysql-load-record.json` (Handles loading for update)
    * `storage/aiInstaller/playground/actions/mysql-update-record.json`
    * `storage/aiInstaller/playground/actions/mysql-delete-record.json`
* **Standard:** `write-module-standard.md`
* **Steps:** `steps.md`

**UI Definition (`mysql-data-module-test.json` - Simplified Structure, Corrected Syntax):**

```json
{
  "id": "mysql-data-module-test", 
  "type": "div",
  "children": [
    // --- Add Record Section ---
    {
      "type": "Form",
      "props": { "id": "addRecordForm" },
      "children": [
        {"type": "Input", "props": {"label": "Name", "name": "name", "id": "addName"}},
        {"type": "Input", "props": {"label": "Value", "name": "value", "id": "addValue"}},
        {
          "type": "Button",
          "props": { "label": "Add Record" },
          "customHooks": {"click": {"action": "sendData", "data": {"form": "addRecordForm", "sendTo": "playground/actions/mysql-add-record"}}}
        }
      ]
    },
    // --- Display & Count Section ---
    {
      "type": "div",
      "props": { "id": "displaySection" }, 
      "children": [
        {
          "type": "Alert",
          "props": {
            "id": "recordCountDisplay",
            "severity": "info",
            "content": "Total Records: 0"
           }
        },
        {
          "type": "div",
          "props": {
             "id": "mysqlOutput",
             "content": "MySQL data will appear here..."
          }
        },
        {
           "type": "Button",
           "props": { "label": "Count Records" },
           "customHooks": {"click": {"action": "sendData", "data": {"sendTo": "playground/actions/mysql-count-records"}}}
         }
      ]
    },
    // --- Update Record Section ---
    {
      "type": "Form",
      "props": { "id": "updateRecordForm" },
      "children": [
        {"type": "Input", "props": {"label": "Record ID (for Load/Update/Delete)", "name": "id", "id": "recordId"}},
        {"type": "Input", "props": {"label": "New Name", "name": "name", "id": "updateName"}},
        {"type": "Input", "props": {"label": "New Value", "name": "value", "id": "updateValue"}},
        {
          "type": "Button",
          "props": { "label": "Load Record for Update" },
          "customHooks": {"click": {"action": "sendData", "data": {"form": "updateRecordForm", "sendTo": "mysql-load-record"}}}
        },
        {
          "type": "Button",
          "props": { "label": "Update Loaded Record" },
          "customHooks": {"click": {"action": "sendData", "data": {"form": "updateRecordForm", "sendTo": "mysql-update-record"}}}
        }
      ]
    },
    // --- Delete Record Section ---
    {
      "type": "Form",
      "props": { "id": "deleteRecordForm" },
      "children": [
        {
          "type": "Button",
          "props": { "label": "Delete Record by ID" },
          "customHooks": {"click": {"action": "sendData", "data": {"form": "updateRecordForm", "sendTo": "mysql-delete-record"}}}
        }
      ]
    }
  ]
}
```

**Action File Definitions (Corrected):**

* **`mysql-add-record.json`:**
    * `action: "save"`, `to: "mysql!test_table"`
    * Followed by actions to recount: `action: "call"`, `from: "handler:mysqlHandler/countRecords"``
    * Update count display: `action: "update"`,
      `to: "file!playground/mysql-data-module-test:children.1.children.0.props.content"`,
      `value: "Total Records: {buffer:recordCount}"`
    * Save template: `action: "save"`, `from: "file!playground/mysql-data-module-test"`
* **`mysql-count-records.json`:**
    * `action: "call"`, `from: "file!path/to/handler:mysqlHandler.countRecords"`
    * `action: "update"`, `to: "file!playground/mysql-data-module-test:children.1.children.0.props.content"`,
      `value: "Total Records: {buffer:recordCount}"`
    * `action: "save"`, `from: "file!playground/mysql-data-module-test"`
* **`mysql-load-record.json`:**
    * `action: "call"`, `from: "file!path/to/handler:mysqlHandler.readRecord"`
    * Update 'New Name' input: `action: "update"`,
      `to: "file!playground/mysql-data-module-test:children.2.children.1.props.value"`,
      `value: "{buffer:loadedRecord.name}"`
    * Update 'New Value' input: `action: "update"`,
      `to: "file!playground/mysql-data-module-test:children.2.children.2.props.value"`,
      `value: "{buffer:loadedRecord.value}"`
    * Update display area: `action: "update"`,
      `to: "file!playground/mysql-data-module-test:children.1.children.1.props.content"`,
      `value: "Loaded Record: ID={buffer:loadedRecord.id}, Name={buffer:loadedRecord.name}, Value={buffer:loadedRecord.value}"`
    * `action: "save"`, `from: "file!playground/mysql-data-module-test"`
* **`mysql-update-record.json`:**
    * `action: "save"`, `to: "mysql!test_table/where/id/{input:id}"`
    * Followed by actions to recount and update display areas using the Template Processing pattern (call handler to
      count to buffer, update display props using `file!`, update count props using `file!`, save template using
      `file!`).
* **`mysql-delete-record.json`:**
    * `action: "remove"`, `from: "mysql!test_table/where/id/{input:id}"`
    * Followed by actions to recount and update display areas using the Template Processing pattern (call handler to
      count to buffer, update display props using `file!`, update count props using `file!`, save template using
      `file!`).

**Implementation Notes & Verification Steps:**

1. **UI Creation:** Build `mysql-data-module-test.json` as defined (using `type`/`props`).
2. **Registration:** Add `playground/mysql-data-module-test` to `_i/files-by-block.json` (primary registration file) and
   ensure necessary `_i/` files exist.
3. **Action Implementation:** Create the five action JSON files.
    * Focus on correct `from`/`to` addresses (`mysql!...`, `file!...`).
    * Use `action: "call"` to interact with the hypothetical `mysqlHandler` (needs methods like `countRecords`,
      `readRecord`).
    * Use `{input:fieldName}` to access form data.
    * **Crucially, implement UI updates using the Template Processing pattern:** Use `action: "update"` to stage changes
      to specific component properties within the template (e.g.,
      `to: "file!playground/mysql-data-module-test:children.1.children.0.props.content"`) and then use `action: "save"`
      with `from: "file!playground/mysql-data-module-test"` to persist the changes and trigger the UI refresh.
4. **Verification:**
    * Load the page.
    * Add a record -> Verify DB entry & update (via handler call and template save).
    * Load a record -> Verify update form fields populate & display area shows loaded data (via handler call and
      template save).
    * Count records -> Verify count display (via handler call and template save).
    * Modify values & Update -> Verify DB change, count, and display area update (via save, handler call and template
      save).
    * Delete a record -> Verify DB removal, count, and display area update (via remove, handler call and template save).
    * Ensure UI updates happen *after* the actions (especially DB operations) complete, triggered by the final template
      `save` action.
4. **Persistent Status Logs:**
    * Instead of `update`, use `add` action to append status or progress messages to a status container in the UI.
    * Example:
   ```json
   {
     "action": "add",
     "value": "✔ Record added successfully.\n",
     "to": "playground/mysql-data-module-test:children.1.props.content",
     "how": "append"
   },
   {
     "action": "save",
     "from": "playground/mysql-data-module-test"
   }
   ```

**Considerations/Unknowns:**

* Exact methods and return structure of the required `mysqlHandler`.
* Exact syntax/mechanism for storing/accessing buffer results (`result: "buffer:varName"`, `{buffer:varName}`). Assume
  this works for planning.
* Implicit INSERT vs UPDATE behavior of `save` action based on `to` address (`mysql!table` vs `mysql!table/where/...`).
* Error handling (e.g., record not found, DB errors, handler errors) needs definition.
* Confirmation messages after actions (e.g., "Record Added!").

***

## Task: Implement MySQL Data Interaction Module (Obsolete - See Above)

(Keeping the section below for reference, but it uses outdated syntax/actions)

**Objective:** Create a UI component (`page/mysql-data-module-test.json`) and corresponding actions (`actions/*.json`)
to perform basic CRUD operations (Load by ID, Load by Where, Update by ID, Delete by ID, Count All) on a hypothetical
MySQL `users` table (`id`, `name`, `email`). Use the Template Processing Pattern for UI updates.

**Associated Files:**

* UI Definition: `page/mysql-data-module-test.json`
* Actions:
    * `actions/load-mysql-by-id.json`
    * `actions/load-mysql-by-where.json`
    * `actions/update-mysql-by-id.json`
    * `actions/delete-mysql-by-id.json`
    * `actions/count-mysql.json`
* Common Actions: `_i/common.json` (referenced by UI)
* Standard Guide: `write-module-standard.md`

**UI Definition (`page/mysql-data-module-test.json`):**

```json
{
  "type": "Page",
  "id": "mysqlTestPage",
  "children": [
    {
      "type": "div",
      "id": "mysqlControls",
      "children": [
        // --- Load by ID ---
        {"type": "Input", "props":{ "id": "recordId",  "placeholder": "Record ID"},"model": {"form": "mysqlTestPage5", "field": "recordId"}}   ,
        {"type": "Button","props": { "label": "Load by ID" },"customHooks": {"click": {"action": "sendData", "data": {"form": "mysqlTestPage5", "sendTo": "load-mysql-by-id"}}}}    
        // --- Load by Where ---
        {"type": "Input", "props": { "id": "whereColumn", "placeholder": "Column Name (e.g., email)"},"model": {"form": "mysqlTestPage4", "field": "whereColumn"}},
        {"type": "Input", "props": { "id": "whereValue", "placeholder": "Column Value"},"model": {"form": "mysqlTestPage4", "field": "whereValue"}  },
        {"type": "Button", "props": { "label": "Load by Where" },"customHooks": {"click": {"action": "sendData", "data": {"form": "mysqlTestPage4", "sendTo": "load-mysql-by-where"}}}}
        // --- Update by ID ---
        {"type": "Input", "props": { "id": "updateId", "placeholder": "ID to Update"},"model": {"form": "mysqlTestPage3", "field": "updateId"}},
        {"type": "Input", "props": { "id": "updateName", "placeholder": "New Name"},"model": {"form": "mysqlTestPage3", "field": "updateName"}},
        {"type": "Input", "props": { "id": "updateEmail", "placeholder": "New Email"},"model": {"form": "mysqlTestPage3", "field": "updateEmail"}},
        {"type": "Button", "props": { "label": "Update by ID" },"customHooks": {"click": {"action": "sendData", "data": {"form": "mysqlTestPage3", "sendTo": "update-mysql-by-id"}}}}
        // --- Delete by ID ---
        {"type": "Input", "props": { "id": "deleteId", "placeholder": "ID to Delete"},"model": {"form": "mysqlTestPage2", "field": "deleteId"}},
        {"type": "Button", "props": { "label": "Delete by ID" },"customHooks": {"click": {"action": "sendData", "data": {"form": "mysqlTestPage2", "sendTo": "delete-mysql-by-id"}}}}
        // --- Count All ---  
          {"type": "Button", "props": { "label": "Count All Records" },"customHooks": {"click": {"action": "sendData", "data": {"form": "mysqlTestPage6", "sendTo": "count-mysql"}}}} 
      ]
    },
    {
      "type": "div",
      "id": "mysqlOutput",
      "props": { "content": "Output will appear here..."}
    },
    {
      "type": "div",
      "id": "mysqlStatus",
      "props": { "content": "Status messages will appear here..."}
    }
  ]
}
```

**Action File Definitions:**

1. **`load-mysql-by-id.json`**
    * Action: `update` (to: `page/mysql-data-module-test.json/mysqlOutput.content`, value:
      `{content: "Loaded: {temp:recordData.name} ({temp:recordData.email})"}`)
    * Action: `update` (to: `page/mysql-data-module-test.json/mysqlStatus.content`, value:
      `{content: "Record {input:recordId} loaded."}`)
    * Action: `save` (from: `page/mysql-data-module-test.json`)

2. **`load-mysql-by-where.json`**
    * Action: `update` (to: `page/mysql-data-module-test.json/mysqlOutput.content`, value:
      `{content: "Found {temp:recordsData.length} records matching {input:whereColumn}={input:whereValue}"}`)
    * Action: `update` (to: `page/mysql-data-module-test.json/mysqlStatus.content`, value:
      `{content: "Search complete for {input:whereColumn}={input:whereValue}."}`)
    * Action: `save` (from: `page/mysql-data-module-test.json`)

3. **`update-mysql-by-id.json`**
    * Action: `update` (to: `mysql!users/where/id/{input:id}`, value: `{name: "{input:name}", email: "{input:email}"}`)
    * Action: `update` (to: `page/mysql-data-module-test.json/mysqlStatus.content`, value:
      `{content: "Record {input:id} updated."}`)
    * Action: `save` (from: `page/mysql-data-module-test.json`)

4. **`delete-mysql-by-id.json`**
    * Action: `remove` (to: `mysql!users/where/id/{input:id}`)
    * Action: `update` (to: `page/mysql-data-module-test.json/mysqlStatus.content`, value:
      `{content: "Record {input:id} deleted."}`)
    * Action: `save` (from: `page/mysql-data-module-test.json`)

5. **`count-mysql.json`**
    * Action: `update` (to: `page/mysql-data-module-test.json/mysqlOutput.content`, value:
      `{content: "Total Records: {result}"}`)
    * Action: `update` (to: `page/mysql-data-module-test.json/mysqlStatus.content`, value:
      `{content: "Count complete."}`)
    * Action: `save` (from: `page/mysql-data-module-test.json`)

**Implementation Notes & Verification Steps:**

1. Create the `page/mysql-data-module-test.json` file with the specified UI structure.
2. Create the five action files (`actions/*.json`) following the definitions above, ensuring correct use of `target`,
   `params`, `output`, and the `update` + `save` steps for the Template Processing pattern.
3. Use `{input:variableName}` placeholders correctly to reference data sent from button clicks (`sendData`).
4. Assume a PHP handler `mysqlHandler` exists with methods `readRecord`, `readRecordsWhere`, `updateRecord`,
   `deleteRecord`, `countAll`.
5. Test each button click:
    * Verify the correct action file is triggered.
    * Verify the expected parameters are passed to the (mocked or real) PHP handler.
    * Verify the `mysqlOutput` and `mysqlStatus` divs in `page/mysql-data-module-test.json` are updated correctly
      *after* the action completes (check the saved file content).
    * Ensure no errors occur during action execution.
6. Confirm that `{input:...}` placeholders correctly resolve values from the button's `sendData` object.

### Tasks:

- **Module Directory Setup:** Create `playground/mysql-data-module-test` and subdirectories (`actions`, `code`, `ui`).
- **Meta File:** Create `playground/mysql-data-module-test/_i/meta.json`.
- **Links File:** Create `playground/mysql-data-module-test/_i/links.json`.
- **UI Definition:** Create `playground/mysql-data-module-test/ui/main.json`.
- **Action Files:**
    - Create `playground/mysql-data-module-test/actions/load-data.json`.
    - Create `playground/mysql-data-module-test/actions/count-records.json`.
    - Create `playground/mysql-data-module-test/actions/add-record.json`.
- **(Optional) PHP Handler:** If necessary, create `playground/mysql-data-module-test/code/MysqlHandler.php`. (Initially
  assume actions can handle directly).
- **Testing and Verification:** Manually test all UI interactions and verify data in the `test_table`.
- **Documentation:** Update `@memories.md`, `@lessons-learned.md`.

## Дополнение: Обновленная синтаксическая информация

- При обновлении буфера в action файлах (например, в `actions/model-test-v1/delete-model-by-id.json`), теперь
  используется `"to": "buffer:..."` вместо `"result": "buffer:..."` для соблюдения шаблонного паттерна обновления UI.

