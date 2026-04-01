# Step 4 — request (after `result.script` from detect)

LLM markdown snapshot for prompt pipeline coverage: client returned `broken_imports`; server advances to resolve-phase `execute.script`.

```json
{
  "context": {
    "task": "Script central E2E (sync/script): router → scope form → script×3 ↔ client → run-script → gate → command → summary → follow-up.",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-detect"
    },
    "history": [
      { "role": "user", "message": "Scope: fix-vue-imports on app/Example.vue" },
      { "role": "system", "message": "script vue-import-detect: one broken import" },
      { "role": "assistant", "message": "script vue-import-resolve: proposed patch ./Missing to @/components/Missing" }
    ],
    "workbench": {
      "sections": {
        "vueImportFix": {
          "broken_imports": [
            { "file": "app/Example.vue", "line": 2, "specifier": "./Missing" }
          ],
          "patches": [
            { "file": "app/Example.vue", "line": 2, "from": "./Missing", "to": "@/components/Missing" }
          ]
        }
      }
    }
  },
  "result": {
    "script": {
      "broken_imports": [
        { "file": "app/Example.vue", "line": 2, "specifier": "./Missing" }
      ]
    }
  }
}
```
