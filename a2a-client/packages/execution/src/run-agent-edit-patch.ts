/**
 * Client-side edit-patch — aligned with a2a-server/src/actions/handlers/edit-patch.ts
 */

import { promises as fsp } from 'node:fs';
import { resolveUnderProjectRoot } from './path-sandbox.js';
import { checkPathAccess } from './fs-access.js';

function applyReplace(lines, operation) {
    const startLine = operation.startLine;
    const endLine = operation.endLine;
    const content = operation.content;

    if (startLine === undefined || content === undefined) {
        return { applied: false, linesChanged: 0 };
    }

    const startIndex = startLine - 1;
    const endIndex = endLine !== undefined ? endLine : startIndex;

    if (startIndex < 0 || startIndex >= lines.length) {
        return { applied: false, linesChanged: 0 };
    }

    const contentLines = String(content).split('\n');
    const oldLinesCount = endIndex >= startIndex ? endIndex - startIndex + 1 : 1;

    lines.splice(startIndex, oldLinesCount, ...contentLines);

    return { applied: true, linesChanged: Math.max(oldLinesCount, contentLines.length) };
}

function applyInsert(lines, operation) {
    const startLine = operation.startLine;
    const content = operation.content;

    if (startLine === undefined || content === undefined) {
        return { applied: false, linesChanged: 0 };
    }

    const insertIndex = Math.max(0, startLine - 1);
    const contentLines = String(content).split('\n');

    lines.splice(insertIndex, 0, ...contentLines);

    return { applied: true, linesChanged: contentLines.length };
}

function applyDelete(lines, operation) {
    const startLine = operation.startLine;
    const endLine = operation.endLine;

    if (startLine === undefined) {
        return { applied: false, linesChanged: 0 };
    }

    const startIndex = startLine - 1;
    const endIndex = endLine !== undefined ? endLine - 1 : startIndex;

    if (startIndex < 0 || startIndex >= lines.length) {
        return { applied: false, linesChanged: 0 };
    }

    const deleteCount = endIndex - startIndex + 1;
    lines.splice(startIndex, deleteCount);

    return { applied: true, linesChanged: deleteCount };
}

function applyReplaceContent(lines, operation) {
    const search = operation.search;
    const content = operation.content;

    if (!search || content === undefined) {
        return { applied: false, linesChanged: 0 };
    }

    let applied = false;
    let linesChanged = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line && line.includes(search)) {
            lines[i] = line.replace(search, content);
            applied = true;
            linesChanged++;
        }
    }

    return { applied, linesChanged };
}

function applyOperation(lines, operation) {
    const type = operation.type;
    switch (type) {
        case 'replace':
            return applyReplace(lines, operation);
        case 'insert':
            return applyInsert(lines, operation);
        case 'delete':
            return applyDelete(lines, operation);
        case 'replaceContent':
            return applyReplaceContent(lines, operation);
        default:
            return { applied: false, linesChanged: 0 };
    }
}

/**
 * @param {string} projectPath
 * @param {Record<string, unknown>} payload
 */
export async function runClientEditPatch(projectPath, payload) {
    const rel = typeof payload.path === 'string' ? payload.path : '';
    if (!rel.trim()) {
        return {
            success: false,
            path: '',
            operationsApplied: 0,
            linesChanged: 0,
            error: 'missing path',
        };
    }

    const fullPath = resolveUnderProjectRoot(projectPath, rel);
    if (!fullPath) {
        return {
            success: false,
            path: rel,
            operationsApplied: 0,
            linesChanged: 0,
            error: 'path outside project',
        };
    }

    const operations = Array.isArray(payload.operations) ? payload.operations : [];
    if (operations.length === 0) {
        return {
            success: false,
            path: rel,
            operationsApplied: 0,
            linesChanged: 0,
            error: 'no operations',
        };
    }

     try {
         const hasAccess = await checkPathAccess(fullPath);
         if (!hasAccess) {
             return {
                 success: false,
                 path: rel,
                 operationsApplied: 0,
                 linesChanged: 0,
                 error: 'File does not exist',
             };
         }
     } catch {
         return {
             success: false,
             path: rel,
             operationsApplied: 0,
             linesChanged: 0,
             error: 'File does not exist',
         };
     }

    let backupPath;
    if (payload.backup === true) {
        backupPath = `${fullPath}.backup-${Date.now()}`;
        await fsp.copyFile(fullPath, backupPath);
    }

    try {
        const content = await fsp.readFile(fullPath, 'utf8');
        const lines = content.split('\n');

        const sortedOperations = [...operations].sort((a, b) => {
            const aStart = typeof a.startLine === 'number' ? a.startLine : 0;
            const bStart = typeof b.startLine === 'number' ? b.startLine : 0;
            return bStart - aStart;
        });

        let linesChanged = 0;
        let operationsApplied = 0;

        for (const operation of sortedOperations) {
            if (!operation || typeof operation !== 'object') {
                continue;
            }
            const result = applyOperation(lines, operation);
            if (result.applied) {
                operationsApplied++;
                linesChanged += result.linesChanged;
            }
        }

        await fsp.writeFile(fullPath, lines.join('\n'), 'utf8');

        return {
            success: true,
            path: rel,
            operationsApplied,
            linesChanged,
            backupPath,
        };
    } catch (error) {
        return {
            success: false,
            path: rel,
            operationsApplied: 0,
            linesChanged: 0,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
