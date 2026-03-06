/**
 * RAG Indexer - Local project indexing
 */
import { IgnoreDetector } from '@a2a/fs-utils';
import { type Chunk } from './chunk-manager.js';
import type { FileRelevanceLabel } from './file-relevance';
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
export declare class RAGIndexer {
    projectPath: string;
    indexPath: string;
    includePatterns: string[];
    excludePatterns: string[];
    ignoreDetector: IgnoreDetector | null;
    private _initIgnoreDetectorPromise;
    private chunkManager;
    index: RAGIndexData | null;
    private fileRelevanceModel?;
    constructor(config: RAGIndexerConfig);
    private _initIgnoreDetector;
    private _ensureIgnoreDetector;
    indexProject(force?: boolean): Promise<RAGIndexData>;
    /**
     * Get indexing status - returns info about current index state
     */
    getIndexStatus(): Promise<{
        hasIndex: boolean;
        fileCount: number;
        timestamp: string | null;
    }>;
    indexFile(filePath: string): Promise<{
        file: IndexFileInfo;
        chunks: Chunk[];
    } | null>;
    walkDirectory(dir: string, files?: string[]): Promise<string[]>;
    shouldExcludeDir(relativePath: string): boolean;
    shouldExcludeFile(relativePath: string): boolean;
    matchPattern(filePath: string, pattern: string): boolean;
    private matchFileName;
    detectLanguage(ext: string): string;
    indexChunk(chunk: Chunk): Promise<void>;
    removeFile(filePath: string): Promise<void>;
    removeDirectory(dirPath: string): Promise<void>;
    getIndexedFilesCount(): number;
    getIndexedChunksCount(): number;
    dispose(): void;
}
