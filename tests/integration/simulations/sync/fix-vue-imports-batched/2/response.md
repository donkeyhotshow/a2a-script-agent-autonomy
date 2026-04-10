# `fix-vue-imports-batched/2` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports-batched",
      "step": "request-files-to-fix"
    },
    "vite_config": {
      "file": "vite.config.js"
    },
    "aliases": {
      "@": "resources/js",
      "~": "resources"
    }
  },
  "execute": {
    "script": {
      "input": {
        "rootDir": ".",
        "filePattern": "**/*.vue"
      },
      "output": "broken_imports_count",
      "code": "const { readdirSync, readFileSync, existsSync } = require('node:fs');\nconst { join, dirname, resolve } = require('node:path');\n\nconst IMPORT_RE = /(?:from\\s+|require\\s*\\(\\s*)[''\"]([^''\"]+)[''\"]/g;\n\nfunction collectFiles(dir, exts) {\n  const files = [];\n  function scan(d) {\n    readdirSync(d, { withFileTypes: true }).forEach(e => {\n      const p = join(d, e.name);\n      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') scan(p);\n      else if (e.isFile() && exts.some(ext => e.name.endsWith(ext))) files.push(p);\n    });\n  }\n  scan(dir);\n  return files;\n}\n\nfunction stripQuery(s) { return s.split('?')[0]; }\nfunction exists(p) {\n  return ['', '.js', '.ts', '.jsx', '.tsx', '.vue', '/index.js', '/index.ts'].some(e => existsSync(p + e));\n}\n\nconst root = resolve(input.rootDir || '.');\nconst brokenFiles = new Set();\nconst files = collectFiles(root, ['.ts', '.tsx', '.vue']);\n\nfor (const file of files) {\n  const lines = readFileSync(file, 'utf-8').split('\\n');\n  for (const line of lines) {\n    IMPORT_RE.lastIndex = 0;\n    let m;\n    while ((m = IMPORT_RE.exec(line)) !== null) {\n      const spec = stripQuery(m[1] || '');\n      if (spec.startsWith('.') && !exists(resolve(dirname(file), spec))) {\n        brokenFiles.add(file);\n        break;\n      }\n    }\n  }\n}\n\nreturn { broken_imports_count: brokenFiles.size, files_to_fix: Array.from(brokenFiles) };"
    }
  }
}
```
