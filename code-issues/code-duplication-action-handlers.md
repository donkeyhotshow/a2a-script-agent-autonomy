# Code Duplication: Action Handler Execution Pattern

## Description
Multiple action handlers follow an identical structure for input validation, execution, and error handling. This includes logging the start of execution, validating input (often using `validatePath` or custom validators), executing the core logic in a try-catch block, and returning a standardized success/error response object.

## Impact
This pattern is copy-pasted across handlers, leading to maintenance issues if the structure needs changes (e.g., adding metrics or modifying error responses).

## Files Involved
- `a2a-server/src/actions/handlers/file-operations/read-file.ts` (lines 7-78)
- `a2a-server/src/actions/handlers/file-operations/write-file.ts` (lines 9-101)
- `a2a-server/src/actions/handlers/file-operations/list-directory.ts` (lines 7-96)
- `a2a-server/src/actions/handlers/command-execution.ts` (lines 112-349)

## Duplicated Code Block
```typescript
logger.info('[action] Executing', {...});
try {
    const validation = validateX(input);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }
    // Core logic
    return { success: true, ... };
} catch (error) {
    logger.error('[action] Execution failed', {error: String(error)});
    return { success: false, error: String(error) };
}
```

## Recommendation
Extract a generic `executeAction` wrapper function in a shared utility (e.g., `actions/utils.ts`) that handles validation, logging, and error wrapping.