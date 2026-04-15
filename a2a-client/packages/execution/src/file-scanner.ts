/**
 * File Scanner - scan directories with include/exclude patterns
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {GlobMatcher} from './glob-matcher.js';
import type {IgnoreDetector} from './ignore-detector.js';

export interface FileScannerConfig {
    rootPath?: string;
    includePatterns?: string[];
    excludePatterns?: string[];
    maxDepth?: number;
    maxFiles?: number;
    onProgress?: (info: { type: string; path: string; stats: ScanStats }) => void;
    /** When set and initialized, scan results are filtered with ignore rules (parity with scanWithIgnore). */
    ignoreDetector?: IgnoreDetector | null;
}

export interface ScanStats {
    totalFiles: number;
    totalDirs: number;
    skippedDirs: number;
    skippedFiles: number;
    errors: Array<{ path: string; error: string }>;
}

export interface ScannedFile {
    path: string;
    relativePath: string;
    name: string;
    ext: string;
}

export interface ScanResult {
    files: ScannedFile[];
    stats: ScanStats;
    rootPath: string;
}

export class FileScanner {
    rootPath: string;
    includePatterns: string[];
    excludePatterns: string[];
    maxDepth: number;
    maxFiles: number;
    onProgress: FileScannerConfig['onProgress'];
    private includeMatcher: GlobMatcher;
    private excludeMatcher: GlobMatcher;
    private readonly ignoreDetector: IgnoreDetector | null;

    constructor(config: FileScannerConfig = {}) {
        this.rootPath = config.rootPath ?? process.cwd();
        this.includePatterns = config.includePatterns ?? [...GlobMatcher.PATTERNS.CODE];
        this.excludePatterns = config.excludePatterns ?? [...GlobMatcher.PATTERNS.EXCLUDE];
        this.maxDepth = config.maxDepth ?? 0;
        this.maxFiles = config.maxFiles ?? 100000;
        this.onProgress = config.onProgress;
        this.includeMatcher = new GlobMatcher(this.includePatterns);
        this.excludeMatcher = new GlobMatcher(this.excludePatterns);
        this.ignoreDetector = config.ignoreDetector ?? null;
    }

    async scan(dir?: string, options: FileScannerConfig = {}): Promise<ScanResult> {
        const files: ScannedFile[] = [];
        const stats: ScanStats = {
            totalFiles: 0,
            totalDirs: 0,
            skippedDirs: 0,
            skippedFiles: 0,
            errors: [],
        };
        await this.walkDirectory(dir ?? this.rootPath, files, stats, 0, options);
        const base: ScanResult = {files, stats, rootPath: this.rootPath};
        const det = this.ignoreDetector;
        if (det?.initialized) {
            const kept: ScannedFile[] = [];
            for (const file of files) {
                if (!det.shouldIgnore(file.relativePath)) kept.push(file);
            }
            const skipped = files.length - kept.length;
            return {
                files: kept,
                stats: {...stats, skippedFiles: stats.skippedFiles + skipped},
                rootPath: this.rootPath,
            };
        }
        return base;
    }

    private async walkDirectory(
        dir: string,
        files: ScannedFile[],
        stats: ScanStats,
        depth: number,
        _options: FileScannerConfig
    ): Promise<void> {
        if (files.length >= this.maxFiles) return;
        if (this.maxDepth > 0 && depth > this.maxDepth) return;

        let entries: import('fs').Dirent[];
        try {
            entries = await fs.readdir(dir, {withFileTypes: true});
        } catch (e) {
            stats.errors.push({path: dir, error: (e as Error).message});
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
                    this.onProgress({type: 'dir', path: relativePath, stats});
                }
                await this.walkDirectory(fullPath, files, stats, depth + 1, _options);
            } else if (entry.isFile()) {
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
                } else {
                    stats.skippedFiles++;
                }
            }
        }
    }

    shouldIncludeFile(relativePath: string): boolean {
        return this.includeMatcher.match(relativePath);
    }

    shouldExcludeFile(relativePath: string): boolean {
        return this.excludeMatcher.match(relativePath);
    }

    shouldExcludeDir(relativePath: string): boolean {
        return this.excludeMatcher.match(relativePath + '/') || this.excludeMatcher.match(relativePath);
    }

    static async scan(dir: string, options: FileScannerConfig = {}): Promise<ScanResult> {
        const scanner = new FileScanner({rootPath: dir, ...options});
        return scanner.scan();
    }

    async scanByExtension(dir: string, extensions: string | string[]): Promise<ScanResult> {
        const exts = Array.isArray(extensions) ? extensions : [extensions];
        const normalizedExts = exts.map((e) => (e.startsWith('.') ? e : '.' + e));
        const result = await this.scan(dir);
        return {
            ...result,
            files: result.files.filter((f) => normalizedExts.includes(f.ext)),
        };
    }
}
