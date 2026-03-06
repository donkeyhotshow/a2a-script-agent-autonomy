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

Modified `a2a-client/web/js/task-flow.js` to conditionally render input based on server response:

### renderForm function

- **Before**: Always rendered input area at bottom
- **After**: Only renders input when `form.input` array exists and has items

```javascript
function renderForm(contentEl, form, ...) {
    const hasChoices = form?.choices?.length > 0;
    const hasInput = form?.input?.length > 0;

    // Only show input area if server sent form.input
    let inputAreaHtml = '';
    if (hasInput) {
        // ... render inputs ...
        inputAreaHtml = getInputAreaHtml();
    }
    // ...
}
```

### Other render functions

Removed input area from:
- `renderMessage` - shows message with Continue button only
- `renderClientAction` - shows action status only
- `renderDebug` - shows debug data only
- `setPanelContent` (loading states) - shows status only

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

- `a2a-client/web/js/task-flow.js` - Conditional input rendering

## Testing

1. Start a new task
2. Verify first response shows choice buttons without input field
3. Select a dialog option
4. Verify input field appears for subsequent messages
