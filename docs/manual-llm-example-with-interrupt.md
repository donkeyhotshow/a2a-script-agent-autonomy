```json
{
  "step": "thinking",
  "message": "I need to think about this task before proceeding.",
  "interrupt": {
    "reason": "thinking",
    "data": {
      "topic": "task_analysis",
      "depth": "quick"
    }
  },
  "workbench": {
    "sections": {
      "thinking": {
        "title": "Thinking Process",
        "content": "Analyzing task requirements..."
      }
    }
  }
}
```

---

## Other Interrupt Examples

### Auto RAG Page
```json
{
  "step": "rag_search",
  "message": "Searching relevant documentation...",
  "interrupt": {
    "reason": "auto_rag_page",
    "data": {
      "query": "ADR-0028 port management",
      "limit": 5
    }
  }
}
```

### Clarify
```json
{
  "step": "clarify",
  "message": "I need more information to proceed.",
  "interrupt": {
    "reason": "clarify",
    "data": {
      "question": "Which specific component should I analyze?",
      "options": ["Client API", "Server", "Proxy"]
    }
  }
}
```

### Compress History
```json
{
  "step": "compress",
  "message": "Compressing conversation history...",
  "interrupt": {
    "reason": "compress_history",
    "when": {
      "historyMaxLength": 50
    }
  }
}
```

### Auto Read File
```json
{
  "step": "read_file",
  "message": "Reading configuration file...",
  "interrupt": {
    "reason": "auto_read_file",
    "data": {
      "filePath": "docs/ADR-0028.md"
    }
  }
}
```
