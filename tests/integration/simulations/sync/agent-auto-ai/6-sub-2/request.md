Compress the following conversation history into 3-5 key facts.
Return a JSON array of {"role": "system", "message": "..."} entries.
Keep: task goal, key decisions, current state. Drop: tool call details already in scratchpad/files.
Respond with ONLY the JSON array, no prose.

History:
[{"role":"user","message":"Add GET /health returning JSON { ok: true }; wire the route in src/app.js."},{"role":"assistant","step":"inspect_structure","message":"Running paginated RAG to find the Express entrypoint."},{"role":"system","message":"RAG: src/app.js (page 1, pageSize 10, total 1, hasMore false)"},{"role":"assistant","step":"read_code","message":"Listing src/ to confirm layout before reading app.js."},{"role":"system","message":"Listed src/: app.js, routes/"},{"role":"assistant","step":"read_code","message":"Reading src/app.js to see how to mount a new route."},{"role":"system","message":"Read src/app.js (3 lines)"},{"role":"assistant","step":"edit_code","message":"Creating src/routes/health.js and will mount it next turn."}]
