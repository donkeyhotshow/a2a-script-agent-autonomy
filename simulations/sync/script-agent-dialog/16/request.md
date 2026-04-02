# Step 16 — request (User provides commit message)

User provides commit message.

```json
{
  "context": { "execution": { "action": "dialog", "step": "commit" } },
  "result": { "message": "fix: resolve import error and add comprehensive tests..." }
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