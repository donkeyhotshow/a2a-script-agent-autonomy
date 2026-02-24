/**
 * @a2a/rag - RAG Indexing and Search Module
 *
 * Provides local indexing and search capabilities for code projects.
 * Part of the A2A distributed system.
 *
 * Features:
 * - Keyword-based search with technical term extraction
 * - TF-IDF/BM25 sparse retrieval
 * - Hybrid search combining both methods
 * - Semantic search with embedding models
 * - Meilisearch integration for production search
 * - Cross-encoder reranking
 * - Query understanding and intent detection
 * - Search suggestions and autocomplete
 * - Code similarity detection
 *
 * @module @a2a/rag
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * const { createRAG } = require('@a2a/rag');
 *
 * const rag = createRAG({
 *   projectPath: '/path/to/project',
 *   useTFIDF: true,
 *   useBM25: true,
 *   useSemantic: true,
 * });
 *
 * // Index files
 * await rag.indexer.indexDirectory();
 *
 * // Search
 * const results = await rag.searcher.search('UserService');
 */

// Core modules
const { RAGIndexer } = require('./indexer');
const { RAGSearcher } = require('./searcher');
const { ChunkManager } = require('./chunk-manager');
const { TFIDFService } = require('./tfidf');
const { RAGIntegrator } = require('./rag-integrator');
const { SemanticSearcher } = require('./semantic-search');

// BM25 and Search
const { BM25Scorer, createBM25Scorer } = require('./bm25');
const { RerankerClient, createReranker } = require('./reranker');
const { HybridSearcher, createHybridSearcher } = require('./hybrid-search');
const { MeilisearchClient, createMeilisearchClient } = require('./meilisearch-client');

// Advanced Search Features
const { ASTChunker, createASTChunker } = require('./ast-chunker');
const { QueryUnderstandingEngine, createQueryUnderstandingEngine, INTENT_TYPES } = require('./query-understanding');
const { SearchSuggestionsEngine, createSuggestionsEngine, QueryExpander, createQueryExpander } = require('./suggestions');
const { CodeSimilarityEngine, createSimilarityEngine } = require('./code-similarity');

/**
 * Configuration options for RAG
 * @typedef {Object} RAGConfig
 * @property {string} projectPath - Path to project directory
 * @property {string[]} [includePatterns] - File patterns to include
 * @property {string[]} [excludePatterns] - File patterns to exclude
 * @property {boolean} [useTFIDF=true] - Enable TF-IDF search
 * @property {boolean} [useBM25=false] - Enable BM25 search
 * @property {boolean} [useSemantic=false] - Enable semantic search
 * @property {number} [maxDepth=0] - Maximum directory depth (0 = unlimited)
 * @property {number} [maxFiles=100000] - Maximum files to index
 * @property {string} [embeddingModel] - Embedding model name
 * @property {string} [embeddingProvider] - Embedding provider (ollama, openai)
 */

/**
 * RAG instance
 * @typedef {Object} RAGInstance
 * @property {RAGIndexer} indexer - Indexer for adding documents
 * @property {RAGSearcher} searcher - Searcher for querying
 * @property {ChunkManager} chunks - Chunk manager
 * @property {TFIDFService} tfidf - TF-IDF service
 */

/**
 * Create a RAG instance with indexer and searcher
 * @param {RAGConfig} config - Configuration options
 * @returns {RAGInstance} RAG instance with indexer, searcher, chunks, and tfidf
 *
 * @example
 * const rag = createRAG({
 *   projectPath: '/path/to/project',
 *   includePatterns: ['*.php', '*.vue', '*.js'],
 *   excludePatterns: ['node_modules/**', 'vendor/**'],
 *   useTFIDF: true,
 * });
 */
function createRAG(config) {
  const indexer = new RAGIndexer(config);
  const searcher = new RAGSearcher(config);
  const chunks = new ChunkManager(config);
  const tfidf = new TFIDFService();

  return { indexer, searcher, chunks, tfidf };
}

module.exports = {
  // Core modules
  RAGIndexer,
  RAGSearcher,
  ChunkManager,
  TFIDFService,
  createRAG,
  RAGIntegrator,
  SemanticSearcher,

  // BM25 Search
  BM25Scorer,
  createBM25Scorer,

  // Reranking
  RerankerClient,
  createReranker,

  // Hybrid Search
  HybridSearcher,
  createHybridSearcher,

  // Meilisearch
  MeilisearchClient,
  createMeilisearchClient,

  // AST-based Chunking
  ASTChunker,
  createASTChunker,

  // Query Understanding
  QueryUnderstandingEngine,
  createQueryUnderstandingEngine,
  INTENT_TYPES,

  // Search Suggestions
  SearchSuggestionsEngine,
  createSuggestionsEngine,
  QueryExpander,
  createQueryExpander,

  // Code Similarity
  CodeSimilarityEngine,
  createSimilarityEngine,
};
