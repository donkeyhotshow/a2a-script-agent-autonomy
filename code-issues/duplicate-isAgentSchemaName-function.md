Duplicate `isAgentSchemaName` function found in:
- a2a-server/src/services/core/request-processor/agent-spurious-request-normalize.ts
- a2a-server/src/services/core/request-processor/dialog-request-processor.ts

Both files contain identical function implementations:
```typescript
function isAgentSchemaName(schemaName: string): boolean {
  return schemaName.startsWith('agent:');
}
```

This duplication violates DRY principles and should be refactored into a shared utility function.