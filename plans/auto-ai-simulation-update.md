# Plan for Updating Auto-AI Simulation

## 1. Updates to Simulation Step Files (steps 3-15)

For each step from 3 to 15 in the auto-ai simulation, we will update the context structure in `request.json` and `response.json` to align with the new context strategy defined in ISSUE 9 and ISSUE 6, with the additional constraint that the server processes the result into context before the LLM sees it, so that the LLM never receives a raw `result` in its input.

### Changes per step:

- **context.files**: A map where keys are file paths and values are the full file contents. This will store the contents of files that have been read (via `read-file`) so they are available for subsequent steps without cluttering the history.
- **context.scratchpad**: An object that tracks the state of the simulation using boolean flags (e.g., `{ "read_app_js": true, "health_route_written": true }`). This will be updated via `scratchpad_ops` from the LLM.
- **context.history**: An array of history entries. Each entry will be a system message that briefly describes the result of a tool execution (e.g., `{ "role": "system", "message": "Read src/app.js (142 lines)" }`) or a user/assistant message for interactions. Full payloads (like file contents) will not be stored in history.

### Important: The `request.json` (which represents the input to the LLM) should NOT contain a `result` field. Instead, the context should already reflect the processing of the previous step's result into `files`, `scratchpad`, and `history`.

The `response.json` (which represents the server's output) will contain:
- `context`: the updated context after processing the LLM's proposed execute (but before the tool is actually executed by the client? Actually, in the simulation, we are capturing the state after the server has validated the LLM's propose and updated the context with the executed step).
- `execute`: the action that the client should perform next (as proposed by the LLM and validated by the server).

### Example transformation for a read-file step:

**Before (step 6 request.json)**:
```json
{
  "context": {
    "task": "...",
    "execution": { "action": "auto-ai", "step": "read_code" },
    "history": [
      { "role": "user", "message": "..." },
      { "role": "assistant", "message": "Reading app entry.", "action": "read-file" }
    ]
  },
  "result": {
    "read-file": {
      "path": "src/app.js",
      "content": "..."
    }
  }
}
```

**After (step 6 request.json)**:
```json
{
  "context": {
    "task": "...",
    "execution": { "action": "auto-ai", "step": "read_code" },
    "files": {
      "src/app.js": "..."
    },
    "scratchpad": {
      "read_app_js": true
    },
    "history": [
      { "role": "user", "message": "..." },
      { "role": "assistant", "message": "Reading app entry.", "action": "read-file" },
      { "role": "system", "message": "Read src/app.js (142 lines)" }
    ]
  }
  // NOTE: No "result" field here, because the server has already processed the result
  // into the context (files, scratchpad, history) before presenting to the LLM.
}
```

**After (step 6 response.json)**:
```json
{
  "context": {
    "task": "...",
    "execution": { "action": "auto-ai", "step": "read_routes" }, // step updated based on LLM's propose
    "files": {
      "src/app.js": "...",
      "src/routes/index.js": "..." // if the LLM proposed to read this file and we are simulating that it was read? 
      // Actually, in the response, we haven't executed the tool yet; we are just proposing.
      // So the files might not include the routes file yet. This is a nuance.
      // For the simulation, we might want to show the context as it is after the server
      // has processed the LLM's propose but before the client executes the tool.
      // However, to keep the simulation simple, we can assume that the context in the
      // response.json is the same as in the request.json, except for the execution step
      // and possibly any immediate updates (like adding to scratchpad from the LLM's propose?).
      // But the LLM's propose doesn't change files or scratchpad directly; it only proposes
      // an action to be executed.
      // Therefore, the context in response.json should be identical to the context in
      // request.json, except for the execution.step and execution.action (which are set
      // to what the LLM proposed and the server validated).
    },
    "scratchpad": {
      "read_app_js": true
    },
    "history": [
      { "role": "user", "message": "..." },
      { "role": "assistant", "message": "Reading app entry.", "action": "read-file" },
      { "role": "system", "message": "Read src/app.js (142 lines)" },
      { "role": "assistant", "message": "Reading routes to add health and understand structure.", "action": "read-file", "params": { "path": "src/routes/index.js" } }
      // Note: This assistant message is from the LLM's propose, which is part of the
      // context that the server has added to history? Actually, in the existing flow,
      // the server adds the LLM's propose to the history as an assistant message.
      // We will keep that.
    ]
  },
  "execute": {
    "read-file": {
      "path": "src/routes/index.js"
    }
  }
}
```

Note: The `response.json` does not contain a `result` field because the tool has not been executed yet; the `execute` is what the client should do next.

## 2. Implementation of Scratchpad Operations (apply-scratchpad-ops)

We need to implement the `apply-scratchpad-ops` transform operation in the server (in `a2a-server/src/transform/operations.ts` and `types.ts`).

### Operation details:
- **Name**: `apply-scratchpad-ops`
- **Input**: 
  - `context`: The current context (which includes `scratchpad` as an object).
  - `scratchpad_ops`: An array of operations from the LLM (e.g., `[{ "op": "check", "item": "read_app_js" }, { "op": "add", "item": "health_route_written" }]`).
- **Output**: The updated context with the `scratchpad` modified according to the operations.

### Supported operations:
- `check`: Verifies that an item exists in the scratchpad (does not modify).
- `add`: Adds an item to the scratchpad (sets to true).
- `remove`: Removes an item from the scratchpad (sets to false or deletes).

We will implement this operation and then use it in the transform pipeline for steps that require scratchpad updates.

## 3. RAG Pagination Changes

To address ISSUE 5 (which depends on this), we will update the RAG search action to support pagination.

### Changes:
- **execute.rag-search**: Will include optional `page` and `pageSize` parameters (defaulting to 1 and a reasonable number like 10).
- **result.rag-search**: Will return an object with:
  - `items`: Array of search results (each with `file`, `score`, `snippet`).
  - `total`: Total number of results.
  - `page`: Current page number.
  - `hasMore`: Boolean indicating if there are more results.

This will allow the client to fetch results in pages and avoid overloading the context with too many results at once.

## 4. Update to stepRoutes.js

We will update the context filtering in `a2a-client/vite-plugin-a2a/routes/stepRoutes.js` (around line 230) to ensure that when preparing the context for the LLM prompt, we pass along:
- `task`
- `execution`
- `history` (the filtered history with only system messages for tool results and user/assistant messages for interaction)
- `files` (the working set of file contents)
- `scratchpad` (the current scratchpad state)

This will give the LLM access to the necessary context without overwhelming it with redundant information.

## 5. Documentation and Server Prompt Updates

As noted in the user feedback, these changes will require updates to:
- Documentation in `docs/planning/` directory to reflect the new simulation structure and context strategy
- Server-side prompts (transform schemas) to align with the new context structure and the processing of result into context before LLM consumption

Additionally, as per user feedback, we need to make the prompts dynamic based on the combination of "action" and "step" to control flow and step switching.

Specifically:
- Update documentation in `docs/planning/` to reflect the new simulation format and context strategy
- Review and update server transform schemas in:
  - `a2a-server/src/services/core/request-processor/*/prompts/transforms/`
  - Ensure they produce context structure matching the new format
  - Make the transform schemas dynamic so that the prompt sent to the LLM varies based on the current `action` and `step` in the context, allowing for flow control instructions (e.g., telling the LLM to proceed to a specific next step or to complete)
- Update any references to old context format in the planning documents

## 6. Considerations for Simplicity and Understandability

- We will keep the number of context fields minimal: only `task`, `execution`, `files`, `scratchpad`, and `history`.
- We will ensure that the transformation steps are clear and well-documented in the simulation files.
- We will avoid duplicating information (e.g., not storing full file contents in both `result` and `context.files` at the same time in the server after processing).
- We will make sure that the simulation steps are easy to follow by having clear and concise history messages.

## 7. Review for Contradictions and Optimality

- We have ensured that the changes in this plan address the issues raised in ISSUE 9, 5, 6, and 8.
- The plan does not introduce contradictions because:
  - ISSUE 5 (coder-smart) depends on the RAG pagination changes, which we are including.
  - ISSUE 6 (context optimization) is the foundation of the new context structure we are implementing.
  - ISSUE 8 (agent mode) is supported by making the context available for tool use and by planning to update the client to handle automatic tool execution (though the client-side changes for automatic execution are out of scope for this simulation update, they are noted in ISSUE 8b).
- The plan is optimal because it focuses on reducing the context size by moving large payloads (file contents) to `context.files` and using a scratchpad for state, while keeping the history light.

## Next Steps

After reviewing this plan with the user, we will proceed to implement the changes in the simulation files and the necessary server and client code, as well as update the documentation and server prompts as needed.