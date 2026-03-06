# Protocol Workflow

> **Files:** `a2a-server/src/protocol/**/*.ts`, `a2a-client/packages/json/src/`

## Overview

Protocol layer handles message validation, transformation, and conversion between legacy and canonical formats.

## Architecture

```
Incoming Message
    ↓
[Validation] → Zod schemas
    ↓
[Conversion] → legacy-to-canonical.converter.ts
    ↓
[Transformation] → server-transforms
    ↓
[Processing]
```

## When to Edit

| Task | File | Section |
|------|------|---------|
| Add message type | `types.ts` | Interface definition |
| Change validation | `validator.ts` | Zod schema |
| Legacy conversion | `legacy-to-canonical.converter.ts` | Conversion logic |
| Server transforms | `templates/ai-action-transforms/` | Transform JSON |

## Core Flow: Message Processing

```typescript
// 1. Parse raw input
const parsed = JSON.parse(rawMessage);

// 2. Validate format
const validated = messageSchema.parse(parsed);

// 3. Check for legacy format
if (isLegacyFormat(validated)) {
  validated = convertToCanonical(validated);
}

// 4. Apply transforms
const transformed = applyTransforms(validated, 'request');

// 5. Process
processMessage(transformed);
```

## Adding New Message Type

```typescript
// 1. Add to types.ts
interface NewMessageType {
  type: 'new_type';
  payload: {
    field1: string;
    field2: number;
  };
}

// 2. Add Zod schema to validator.ts
const newMessageSchema = z.object({
  type: z.literal('new_type'),
  payload: z.object({
    field1: z.string(),
    field2: z.number()
  })
});

// 3. Add to union type
const messageSchema = z.union([
  existingSchema,
  newMessageSchema
]);
```

## Canonical Format (AGENTS.md)

All AI-action responses must use this format:

```json
{
  "step": "step_name",
  "message": "user-visible explanation",
  "execute": {
    "<action_type>": { ...params }
  },
  "completed": false
}
```

## Transform Templates

Location: `templates/ai-action-transforms/`

- `server-transforms-request.json` - Preprocessing
- `server-transforms-response.json` - Postprocessing

### Example Transform

```json
{
  "operation": "copy",
  "from": "context.project",
  "to": "output.project"
}
```

## Testing

```bash
# Validate all simulations
npm run sim:validate

# Test protocol layer
npm run test:protocol

# Test specific transform
npm run test:transforms
```

## Common Patterns

### Detecting Legacy Format

```typescript
function isLegacyFormat(context: unknown): boolean {
  const ctx = context as Record<string, unknown>;
  return (
    ctx.subActions !== undefined ||
    ctx.executingAction !== undefined ||
    ctx.dslScript !== undefined
  );
}
```

### Safe Property Access

```typescript
// Use type guards
if (hasProperty(context, 'history') && Array.isArray(context.history)) {
  // Safe to use context.history
}
```
