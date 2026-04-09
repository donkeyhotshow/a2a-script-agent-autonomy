# script-agent-dialog — auto script run after import errors

Simulate the dialog pipeline catching an assistant call-out for a Vue import failure and firing the fix-vue-imports script automatically. The conversation then continues after the script reports success.

## Steps

1. Router presents the dialog option that watches for error comments.
2. The user mentions the missing module while chatting with the assistant.
3. The assistant replies "Ошибка импорта..." and the server launches `run-script` for `fix-vue-imports`.
4. The script result appears and the assistant informs the user that the auto fix ran before the dialog continues.
5. The client sends a follow-up instruction with the next task after the import fix.
6. The server echoes the updated plan so the dialog can continue with the new directive.
7. The user asks for a vitest run once Example.spec is ready.
8. The server runs the packaged vitest script, reports success, and signals that work can continue.

## Fixture scope (16 steps)

The checked-in golden files extend the story with more turns (test suggestions, adding tests, refactoring prompt, wrap-up). Steps 1–8 above are the narrative spine; steps 9–16 are additional dialog beats for regression coverage. `execution.step` values in the fixture are illustrative, not a normative state machine spec.
