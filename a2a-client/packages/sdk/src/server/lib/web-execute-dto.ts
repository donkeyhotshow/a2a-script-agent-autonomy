/**
 * Web UI execute DTO (SDK parity with vite-plugin-a2a web-execute-dto.js).
 */

const INTERNAL_CLIENT_ACTION_KEYS = new Set([
    'rag-search',
    'read-file',
    'write-file',
    'script',
    'execute-command',
]);

function collectReadFileEntries(readFilePayload: unknown): Array<{ path: string }> {
    const out: Array<{ path: string }> = [];
    if (!readFilePayload || typeof readFilePayload !== 'object' || Array.isArray(readFilePayload)) {
        return out;
    }
    const rf = readFilePayload as Record<string, unknown>;
    const p = rf.path;
    if (typeof p === 'string' && p.trim()) out.push({ path: p.trim() });
    const paths = rf.paths;
    if (Array.isArray(paths)) {
        for (const x of paths) {
            if (typeof x === 'string' && x.trim()) out.push({ path: x.trim() });
            else if (x && typeof x === 'object' && typeof (x as { path?: string }).path === 'string') {
                const px = (x as { path: string }).path.trim();
                if (px) out.push({ path: px });
            }
        }
    }
    return out;
}

/** Strip client-only execute keys; add message / attachments for the web UI. */
export function buildWebExecute(execute: unknown): Record<string, unknown> | null {
    if (execute == null) return null;
    if (typeof execute !== 'object' || Array.isArray(execute)) return null;

    const raw = execute as Record<string, unknown>;
    const ex: Record<string, unknown> = { ...raw };

    const rag = raw['rag-search'];
    const hadRag = rag && typeof rag === 'object';
    const ragQuery =
        hadRag && typeof (rag as { query?: string }).query === 'string'
            ? (rag as { query: string }).query.trim()
            : '';

    const readFiles = collectReadFileEntries(raw['read-file']);
    const writePayload = raw['write-file'];
    const writePath =
        writePayload && typeof writePayload === 'object' && !Array.isArray(writePayload)
            ? String((writePayload as { path?: string }).path || '').trim()
            : '';
    const hadWrite = Boolean(writePath);
    const hadScript = Boolean(raw.script);
    const cmdPayload = raw['execute-command'];
    const hadCmd = Boolean(cmdPayload && typeof cmdPayload === 'object');
    const shellCommand =
        hadCmd && typeof (cmdPayload as { command?: string }).command === 'string'
            ? (cmdPayload as { command: string }).command.trim()
            : '';

    for (const k of INTERNAL_CLIENT_ACTION_KEYS) {
        delete ex[k];
    }
    delete ex.debug;

    const attachments: Record<string, unknown> = {};
    if (readFiles.length) attachments.readFiles = readFiles;
    if (hadRag && ragQuery) attachments.ragQuery = ragQuery;
    if (hadWrite) attachments.writtenFiles = [{ path: writePath }];
    if (hadScript) attachments.pendingClientAction = 'script';
    if (hadCmd) attachments.pendingClientAction = 'execute-command';
    if (shellCommand) attachments.shellCommand = shellCommand;

    const priorAttach =
        raw.attachments && typeof raw.attachments === 'object' && !Array.isArray(raw.attachments)
            ? (raw.attachments as Record<string, unknown>)
            : {};
    if (Object.keys(attachments).length) {
        ex.attachments = { ...priorAttach, ...attachments };
    } else if (Object.keys(priorAttach).length) {
        ex.attachments = { ...priorAttach };
    }

    const hasForm = ex.form && typeof ex.form === 'object';
    const msg = ex.message;
    const hasMessage =
        msg !== undefined &&
        msg !== null &&
        (typeof msg === 'string'
            ? msg.trim().length > 0
            : typeof msg === 'object');

    if (!hasForm && !hasMessage) {
        const parts: string[] = [];
        if (hadRag) parts.push('Searching the codebase');
        if (readFiles.length) parts.push('Reading files');
        if (hadWrite) parts.push('Updating files');
        if (hadScript) parts.push('Running script');
        if (hadCmd) parts.push('Running command');
        ex.message = parts.length ? `${parts.join(' · ')}…` : 'Working…';
    }

    return ex;
}

/** Apply buildWebExecute to execute-shaped fields on an API payload. */
export function sanitizeApiRecordExecuteFields<T extends Record<string, unknown>>(payload: T): T {
    const out = { ...payload } as Record<string, unknown>;
    if (out.execute !== undefined) {
        out.execute = buildWebExecute(out.execute);
    }
    if (out.currentExecute !== undefined) {
        out.currentExecute = buildWebExecute(out.currentExecute);
    }
    return out as T;
}
