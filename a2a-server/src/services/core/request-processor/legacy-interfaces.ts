// Legacy interfaces — kept for backward compatibility
// Do not use in new code; subject to removal in future versions

export interface ActionRequest {
    sessionId: string;
    actionType: string;
    context: Record<string, unknown>;
    codeBlocks: unknown;
    message?: string;
}