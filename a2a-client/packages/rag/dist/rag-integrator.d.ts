/**
 * RAG Integrator - Connects File Scanner with RAG System
 */
import type { ScannedFile } from '@a2a/fs-utils';
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
export declare class RAGIntegrator {
    private config;
    private scanner;
    private indexer;
    private chunkManager;
    private watcher;
    isWatching: boolean;
    private fileCache;
    constructor(config?: RAGIntegratorConfig);
    scanAndIndex(): Promise<import('@a2a/fs-utils').ScanResult>;
    indexFile(file: ScannedFile | IndexFileInput): Promise<{
        success: boolean;
        file: ScannedFile | IndexFileInput;
        chunks?: number;
        error?: string;
    }>;
    readFile(filePath: string): Promise<string>;
    startWatching(): void;
    private handleFileChange;
    private handleDirectoryChange;
    stopWatching(): void;
    getStats(): {
        filesIndexed: number;
        chunksIndexed: number;
        watching: boolean;
        cacheSize: number;
    };
    clearCache(): void;
    dispose(): void;
}
