# Curated cross-system fixtures

**Purpose:** Small, **committed** snapshots that document a specific contract bug or ambiguity between systems. Not a full dump of `proxy_logs` — those stay local or under `../scratch/`.

## Folder shape

```
fixtures/<slug>/
  meta.json      # required — see schema below
  README.md      # short human summary (what broke, fixed or open)
  excerpt.json   # optional — minimal JSON fragment
  excerpt.md     # optional — fenced JSON from body/response
```

## meta.json (required fields)

```json
{
  "id": "<slug>",
  "status": "open|fixed|wontfix",
  "systems": ["ai-integration", "a2a-server", "a2a-client"],
  "symptom": "one line: wrong/missing field or shape",
  "validators": ["scan-promise-bodies"],
  "sourceHint": "optional: promiseId or session path pattern (no secrets)"
}
```

Add a fixture when the same class of error is likely to regress; link it from `tasks/pending/cross-system-parameter-hunt.md`.
