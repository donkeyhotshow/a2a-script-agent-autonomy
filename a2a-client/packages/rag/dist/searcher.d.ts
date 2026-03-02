/**
 * RAG Searcher - Search in indexed files
 */
import {TFIDFService} from './tfidf.js';
import type {Chunk} from './chunk-manager.js';
import type {RAGIndexData, IndexFileInfo} from './indexer.js';

export interface RAGSearcherConfig {
    projectPath?: string;
    useTFIDF?: boolean;
}

export interface SearchOptions {
    limit?: number;
}

export interface HybridSearchOptions extends SearchOptions {
    keywordWeight?: number;
    tfidfWeight?: number;
    k?: number;
}

export interface SearchResult {
    chunk: Chunk;
    score: number;
    highlights: string[];
}

export interface TFIDFResult {
    id: string;
    score: number;
    chunk?: Chunk;
}

interface ExtractedKeywords {
    words: string[];
    techTerms: string[];
    methodNames: string[];
}

export declare class RAGSearcher {
    projectPath: string;
    private indexPath;
    index: RAGIndexData | null;
    useTFIDF: boolean;
    tfidf: TFIDFService | null;
    private tfidfIndexed;

    constructor(config?: RAGSearcherConfig);

    loadIndex(): Promise<RAGIndexData>;

    indexDocument(id: string, content: string): void;

    indexDocuments(documents: Array<{
        id: string;
        content: string;
    }>): void;

    buildTFIDFIndex(): Promise<void>;

    searchTFIDF(query: string, topK?: number): Promise<Array<TFIDFResult>>;

    searchHybrid(query: string, options?: HybridSearchOptions): Promise<Array<SearchResult & {
        details: Record<string, number | null>;
    }>>;

    getTFIDFStats(): ReturnType<TFIDFService['getStats']> | null;

    clearTFIDFIndex(): void;

    search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

    searchFiles(pattern: string): Promise<IndexFileInfo[]>;

    getFileContent(relativePath: string): Promise<string>;

    getFileChunks(relativePath: string): Promise<Chunk[]>;

    extractKeywords(query: string): ExtractedKeywords;

    scoreChunk(chunk: Chunk, keywords: ExtractedKeywords, _originalQuery: string): number;

    findHighlights(content: string, keywords: ExtractedKeywords): string[];

    matchPattern(filePath: string, pattern: string): boolean;

    dispose(): void;
}

export {};
