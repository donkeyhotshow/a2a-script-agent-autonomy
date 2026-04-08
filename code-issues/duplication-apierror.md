# Code Duplication: ApiError Class

## Description
The `ApiError` class is defined identically in two files within the a2a-client/packages/sdk package.

## Files Involved
- `a2a-client/packages/sdk/src/index.ts` (lines 25-35)
- `a2a-client/packages/sdk/src/session-manager.ts` (lines 96-105)

## Code Snippet
```typescript
export class ApiError extends Error {
    status: number;
    data: Record<string, unknown>;

    constructor(message: string, status: number, data: Record<string, unknown> = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}
```

## Recommendation
Extract the `ApiError` class into a shared module or use a single definition.