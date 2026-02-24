# generate-crud

Generate CRUD operations (controller, routes, views).

## Priority
80

## Triggers
- generate crud
- crud generation
- create crud

## Sub-actions

### 1. generate-crud-scaffold
Scaffold CRUD files for a resource.

**Input:** resourceName, options  
**Output:** createdFiles[]

```typescript
export default async function run(input: { resourceName: string; options?: unknown }): Promise<{ createdFiles: string[] }> {
  return { createdFiles: [] };
}
```
