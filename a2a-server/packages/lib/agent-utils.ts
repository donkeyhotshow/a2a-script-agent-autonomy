/**
 * Utility functions for agent-related operations
 */

/**
 * Check if a schema name represents an agent schema
 */
export function isAgentSchemaName(schemaName: string): boolean {
    return schemaName === 'agent' || schemaName.startsWith('agent-') || schemaName.includes('agent');
}

/**
 * Get the last assistant message from context
 */
export function lastAssistantMessageFromContext(ctx: Record<string, unknown>): string | undefined {
    const history = ctx.history as unknown[];
    if (!Array.isArray(history) || history.length === 0) {
        return undefined;
    }

    // Find the last assistant message
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i] as Record<string, unknown>;
        if (msg && typeof msg === 'object' && msg.role === 'assistant') {
            return msg.content as string;
        }
    }

    return undefined;
}