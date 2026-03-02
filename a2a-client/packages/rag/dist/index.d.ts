/**
 * @a2a/rag - RAG Indexing and Search Module
 */
import { RAGIndexer } from './indexer';
import { RAGSearcher } from './searcher';
import { ChunkManager } from './chunk-manager';
import { TFIDFService } from './tfidf';
import { RAGIntegrator } from './rag-integrator';
import { SemanticSearcher } from './semantic-search';
import { BM25Scorer, createBM25Scorer } from './bm25';
import { RerankerClient, createReranker } from './reranker';
import { HybridSearcher, createHybridSearcher } from './hybrid-search';
import { MeilisearchClient, createMeilisearchClient } from './meilisearch-client';
import { ASTChunker, createASTChunker } from './ast-chunker';
import { QueryUnderstandingEngine, createQueryUnderstandingEngine, INTENT_TYPES } from './query-understanding';
import { SearchSuggestionsEngine, createSuggestionsEngine, QueryExpander, createQueryExpander } from './suggestions';
import { CodeSimilarityEngine, createSimilarityEngine } from './code-similarity';
export interface RAGConfig {
    projectPath?: string;
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
export interface RAGInstance {
    indexer: RAGIndexer;
    searcher: RAGSearcher;
    chunks: ChunkManager;
    tfidf: TFIDFService;
}
export declare function createRAG(config?: RAGConfig): RAGInstance;
export type { RAGIndexerConfig } from './indexer';
export { RAGIndexer, RAGSearcher, ChunkManager, TFIDFService, RAGIntegrator, SemanticSearcher, BM25Scorer, createBM25Scorer, RerankerClient, createReranker, HybridSearcher, createHybridSearcher, MeilisearchClient, createMeilisearchClient, ASTChunker, createASTChunker, QueryUnderstandingEngine, createQueryUnderstandingEngine, INTENT_TYPES, SearchSuggestionsEngine, createSuggestionsEngine, QueryExpander, createQueryExpander, CodeSimilarityEngine, createSimilarityEngine, };
