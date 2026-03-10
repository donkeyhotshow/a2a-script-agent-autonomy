# Message Input Conditional Rendering

## Problem

The message input container was appearing automatically on every response, regardless of whether the server requested it. According to the A2A protocol, the input field should only appear when the server explicitly sends `execute.form.input`.

## Expected Flow

```
1. User sends task
   ↓
2. Server returns execute.form.choices (list of options)
   ↓
3. UI shows choice buttons ONLY (no input field)
   ↓
4. User selects choice
   ↓
5. Server returns execute.form.input (text input requested)
   ↓
6. UI shows input field for user message
```

## Solution

Rather than trying to show or hide an input field from within the TaskFlow renderer, we now render only message history, choice buttons, execution metadata, and debug information. No input area is injected by `a2a-client/web/js/task-flow/render.js` (and `getInputAreaHtml` has been removed), so the TaskFlow panel never adds a text box on every response. When the server needs user input it should present `execute.form.choices` (which still render as buttons) or rely on the broader session UI/simulations to collect typed messages.

## Protocol Reference

From `simulations/SCHEMA.md`:

**First response with choices:**
```json
{
  "execute": {
    "form": {
      "title": "Select execution method",
      "choices": [
        { "id": "dialog", "label": "AI Dialog" },
        { "id": "auto-ai", "label": "Auto AI" }
      ]
    }
  }
}
```

**Response requesting input:**
```json
{
  "execute": {
    "form": {
      "input": [
        { "name": "message", "type": "text", "label": "Message", "required": true }
      ]
    }
  }
}
```

## Files Changed

- `a2a-client/web/js/task-flow/render.js` - Removed input-area rendering and handler exports so the renderer only shows history, choices, and status blocks
- `a2a-client/web/js/task-flow/core.js` - Dropped references to `getInputAreaHtml` and no longer monkey-patches a waiting indicator inside the removed input block
- `a2a-client/web/js/app/windows/window-events.js` - Removed the session header and `.session-info` markup so waiting states only show history and a short status line
- `a2a-client/web/css/components/task-flow.css` - Deleted the `.task-flow-input-area`/input/button styles
- `a2a-client/web/css/components/session-window.css` - Removed the unused `.session-info`, `.session-id`, and `.session-status` rules because the header markup is gone

## Testing

1. Start a new task
2. Verify first response shows choice buttons without input field
3. Select a dialog option
4. Verify input field appears for subsequent messages

## Legacy UI removals

- The old `ai-actions` panel and overlay have been deleted, so no extra container or CSS is loaded on the client side; only the simplified TaskFlow history/panel UI remains.
- `message-input-section` (the standalone header input) has also been removed along with `message-input.css`, so any automation that previously worked through `#messageInput` should now interact via the TaskFlow panel instead.
