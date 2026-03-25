/**
 * Web UI execute DTO: drop client-only action payloads (rag-search, read-file, …)
 * and surface user-facing fields: message, optional llmMessage, attachments.
 */

import {INTERNAL_CLIENT_ACTION_KEYS} from '../../../../shared/internal-client-action-keys.mjs';

const INTERNAL_CLIENT_ACTION_KEYS_SET = new Set(INTERNAL_CLIENT_ACTION_KEYS);

/**
 * @param {unknown} execute - raw execute from A2A / step record
 * @returns {Record<string, unknown>|null}
 */
export function buildWebExecute(execute) {
    if (execute == null) return null;
    if (typeof execute !== 'object' || Array.isArray(execute)) {
        return null;
    }

    const raw = execute;
    const ex = { ...raw };

    const hadRag = raw['rag-search'] && typeof raw['rag-search'] === 'object';
    const ragQuery =
        hadRag && typeof raw['rag-search'].query === 'string' ? raw['rag-search'].query.trim() : '';

    const readFiles = collectReadFileEntries(raw['read-file']);
    const writePayload = raw['write-file'];
    const writePath =
        writePayload && typeof writePayload === 'object' && typeof writePayload.path === 'string'
            ? writePayload.path
            : '';
    const hadWrite = Boolean(writePath);
    const hadScript = Boolean(raw.script);
    const cmdPayload = raw['execute-command'];
    const hadCmd = Boolean(cmdPayload && typeof cmdPayload === 'object');
    const shellCommand =
        hadCmd && typeof cmdPayload.command === 'string' ? cmdPayload.command.trim() : '';

    const listPayload = raw['list-directory'];
    const hadListDir = Boolean(listPayload && typeof listPayload === 'object');
    const listDirPath =
        hadListDir && typeof listPayload.path === 'string' ? listPayload.path.trim() : '';

    const grepPayload = raw['grep-search'];
    const hadGrep = Boolean(grepPayload && typeof grepPayload === 'object');
    const grepPattern =
        hadGrep && typeof grepPayload.pattern === 'string' ? grepPayload.pattern.trim() : '';
    const grepPath =
        hadGrep && typeof grepPayload.path === 'string' ? grepPayload.path.trim() : '';
    const grepGlob =
        hadGrep && typeof grepPayload.glob === 'string' ? grepPayload.glob.trim() : '';

    const fePayload = raw['file-exists'];
    const hadFileExists = Boolean(fePayload && typeof fePayload === 'object');
    const fileExistsPath =
        hadFileExists && typeof fePayload.path === 'string' ? fePayload.path.trim() : '';

    const patchPayload = raw['edit-patch'];
    const hadEditPatch = Boolean(patchPayload && typeof patchPayload === 'object');
    const editPatchPath =
        hadEditPatch && typeof patchPayload.path === 'string' ? patchPayload.path.trim() : '';

    const runScriptPayload = raw['run-script'];
    const hadRunScript = Boolean(runScriptPayload && typeof runScriptPayload === 'object');
    const runScriptId =
        hadRunScript && typeof runScriptPayload.scriptId === 'string'
            ? runScriptPayload.scriptId.trim()
            : '';

    for (const k of INTERNAL_CLIENT_ACTION_KEYS_SET) {
        delete ex[k];
    }
    delete ex.debug;

    const attachments = {};
    if (readFiles.length) attachments.readFiles = readFiles;
    if (hadRag && ragQuery) attachments.ragQuery = ragQuery;
    if (hadWrite) attachments.writtenFiles = [{ path: writePath }];
    if (hadScript) attachments.pendingClientAction = 'script';
    if (hadCmd) attachments.pendingClientAction = 'execute-command';
    if (shellCommand) attachments.shellCommand = shellCommand;
    if (listDirPath) attachments.listDirectoryPath = listDirPath;
    if (grepPattern) attachments.grepPattern = grepPattern;
    if (grepPath) attachments.grepPath = grepPath;
    if (grepGlob) attachments.grepGlob = grepGlob;
    if (fileExistsPath) attachments.fileExistsPath = fileExistsPath;
    if (editPatchPath) attachments.editPatchPath = editPatchPath;
    if (runScriptId) attachments.runScriptId = runScriptId;
    if (hadRunScript) attachments.pendingClientAction = 'run-script';

    const priorAttach =
        raw.attachments && typeof raw.attachments === 'object' && !Array.isArray(raw.attachments)
            ? raw.attachments
            : {};
    if (Object.keys(attachments).length) {
        ex.attachments = { ...priorAttach, ...attachments };
    } else if (Object.keys(priorAttach).length) {
        ex.attachments = { ...priorAttach };
    }

    const hasForm = ex.form && typeof ex.form === 'object';
    const hasMessage =
        ex.message !== undefined &&
        ex.message !== null &&
        (typeof ex.message === 'string'
            ? ex.message.trim().length > 0
            : typeof ex.message === 'object');

    if (!hasForm && !hasMessage) {
        const parts = [];
        if (hadRag) parts.push('Searching the codebase');
        if (readFiles.length) parts.push('Reading files');
        if (hadWrite) parts.push('Updating files');
        if (hadScript || hadRunScript) parts.push('Running script');
        if (hadCmd) parts.push('Running command');
        if (hadListDir) parts.push('Listing directory');
        if (hadGrep) parts.push('Searching in files');
        if (hadFileExists) parts.push('Checking path');
        if (hadEditPatch) parts.push('Applying patch');
        ex.message = parts.length ? `${parts.join(' · ')}…` : 'Working…';
    }

    return ex;
}

/**
 * @param {unknown} readFilePayload
 * @returns {{ path: string }[]}
 */
function collectReadFileEntries(readFilePayload) {
    const out = [];
    if (!readFilePayload || typeof readFilePayload !== 'object') return out;
    const p = readFilePayload.path;
    if (typeof p === 'string' && p.trim()) out.push({ path: p.trim() });
    const paths = readFilePayload.paths;
    if (Array.isArray(paths)) {
        for (const x of paths) {
            if (typeof x === 'string' && x.trim()) out.push({ path: x.trim() });
            else if (x && typeof x === 'object' && typeof x.path === 'string' && x.path.trim()) {
                out.push({ path: x.path.trim() });
            }
        }
    }
    return out;
}
