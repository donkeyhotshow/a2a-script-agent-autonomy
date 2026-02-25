# generate-controller

Generate controller with actions. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [4-code-generation](../../../../docs/use-cases/auto-ai/4-code-generation.md).

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

### 2. generate-controller-routes
Register REST routes for controller.

**Input:** filePath, controllerName, actions[]  
**Output:** routesRegistered

```typescript
export default async function run(input: { filePath: string; controllerName: string; actions?: string[] }): Promise<{ routesRegistered: string[] }> {
  return { routesRegistered: [] };
}
```
