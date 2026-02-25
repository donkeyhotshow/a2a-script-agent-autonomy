# Module Actions vs. Client Actions

This document clarifies the distinction between two types of "actions" within the JSON UI V1 system:

1. **Server Actions (or Module Actions):**
    * **Definition:** These are sequences of server-side operations defined in JSON files, typically located within a
      module's `actions/` directory or its subdirectories (e.g.,
      `storage/aiInstaller/primary-form/actions/program-section/programChange.json`).
    * **Purpose:** Handle business logic, data manipulation (reading/writing via `DataHub`), interaction with external
      services, and prepare data to be sent back to the UI.
    * **Invocation:** Triggered from the client-side, usually via a `customHooks` action like `sendData`, which sends a
      request to the server specifying which Server Action to execute.
    * **Examples:** Saving form data, loading user details, processing payments, calling PHP commands.
    * **Reference:** See [
      `docs/ui/json-ui/commands-and-operations/server-actions-reference.md`](../commands-and-operations/server-actions-reference.md)
      for details on the available server-side command types (`update`, `save`, `call`, etc.).

2. **Client Actions (defined in `customHooks`):**
    * **Definition:** These are actions defined within the `customHooks` property of a JSON UI component.
    * **Execution:** Processed in the **user's browser** (client-side), likely by the client-side `ActionManager` or
      dedicated event handlers.
    * **Purpose:** Handle direct UI interactions, trigger navigation, display notifications, manipulate DOM elements
      locally, or initiate requests to the server (by calling `sendData`).
    * **Invocation:** Triggered directly by browser events specified in the `customHooks` key (e.g., `click`, `change`).
    * **Examples:** `navigateTo`, `changeAttribute`, `toggleClass`, `alert`, `copyToClipboard`, and importantly,
      `sendData` (which bridges the gap to Server Actions). Other client-side ac
    * **Reference:** See the `customHooks` section in [
      `docs/ui/json-ui/core-concepts/template-schema.md`](./template-schema.md) and examples in [
      `docs/ui/json-ui/commands-and-operations/ui-documentation.md`](../commands-and-operations/ui-documentation.md).

**Key Takeaway:** It's crucial to differentiate between the server-side logic defined in `actions/*.json` files (Server
Actions) and the client-side event handlers defined in `customHooks` (Client Actions), even though the term "action" is
used in both contexts. Client Actions often serve as the trigger for Server Actions via `sendData`. 
