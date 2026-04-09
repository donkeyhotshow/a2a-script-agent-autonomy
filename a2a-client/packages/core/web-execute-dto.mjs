/**
 * Web UI execute DTO: drop client-only action payloads and surface message / attachments.
 * Single implementation: Vite plugin + @a2a/sdk re-export.
 */

import { INTERNAL_CLIENT_ACTION_KEYS } from './internal-client-action-keys.mjs';

const INTERNAL_CLIENT_ACTION_KEYS_SET = new Set(INTERNAL_CLIENT_ACTION_KEYS);

/** Web-facing execute: only these top-level keys may be forwarded (allowlist). */
const WEB_EXECUTE_PUBLIC_KEYS = ['form', 'message', 'attachments'];

function collectReadFileEntries(readFilePayload) {
    const out = [];
    if (!readFilePayload || typeof readFilePayload !== 'object' || Array.isArray(readFilePayload)) {
        return out;
    }
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

/**
 * @param {object|null|undefined} execute
 * @param {{ context?: object }|undefined} [options] - Optional invoke `context` (workbench) for form-only post-tool beats.
 */
export function buildWebExecute(execute, options) {
    if (execute == null) return null;
    if (typeof execute !== 'object' || Array.isArray(execute)) {
        return null;
    }

    const raw = execute;
    const ex = { ...raw };

    const rag = raw['rag-search'];
    const hadRag = rag && typeof rag === 'object';
    const ragQuery =
        hadRag && typeof rag.query === 'string' ? rag.query.trim() : '';

    const readFiles = collectReadFileEntries(raw['read-file']);
    const writePayload = raw['write-file'];
    const writePath =
        writePayload && typeof writePayload === 'object' && !Array.isArray(writePayload)
            ? String(writePayload.path || '').trim()
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
    if (hadScript || hadRunScript) attachments.pendingClientAction = 'script';
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
    const msg = ex.message;
    const hasMessage =
        msg !== undefined &&
        msg !== null &&
        (typeof msg === 'string' ? msg.trim().length > 0 : typeof msg === 'object');

    if (!hasMessage) {
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
        if (parts.length) {
            ex.message = `${parts.join(' · ')}…`;
        } else if (!hasForm) {
            ex.message = 'Working…';
        }
    }

    augmentExecuteFromAutoScriptWorkbench(ex, options?.context);

    const slim = {};
    for (const k of WEB_EXECUTE_PUBLIC_KEYS) {
        if (k in ex && ex[k] !== undefined) {
            slim[k] = ex[k];
        }
    }
    return slim;
}

/** Form-only execute after auto `run-script`: surface script id + status line (see simulations/SCHEMA.md). */
function augmentExecuteFromAutoScriptWorkbench(ex, context) {
    if (!ex || typeof ex !== 'object' || Array.isArray(ex)) return;
    const keys = Object.keys(ex).filter((k) => k !== 'attachments' && k !== 'debug');
    if (keys.length !== 1 || keys[0] !== 'form') return;

    const sections = context?.workbench?.sections;
    const trig = sections && typeof sections === 'object' && !Array.isArray(sections) ? sections.autoScriptTrigger : null;
    if (!trig || typeof trig !== 'object' || Array.isArray(trig)) return;

    const sid = typeof trig.scriptId === 'string' ? trig.scriptId.trim() : '';
    if (!sid) return;
    const completed =
        (typeof trig.lastOutput === 'string' && trig.lastOutput.trim().length > 0) ||
        (Array.isArray(trig.filesModified) && trig.filesModified.length > 0);
    if (!completed) return;

    const msg = ex.message;
    const hasMsg =
        msg !== undefined &&
        msg !== null &&
        (typeof msg === 'string' ? msg.trim().length > 0 : typeof msg === 'object');
    if (!hasMsg) {
        ex.message = 'Running script…';
    }

    const prior =
        ex.attachments && typeof ex.attachments === 'object' && !Array.isArray(ex.attachments) ? ex.attachments : {};
    if (!prior.runScriptId) {
        ex.attachments = {...prior, runScriptId: sid};
    }
}

export function sanitizeApiRecordExecuteFields(payload) {
    const out = { ...payload };
    const ctx = out.context && typeof out.context === 'object' && !Array.isArray(out.context) ? out.context : undefined;
    const projOpts = ctx ? { context: ctx } : undefined;
    if (out.execute !== undefined) {
        out.execute = buildWebExecute(out.execute, projOpts);
    }
    if (out.currentExecute !== undefined) {
        out.currentExecute = buildWebExecute(out.currentExecute, projOpts);
    }
    return out;
}
