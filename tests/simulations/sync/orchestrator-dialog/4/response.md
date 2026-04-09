# `orchestrator-dialog/4` — copy of `response.json` for drift checks

**Not model output.** Fixture mirror only (`sim:check-md`).

```json
{
  "context": {
    "task": "orchestrate ADR review",
    "workbench": {
      "sections": {}
    },
    "execution": {
      "action": "orchestrator-dialog",
      "step": "plan-summary"
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
      },
      {
        "role": "assistant",
        "message": "Plan: cross-check AGENTS, PROTOCOL, and simulations docs for duplicated tables and note missing links."
      }
    ],
    "files": {
      "docs/adr/ADR-0027-documentation-canonical-sources.md": "ADR-0027 canonical map summary: status accepted 2026-03-24, links protocol and simulation docs."
    }
  },
  "execute": {
    "message": "Plan: cross-check AGENTS, PROTOCOL, and simulations docs for duplicated tables and note missing links."
  }
}
```
