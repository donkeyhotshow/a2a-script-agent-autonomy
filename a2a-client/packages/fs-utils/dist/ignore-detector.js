"use strict";
/**
 * Ignore Detector - Detects and parses IDE ignore files
 * Supports .gitignore, .cursorignore, .a2aignore and custom ignore files
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgnoreDetector = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const DEFAULT_IGNORE_FILES = ['.gitignore', '.cursorignore', '.a2aignore'];
const COMMON_IGNORED_DIRS = [
    'node_modules', '.git', '.svn', '.hg', '__pycache__', '.cache',
    'dist', 'build', 'coverage', '.next', '.nuxt', 'vendor', 'storage', '.a2a',
];
const DEFAULT_PATTERNS = [
    'node_modules', 'vendor', '.git', '.svn', '.hg', 'dist', 'build',
    'storage', '.a2a', '.cache', 'coverage',
];
class IgnoreDetector {
    get initialized() {
        return this._initialized;
    }
    constructor(config = {}) {
        this.ignorePatterns = [];
        this.ignoreFilesFound = [];
        this._initialized = false;
        this.projectPath = config.projectPath ?? process.cwd();
        this.customIgnoreFiles = config.customIgnoreFiles ?? [];
        this.additionalPatterns = config.additionalPatterns ?? [];
    }
    async initialize() {
        if (this._initialized)
            return this;
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
                await fs.access(fullPath);
                const content = await fs.readFile(fullPath, 'utf-8');
                const patterns = this._parseIgnoreFile(content, ignoreFile);
                this.ignorePatterns.push(...patterns);
                this.ignoreFilesFound.push({ name: ignoreFile, path: fullPath, patterns: patterns.length });
            }
            catch {
                // file doesn't exist
            }
        }
        await this._scanForIgnoreFiles(this.projectPath);
        this._initialized = true;
        return this;
    }
    async _scanForIgnoreFiles(dirPath) {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue;
                const fullPath = path.join(dirPath, entry.name);
                if (this._isCommonIgnoredDir(entry.name))
                    continue;
                for (const ignoreFile of DEFAULT_IGNORE_FILES) {
                    const ignoreFilePath = path.join(fullPath, ignoreFile);
                    try {
                        await fs.access(ignoreFilePath);
                        const content = await fs.readFile(ignoreFilePath, 'utf-8');
                        const patterns = this._parseIgnoreFile(content, ignoreFile);
                        const dirPrefix = path.relative(this.projectPath, fullPath);
                        const prefixedPatterns = patterns.map((p) => ({
                            ...p,
                            pattern: `${dirPrefix}/${p.pattern}`,
                            originalPattern: p.pattern,
                            isRootAnchored: false,
                        }));
                        this.ignorePatterns.push(...prefixedPatterns);
                        this.ignoreFilesFound.push({ name: ignoreFile, path: ignoreFilePath, patterns: patterns.length });
                    }
                    catch {
                        // skip
                    }
                }
                await this._scanForIgnoreFiles(fullPath);
            }
        }
        catch {
            // ignore
        }
    }
    _isCommonIgnoredDir(dirName) {
        return COMMON_IGNORED_DIRS.includes(dirName);
    }
    _parseIgnoreFile(content, fileName) {
        const patterns = [];
        for (const line of content.split('\n')) {
            let trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
            const isNegation = trimmed.startsWith('!');
            if (isNegation)
                trimmed = trimmed.slice(1);
            const isRootAnchored = trimmed.startsWith('/');
            if (isRootAnchored)
                trimmed = trimmed.slice(1);
            const isDir = trimmed.endsWith('/');
            if (isDir)
                trimmed = trimmed.slice(0, -1);
            if (trimmed) {
                patterns.push({ pattern: trimmed, isNegation, isDir, isRootAnchored, source: fileName });
            }
        }
        return patterns;
    }
    shouldIgnore(relativePath) {
        if (!this._initialized)
            return false;
        const normalizedPath = relativePath.replace(/\\/g, '/');
        const pathParts = normalizedPath.split('/');
        const fileName = pathParts[pathParts.length - 1] ?? '';
        let ignored = false;
        let matchedPattern = null;
        for (const pattern of this.ignorePatterns) {
            if (pattern.isNegation)
                continue;
            const patternStr = pattern.pattern;
            const isRootAnchored = pattern.isRootAnchored;
            if (isRootAnchored) {
                if (normalizedPath === patternStr || normalizedPath.startsWith(patternStr + '/')) {
                    ignored = true;
                    matchedPattern = pattern;
                    break;
                }
            }
            else {
                for (const part of pathParts) {
                    if (this._matchComponent(part, patternStr, pattern.isDir)) {
                        ignored = true;
                        matchedPattern = pattern;
                        break;
                    }
                }
                if (ignored)
                    break;
                if (!pattern.isDir && this._matchPattern(normalizedPath, patternStr)) {
                    ignored = true;
                    matchedPattern = pattern;
                    break;
                }
            }
        }
        if (ignored && matchedPattern) {
            for (const pattern of this.ignorePatterns) {
                if (!pattern.isNegation)
                    continue;
                const patternStr = pattern.pattern;
                if (this._matchPattern(normalizedPath, patternStr) ||
                    this._matchComponent(fileName, patternStr, pattern.isDir)) {
                    if (matchedPattern.pattern === patternStr || normalizedPath.includes(patternStr)) {
                        ignored = false;
                        break;
                    }
                }
            }
        }
        return ignored;
    }
    _matchComponent(component, pattern, isDirPattern) {
        if (pattern.includes('*') || pattern.includes('?'))
            return this._matchPattern(component, pattern);
        if (isDirPattern)
            return component === pattern;
        if (pattern.startsWith('*.'))
            return component.endsWith(pattern.slice(1));
        return component === pattern;
    }
    _matchPattern(pathStr, pattern) {
        if (pattern.includes('*')) {
            const regexPattern = pattern
                .replace(/\./g, '\\.')
                .replace(/\*\*/g, '{{GLOBSTAR}}')
                .replace(/\*/g, '[^/]*')
                .replace(/{{GLOBSTAR}}/g, '.*')
                .replace(/\?/g, '.');
            try {
                return new RegExp(`^${regexPattern}$`).test(pathStr);
            }
            catch {
                return false;
            }
        }
        if (pathStr === pattern || pathStr.startsWith(pattern + '/'))
            return true;
        for (const part of pathStr.split('/')) {
            if (part === pattern)
                return true;
        }
        return false;
    }
    getIgnoreFiles() {
        return this.ignoreFilesFound;
    }
    getPatterns() {
        return this.ignorePatterns;
    }
    getDirectoriesToSkip() {
        const dirsToSkip = new Set();
        for (const pattern of this.ignorePatterns) {
            if (pattern.isNegation)
                continue;
            const patternStr = pattern.pattern;
            if (pattern.isDir || patternStr.includes('**')) {
                const dirName = patternStr.replace(/\*\*.*$/, '').replace(/\/+$/, '');
                if (dirName)
                    dirsToSkip.add(dirName);
            }
        }
        return Array.from(dirsToSkip);
    }
    filterEntries(entries) {
        return entries.filter((entry) => !this.shouldIgnore(entry.path));
    }
    shouldSkipDirectory(dirName, parentPath = '') {
        if (this._isCommonIgnoredDir(dirName))
            return true;
        const relativePath = parentPath ? `${parentPath}/${dirName}` : dirName;
        return this.shouldIgnore(relativePath);
    }
    addPatterns(patterns) {
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
exports.IgnoreDetector = IgnoreDetector;
