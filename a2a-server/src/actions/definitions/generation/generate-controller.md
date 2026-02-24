# generate-controller

Generate controller with actions.

## Priority
80

## Triggers
- generate controller
- controller generation
- create controller

## Sub-actions

### 1. generate-controller-create
Create controller file with stub actions.

**Input:** controllerName, actions[]  
**Output:** filePath

```typescript
export default async function run(input: { controllerName: string; actions?: string[] }): Promise<{ filePath: string }> {
  return { filePath: '' };
}
```
