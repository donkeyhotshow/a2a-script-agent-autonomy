# Server Transform: response.md → response.json (step 7)

**Input:** LLM response with action "completed".

**Steps:**

1. Build response.json: context, history with assistant reply, result.completed = true, result.message = summary
2. Optionally execute.form to allow further messages
3. Return to client.

---

**Output:** response.json with completed: true and optional form.
