# Summary of Strict Requirements and Principles (as of [current date/version])

## 0. Key Principles and Strategy

- Глубокое исследование и жесткие требования применяются только к файлам Instructions.
- Для других типов файлов (UI: Pages, Sections, Templates) — только поверхностная проверка структуры и фиксация в чеклисте.
- QTU по файлам Instructions: Только для выяснения связей (`call`, `file!`) и использования: "Зачем этот файл Instructions использует другой файл, и используется ли он сам?". QTU не используется для вопросов о структуре или назначении, если файл соответствует стандарту.
- component-map.json — центральный источник для проверки существования и типа UI-компонентов.
- sendData (клиентское действие) — стандартный мост для вызова серверных Instructions с клиента.

## 1. Supported Actions (см. server-actions-reference.md)
- update
- save
- add
- remove
- call
- for
- return
- print_r
- comment
- assignId

## 2. Instruction Object Fields (см. server-actions-reference.md)
- Каждый объект инструкции обязан содержать поле action (строка, одно из поддерживаемых действий).
- Допустимые поля: from, to, value, condition, disabled, batch, args, instructions, find, with, halt, status, key, how, limit, _comment.
- batch разрешен только для update. Вложенные batch запрещены.
- args разрешен только для call. Передача аргументов через args не реализована, требуется ручная подготовка buffer.
- instructions разрешен только для for.
- find и with разрешены только для update.
- halt и status разрешены только для return.
- key, how, limit разрешены только для add.
- _comment разрешен для любого действия, не влияет на выполнение.

## 3. Data Path Prefixes (см. server-actions-reference.md)
- buffer: — временные данные для облегчения операци.
- input: — данные с фронта.
- output: — данные для вывода на страницу.
- file! — доступ к файлам к папке в storage/ai , где размещены рабочие модули, после инсталяции в системе. 
- model! — доступ к моделям Laravel фреймворка
- args: — [плейсхолдер]
- module-name/data/file:key — сокращенная версия file! адреса.
- mysql! — [плейсхолдер]
- [не-все-типы-адресов-добавлены]

## 4. Condition Syntax (см. server-actions-reference.md)
- Строка: "true", "false", "buffer:flag", "!buffer:flag"
- Массив: ["equals", path1, path2], ["notEquals", path1, path2], ["greaterThan", path1, path2], ["greaterThanOrEqual", path1, path2], ["is_array", path1, null], ["is_set", path1, null], ["notEmpty", path1, null], ["isEmpty", path1, null]
- Все пути должны быть валидными StoragePathParser адресами.

## 5. Batch, Nesting, Args (см. server-actions-reference.md)
- batch разрешен только для update, вложенные batch запрещены.
- args разрешен только для call, автоматическая передача не реализована, требуется ручной buffer.
- instructions разрешен только для for.

## 6. Error Handling and StepResponse (см. server-actions-reference.md)
- Любая ошибка должна логироваться в StepResponse.$history.
- При ошибке StepResponse.$status = ERROR, StepResponse.$halt = true.
- output: — единственный способ добавить данные в StepResponse.$data для фронта.

## 7. Interaction with UI and Structural Operations (см. server-actions-reference.md, component-syntax.md)
- Instructions не содержат UI-компоненты (type, props, children, customHooks и т.д.).
- Instructions не содержат структурные операции (type: "operation", action: "include"/"add").
- UI-файлы могут вызывать Instructions через sendData (customHooks).
- Если Instructions вызывает другой файл через call/file!, и назначение неясно — QTU только для выяснения связи и использования.

## 8. Validation and JSON (см. server-actions-reference.md)
- Только валидный JSON.
- Все адреса должны соответствовать StoragePathParser.
- Автоматическая проверка структуры и полей по этому стандарту обязательна.

## 9. Legacy Structures and Migration (см. server-actions-reference.md)
- Все файлы в actions/ или commands/, не соответствующие этому стандарту, считаются легаси.
- Легаси-файлы должны быть либо рефакторены, либо задокументированы как отклонение.
- Неиспользуемые или невалидные файлы — тикет на удаление или миграцию.

## 10. QTU Usage (см. handling-schema-deviations.md)
- QTU разрешен только для выяснения связей между Instructions (call, file!), либо если невозможно определить использование файла.
- QTU не используется для вопросов о структуре, если файл соответствует стандарту.

## 11. Источники фактов
- server-actions-reference.md — все действия, поля, ограничения, ошибки, StepResponse, batch, args, condition, StoragePathParser.
- component-map.json — только для UI-файлов.
- component-syntax.md — только для UI-файлов.
- handling-schema-deviations.md — только для QTU.
- examples.md — только для подтверждения использования.

## 12. Поток взаимодействия с UI

(Источники: `ui-documentation.md`, `server-actions-reference.md`, `template-schema.md`)

-   **Триггер:** Выполнение файла `Instructions` инициируется клиентским действием `sendData`, которое определено в `customHooks` компонента UI.
-   **Вызов:** Действие `sendData` отправляет запрос на сервер. Поле `data.action` (или `data.sendTo`) в `sendData` указывает путь к файлу `Instructions` или маршруту, который запускает его выполнение.
-   **Входные данные:** Файл `Instructions` на сервере получает входные данные через адрес `input:`. Эти данные могут включать данные формы (связанные через `model` и собранные `sendData` с указанием `form`) или дополнительный `payload`, отправленный `sendData`.
-   **Выполнение:** Инструкции выполняются последовательно на сервере, манипулируя данными в `DataHub` (через адреса `buffer:`, `file!`, `models:`, т.д.).
-   **Формирование ответа:** В процессе выполнения инструкции могут помещать данные для фронтенда в `StepResponse.$data` через адрес `output:`. Также инструкции (`return` действие) могут устанавливать статус `StepResponse` (например, `OK`, `ERROR`, `REDIRECT`).
-   **Ответ сервера:** Сервер отправляет `StepResponse` обратно клиенту. `StepResponse` содержит `$data` (из `output:`), `$history` (логи, ошибки), `$status`, `$halt`, `$sessionData`.
-   **Обработка на клиенте:** Фронтенд обрабатывает `StepResponse`. Обновление UI-структуры происходит путем рендеринга нового JSON, присланного с сервера (например, при переходе на новую страницу/компонент, указанный в `output:component` или `output:redirect`), а не путем динамического связывания данных из `StepResponse` с существующими `props` (это не поддерживается в V1).

---

# Standard for `Instructions` Type Files

This document defines the strict standards for JSON files of type `Instructions`. These files are responsible for server-side data manipulation, logic execution, and interaction with various storage systems. Adherence to these standards is mandatory.

**Primary Source of Truth:** [`docs/ui/commands-and-operations/server-actions-reference.md`](/docs/ui/commands-and-operations/server-actions-reference.md)

## 1. Top-Level Structure

-   An `Instructions` file **MUST** be a JSON array `[...]` at its root.
-   Each element of this array **MUST** be a JSON object `{...}` representing a single instruction.
-   Files that appear to define a sequence of server-side actions but do not conform to this top-level array structure are considered non-compliant and **MUST** be refactored or reported via QTU for clarification on their role and intended structure.

```json
// CORRECT Example:
[
    {
        "action": "update",
        "value": "initial data",
        "to": "buffer:myVar"
    },
    {
        "action": "save",
        "from": "buffer:myVar",
        "condition": "buffer:myVar.isValid"
    }
]
```

## 2. Individual Instruction Structure

Each instruction object **MUST** contain an `"action"` field. Other fields are specific to the action type.

### 2.1. Common Fields (Refer to `server-actions-reference.md` for specifics per action)

| Field         | Type                | Description                                                                                                                                    | Required?          |
|---------------|---------------------|------------------------------------------------------------------------------------------------------------------------------------------------|--------------------|
| `action`      | `String`            | **Identifier of the action type.** (e.g., `update`, `save`, `call`).                                                                           | **Yes**            |
| `from`        | `String` or `Array` | Storage address(es) from which data is read. Parsed by `StoragePathParser`.                                                                    | Varies by action   |
| `to`          | `String`            | Storage address where data is written. Parsed by `StoragePathParser`.                                                                          | Varies by action   |
| `value`       | `Any`               | A direct value used instead of `from`. Can contain template variables `{...}` resolved by `DataHub::resolveInstruction`.                         | Varies by action   |
| `condition`   | `String` or `Array` | Condition for executing the instruction. Processed by `DataManipulateHelper::evaluateCondition`. See `server-actions-reference.md` for syntax. | No (Optional)      |
| `disabled`    | `Boolean`           | If `true`, the instruction is skipped. Defaults to `false`.                                                                                    | No (Optional)      |
| `batch`       | `Array`             | Used **ONLY** within the `update` action for atomic batch execution of multiple `update` operations.                                             | `update` specific  |
| `args`        | `Object`            | Used by the `call` action. **NOTE:** Current implementation for passing args to called instructions requires manual buffer preparation.         | `call` specific    |
| `instructions`| `Array`             | Used by the `for` action to define instructions executed in each iteration.                                                                    | `for` specific     |
| `comment`     | `String`            | (Informal) Field for adding explanatory comments. Not a distinct `action: "comment"`. Ignored by parser if not a standard field for an action. | No (Optional)      |
| `_comment`    | `String`            | (Informal) Alternative field for comments.                                                                                                       | No (Optional)      |

### 2.2. Action: `comment`
- If a dedicated comment instruction is needed, use `{"action": "comment", "_comment": "Your comment here"}`.
- Avoid adding arbitrary comment fields to other actions unless they are purely for human readability and known to be ignored by the processor for that specific action.

## 3. Data Path Formats (Storage Addresses)

All paths in `from`, `to`, `condition`, and template variables `{...}` **MUST** adhere to the formats parsed by `StoragePathParser`. Refer to `server-actions-reference.md` for the canonical list.

### 3.1. Key Prefixes:

| Prefix        | Description                                                                                                   | Writable by `to`? |
|---------------|---------------------------------------------------------------------------------------------------------------|-------------------|
| `buffer:`     | Temporary data for the current request (`DataHub`). Volatile.                                                  | Yes               |
| `input:`      | Input data from the frontend (e.g., form data, `customHooks` payload).                                         | No                |
| `output:`     | Data for the `StepResponse` to the frontend.                                                                  | Yes               |
| `file!{path}` | Direct file access. Path is relative to a predefined root or absolute. **Crucial:** `update` modifies in-memory, `save` writes to disk. | Yes (via `update`) |
| `models/{name}`| Global data models (typically Eloquent).                                                                        | Yes (via `update`) |
| `args:`       | For reading arguments in `call`-ed instructions. **Requires manual buffer setup for passing.**                  | No                |
| `module-name/data/file:key` | (Legacy/Specific) Data from a file in a module's `data/` folder. Check `server-actions-reference.md`. | Varies            |
| `mysql!table` | (Legacy) Direct MySQL table access. **Avoid if possible.**                                                      | Varies            |

### 3.2. Template Variables:
- Variables `{...}` **MUST** use valid storage addresses.

## 4. Action-Specific Requirements

(This section will be populated with detailed rules for each action based on `server-actions-reference.md` and examples)

### 4.1. `update`
- **MUST** have a `to` field.
- **MUST** have either `from` or `value`.
- `batch`: If used, **MUST** be an array of valid `update` instruction objects (excluding nested `batch` within these).
- `find`: If used, **MUST** conform to `DataManipulateHelper::searchInData` parameters (`value`, `return`).
- `with`: If used, **MUST** conform to `DataManipulateHelper::applyDataTransformation` parameters.

### 4.2. `save`
- **MUST** have a `from` field.
- `from` field **MUST** point to a persistable storage address (e.g., `file!...`, `models/...`). **CANNOT** be `buffer:`.
- This action is **MANDATORY** to persist changes made by `update` to `file!...` or `models/...` addresses if those changes need to be read by subsequent operations or requests.

### 4.3. `add`
- **MUST** have a `to` field.
- `to` field **MUST** point to an array or string in `DataHub`.
- **MUST** have `from`, `address`, or `value` for the data to add.
- `how`: (Optional) `append` (default) or `prepend`.
- `limit`: (Optional) Number.

### 4.4. `remove`
- **MUST** have `from` or `to` field specifying address(es) to remove.
- This action removes from `DataHub` and **persists** the removal (calls `DataHub::save()`).

### 4.5. `call`
- **MUST** have `from`, `address`, `target`, or `value` specifying the instructions to call (file path or array of instructions).
- `args` (Object): Optional. For passing arguments. **CRITICAL:** Effective argument passing currently requires manual preparation of a `buffer:` location *before* the `call`, and the called instructions must read from this buffer. The `args:` field in `call` itself is not automatically mapped to an `args:` prefix in the called scope without this buffer intermediary.
- Called instructions are executed recursively. Their `StepResponse` is merged.

### 4.6. `for`
- **MUST** have `from` or `address` (iterable array/object).
- **MUST** have `instructions` (array of instructions to execute per item).
- `to` (String, optional): Address to write an array of results if child instructions write to `buffer:for.list`.
- Inside `instructions`, `buffer:for.currentItem` and `buffer:for.currentIndex` are available.

### 4.7. `return`
- May have `from`, `address`, or `value` for data to add to `StepResponse`.
- `halt` (Boolean, optional): If `true`, stops further request processing.
- `status` (String, optional): Sets `StepResponse` status (e.g., `ok`, `error`, `redirect`).

### 4.8. `print_r` (Debug)
- May have `from`, `address`, or `value`. Output added to `StepResponse` history.

### 4.9. `assignId`
- **MUST** have `to` field (storage address for the generated ID).

## 5. Conditional Execution (`condition`)

- If a `condition` field is present in an instruction, its value (string or array) **MUST** conform to the syntax evaluable by `DataManipulateHelper::evaluateCondition`.
- The evaluation logic is implemented in `app/AiRudeDepot/Processors/InstructionProcessor/DataManipulateHelper.php::evaluateCondition`.

### 5.1. String Syntax

- A `condition` can be a string. The string can be:
    -   Literal boolean values: `"true"` or `"false"`.
    -   A Storage Address path: `"buffer:someFlag"`, `"input:userData.isActive"`, etc. The value retrieved from this address is cast to a boolean (`(bool)$value`).
    -   An inverted Storage Address path: `"!buffer:someFlag"`. The value is retrieved, cast to boolean, and then logically inverted.

```json
// Examples of String Conditions:
{ "action": "...", "condition": "true", ... }
{ "action": "...", "condition": "!buffer:isComplete", ... }
```

### 5.2. Array Syntax

- A `condition` can be a JSON array following the format: `["operation", "operand1", "operand2?"]`.
- The first element **MUST** be a string representing the operation.
- Operands (`operand1`, `operand2`) are strings that are resolved by `Storage::processResolveInstruction`. They can be Storage Addresses (`buffer:`, `input:`, etc.) or literal values that need resolution (e.g., `"{buffer:someValue}"` or direct strings if the operation expects them).

### 5.3. Supported Operations (Array Syntax)

The following operations are supported. Refer to `DataManipulateHelper::evaluateCondition` for precise implementation details:

-   `"equals"`: `["equals", operand1, operand2]` (Checks if `operand1 === operand2` after resolution).
-   `"notEquals"`: `["notEquals", operand1, operand2]` (Checks if `operand1 !== operand2` after resolution).
-   `"greaterThan"`: `["greaterThan", operand1, operand2]` (Checks if `operand1 > operand2` after resolution. Requires numeric or comparable values).
-   `"greaterThanOrEqual"`: `["greaterThanOrEqual", operand1, operand2]` (Checks if `operand1 >= operand2` after resolution. Requires numeric or comparable values).
-   `"is_array"`: `["is_array", operand1, null]` (Checks if `operand1` after resolution is an array).
-   `"is_set"`: `["is_set", operand1, null]` (Checks if `operand1` after resolution is set/exists in DataHub path).
-   `"notEmpty"`: `["notEmpty", operand1, null]` (Checks if `operand1` after resolution is not empty. Empty includes `null`, `false`, `0`, `""`, `[]`).
-   `"isEmpty"`: `["isEmpty", operand1, null]` (Checks if `operand1` after resolution is empty. Empty includes `null`, `false`, `0`, `""`, `[]`).
-   `"and"`: `["and", condition1, condition2, ...]` (Evaluates multiple sub-conditions logically AND-ed together. Each sub-condition (`condition1`, `condition2`, etc.) **MUST** also be a valid `condition` (string or array)). **Note:** The `"or"` operator is NOT supported by `DataManipulateHelper::evaluateCondition`.

```json
// Examples of Array Conditions:
{ "action": "...", "condition": ["equals", "input:username", "buffer:currentUser.name"], ... }
{ "action": "...", "condition": ["notEmpty", "input:email", null], ... }
{ "action": "...", "condition": ["and", "buffer:isLoggedIn", ["greaterThan", "buffer:user.level", 5]], ... }
```

### 5.4. Paths and Resolution

- All string values within a `condition` that are intended as data references (paths like `buffer:...`, `input:...`) **MUST** be valid Storage Addresses parsable by `StoragePathParser`.
- Operands in array conditions are resolved by `Storage::processResolveInstruction`, which handles both simple paths and template variables (`{...}`).

### 5.5. Limitations and Error Handling

- Empty array conditions `[]` are invalid and will cause an exception.
- The `"and"` operation requires at least one operand. Invalid usage will cause an exception.
- Using unsupported operations or incorrect syntax will result in errors during processing.

## 6. Error Handling and `StepResponse`
- Instructions operate within a `StepResponse` context.
- Errors encountered during instruction processing (either by system or custom logic if it were PHP) **SHOULD** result in:
    1.  Logging error details to `StepResponse.$history`.
    2.  Setting `StepResponse.$status` to `ERROR`.
    3.  Setting `StepResponse.$halt` to `true` to stop further processing of the current instruction sequence.
- `output:` prefix in `to` addresses is the standard way to populate `StepResponse.$data` for the frontend.

## 7. Interaction with UI Files and Other Systems
- `Instructions` files are server-side logic. They **MUST NOT** contain UI component definitions (e.g., `{"type": "Button", ...}`).
- UI files (Pages, Sections, Templates) **MAY** trigger `Instructions` execution via client-side `customHooks` using the `sendData` action. The `data.action` field in `sendData` **MUST** point to a valid server-side `Instructions` file/route.
- Structural operations like `{"type": "operation", "action": "include"}` or `"add"}` are part of UI composition and **MUST NOT** be used within `Instructions` files.
- If an `Instructions` file needs to `call` another set of instructions from a file, and the usage or purpose of this called file is unclear, a QTU **MUST** be raised to clarify its role and ensure it also conforms to these standards.

## 8. Legacy Structures and Refactoring
- Files in `actions/` or `commands/` directories that perform server-side logic but do not conform to this `Instructions` standard (e.g., custom JSON structures) are considered legacy.
- These **SHOULD** be identified and, where possible, refactored to the standard `Instructions` format. If refactoring is not immediately feasible, their deviation **MUST** be documented.

## 9. Linting and Validation
- All `Instructions` files **MUST** be valid JSON.
- Automated linting/validation against this standard is highly recommended.

## 10. QTU Usage (см. handling-schema-deviations.md)
- QTU разрешен только для выяснения связей между Instructions (call, file!), либо если невозможно определить использование файла.
- QTU не используется для вопросов о структуре, если файл соответствует стандарту.

## 11. Источники фактов
- server-actions-reference.md — все действия, поля, ограничения, ошибки, StepResponse, batch, args, condition, StoragePathParser.
- component-map.json — только для UI-файлов.
- component-syntax.md — только для UI-файлов.
- handling-schema-deviations.md — только для QTU.
- examples.md — только для подтверждения использования.

## 12. Поток взаимодействия с UI

(Источники: `ui-documentation.md`, `server-actions-reference.md`, `template-schema.md`)

-   **Триггер:** Выполнение файла `Instructions` инициируется клиентским действием `sendData`, которое определено в `customHooks` компонента UI.
-   **Вызов:** Действие `sendData` отправляет запрос на сервер. Поле `data.action` (или `data.sendTo`) в `sendData` указывает путь к файлу `Instructions` или маршруту, который запускает его выполнение.
-   **Входные данные:** Файл `Instructions` на сервере получает входные данные через адрес `input:`. Эти данные могут включать данные формы (связанные через `model` и собранные `sendData` с указанием `form`) или дополнительный `payload`, отправленный `sendData`.
-   **Выполнение:** Инструкции выполняются последовательно на сервере, манипулируя данными в `DataHub` (через адреса `buffer:`, `file!`, `models:`, т.д.).
-   **Формирование ответа:** В процессе выполнения инструкции могут помещать данные для фронтенда в `StepResponse.$data` через адрес `output:`. Также инструкции (`return` действие) могут устанавливать статус `StepResponse` (например, `OK`, `ERROR`, `REDIRECT`).
-   **Ответ сервера:** Сервер отправляет `StepResponse` обратно клиенту. `StepResponse` содержит `$data` (из `output:`), `$history` (логи, ошибки), `$status`, `$halt`, `$sessionData`.
-   **Обработка на клиенте:** Фронтенд обрабатывает `StepResponse`. Обновление UI-структуры происходит путем рендеринга нового JSON, присланного с сервера (например, при переходе на новую страницу/компонент, указанный в `output:component` или `output:redirect`), а не путем динамического связывания данных из `StepResponse` с существующими `props` (это не поддерживается в V1).

## 13. Context of Use

For each `Instructions` file, the analysis **MUST** include documenting its intended context of use within the module:

-   **How is this file called?** (e.g., by a specific UI component's `customHooks`, by another Instructions file via `call`, as part of a scenario).
    -   Identify the caller (e.g., filename, component type, scenario ID).
    -   Note the trigger (e.g., button click, form submission, step in a scenario).
-   **How are the results used?** (e.g., data written to `output:`, `buffer:` locations is read by UI for rendering, used in subsequent Instructions).
    -   Identify where the output data is consumed.
    -   Note how the `StepResponse` status/halt is handled.

This analysis helps ensure the file's logic aligns with its role in the overall workflow and aids in debugging and future modifications.

*(This standard is based on analysis of `server-actions-reference.md`, `examples.md`, and other provided documentation as of [current date/version]. Always refer to the primary source documents and code for absolute ground truth.)* 