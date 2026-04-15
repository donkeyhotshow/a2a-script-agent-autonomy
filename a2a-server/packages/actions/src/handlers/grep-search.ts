/**
 * Action Handler: grep-search
 * 
 * Handles grep-search action for text search with regex support.
 */

import {logger} from '@a2a/server-utils/logger';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {validatePath} from './file-operations/security.js';

export interface GrepSearchInput {
    pattern: string;
    path?: string;
    options?: GrepSearchOptions;
}

export interface GrepSearchOptions {
    regex?: boolean;
    caseSensitive?: boolean;
    wholeWord?: boolean;
    include?: string[];
    exclude?: string[];
    maxResults?: number;
}

export interface GrepMatch {
    file: string;
    line: number;
    column: number;
    content: string;
    match: string;
}

export interface GrepSearchOutput {
    success: boolean;
    pattern: string;
    matches: GrepMatch[];
    files: string[];
    total: number;
    error?: string;
}

/**
 * Execute grep-search action
 */
export async function executeGrepSearch(
    input: GrepSearchInput
): Promise<GrepSearchOutput> {
    logger.info('[grep-search] Executing', {
        pattern: input.pattern,
        path: input.path,
    });

    try {
        const searchPath = input.path || process.cwd();
        const fullPath = path.resolve(searchPath);
        
        // Validate path
        const validation = validatePath(fullPath);
        if (!validation.valid) {
            return {
                success: false,
                pattern: input.pattern,
                matches: [],
                files: [],
                total: 0,
                error: validation.error,
            };
        }

        const options = input.options || {};
        const maxResults = options.maxResults || 1000;
        
        // Build regex pattern
        let regex: RegExp;
        try {
            const pattern = options.regex 
                ? input.pattern 
                : escapeRegex(input.pattern);
            
            const flags = buildFlags(options);
            regex = new RegExp(pattern, flags);
        } catch (error) {
            return {
                success: false,
                pattern: input.pattern,
                matches: [],
                files: [],
                total: 0,
                error: `Invalid regex pattern: ${String(error)}`,
            };
        }

        const matches: GrepMatch[] = [];
        const files: Set<string> = new Set();

        // Search through files
        await searchInDirectory(fullPath, regex, options, matches, files, maxResults);

        // Sort matches by file and line
        matches.sort((a, b) => {
            if (a.file !== b.file) return a.file.localeCompare(b.file);
            return a.line - b.line;
        });

        const uniqueFiles = Array.from(files);

        logger.info('[grep-search] Search completed', {
            pattern: input.pattern,
            totalMatches: matches.length,
            filesCount: uniqueFiles.length,
        });

        return {
            success: true,
            pattern: input.pattern,
            matches,
            files: uniqueFiles,
            total: matches.length,
        };
    } catch (error) {
        logger.error('[grep-search] Execution failed', {error: String(error)});
        return {
            success: false,
            pattern: input.pattern,
            matches: [],
            files: [],
            total: 0,
            error: String(error),
        };
    }
}

/**
 * Search in directory recursively
 */
async function searchInDirectory(
    dirPath: string,
    regex: RegExp,
    options: GrepSearchOptions,
    matches: GrepMatch[],
    files: Set<string>,
    maxResults: number
): Promise<void> {
    if (matches.length >= maxResults) return;

    const entries = await fs.readdir(dirPath, {withFileTypes: true});

    for (const entry of entries) {
        if (matches.length >= maxResults) break;

        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(process.cwd(), fullPath);

        // Check exclude patterns
        if (options.exclude?.some((pattern: string) => matchGlob(relativePath, pattern))) {
            continue;
        }

        if (entry.isDirectory()) {
            // Skip node_modules and hidden directories
            if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                continue;
            }
            await searchInDirectory(fullPath, regex, options, matches, files, maxResults);
        } else if (entry.isFile()) {
            // Check include patterns
            if (options.include?.length) {
                const matchesInclude = options.include.some((pattern: string) => 
                    matchGlob(relativePath, pattern)
                );
                if (!matchesInclude) continue;
            }

            // Search in file
            await searchInFile(fullPath, regex, options, matches, files, maxResults);
        }
    }
}

/**
 * Search in a single file
 */
async function searchInFile(
    filePath: string,
    regex: RegExp,
    _options: GrepSearchOptions,
    matches: GrepMatch[],
    files: Set<string>,
    maxResults: number
): Promise<void> {
    if (matches.length >= maxResults) return;

    try {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        
        const fileMatches: GrepMatch[] = [];

        for (let i = 0; i < lines.length && matches.length < maxResults; i++) {
            const line = lines[i];
            if (line === undefined) continue;
            const match = regex.exec(line);
            
            if (match && match[0]) {
                const column = line.indexOf(match[0]);
                
                fileMatches.push({
                    file: path.relative(process.cwd(), filePath),
                    line: i + 1,
                    column: column + 1,
                    content: line.trim(),
                    match: match[0],
                });
                
                files.add(path.relative(process.cwd(), filePath));
            }
            
            // Reset regex lastIndex for global patterns
            regex.lastIndex = 0;
        }

        matches.push(...fileMatches);
    } catch (error) {
        // Skip files that can't be read
        logger.warn('[grep-search] Could not read file', {filePath, error: String(error)});
    }
}

/**
 * Escape special regex characters for literal search
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build regex flags from options
 */
function buildFlags(options: GrepSearchOptions): string {
    let flags = '';
    if (!options.caseSensitive) flags += 'i';
    if (options.wholeWord) flags += 'w';
    return flags;
}

/**
 * Simple glob matching
 */
function matchGlob(filePath: string, pattern: string): boolean {
    const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(filePath);
}

