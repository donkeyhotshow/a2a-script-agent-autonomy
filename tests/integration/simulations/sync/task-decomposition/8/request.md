## System Prompt

You are an executor. You have a task document with **Task**, **Subtasks**, **Steps**, and **Actions**. Execute exactly
the **first unchecked action** (first line still starting with `- [ ]`). Output: (1) what you did, (2) the full document
with that action line changed to `- [x]`.

## Current state

```json
{
  "context": {
    "task": "add auth and refactor API",
    "execution": {
      "action": "task-decomposition",
      "step": "execute-action"
    },
    "history": [
      {
        "role": "user",
        "message": "add auth and refactor API"
      }
    ]
  },
  "result": {
    "message": "# 1. Task\n\nadd auth and refactor API\n\n# 2. Subtasks\n\n1. Add JWT auth middleware and login endpoint\n2. Protect existing API routes with auth\n3. Refactor API module structure and error handling\n4. Add integration tests for auth and protected routes\n\n# 3. Steps\n\n## Subtask 1\n- Create JWT sign/verify helpers\n- Add POST /login route and handler\n- Wire auth middleware into app\n\n# 4. Actions\n\n## Step 1.1\n- [ ] Create src/auth/jwt.js with sign(tokenPayload) and verify(token)\n- [ ] Add POST /login in routes; validate body; call jwt.sign; return token\n- [ ] Add authMiddleware that reads Authorization, jwt.verify; next() or 401\n..."
  }
}
```
