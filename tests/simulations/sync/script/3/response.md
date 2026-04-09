# Step 3 — response (vue-import-detect execute.script)

Mirror of response.json.

```json
{
  "context": {
    "task": "Script central E2E (sync/script): router → scope form → script×3 ↔ client → run-script → gate → command → summary → follow-up.",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-detect"
    },
    "workbench": {
      "sections": {}
    }
  },
  "execute": {
    "script": {
      "input": {
        "rootDir": "."
      },
      "output": "broken_imports[]",
      "code": "return { broken_imports: [{ file: 'app/Example.vue', line: 2, specifier: './Missing' }] };"
    }
  }
}
```
