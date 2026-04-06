/**
 * Action Handler: edit-patch
 * 
 * Handles edit-patch action for applying patches to files.
 */

import {logger} from '../../utils/logger.js';
import {pathIsAccessible, timestampedBackupPath} from '../../utils/fs-access.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {validatePath} from './file-operations/security.js';

export interface PatchOperation {
    type: 'replace' | 'insert' | 'delete' | 'replaceContent';
    startLine?: number;
    endLine?: number;
    content?: string;
    search?: string;
}

export interface EditPatchInput {
    path: string;
    operations: PatchOperation[];
    backup?: boolean;
}

export interface EditPatchOutput {
    success: boolean;
    path: string;
    operationsApplied: number;
    linesChanged: number;
    backupPath?: string;
    error?: string;
}

/**
 * Execute edit-patch action
 */
export async function executeEditPatch(
    input: EditPatchInput
): Promise<EditPatchOutput> {
    logger.info('[edit-patch] Executing', {
        path: input.path,
        operationsCount: input.operations.length,
    });

    try {
        // Validate path
        const validation = validatePath(input.path);
        if (!validation.valid) {
            return {
                success: false,
                path: input.path,
                operationsApplied: 0,
                linesChanged: 0,
                error: validation.error,
            };
        }

        const fullPath = path.resolve(input.path);

        const fileExists = await pathIsAccessible(fullPath, (m) =>
            logger.warn('[edit-patch] access check failed', {
                fullPath: m.filePath,
                code: m.code,
                error: m.error,
            })
        );

        if (!fileExists) {
            return {
                success: false,
                path: input.path,
                operationsApplied: 0,
                linesChanged: 0,
                error: 'File does not exist',
            };
        }

        // Create backup if requested
        let backupPath: string | undefined;
        if (input.backup) {
            backupPath = timestampedBackupPath(fullPath);
            await fs.copyFile(fullPath, backupPath);
            logger.info('[edit-patch] Backup created', {backupPath});
        }

        // Read file content
        const content = await fs.readFile(fullPath, 'utf8');
        const lines = content.split('\n');
        
        // Sort operations by startLine in descending order
        // This ensures we apply changes from bottom to top
        const sortedOperations = [...input.operations].sort((a, b) => {
            const aStart = a.startLine || 0;
            const bStart = b.startLine || 0;
            return bStart - aStart;
        });

        let linesChanged = 0;
        let operationsApplied = 0;

        for (const operation of sortedOperations) {
            const result = applyOperation(lines, operation);
            if (result.applied) {
                operationsApplied++;
                linesChanged += result.linesChanged;
            }
        }

        // Write modified content
        const newContent = lines.join('\n');
        await fs.writeFile(fullPath, newContent, 'utf8');

        logger.info('[edit-patch] Patch applied', {
            path: input.path,
            operationsApplied,
            linesChanged,
        });

        return {
            success: true,
            path: input.path,
            operationsApplied,
            linesChanged,
            backupPath,
        };
    } catch (error) {
        logger.error('[edit-patch] Execution failed', {error: String(error)});
        return {
            success: false,
            path: input.path,
            operationsApplied: 0,
            linesChanged: 0,
            error: String(error),
        };
    }
}

/**
 * Apply a single patch operation to lines array
 */
function applyOperation(
    lines: string[],
    operation: PatchOperation
): {applied: boolean; linesChanged: number} {
    switch (operation.type) {
        case 'replace':
            return applyReplace(lines, operation);
        case 'insert':
            return applyInsert(lines, operation);
        case 'delete':
            return applyDelete(lines, operation);
        case 'replaceContent':
            return applyReplaceContent(lines, operation);
        default:
            return {applied: false, linesChanged: 0};
    }
}

/**
 * Apply replace operation (replace lines from startLine to endLine)
 */
function applyReplace(
    lines: string[],
    operation: PatchOperation
): {applied: boolean; linesChanged: number} {
    const startLine = operation.startLine;
    const endLine = operation.endLine;
    const content = operation.content;

    if (startLine === undefined || !content) {
        return {applied: false, linesChanged: 0};
    }

    // Convert to 0-indexed
    const startIndex = startLine - 1;
    const endIndex = endLine !== undefined ? endLine : startIndex;

    if (startIndex < 0 || startIndex >= lines.length) {
        return {applied: false, linesChanged: 0};
    }

    const contentLines = content.split('\n');
    const oldLinesCount = endIndex >= startIndex ? endIndex - startIndex + 1 : 1;
    const newLinesCount = contentLines.length;
    const linesChanged = Math.max(oldLinesCount, newLinesCount);

    // Replace lines
    lines.splice(startIndex, oldLinesCount, ...contentLines);

    return {applied: true, linesChanged};
}

/**
 * Apply insert operation (insert lines at startLine)
 */
function applyInsert(
    lines: string[],
    operation: PatchOperation
): {applied: boolean; linesChanged: number} {
    const startLine = operation.startLine;
    const content = operation.content;

    if (startLine === undefined || !content) {
        return {applied: false, linesChanged: 0};
    }

    // Convert to 0-indexed (insert before this line)
    const insertIndex = Math.max(0, startLine - 1);
    const contentLines = content.split('\n');

    // Insert lines
    lines.splice(insertIndex, 0, ...contentLines);

    return {applied: true, linesChanged: contentLines.length};
}

/**
 * Apply delete operation (delete lines from startLine to endLine)
 */
function applyDelete(
    lines: string[],
    operation: PatchOperation
): {applied: boolean; linesChanged: number} {
    const startLine = operation.startLine;
    const endLine = operation.endLine;

    if (startLine === undefined) {
        return {applied: false, linesChanged: 0};
    }

    // Convert to 0-indexed
    const startIndex = startLine - 1;
    const endIndex = endLine !== undefined ? endLine - 1 : startIndex;

    if (startIndex < 0 || startIndex >= lines.length) {
        return {applied: false, linesChanged: 0};
    }

    const deleteCount = endIndex - startIndex + 1;
    lines.splice(startIndex, deleteCount);

    return {applied: true, linesChanged: deleteCount};
}

/**
 * Apply replaceContent operation (replace content matching search string)
 */
function applyReplaceContent(
    lines: string[],
    operation: PatchOperation
): {applied: boolean; linesChanged: number} {
    const search = operation.search;
    const content = operation.content;

    if (!search || content === undefined) {
        return {applied: false, linesChanged: 0};
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

    return {applied, linesChanged};
}

