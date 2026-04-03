# Step 16 — request (User provides commit message)

User provides commit message.

```json
{
  "context": {
    "execution": {
      "action": "dialog",
      "step": "commit"
    }
  },
  "result": {
    "message": "fix: resolve import error and add comprehensive tests\n\n- Auto-fix Vue imports in Example.vue\n- Add 9 tests with 85% coverage\n- Cover props, empty state, loading, error, events, slots"
  }
}
```

## System Prompt

The user has provided a commit message. Commit the changes.

## Response Format

```json
{
  "result": { "completed": true }
}
```