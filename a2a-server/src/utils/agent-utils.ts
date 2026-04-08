function isAgentSchemaName(schemaName: string): boolean {
    return schemaName === 'agent' || schemaName.startsWith('agent-');
}

function lastAssistantMessageFromContext(context: Record<string, unknown> | undefined): string | undefined {
    const h = context?.['history'];
    if (!Array.isArray(h)) {
        return undefined;
    }
    for (let i = h.length - 1; i >= 0; i--) {
        const row = h[i];
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            continue;
        }
        const r = row as Record<string, unknown>;
        if (r['role'] === 'assistant' && typeof r['message'] === 'string' && r['message'].trim()) {
            return r['message'].trim();
        }
    }
    return undefined;
}

export {isAgentSchemaName, lastAssistantMessageFromContext};