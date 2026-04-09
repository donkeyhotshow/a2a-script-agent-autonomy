# `orchestrator-dialog/4` — request

Mirror of `request.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "orchestrate ADR review",
    "execution": {
      "action": "orchestrator-dialog",
      "step": "read-adr"
    },
    "history": [
      {
        "role": "user",
        "message": "Read ADR-0027 and tell me how to check documentation consistency across canonical sources."
      },
      {
        "role": "assistant",
        "message": "I will read ADR-0027 to capture the canonical documentation map before recommending audit steps."
      },
      {
        "role": "system",
        "message": "Read docs/adr/ADR-0027-documentation-canonical-sources.md (short summary)."
      }
    ],
    "files": {
      "docs/adr/ADR-0027-documentation-canonical-sources.md": "ADR-0027 canonical map summary: status accepted 2026-03-24, links protocol and simulation docs."
    }
  },
  "result": {
    "read-file": {
      "path": "docs/adr/ADR-0027-documentation-canonical-sources.md",
      "content": "ADR-0027 canonical map summary: status accepted 2026-03-24, links protocol and simulation docs."
    }
  }
}
```
