# Gray Room Clarify Handler Test

## Description
Tests the `clarify` gray room interrupt handler. When the LLM response is incomplete
or ambiguous (e.g., a question back to the user), the gray room orchestrator triggers
the `clarify` interrupt, which surfaces a form asking the user for clarification.

## Steps
1. User sends an ambiguous task: "Analyze the error in the authentication module"
2. LLM response includes a question back (interrupt: clarify)
3. Gray room orchestrator intercepts and triggers `clarify` handler
4. Handler stores clarification question in `workbench.slots.clarify`
5. Response returns a form (`execute.form`) with the clarification prompt

## Expected Behavior
- `execute.form.title` should indicate clarification is needed
- `execute.form.input` should contain a text field for the user's answer
- `context.workbench.slots.clarify.question` should hold the generated question
- `context.workbench.slots.interruptTrace` should include `{ kind: 'sidecar_llm', purpose: 'clarify', ok: true }`
- No direct message answer — only the clarification form is returned

## Gray Room Interrupt Chain
- Triggered by: `interrupt.reason === 'clarify'`
- Handler: `handleClarify()` in `gray-room-interrupt-handlers/clarify.ts`
- Outcome: `continueLoop: false` (dialog handed off to user)
