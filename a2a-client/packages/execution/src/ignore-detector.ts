/**
 * Ignore Detector - Detects and parses IDE ignore files
 * Supports .gitignore, .cursorignore, .a2aignore and custom ignore files
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { checkPathAccess } from './fs-access.js';

const DEFAULT_IGNORE_FILES = ['.gitignore', '.cursorignore', '.a2aignore'];

const COMMON_IGNORED_DIRS = [
    'node_modules', '.git', '.svn', '.hg', '__pycache__', '.cache',
    'dist', 'build', 'coverage', '.next', '.nuxt', 'vendor', 'storage', '.a2a',
];

const DEFAULT_PATTERNS = [
    'node_modules', 'vendor', '.git', '.svn', '.hg', 'dist', 'build',
    'storage', '.a2a', '.cache', 'coverage',
];

export interface IgnoreDetectorConfig {
    projectPath?: string;
    customIgnoreFiles?: string[];
    additionalPatterns?: string[];
}

interface IgnorePattern {
    pattern: string;
    isNegation: boolean;
    isDir: boolean;
    isRootAnchored: boolean;
    source: string;
    originalPattern?: string;
}

interface IgnoreFileFound {
    name: string;
    path: string;
    patterns: number;
}

export interface ScanEntry {
    name: string;
    path: string;
    type: string;
}

export class IgnoreDetector {
    projectPath: string;
    customIgnoreFiles: string[];
    additionalPatterns: string[];
    ignorePatterns: IgnorePattern[] = [];
    ignoreFilesFound: IgnoreFileFound[] = [];
    private _initialized = false;

    get initialized(): boolean {
        return this._initialized;
    }

    constructor(config: IgnoreDetectorConfig = {}) {
        this.projectPath = config.projectPath ?? process.cwd();
        this.customIgnoreFiles = config.customIgnoreFiles ?? [];
        this.additionalPatterns = config.additionalPatterns ?? [];
    }

    async initialize(): Promise<this> {
        if (this._initialized) return this;

        for (const pattern of DEFAULT_PATTERNS) {
            this.ignorePatterns.push({
                pattern,
                isNegation: false,
                isDir: true,
                isRootAnchored: false,
                source: 'default',
            });
        }

        for (const pattern of this.additionalPatterns) {
            this.ignorePatterns.push({
                pattern,
                isNegation: false,
                isDir: false,
                isRootAnchored: false,
                source: 'config',
            });
        }

        const ignoreFilesToCheck = [...DEFAULT_IGNORE_FILES, ...this.customIgnoreFiles];

         for (const ignoreFile of ignoreFilesToCheck) {
             const fullPath = path.join(this.projectPath, ignoreFile);
             try {
                 const hasAccess = await checkPathAccess(fullPath);
                 if (hasAccess) {
                     const content = await fs.readFile(fullPath, 'utf-8');
                     const patterns = this._parseIgnoreFile(content, ignoreFile);
                     this.ignorePatterns.push(...patterns);
                     this.ignoreFilesFound.push({name: ignoreFile, path: fullPath, patterns: patterns.length});
                 }
             } catch {
                 // file doesn't exist
             }
         }

        await this._scanForIgnoreFiles(this.projectPath);
        this._initialized = true;
        return this;
    }

    private async _scanForIgnoreFiles(dirPath: string): Promise<void> {
        try {
            const entries = await fs.readdir(dirPath, {withFileTypes: true});
            for (const entry of entries) {
                if (!entry.isDirectory()) continue;
                const fullPath = path.join(dirPath, entry.name);
                if (this._isCommonIgnoredDir(entry.name)) continue;
                 for (const ignoreFile of DEFAULT_IGNORE_FILES) {
                     const ignoreFilePath = path.join(fullPath, ignoreFile);
                     try {
                         const hasAccess = await checkPathAccess(ignoreFilePath);
                         if (hasAccess) {
                             const content = await fs.readFile(ignoreFilePath, 'utf-8');
                             const patterns = this._parseIgnoreFile(content, ignoreFile);
                             this.ignorePatterns.push(...patterns);
                             this.ignoreFilesFound.push({name: ignoreFile, path: ignoreFilePath, patterns: patterns.length});
                         }
                     } catch {
                         // file doesn't exist
                     }
                 }
                }
                await this._scanForIgnoreFiles(fullPath);
            }
        } catch {
            // ignore
        }
    }

    private _isCommonIgnoredDir(dirName: string): boolean {
        return COMMON_IGNORED_DIRS.includes(dirName);
    }

    private _parseIgnoreFile(content: string, fileName: string): IgnorePattern[] {
        const patterns: IgnorePattern[] = [];
        for (const line of content.split('\n')) {
            let trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const isNegation = trimmed.startsWith('!');
            if (isNegation) trimmed = trimmed.slice(1);
            const isRootAnchored = trimmed.startsWith('/');
            if (isRootAnchored) trimmed = trimmed.slice(1);
            const isDir = trimmed.endsWith('/');
            if (isDir) trimmed = trimmed.slice(0, -1);
            if (trimmed) {
                patterns.push({pattern: trimmed, isNegation, isDir, isRootAnchored, source: fileName});
            }
        }
        return patterns;
    }

    shouldIgnore(relativePath: string): boolean {
        if (!this._initialized) return false;
        const normalizedPath = relativePath.replace(/\\/g, '/');
        const pathParts = normalizedPath.split('/');
        const fileName = pathParts[pathParts.length - 1] ?? '';
        let ignored = false;
        let matchedPattern: IgnorePattern | null = null;

        for (const pattern of this.ignorePatterns) {
            if (pattern.isNegation) continue;
            const patternStr = pattern.pattern;
            const isRootAnchored = pattern.isRootAnchored;
            if (isRootAnchored) {
                if (normalizedPath === patternStr || normalizedPath.startsWith(patternStr + '/')) {
                    ignored = true;
                    matchedPattern = pattern;
                    break;
                }
            } else {
                for (const part of pathParts) {
                    if (this._matchComponent(part, patternStr, pattern.isDir)) {
                        ignored = true;
                        matchedPattern = pattern;
                        break;
                    }
                }
                if (ignored) break;
                if (!pattern.isDir && this._matchPattern(normalizedPath, patternStr)) {
                    ignored = true;
                    matchedPattern = pattern;
                    break;
                }
            }
        }

        if (ignored && matchedPattern) {
            for (const pattern of this.ignorePatterns) {
                if (!pattern.isNegation) continue;
                const patternStr = pattern.pattern;
                if (
                    this._matchPattern(normalizedPath, patternStr) ||
                    this._matchComponent(fileName, patternStr, pattern.isDir)
                ) {
                    if (matchedPattern.pattern === patternStr || normalizedPath.includes(patternStr)) {
                        ignored = false;
                        break;
                    }
                }
            }
        }
        return ignored;
    }

    private _matchComponent(component: string, pattern: string, isDirPattern: boolean): boolean {
        if (pattern.includes('*') || pattern.includes('?')) return this._matchPattern(component, pattern);
        if (isDirPattern) return component === pattern;
        if (pattern.startsWith('*.')) return component.endsWith(pattern.slice(1));
        return component === pattern;
    }

    private _matchPattern(pathStr: string, pattern: string): boolean {
        if (pattern.includes('*')) {
            const regexPattern = pattern
                .replace(/\./g, '\\.')
                .replace(/\*\*/g, '{{GLOBSTAR}}')
                .replace(/\*/g, '[^/]*')
                .replace(/{{GLOBSTAR}}/g, '.*')
                .replace(/\?/g, '.');
            try {
                return new RegExp(`^${regexPattern}$`).test(pathStr);
            } catch {
                return false;
            }
        }
        if (pathStr === pattern || pathStr.startsWith(pattern + '/')) return true;
        for (const part of pathStr.split('/')) {
            if (part === pattern) return true;
        }
        return false;
    }

    getIgnoreFiles(): IgnoreFileFound[] {
        return this.ignoreFilesFound;
    }

    getPatterns(): IgnorePattern[] {
        return this.ignorePatterns;
    }

    getDirectoriesToSkip(): string[] {
        const dirsToSkip = new Set<string>();
        for (const pattern of this.ignorePatterns) {
            if (pattern.isNegation) continue;
            const patternStr = pattern.pattern;
            if (pattern.isDir || patternStr.includes('**')) {
                const dirName = patternStr.replace(/\*\*.*$/, '').replace(/\/+$/, '');
                if (dirName) dirsToSkip.add(dirName);
            }
        }
        return Array.from(dirsToSkip);
    }

    filterEntries(entries: ScanEntry[]): ScanEntry[] {
        return entries.filter((entry) => !this.shouldIgnore(entry.path));
    }

    shouldSkipDirectory(dirName: string, parentPath = ''): boolean {
        if (this._isCommonIgnoredDir(dirName)) return true;
        const relativePath = parentPath ? `${parentPath}/${dirName}` : dirName;
        return this.shouldIgnore(relativePath);
    }

    addPatterns(patterns: string[] | string): void {
        const arr = Array.isArray(patterns) ? patterns : [patterns];
        for (const pattern of arr) {
            this.ignorePatterns.push({
                pattern,
                isNegation: false,
                isDir: false,
                isRootAnchored: false,
                source: 'programmatic',
            });
        }
    }
}
