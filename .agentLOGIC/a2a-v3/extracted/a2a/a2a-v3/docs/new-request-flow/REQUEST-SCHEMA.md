# Canonical `request.md` schema for AI-Actions

This document describes the deterministic layout that every AI-Action prompt must follow so that the server and simulations stay in sync.

## Section order

1. **System Prompt** – The narrative that defines the assistant’s role, the toolkit it can use, and any workflow expectations. Each AI-Action has its own narrative inside `a2a-server/prompts/<action>-request.md`.
2. **Response Format** – A language-agnostic JSON skeleton that explicitly names the allowed actions and shows which parameters to populate. The template includes a literal code block (` ```json ... ``` `) so the LLM always sees the same schema.
3. **Current State** – A code block containing a JSON snapshot whose shape is fixed across all actions:
   ```json
   {
     "context": { ... },
     "result": { ... },
     "workbench": ...,
     "ragResults": ...
   }
   ```
   - `context` reproduces `context.task`, `context.execution`, and `context.history`.
   - `result` echoes the previous step, e.g. the latest assistant message or action.
   - `workbench` and `ragResults` stay `null` when absent; the templates render them as stable JSON values.
4. **Constraints** – Bullet points that remind the model to emit well-formed JSON, follow the action-key shape, and honor the allowable toolset.

## Template usage

- Templates live in `a2a-server/prompts/`:
  - `dialog-request.md`
  - `coder-request.md`
  - `auto-ai-request.md`
  - `analyze-request.md`
- Every server transform pipeline that renders an AI-Action prompt now references the corresponding template via `templateRef`.
- The rendering pipeline feeds the `context`, `result`, `workbench`, `flowControlHint`, and `ragResults` (alongside any extra metadata) as the `data` parameter so that `${...}` placeholders can substitute the current state.

## Normalization for replay

- JSON blocks are stringified with sorted keys and two-space indentation to guarantee deterministic output.
- Line endings are normalized to `\n`.
- The tests in `a2a-server/tests/request-template.test.ts` compare the generated markdown against canonical samples (e.g., `simulations/dialog/3/request.md`) to detect drift.

## Recipe for add/new actions

1. Add a template under `a2a-server/prompts/` with the four sections described above.
2. Update the relevant `simulations/<action>/*/server-transforms-request.json` files to point `templateRef` to the new template.
3. Optionally regenerate a sample `simulations/<action>/<step>/request.md` by running the transform pipeline and archive the approved output for replay tests.
4. Add or update documentation and tests so the new action always produces the same canonical prompt.
