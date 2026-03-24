# Specific Actions for Updating Auto-AI Simulation

## 1. Simulation Step Files Updates (steps 3-15)
For each step directory (3/ through 15/) in simulations/auto-ai/:
- Update request.json:
  - Remove "result" field from the context
  - Add "files" object with previously read file contents
  - Add "scratchpad" object with boolean flags for completed actions
  - Keep "history" with user/assistant messages and add system messages for tool results
  - Keep "task" and "execution" (with current step)
- Update response.json:
  - Keep "context" with updated execution step (based on LLM's propose)
  - Keep "files" and "scratchpad" identical to request.json (no changes from LLM's propose)
  - Update "history" to include the LLM's propose as an assistant message
  - Add "execute" field with the action proposed by LLM and validated by server
  - Do NOT include "result" field

## 2. Implement Scratchpad Operations (apply-scratchpad-ops)
- In a2a-server/src/transform/operations.ts:
  - Add new operation class ApplyScratchpadOpsOperation
  - Implement apply method to process scratchpad_ops array and update context.scratchpad
- In a2a-server/src/transform/types.ts:
  - Add ApplyScratchpadOpsOperation to the Union type
  - Define the interface for ApplyScratchpadOpsOperation
- Supported operations: check, add, remove

## 3. RAG Pagination Changes
- In a2a-client/packages/rag/src/protocol-rag-search.ts:
  - Add page and pageSize parameters to RagSearchProtocolParams
  - Add total, page, hasMore to RagSearchProtocolResult
- Update execute.rag-search schema to include optional page and pageSize
- Update result.rag-search schema to return paginated results

## 4. Update stepRoutes.js
- In a2a-client/vite-plugin-a2a/routes/stepRoutes.js (around line 230):
  - Modify context filtering to pass: task, execution, history, files, scratchpad
  - Ensure history includes both system messages (for tool results) and user/assistant messages (for interactions)
  - Ensure files contains the working set of file contents
  - Ensure scratchpad contains current state

## 5. Documentation and Server Prompt Updates
- Update documentation in `a2a-server/docs/planning/` to reflect new simulation structure
- Review and update server transform schemas in:
  - a2a-server/src/services/core/request-processor/*/prompts/transforms/
  - Ensure they produce context structure matching the new format
- Update any references to old context format in planning documents

## 6. Verification Steps
- Run existing simulations to ensure they still work with updated format
- Verify that context size is reduced by checking that large file contents are not in history
- Confirm that LLM input (request.json) does not contain result field
- Validate that scratchpad operations work correctly
- Test RAG pagination with large result sets