export const CHAINABLE_CLIENT_TOOLS = new Set([
    'rag-search',
    'read-file',
    'list-directory',
    'grep-search',
    'file-exists',
    'write-file',
    'execute-command',
    'run-script',
    'edit-patch',
]);

/** Allowed next to a single tool key (same object as `list-directory`, etc.) — see agent-request.md / dialog-request.md */
const EXECUTE_AUX_KEYS = new Set(['message', 'completed']);

export function getValidatedToolKey(ex) {
    if (!ex || typeof ex !== 'object' || Array.isArray(ex)) {
        return null;
    }
    const keys = Object.keys(ex);
    const toolKeys = keys.filter((k) => !EXECUTE_AUX_KEYS.has(k));
    if (toolKeys.length !== 1) {
        return null;
    }
    const toolKey = toolKeys[0];
    if (!CHAINABLE_CLIENT_TOOLS.has(toolKey)) {
        return null;
    }

    if (toolKey === 'rag-search') {
        const ragPayload = ex['rag-search'];
        if (!ragPayload || typeof ragPayload.query !== 'string' || !ragPayload.query.trim()) {
            return null;
        }
    }

    if (toolKey === 'execute-command') {
        const cp = ex['execute-command'];
        if (!cp || typeof cp.command !== 'string' || !cp.command.trim()) {
            return null;
        }
    }

    if (toolKey === 'run-script') {
        const rs = ex['run-script'];
        if (!rs || typeof rs.scriptId !== 'string' || !rs.scriptId.trim()) {
            return null;
        }
    }

    if (toolKey === 'edit-patch') {
        const ep = ex['edit-patch'];
        if (
            !ep ||
            typeof ep.path !== 'string' ||
            !Array.isArray(ep.operations) ||
            ep.operations.length === 0
        ) {
            return null;
        }
    }

    return toolKey;
}
