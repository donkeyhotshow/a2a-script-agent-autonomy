/**
 * RAG Types
 * 
 * Types related to Retrieval-Augmented Generation
 */

export interface RAGConfig {
    projectPath: string;
    includePatterns?: string[];
    excludePatterns?: string[];
    useTFIDF?: boolean;
    useBM25?: boolean;
    useSemantic?: boolean;
    maxDepth?: number;
    maxFiles?: number;
    embeddingModel?: string;
    embeddingProvider?: string;
}

export interface Chunk {
    id: string;
    filePath: string;
    type: string;
    name: string;
    content: string;
    startLine: number;
    endLine?: number;
    visibility?: string;
    method?: string;
}

export interface IndexStats {
    filesIndexed: number;
    chunksIndexed: number;
    lastUpdated: number;
    indexedExtensions?: string[];
}
