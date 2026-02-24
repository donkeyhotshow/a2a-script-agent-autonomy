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
 *
 * @module @a2a/rag
 */

const { RAGIndexer } = require('./indexer');
const { RAGSearcher } = require('./searcher');
const { ChunkManager } = require('./chunk-manager');
const { TFIDFService } = require('./tfidf');
const { RAGIntegrator } = require('./rag-integrator');
const { SemanticSearcher } = require('./semantic-search');

/**
 * Create a RAG instance with indexer and searcher
 * @param {Object} config - Configuration options
 * @param {string} config.projectPath - Path to project directory
 * @param {string[]} [config.includePatterns] - File patterns to include
 * @param {string[]} [config.excludePatterns] - File patterns to exclude
 * @param {boolean} [config.useTFIDF=true] - Enable TF-IDF search in searcher
 * @returns {{indexer: RAGIndexer, searcher: RAGSearcher, chunks: ChunkManager, tfidf: TFIDFService}}
 */
function createRAG(config) {
  const indexer = new RAGIndexer(config);
  const searcher = new RAGSearcher(config);
  const chunks = new ChunkManager(config);
  // Note: TFIDFService is also available via searcher.tfidf when useTFIDF is true
  const tfidf = new TFIDFService();

  return { indexer, searcher, chunks, tfidf };
}

module.exports = {
  RAGIndexer,
  RAGSearcher,
  ChunkManager,
  TFIDFService,
  createRAG,
  RAGIntegrator,
  SemanticSearcher,
};