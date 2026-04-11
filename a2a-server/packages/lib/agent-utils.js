/**
 * Utility functions for agent-related operations
 */
/**
 * Check if a schema name represents an agent schema
 */
export function isAgentSchemaName(schemaName) {
    return schemaName === 'agent' || schemaName.startsWith('agent-') || schemaName.includes('agent');
}
/**
 * Get the last assistant message from context
 */
export function lastAssistantMessageFromContext(ctx) {
    const history = ctx.history;
    if (!Array.isArray(history) || history.length === 0) {
        return undefined;
    }
    // Find the last assistant message
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg && typeof msg === 'object' && msg.role === 'assistant') {
            return msg.content;
        }
    }
    return undefined;
}
//# sourceMappingURL=agent-utils.js.map