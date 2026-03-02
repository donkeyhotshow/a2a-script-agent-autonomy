/**
 * Semantic Search - Code similarity using embeddings
 */
import { RAGSearcher } from './searcher.js';
import type { Chunk } from './chunk-manager.js';
import { createEmbeddingClient } from '@a2a/embedding';
export interface SemanticSearcherConfig extends Record<string, unknown> {
    projectPath?: string;
    useTFIDF?: boolean;
    embedding?: Record<string, unknown>;
}
export interface SimilarityResult {
    chunk: Chunk | undefined;
    similarity: number;
    details: {
        chunkId: string;
    };
}
export declare class SemanticSearcher extends RAGSearcher {
    embeddingClient: ReturnType<typeof createEmbeddingClient>;
    vectorIndex: Map<string, number[]> | null;
    private vectorIndexReady;
    private embeddingCache;
    constructor(config?: SemanticSearcherConfig);
    buildVectorIndex(): Promise<void>;
    getEmbedding(content: string): Promise<number[]>;
    calculateSimilarity(embedding1: number[], embedding2: number[]): number;
    getChunkById(chunkId: string): Promise<Chunk | undefined>;
    searchSimilar(query: string, options?: {
        limit?: number;
    }): Promise<SimilarityResult[]>;
    searchSimilarFunctions(query: string, options?: {
        limit?: number;
    }): Promise<SimilarityResult[]>;
    searchHybridSemantic(query: string, options?: {
        limit?: number;
        keywordWeight?: number;
        tfidfWeight?: number;
        semanticWeight?: number;
        k?: number;
    }): Promise<Array<{
        chunk: Chunk;
        score: number;
        highlights: string[];
        details: Record<string, number | null>;
    }>>;
    clearVectorIndex(): void;
    dispose(): void;
}
