/**
 * Markdown parser for iterative Actions system
 *
 * Реализация на основе плана: plans/action-scripts-integration.md
 */

import * as fs from 'node:fs/promises';
import * as path from 'path';
import {ActionDefinition, SubAction, ActionContext, DSLDefinition} from './types.js';
import {tryParseJsonFromLlmText} from '@a2a/server-utils/strip-markdown-json-fence';
import {logger} from '@a2a/server-utils/logger';

/** Strip newlines to prevent CWE-117 log injection */
const sanitizeForLog = (s: string): string => s.replace(/[\n\r]/g, ' ');

/**
 * Parse a primitive type from a string value
 * Supports: numbers, booleans, strings
 */
export function parsePrimitive(value: string): unknown {
    const trimmed = value.trim();

    // Try parsing as number
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') {
        return num;
    }

    // Try parsing as boolean
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;

    // Return as string
    return trimmed;
}

/**
 * Parse DSL definition from DSL section
 * Supports both inline format and JSON code blocks
 */
function parseDSL(dslSection: string): DSLDefinition {
    const parsed = tryParseJsonFromLlmText(dslSection);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const p = parsed as Record<string, unknown>;
        const rawIn = p['input'];
        const input: Record<string, unknown> =
            rawIn && typeof rawIn === 'object' && !Array.isArray(rawIn)
                ? (rawIn as Record<string, unknown>)
                : {};
        return {
            script: typeof p['script'] === 'string' ? p['script'] : String(p['script'] ?? ''),
            input,
        };
    }

    // Fallback to inline format parsing
    const scriptMatch = dslSection.match(/script:\s*(.+)/i);
    const inputMatches = Array.from(dslSection.matchAll(/(\w+):\s*(.+)/g));

    const input: Record<string, unknown> = {};
    for (const match of inputMatches) {
        const key = match[1]?.trim();
        const value = match[2]?.trim();
        if (key && value && key !== 'script') {
            input[key] = parsePrimitive(value);
        }
    }

    return {
        script: scriptMatch?.[1]?.trim() ?? '',
        input
    };
}

/**
 * Parse a sub-action section into SubAction object
 */
export function parseSubAction(subActionSection: string): SubAction {
    // Extract ID from ### header (e.g., "### 1. vue-import-detect" or "### vue-import-detect")
    const headerMatch = subActionSection.match(/^#{1,3}\s+(?:(\d+)\.\s+)?(.+)$/m);
    const id = headerMatch?.[2]?.trim() ?? '';

    // Extract title and description
    // The first line after header is the title, rest is description
    let title = id;
    let description = '';

    // Find content after the header
    const contentAfterHeader = subActionSection.replace(/^#{1,3}\s+(?:(\d+)\.\s+)?(.+)$/m, '').trim();

    if (contentAfterHeader) {
        const contentLines = contentAfterHeader.split('\n').filter(l => l.trim());
        if (contentLines.length > 0) {
            // First non-empty line might be description
            const firstLine = contentLines[0]?.replace(/^[-*]\s*/, '').trim();
            if (firstLine) title = firstLine;
            if (contentLines.length > 1) {
                const rest = contentLines.slice(1).join(' ').replace(/^[-*]\s*/, '').trim();
                if (rest) description = rest;
            }
        }
    }

    // Extract priority from number prefix (e.g., "1. vue-import-detect")
    const priorityNum = headerMatch?.[1] ? parseInt(headerMatch[1], 10) : 100;
    const priority = priorityNum || 100;

    // Extract input (**Input:** or **Вход:**)
    const inputMatch = subActionSection.match(/\*\*(?:Input|Вход):\*\*\s*([\s\S]*?)(?=\*\*|\n#{1,3}\s+|\n##\s+|$)/i);
    let input = '';
    if (inputMatch?.[1]) {
        const inputContent = inputMatch[1].trim();
        const parts = inputContent.split('\n');
        input = parts[0]?.trim() ?? '';
    }

    // Extract output (**Output:** or **Выход:**)
    const outputMatch = subActionSection.match(/\*\*(?:Output|Выход):\*\*\s*([\s\S]*?)(?=\*\*|\n#{1,3}\s+|\n##\s+|$)/i);
    let output = '';
    if (outputMatch?.[1]) {
        const outputContent = outputMatch[1].trim();
        const parts = outputContent.split('\n');
        output = parts[0]?.trim() ?? '';
    }

    // Extract TypeScript code from ```typescript block
    const codeMatch = subActionSection.match(/```typescript\s*([\s\S]*?)```/i);
    const code = codeMatch?.[1]?.trim() ?? '';

    // Extract DSL from JSON block or create from code
    let dsl: DSLDefinition = {script: id, input: {}};

    // Try to extract JSON DSL
    const dslMatch = subActionSection.match(/\*\*DSL:\*\*\s*([\s\S]*?)(?=\n#{1,3}\s+|\n##\s+|$)/i);
    if (dslMatch?.[1]) {
        dsl = parseDSL(dslMatch[1]);
    }

    // If we have code, set script name to sub-action id
    if (code) {
        dsl.script = id;
    }

    return {
        id,
        title,
        description,
        priority,
        input,
        output,
        dsl,
        code
    };
}

/**
 * Parse action context section into ActionContext object
 */
export function parseActionContext(contextSection: string): ActionContext {
    const context: ActionContext = {};

    // Extract Framework
    const frameworkMatch = contextSection.match(/(?:Framework|Фреймворк):\s*(.+)/i);
    if (frameworkMatch?.[1]) {
        context.framework = frameworkMatch[1].trim();
    }

    // Extract Build tool
    const buildToolMatch = contextSection.match(/(?:Build tool|Инструмент сборки):\s*(.+)/i);
    if (buildToolMatch?.[1]) {
        context.buildTool = buildToolMatch[1].trim();
    }

    // Extract Aliases (format: "alias -> target" or multiple)
    const aliasesMatch = contextSection.match(/(?:Aliases|псевдонимы):\s*(.+)/i);
    if (aliasesMatch?.[1]) {
        const aliasesStr = aliasesMatch[1].trim();
        const aliases: Record<string, string> = {};

        // Parse comma or pipe separated aliases: "alias1 -> target1, alias2 -> target2"
        const aliasPairs = aliasesStr.split(/[,;|]/);
        for (const pair of aliasPairs) {
            const match = pair.match(/(\S+)\s*->\s*(.+)/);
            if (match?.[1] && match?.[2]) {
                aliases[match[1].trim()] = match[2].trim();
            }
        }

        if (Object.keys(aliases).length > 0) {
            context.aliases = aliases;
        }
    }

    return context;
}

/**
 * Extract metadata section (between header and first ## section)
 */
function extractMetadata(content: string): { title: string; description: string; priority: number } {
    const lines = content.split('\n');

    // Skip the first header line (# action-id)
    let currentLine = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;
        if (line.startsWith('#')) {
            currentLine = i + 1;
            break;
        }
    }

    // Collect lines until we hit ## section
    const metadataLines: string[] = [];
    for (let i = currentLine; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;
        if (line.startsWith('##')) {
            break;
        }
        metadataLines.push(line);
    }

    const metadataText = metadataLines.join(' ');

    // Title is usually first line or first sentence
    let title = '';
    let description = '';
    let priority = 100;

    if (metadataLines.length > 0) {
        // First non-empty line becomes title
        const firstLine = metadataLines[0]?.replace(/^[-*]\s*/, '').trim();
        if (firstLine) title = firstLine;

        // Rest is description
        if (metadataLines.length > 1) {
            const rest = metadataLines.slice(1).join(' ').replace(/^[-*]\s*/, '').trim();
            if (rest) description = rest;
        }
    }

    // Try to find priority in metadata
    const priorityMatch = metadataText.match(/(?:priority|приоритет):\s*(\d+)/i);
    if (priorityMatch?.[1]) {
        priority = parseInt(priorityMatch[1], 10);
    }

    return {title, description, priority};
}

/**
 * Extract a section from the markdown content by header
 */
function extractSection(content: string, sectionHeader: string): string {
    const lines = content.split('\n');
    let inSection = false;
    const sectionLines: string[] = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        const trimmedLineLower = trimmedLine.toLowerCase();
        const searchHeader = sectionHeader.toLowerCase();

        // Check if we're entering the target section (exact match or partial match)
        if (trimmedLineLower === searchHeader || trimmedLineLower.startsWith(searchHeader)) {
            inSection = true;
            continue;
        }

        // Check if we're leaving the section (next ## header that's not ###)
        if (inSection && trimmedLine.startsWith('##') && !trimmedLine.startsWith('###')) {
            break;
        }

        if (inSection) {
            sectionLines.push(line);
        }
    }

    return sectionLines.join('\n').trim();
}

/**
 * Parse sub-actions from Sub-actions section
 */
function parseSubActions(subActionsSection: string): SubAction[] {
    const subActions: SubAction[] = [];

    if (!subActionsSection || subActionsSection.trim().length === 0) {
        return subActions;
    }

    // Split by ### headers (sub-action headers)
    // Pattern matches: ### 1. action-id or ### action-id
    const subActionBlocks = subActionsSection.split(/(?=^###\s+)/m);

    for (const block of subActionBlocks) {
        const trimmedBlock = block.trim();
        if (trimmedBlock && trimmedBlock.startsWith('###')) {
            const subAction = parseSubAction(trimmedBlock);
            if (subAction.id) {
                subActions.push(subAction);
            }
        }
    }

    return subActions;
}

/**
 * Parse markdown content into ActionDefinition
 */
export function parseActionFromMarkdown(content: string, filename: string): ActionDefinition {
    // Extract ID from first # header
    const idMatch = content.match(/^#\s+(.+)$/m);
    const id = idMatch?.[1]?.trim() ?? filename.replace(/\.md$/, '');

    // Extract metadata (title, description, priority)
    const {title, description, priority} = extractMetadata(content);

    // Extract Sub-actions section
    const subActionsSection = extractSection(content, '## Sub-actions');
    const subActions = subActionsSection ? parseSubActions(subActionsSection) : [];

    // Extract Context section
    const contextSection = extractSection(content, '## Context') ||
        extractSection(content, '## Контекст') ||
        extractSection(content, '## Context');
    const context = contextSection ? parseActionContext(contextSection) : {};

    return {
        id,
        title: title || id,
        description,
        priority,
        context,
        subActions
    };
}

/**
 * Recursively collect all .md paths from a directory (skip README.md).
 */
async function collectMarkdownFiles(dirPath: string, out: string[] = [], root?: string): Promise<string[]> {
    // CWE-22/23: resolve root once on first call; all entries must stay within it
    const containmentRoot = root ?? path.resolve(dirPath);
    const entries = await fs.readdir(dirPath, {withFileTypes: true});
    for (const e of entries) {
        const full = path.resolve(dirPath, e.name);
        if (!full.startsWith(containmentRoot + path.sep) && full !== containmentRoot) {
            continue; // skip symlinks or entries that escape the root
        }
        if (e.isDirectory()) {
            await collectMarkdownFiles(full, out, containmentRoot);
        } else if (e.name.endsWith('.md') && e.name.toLowerCase() !== 'readme.md') {
            out.push(full);
        }
    }
    return out;
}

/**
 * Read all .md files from a directory (and subdirs) and parse them as actions.
 */
export async function parseAllActionsFromDirectory(directoryPath: string): Promise<ActionDefinition[]> {
    const actions: ActionDefinition[] = [];
    try {
        const mdFiles = await collectMarkdownFiles(directoryPath);
        for (const filePath of mdFiles) {
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                const baseName = path.basename(filePath);
                const action = parseActionFromMarkdown(content, baseName);
                actions.push(action);
            } catch (error) {
                logger.error('[action-parser] Error parsing action file', {
                    filePath: sanitizeForLog(filePath),
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    } catch (error) {
        logger.error('[action-parser] Error reading directory', {
            directoryPath: sanitizeForLog(directoryPath),
            error: error instanceof Error ? error.message : String(error),
        });
    }
    return actions;
}
