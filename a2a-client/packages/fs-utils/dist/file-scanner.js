"use strict";
/**
 * File Scanner - scan directories with include/exclude patterns
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
exports.FileScanner = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const glob_matcher_1 = require("./glob-matcher");
class FileScanner {
    constructor(config = {}) {
        this.rootPath = config.rootPath ?? process.cwd();
        this.includePatterns = config.includePatterns ?? [...glob_matcher_1.GlobMatcher.PATTERNS.CODE];
        this.excludePatterns = config.excludePatterns ?? [...glob_matcher_1.GlobMatcher.PATTERNS.EXCLUDE];
        this.maxDepth = config.maxDepth ?? 0;
        this.maxFiles = config.maxFiles ?? 100000;
        this.onProgress = config.onProgress;
        this.includeMatcher = new glob_matcher_1.GlobMatcher(this.includePatterns);
        this.excludeMatcher = new glob_matcher_1.GlobMatcher(this.excludePatterns);
    }
    async scan(dir, options = {}) {
        const files = [];
        const stats = {
            totalFiles: 0,
            totalDirs: 0,
            skippedDirs: 0,
            skippedFiles: 0,
            errors: [],
        };
        await this.walkDirectory(dir ?? this.rootPath, files, stats, 0, options);
        return { files, stats, rootPath: this.rootPath };
    }
    async walkDirectory(dir, files, stats, depth, _options) {
        if (files.length >= this.maxFiles)
            return;
        if (this.maxDepth > 0 && depth > this.maxDepth)
            return;
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        }
        catch (e) {
            stats.errors.push({ path: dir, error: e.message });
            return;
        }
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(this.rootPath, fullPath);
            if (entry.isDirectory()) {
                stats.totalDirs++;
                if (this.shouldExcludeDir(relativePath)) {
                    stats.skippedDirs++;
                    continue;
                }
                if (this.onProgress && stats.totalDirs % 100 === 0) {
                    this.onProgress({ type: 'dir', path: relativePath, stats });
                }
                await this.walkDirectory(fullPath, files, stats, depth + 1, _options);
            }
            else if (entry.isFile()) {
                stats.totalFiles++;
                const shouldInclude = this.shouldIncludeFile(relativePath);
                const shouldExclude = this.shouldExcludeFile(relativePath);
                if (shouldInclude && !shouldExclude) {
                    files.push({
                        path: fullPath,
                        relativePath,
                        name: entry.name,
                        ext: path.extname(entry.name).toLowerCase(),
                    });
                }
                else {
                    stats.skippedFiles++;
                }
            }
        }
    }
    shouldIncludeFile(relativePath) {
        return this.includeMatcher.match(relativePath);
    }
    shouldExcludeFile(relativePath) {
        return this.excludeMatcher.match(relativePath);
    }
    shouldExcludeDir(relativePath) {
        return this.excludeMatcher.match(relativePath + '/') || this.excludeMatcher.match(relativePath);
    }
    static async scan(dir, options = {}) {
        const scanner = new FileScanner({ rootPath: dir, ...options });
        return scanner.scan();
    }
    async scanByExtension(dir, extensions) {
        const exts = Array.isArray(extensions) ? extensions : [extensions];
        const normalizedExts = exts.map((e) => (e.startsWith('.') ? e : '.' + e));
        const result = await this.scan(dir);
        return {
            ...result,
            files: result.files.filter((f) => normalizedExts.includes(f.ext)),
        };
    }
}
exports.FileScanner = FileScanner;
