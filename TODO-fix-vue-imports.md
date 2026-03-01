# Fix for simulations/fix-vue-imports-batched - Invalid Action Names

## Problem
The execute block uses invalid action names that are not in SCHEMA.md's valid list.

## Valid Actions (from SCHEMA.md):
- `read-file` - read file contents
- `write-file` - write file contents  
- `rag-search` - search code
- `form` - show form
- `script` - execute script
- `execute-command` - run command

## Invalid → Valid Mapping:
- `search-vite-file` → `rag-search`
- `request-vite-file` → `read-file`
- `request-files-to-fix` → `rag-search` or `script`
- `search-exporter` → `rag-search`
- `apply-fix` → `script`
- `vue-import-cleanup` → `execute-command` or `script`

## Files to Fix:
- [ ] 1/response.json - action definitions (fix-vue-imports-batched steps)
- [ ] 2/response.json - search-vite-file → rag-search
- [ ] 3/response.json - request-vite-file → read-file
- [ ] 4/response.json - request-files-to-fix → rag-search
- [ ] 5/response.json - search-exporter → rag-search
- [ ] 6/response.json - search-exporter → rag-search
- [ ] 7/response.json - search-exporter → rag-search
- [ ] 8/response.json - vue-import-cleanup → execute-command

## Fix Status:
