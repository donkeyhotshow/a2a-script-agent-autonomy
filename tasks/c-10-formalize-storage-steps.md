# C-10: Formalize Storage Step Requirements

## Problem
Need to formalize requirements for step storage in `a2a-client/storage/sessions/*`: ensure correspondence between `response.json` and `received.json`, and document reasons for incomplete pipeline in simulations.

## Solution
1. Define required files per step: client-result.json, request-to-server.json, server-response.json, messages.json
2. Define optional files: server-promise.json (only during async processing)
3. Document validation rules for step completeness
4. Add documentation to SESSION-STORAGE.md

## Where
- File: `a2a-client/docs/SESSION-STORAGE.md`
- Validation: `a2a-client/vite-plugin-a2a/storage/newSessions.js`

## Implementation
In SESSION-STORAGE.md, add section:
```markdown
## Step Storage Requirements

Each step directory must contain:
- `client-result.json` - User input/choice (required)
- `request-to-server.json` - Request sent to A2A Server (required)  
- `server-response.json` - Server response (required for step completion)
- `messages.json` - Conversation history (required)
- `server-promise.json` - Async promise status (optional, removed after response)

A step is considered complete when server-response.json exists.
```

## Verification
```bash
# Check existing sessions
find a2a-client/storage/sessions -name "server-response.json" | head -5