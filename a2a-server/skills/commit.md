---
name: commit
description: Create clean, well-structured git commits with proper messages
---

# Commit Skill

## When to use
Use when the user asks to commit changes, create a git commit, or finalize a change.

## Workflow

1. **Stage selectively** — Only stage files relevant to the current change. Never `git add -A` blindly.
2. **Review what's staged** — Run `git diff --staged` to verify exactly what will be committed.
3. **Write a good message** — Follow Conventional Commits format:
   ```
   <type>(<scope>): <short description>

   [optional body explaining WHY, not what]

   [optional footer: Breaking Change, closes #issue]
   ```
4. **Commit with `--no-verify` only if justified** — Never bypass hooks without understanding why they're failing.

## Commit types

| Type       | When to use |
|-----------|-------------|
| `feat`    | New feature or capability |
| `fix`     | Bug fix |
| `refactor`| Code restructure without behavior change |
| `test`    | Adding or updating tests |
| `docs`    | Documentation changes only |
| `chore`   | Build, config, dependency updates |
| `perf`    | Performance improvement |

## Examples

```
feat(gray-room): add skills registry for on-demand knowledge injection

fix(execute-security): block writes to .env and node_modules paths

refactor(coordinator): add TaskNotification XML contract for inter-agent comms
```

## Key principles

- Commits should be **atomic** — one logical change per commit
- Message subject line: **max 72 characters**, imperative mood ("Add" not "Added")
- If the diff is large, consider splitting into multiple commits
- Run tests before committing
