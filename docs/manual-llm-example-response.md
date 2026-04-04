```json
{
  "step": "analysis_complete",
  "message": "Analysis complete. All ADR-0028 requirements are satisfied.",
  "execute": {
    "form": {
      "title": "✅ ADR-0028 Compliance Verified",
      "description": "All checks passed. The implementation follows the specified architecture decision.",
      "choices": [
        {"id": "continue", "label": "Continue to next task", "type": "action"},
        {"id": "details", "label": "View detailed analysis", "type": "dialog"}
      ]
    }
  },
  "workbench": {
    "sections": {
      "adr0028_compliance": {
        "title": "ADR-0028 Compliance",
        "content": "- ✅ Port allocation: Dynamic with fallback\n- ✅ Health checks: Implemented\n- ✅ Graceful shutdown: Configured\n- ✅ Documentation: Up to date"
      }
    }
  },
  "completed": false
}
```
