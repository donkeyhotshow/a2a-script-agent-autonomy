/**
 * Client-side handlers for auto-ai / agent execute keys that mirror simulation contracts.
 * Shapes align with `materialize-result-for-llm` (path + entries for list-directory, matches for grep-search, etc.).
 */

import type { HandleActionOptions, HandleActionResult } from '../types.js';

function listDirPath(payload: unknown): string {
    const p = payload as { path?: string; dirPath?: string };
    const raw = typeof p.path === 'string' ? p.path : typeof p.dirPath === 'string' ? p.dirPath : '';
    return raw.trim();
}

/**
 * list-directory → result uses `path` + `entries[{ name }]`
 */
export async function handleListDirectoryAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const dirPath = listDirPath(payload);
    if (!dirPath) {
        return { handled: false, error: 'No path in list-directory action' };
    }
    if (!options.listDirectory) {
        return { handled: false, error: 'listDirectory handler not provided' };
    }
    const extra = payload as { recursive?: boolean; pattern?: string };
    try {
        const out = await options.listDirectory(dirPath, {
            recursive: extra.recursive,
            pattern: extra.pattern,
        });
        const files = out.files ?? [];
        const entries = files.map((f) => ({
            name: f.name,
            path: f.path,
            isFile: f.isFile,
            isDirectory: f.isDirectory,
        }));
        return {
            handled: true,
            actionType: 'list-directory',
            result: {
                'list-directory': {
                    path: dirPath,
                    entries,
                    success: out.success !== false,
                    error: out.error,
                },
            },
        };
    } catch (err) {
        return {
            handled: true,
            actionType: 'list-directory',
            result: {
                'list-directory': {
                    path: dirPath,
                    entries: [],
                    success: false,
                    error: err instanceof Error ? err.message : String(err),
                },
            },
        };
    }
}

export async function handleGrepWorkspaceAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const g = payload as { pattern?: string; path?: string; glob?: string };
    const pattern = typeof g.pattern === 'string' ? g.pattern.trim() : '';
    if (!pattern) {
        return { handled: false, error: 'No pattern in grep-search action' };
    }
    if (!options.grepWorkspace) {
        return { handled: false, error: 'grepWorkspace handler not provided' };
    }
    try {
        const out = await options.grepWorkspace({
            pattern,
            path: typeof g.path === 'string' ? g.path : undefined,
            glob: typeof g.glob === 'string' ? g.glob : undefined,
        });
        return {
            handled: true,
            actionType: 'grep-search',
            result: {
                'grep-search': {
                    pattern,
                    path: g.path,
                    glob: g.glob,
                    matches: out.matches ?? [],
                    success: out.success !== false,
                    error: out.error,
                },
            },
        };
    } catch (err) {
        return {
            handled: true,
            actionType: 'grep-search',
            result: {
                'grep-search': {
                    pattern,
                    path: g.path,
                    glob: g.glob,
                    matches: [],
                    success: false,
                    error: err instanceof Error ? err.message : String(err),
                },
            },
        };
    }
}

export async function handleFileExistsAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const p = payload as { path?: string };
    if (!p?.path?.trim()) {
        return { handled: false, error: 'No path in file-exists action' };
    }
    if (!options.fileExists) {
        return { handled: false, error: 'fileExists handler not provided' };
    }
    const filePath = p.path.trim();
    try {
        const out = await options.fileExists(filePath);
        return {
            handled: true,
            actionType: 'file-exists',
            result: {
                'file-exists': {
                    path: filePath,
                    exists: out.exists === true,
                    success: out.success !== false,
                    error: out.error,
                },
            },
        };
    } catch (err) {
        return {
            handled: true,
            actionType: 'file-exists',
            result: {
                'file-exists': {
                    path: filePath,
                    exists: false,
                    success: false,
                    error: err instanceof Error ? err.message : String(err),
                },
            },
        };
    }
}

export async function handleEditPatchAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const p = payload as { path?: string; patch?: string; hunks?: unknown };
    if (!p?.path?.trim()) {
        return { handled: false, error: 'No path in edit-patch action' };
    }
    if (!options.editPatch) {
        return { handled: false, error: 'editPatch handler not provided' };
    }
    const filePath = p.path.trim();
    try {
        const out = await options.editPatch({
            path: filePath,
            patch: p.patch,
            hunks: p.hunks,
        });
        return {
            handled: true,
            actionType: 'edit-patch',
            result: {
                'edit-patch': {
                    path: filePath,
                    success: out.success !== false,
                    error: out.error,
                },
            },
        };
    } catch (err) {
        return {
            handled: true,
            actionType: 'edit-patch',
            result: {
                'edit-patch': {
                    path: filePath,
                    success: false,
                    error: err instanceof Error ? err.message : String(err),
                },
            },
        };
    }
}

export async function handleRunRegisteredScriptAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const p = payload as { scriptId?: string; params?: Record<string, unknown> };
    if (!p?.scriptId?.trim()) {
        return { handled: false, error: 'No scriptId in run-script action' };
    }
    if (!options.runRegisteredScript) {
        return { handled: false, error: 'runRegisteredScript handler not provided' };
    }
    const scriptId = p.scriptId.trim();
    try {
        const out = await options.runRegisteredScript(scriptId, p.params);
        return {
            handled: true,
            actionType: 'run-script',
            result: {
                'run-script': {
                    scriptId,
                    success: out.success !== false,
                    output: out.output,
                    filesModified: out.filesModified,
                    error: out.error,
                },
            },
        };
    } catch (err) {
        return {
            handled: true,
            actionType: 'run-script',
            result: {
                'run-script': {
                    scriptId,
                    success: false,
                    error: err instanceof Error ? err.message : String(err),
                },
            },
        };
    }
}
