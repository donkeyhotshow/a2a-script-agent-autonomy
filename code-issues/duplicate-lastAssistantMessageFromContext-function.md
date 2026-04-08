Duplicate `lastAssistantMessageFromContext` function found in:
- a2a-server/src/services/core/request-processor/agent-spurious-request-normalize.ts
- a2a-server/src/services/core/request-processor/dialog-request-processor.ts

Both files contain identical function implementations:
```typescript
function lastAssistantMessageFromContext(context: Record<string, unknown> | undefined): string | undefined {
  if (!context?.messages) return undefined;
  
  for (let i = context.messages.length - 1; i >= 0; i--) {
    const message = context.messages[i];
    if (message.role === 'assistant') {
      return message.content;
    }
  }
  
  return undefined;
}
```

This duplication violates DRY principles and should be refactored into a shared utility function.