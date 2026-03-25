/**
 * RAG Integrator - Connects File Scanner with RAG System
 */

import fs from 'fs/promises';
import path from 'path';
import {FileScanner, GlobMatcher} from '@a2a/execution/fs-utils';
import type {ScannedFile} from '@a2a/execution/fs-utils';
import {RAGIndexer} from './indexer.js';
import {ChunkManager} from './chunk-manager.js';
import chokidar from 'chokidar';

export interface RAGIntegratorConfig {
    projectPath?: string;
    includePatterns?: string[];
    excludePatterns?: string[];
    maxDepth?: number;
    maxFiles?: number;
}

export interface IndexFileInput {
    path: string;
    relativePath?: string;
    name?: string;
    ext: string;
}

export class RAGIntegrator {
    private config: RAGIntegratorConfig & { projectPath: string };
    private scanner: FileScanner;
    private indexer: RAGIndexer;
    private chunkManager: ChunkManager;
    private watcher: ReturnType<typeof chokidar.watch> | null = null;
    isWatching = false;
    private fileCache = new Map<string, string>();

    constructor(config: RAGIntegratorConfig = {}) {
        const projectPath = config.projectPath ?? process.cwd();
        this.config = {...config, projectPath};
        this.scanner = new FileScanner({
            rootPath: projectPath,
            includePatterns: config.includePatterns ?? [...GlobMatcher.PATTERNS.CODE],
            excludePatterns: config.excludePatterns ?? [...GlobMatcher.PATTERNS.EXCLUDE],
            maxDepth: config.maxDepth ?? 0,
            maxFiles: config.maxFiles ?? 100000,
        });
        this.indexer = new RAGIndexer({...config, projectPath});
        this.chunkManager = new ChunkManager(config as import('./chunk-manager.js').ChunkManagerConfig);
    }

    async scanAndIndex(): Promise<import('@a2a/execution/fs-utils').ScanResult> {
        const scanResult = await this.scanner.scan();
        for (const file of scanResult.files) {
            await this.indexFile(file);
        }
        return scanResult;
    }

    async indexFile(file: ScannedFile | IndexFileInput): Promise<{
        success: boolean;
        file: ScannedFile | IndexFileInput;
        chunks?: number;
        error?: string
    }> {
        try {
            const content = await this.readFile(file.path);
            const chunks = this.chunkManager.chunkFile(file.path, content, file.ext);
            for (const chunk of chunks) {
                await this.indexer.indexChunk(chunk);
            }
            this.fileCache.set(file.path, content);
            return {success: true, file, chunks: chunks.length};
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {success: false, file, error: message};
        }
    }

    async readFile(filePath: string): Promise<string> {
        const cached = this.fileCache.get(filePath);
        if (cached) return cached;
        const content = await fs.readFile(filePath, 'utf-8');
        this.fileCache.set(filePath, content);
        return content;
    }

    startWatching(): void {
        if (this.isWatching) return;
        this.watcher = chokidar.watch(this.config.projectPath, {
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {stabilityThreshold: 2000, pollInterval: 100},
            ignored: this.scanner.excludePatterns,
        });
        this.watcher
            .on('add', (p: string) => this.handleFileChange('add', p))
            .on('change', (p: string) => this.handleFileChange('change', p))
            .on('unlink', (p: string) => this.handleFileChange('unlink', p))
            .on('addDir', (p: string) => this.handleDirectoryChange('add', p))
            .on('unlinkDir', (p: string) => this.handleDirectoryChange('unlink', p));
        this.isWatching = true;
    }

    private async handleFileChange(event: string, filePath: string): Promise<void> {
        try {
            const relativePath = path.relative(this.config.projectPath, filePath);
            if (event === 'add' || event === 'change') {
                await this.indexFile({
                    path: filePath,
                    relativePath,
                    name: path.basename(filePath),
                    ext: path.extname(filePath).toLowerCase(),
                });
            } else if (event === 'unlink') {
                await this.indexer.removeFile(filePath);
            }
        } catch {
            // ignore
        }
    }

    private async handleDirectoryChange(event: string, dirPath: string): Promise<void> {
        try {
            if (event === 'unlink') {
                await this.indexer.removeDirectory(dirPath);
            }
        } catch {
            // ignore
        }
    }

    stopWatching(): void {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
            this.isWatching = false;
        }
    }

    getStats(): { filesIndexed: number; chunksIndexed: number; watching: boolean; cacheSize: number } {
        return {
            filesIndexed: this.indexer.getIndexedFilesCount(),
            chunksIndexed: this.indexer.getIndexedChunksCount(),
            watching: this.isWatching,
            cacheSize: this.fileCache.size,
        };
    }

    clearCache(): void {
        this.fileCache.clear();
    }

    dispose(): void {
        this.stopWatching();
        this.clearCache();
        this.indexer.dispose();
    }
}
