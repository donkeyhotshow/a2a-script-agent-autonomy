# Agent - Auto-AI v2 Flow

Поглощает симуляцию `auto-ai-v2`.

## Тип: Unified Agent (Advanced)

Это полный цикл Agent с advanced features.

## Особенности (Advanced Features)

- `context.scratchpad` — флаги состояния (boolean flags)
- `context.files` — working set (полный текст файлов)
- RAG pagination (page, pageSize, hasMore)
- Server interrupt loop (дополнительные LLM turns)

## Опис

User: "Add GET /health returning { ok: true } and wire it in src/app.js"

## Потік

| Крок | step | action | Особенности |
|------|------|--------|-------------|
| 1 | router | form | |
| 2 | request | form | |
| 3 | plan | rag-search | scratchpad_ops: add flags |
| 4 | analyze | list-directory | scratchpad_ops: update |
| 5 | analyze | read-file | context.files: full text |
| 6 | execute | write-file | |
| 6-sub1... | interrupt | | interrupt loop |
| 7 | review | execute-command | |
| 8 | completed | | |

## scratchpad пример

```json
{
  "scratchpad": {
    "has_rag_results": true,
    "files_listed": true,
    "file_analyzed": "src/app.js",
    "route_created": true,
    "pending_wire": true
  }
}
```

Server transforms применяют `scratchpad_ops`:
- `{"op": "add", "key": "has_rag_results", "value": true}`
- `{"op": "remove", "key": "pending_rag"}`
