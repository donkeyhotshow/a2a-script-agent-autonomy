/**
 * Single source of truth: keys stripped from Web DTO `execute` (buildWebExecute).
 * Consumers: sim-lint RECEIVED_EXECUTE_CLIENT_ONLY_KEYS, Vite web-execute-dto.js, SDK web-execute-dto.ts.
 */
export const INTERNAL_CLIENT_ACTION_KEYS = Object.freeze([
    'rag-search',
    'read-file',
    'write-file',
    'script',
    'execute-command',
    'list-directory',
    'grep-search',
    'file-exists',
    'edit-patch',
    'run-script',
]);

export const INTERNAL_CLIENT_ACTION_KEYS_SET = new Set(INTERNAL_CLIENT_ACTION_KEYS);
