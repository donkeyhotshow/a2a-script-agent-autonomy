/**
 * RAG Indexer - Local project indexing
 */

import fs from 'fs/promises';
import path from 'path';
import {IgnoreDetector} from '@a2a/fs-utils';
import {ChunkManager, type Chunk, type ChunkManagerConfig} from './chunk-manager.js';
import {scoreFileRelevance} from './file-relevance.js';
import type {FileRelevanceLabel, FileRelevanceModel} from './file-relevance';

export interface RAGIndexerConfig {
    projectPath: string;
    includePatterns?: string[];
    excludePatterns?: string[];
    customIgnoreFiles?: string[];
}

export interface IndexFileInfo {
    path: string;
    ext: string;
    size: number;
    modified: string;
    hash: string;
    language: string;
    /**
     * Optional relevance score and metadata produced by file-relevance module.
     * Used by RAG searcher to downrank low-signal files (archives, backups, storage, etc).
     */
    relevanceScore?: number;
    relevanceLabel?: FileRelevanceLabel;
    relevanceReasons?: string[];
}

export interface RAGIndexData {
    version: string;
    timestamp: string;
    projectPath: string;
    files: IndexFileInfo[];
    chunks: Chunk[];
}

const DEFAULT_EXCLUDE = [
    '.a2a/', '.a2a/index/**', '.a2a/index/rag-files.json', '.amazonq/**', '.cursor/**',
    '.idea/**', '.vscode/**', 'node_modules/**', 'node_modules/', 'vendor/**', 'storage/**',
    '.git/**', '.carrier/**', '.carior/**', 'dist/**', 'build/**', 'package-lock.json',
];

export class RAGIndexer {
    projectPath: string;
    indexPath: string;
    includePatterns: string[];
    excludePatterns: string[];
    ignoreDetector: IgnoreDetector | null = null;
    private _initIgnoreDetectorPromise: Promise<void>;
    private chunkManager: ChunkManager;
    index: RAGIndexData | null = null;
    private fileRelevanceModel?: FileRelevanceModel;

    constructor(config: RAGIndexerConfig) {
        this.projectPath = config.projectPath;
        this.indexPath = path.join(this.projectPath, '.a2a', 'index');
        this.includePatterns = config.includePatterns ?? ['**/*.php', '**/*.js', '**/*.vue', '**/*.ts', '**/*.tsx', '**/*.json', '**/*.md', '**/*.sql'];
        this.excludePatterns = config.excludePatterns ?? DEFAULT_EXCLUDE;
        this.chunkManager = new ChunkManager(config as unknown as ChunkManagerConfig);
        this.fileRelevanceModel = (config as unknown as {fileRelevanceModel?: FileRelevanceModel}).fileRelevanceModel;
        this._initIgnoreDetectorPromise = this._initIgnoreDetector(config);
    }

    private async _initIgnoreDetector(config: RAGIndexerConfig): Promise<void> {
        try {
            this.ignoreDetector = new IgnoreDetector({
                projectPath: this.projectPath,
                customIgnoreFiles: config.customIgnoreFiles ?? [],
            });
            await this.ignoreDetector.initialize();
        } catch {
            // ignore
        }
    }

    private async _ensureIgnoreDetector(): Promise<void> {
        await this._initIgnoreDetectorPromise;
    }

    async indexProject(force = false): Promise<RAGIndexData> {
        await fs.mkdir(this.indexPath, {recursive: true});
        await this._ensureIgnoreDetector();
        
        // Try to load existing index for incremental indexing
        let existingIndex: RAGIndexData | null = null;
        if (!force) {
            try {
                const indexFilePath = path.join(this.indexPath, 'rag-files.json');
                const existingIndexRaw = await fs.readFile(indexFilePath, 'utf-8');
                existingIndex = JSON.parse(existingIndexRaw);
                console.log('[RAG] Loaded existing index with', existingIndex!.files.length, 'files');
            } catch {
                console.log('[RAG] No existing index found, starting fresh');
            }
        }
        
        // Build hash map of existing index for fast lookup
        const existingHashes = new Map<string, string>();
        if (existingIndex) {
            for (const file of existingIndex.files) {
                existingHashes.set(file.path, file.hash);
            }
        }
        
        const files = await this.walkDirectory(this.projectPath);
        const index: RAGIndexData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            projectPath: this.projectPath,
            files: [],
            chunks: [],
        };

        let changedCount = 0;
        let unchangedCount = 0;
        let skippedCount = 0;
        
        for (const filePath of files) {
            try {
                const relativePath = path.relative(this.projectPath, filePath).replace(/\\/g, '/');
                
                // Compute hash for this file
                const content = await fs.readFile(filePath, 'utf-8');
                const newHash = this.chunkManager.hashContent(content);
                
                // Check if file changed
                const existingHash = existingHashes.get(relativePath);
                if (existingHash && existingHash === newHash && !force) {
                    // File unchanged - use existing chunks
                    const existingFile = existingIndex?.files.find(f => f.path === relativePath);
                    const existingChunks = existingIndex?.chunks.filter(c => c.filePath === relativePath);
                    
                    if (existingFile && existingChunks && existingChunks.length > 0) {
                        index.files.push(existingFile);
                        index.chunks.push(...existingChunks);
                        unchangedCount++;
                        continue;
                    }
                }
                
                // File changed or not in existing index - reindex
                const fileInfo = await this.indexFile(filePath);
                if (fileInfo) {
                    index.files.push(fileInfo.file);
                    index.chunks.push(...fileInfo.chunks);
                    changedCount++;
                }
            } catch {
                skippedCount++;
            }
        }
        
        console.log(`[RAG] Indexing complete: ${changedCount} changed, ${unchangedCount} unchanged, ${skippedCount} skipped`);

        const indexFilePath = path.join(this.indexPath, 'rag-files.json');
        try {
            await fs.unlink(indexFilePath);
        } catch {
            // ignore
        }
        await fs.writeFile(indexFilePath, JSON.stringify(index, null, 2));
        this.index = index;
        return index;
    }

    /**
     * Index project with parallel batch processing for faster indexing
     * @param batchSize Number of files to process in parallel (default: 10)
     * @param force Force full reindex
     */
    async indexProjectParallel(batchSize = 10, force = false): Promise<RAGIndexData> {
        await fs.mkdir(this.indexPath, {recursive: true});
        await this._ensureIgnoreDetector();

        // Try to load existing index for incremental indexing
        let existingIndex: RAGIndexData | null = null;
        if (!force) {
            try {
                const indexFilePath = path.join(this.indexPath, 'rag-files.json');
                const existingIndexRaw = await fs.readFile(indexFilePath, 'utf-8');
                existingIndex = JSON.parse(existingIndexRaw);
                console.log('[RAG] Loaded existing index with', existingIndex!.files.length, 'files');
            } catch {
                console.log('[RAG] No existing index found, starting fresh');
            }
        }

        // Build hash map of existing index for fast lookup
        const existingHashes = new Map<string, string>();
        if (existingIndex) {
            for (const file of existingIndex.files) {
                existingHashes.set(file.path, file.hash);
            }
        }

        const files = await this.walkDirectory(this.projectPath);
        const index: RAGIndexData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            projectPath: this.projectPath,
            files: [],
            chunks: [],
        };

        // Separate files into unchanged (can skip) and need processing
        const unchangedFiles: { file: IndexFileInfo; chunks: Chunk[] }[] = [];
        const filesToProcess: string[] = [];

        for (const filePath of files) {
            try {
                const relativePath = path.relative(this.projectPath, filePath).replace(/\\/g, '/');
                const content = await fs.readFile(filePath, 'utf-8');
                const newHash = this.chunkManager.hashContent(content);

                const existingHash = existingHashes.get(relativePath);
                if (existingHash && existingHash === newHash && !force) {
                    // File unchanged - use existing chunks
                    const existingFile = existingIndex?.files.find(f => f.path === relativePath);
                    const existingChunks = existingIndex?.chunks.filter(c => c.filePath === relativePath);

                    if (existingFile && existingChunks && existingChunks.length > 0) {
                        unchangedFiles.push({ file: existingFile, chunks: existingChunks });
                    } else {
                        filesToProcess.push(filePath);
                    }
                } else {
                    filesToProcess.push(filePath);
                }
            } catch {
                // Skip problematic files, will count them later
            }
        }

        console.log(`[RAG] Parallel indexing: ${unchangedFiles.length} unchanged, ${filesToProcess.length} to process`);

        // Process unchanged files immediately
        for (const { file, chunks } of unchangedFiles) {
            index.files.push(file);
            index.chunks.push(...chunks);
        }

        // Process files in parallel batches
        let processedCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < filesToProcess.length; i += batchSize) {
            const batch = filesToProcess.slice(i, i + batchSize);
            const results = await Promise.all(
                batch.map(async (filePath) => {
                    try {
                        return await this.indexFile(filePath);
                    } catch {
                        return null;
                    }
                })
            );

            for (const result of results) {
                if (result) {
                    index.files.push(result.file);
                    index.chunks.push(...result.chunks);
                    processedCount++;
                } else {
                    skippedCount++;
                }
            }

            if (i % (batchSize * 5) === 0) {
                console.log(`[RAG] Progress: ${Math.min(i + batchSize, filesToProcess.length)}/${filesToProcess.length} files`);
            }
        }

        console.log(`[RAG] Parallel indexing complete: ${processedCount} processed, ${unchangedFiles.length} unchanged, ${skippedCount} skipped`);

        const indexFilePath = path.join(this.indexPath, 'rag-files.json');
        try {
            await fs.unlink(indexFilePath);
        } catch {
            // ignore
        }
        await fs.writeFile(indexFilePath, JSON.stringify(index, null, 2));
        this.index = index;
        return index;
    }

    /**
     * Get indexing status - returns info about current index state
     */
    async getIndexStatus(): Promise<{hasIndex: boolean; fileCount: number; timestamp: string | null}> {
        try {
            const indexFilePath = path.join(this.indexPath, 'rag-files.json');
            const data = await fs.readFile(indexFilePath, 'utf-8');
            const index = JSON.parse(data) as RAGIndexData;
            return {
                hasIndex: true,
                fileCount: index.files.length,
                timestamp: index.timestamp
            };
        } catch {
            return {
                hasIndex: false,
                fileCount: 0,
                timestamp: null
            };
        }
    }

    async indexFile(filePath: string): Promise<{ file: IndexFileInfo; chunks: Chunk[] } | null> {
        const relativePath = path.relative(this.projectPath, filePath).replace(/\\/g, '/');
        const ext = path.extname(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);

        const file: IndexFileInfo = {
            path: relativePath,
            ext,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            hash: this.chunkManager.hashContent(content),
            language: this.detectLanguage(ext),
        };
        // Compute per-file relevance once during indexing.
        const relevance = scoreFileRelevance(
            {
                relativePath,
                ext,
                size: stats.size,
            },
            this.fileRelevanceModel
        );
        file.relevanceScore = relevance.relevance;
        file.relevanceLabel = relevance.label;
        file.relevanceReasons = relevance.reasons;
        const chunks = this.chunkManager.chunkFile(relativePath, content, ext);
        return {file, chunks};
    }

    async walkDirectory(dir: string, files: string[] = []): Promise<string[]> {
        const entries = await fs.readdir(dir, {withFileTypes: true});
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(this.projectPath, fullPath).replace(/\\/g, '/');

            if (entry.isDirectory()) {
                if (this.shouldExcludeDir(relativePath + '/')) continue;
                if (this.ignoreDetector?.shouldIgnore(relativePath)) continue;
                if (this.ignoreDetector?.shouldSkipDirectory(entry.name, path.relative(this.projectPath, dir))) continue;
                await this.walkDirectory(fullPath, files);
            } else if (entry.isFile()) {
                if (this.shouldExcludeFile(relativePath)) continue;
                if (this.ignoreDetector?.shouldIgnore(relativePath)) continue;
                files.push(fullPath);
            }
        }
        return files;
    }

    shouldExcludeDir(relativePath: string): boolean {
        return this.excludePatterns.some((p) => this.matchPattern(relativePath, p));
    }

    shouldExcludeFile(relativePath: string): boolean {
        if (this.excludePatterns.some((p) => this.matchPattern(relativePath, p))) return true;
        if (this.includePatterns.length > 0) {
            const included = this.includePatterns.some((p) => this.matchPattern(relativePath, p));
            return !included;
        }
        return false;
    }

    matchPattern(filePath: string, pattern: string): boolean {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const isDirPattern = pattern.endsWith('/');
        if (!pattern.includes('**')) {
            const searchName = isDirPattern ? pattern.slice(0, -1) : pattern;
            const pathParts = normalizedPath.split('/');
            for (const part of pathParts) {
                if (isDirPattern) {
                    if (part === searchName) return true;
                } else {
                    if (this.matchFileName(part, searchName)) return true;
                }
            }
            return false;
        }
        const regexPattern = pattern
            .replace(/\*\*\//g, '{{GLOBSTAR_SLASH}}')
            .replace(/\*\*/g, '{{GLOBSTAR}}')
            .replace(/\*/g, '{{STAR}}')
            .replace(/\./g, '\\.')
            .replace(/{{GLOBSTAR_SLASH}}/g, '(.*\\/)?')
            .replace(/{{GLOBSTAR}}/g, '.*')
            .replace(/{{STAR}}/g, '[^/]*');
        return new RegExp('^' + regexPattern + '$').test(normalizedPath);
    }

    private matchFileName(fileName: string, pattern: string): boolean {
        if (fileName === pattern) return true;
        if (pattern.includes('*')) {
            const re = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            return re.test(fileName);
        }
        return false;
    }

    detectLanguage(ext: string): string {
        const map: Record<string, string> = {
            '.php': 'php', '.js': 'javascript', '.ts': 'typescript', '.vue': 'vue',
            '.md': 'markdown', '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
        };
        return map[ext] ?? 'text';
    }

    async indexChunk(chunk: Chunk): Promise<void> {
        if (!this.index) return;
        if (!this.index.chunks.some((c) => c.id === chunk.id)) {
            this.index.chunks.push(chunk);
        }
    }

    async removeFile(filePath: string): Promise<void> {
        if (!this.index) return;
        const relativePath = filePath.replace(this.projectPath, '').replace(/^[\\/]/, '');
        this.index.files = this.index.files.filter((f) => f.path !== relativePath);
        this.index.chunks = this.index.chunks.filter((c) => c.filePath !== relativePath);
    }

    async removeDirectory(dirPath: string): Promise<void> {
        if (!this.index) return;
        const relativePath = dirPath.replace(this.projectPath, '').replace(/^[\\/]/, '');
        this.index.files = this.index.files.filter((f) => !f.path.startsWith(relativePath));
        this.index.chunks = this.index.chunks.filter((c) => !c.filePath.startsWith(relativePath));
    }

    getIndexedFilesCount(): number {
        return this.index?.files?.length ?? 0;
    }

    getIndexedChunksCount(): number {
        return this.index?.chunks?.length ?? 0;
    }

    /**
     * Health check for the index - returns diagnostics
     */
    async health(): Promise<{
        staleFiles: string[];
        orphanedChunks: number;
        coverage: number;
        totalFiles: number;
        totalChunks: number;
    }> {
        // Load index from disk
        let index: RAGIndexData;
        try {
            const indexFilePath = path.join(this.indexPath, 'rag-files.json');
            const content = await fs.readFile(indexFilePath, 'utf-8');
            index = JSON.parse(content) as RAGIndexData;
        } catch {
            return {
                staleFiles: [],
                orphanedChunks: 0,
                coverage: 0,
                totalFiles: 0,
                totalChunks: 0,
            };
        }

        const staleFiles: string[] = [];
        let orphanedChunks = 0;

        // Check for stale files (files that no longer exist)
        for (const file of index.files) {
            const fullPath = path.join(this.projectPath, file.path);
            try {
                await fs.access(fullPath);
            } catch {
                staleFiles.push(file.path);
            }
        }

        // Check for orphaned chunks (chunks without corresponding files)
        const filePaths = new Set(index.files.map((f: IndexFileInfo) => f.path));
        for (const chunk of index.chunks) {
            if (!filePaths.has(chunk.filePath)) {
                orphanedChunks++;
            }
        }

        // Calculate coverage (files with chunks / total files)
        const filesWithChunks = new Set(index.chunks.map((c: Chunk) => c.filePath));
        const coverage = index.files.length > 0
            ? filesWithChunks.size / index.files.length
            : 0;

        return {
            staleFiles,
            orphanedChunks,
            coverage,
            totalFiles: index.files.length,
            totalChunks: index.chunks.length,
        };
    }

    dispose(): void {
        this.index = null;
    }
}
