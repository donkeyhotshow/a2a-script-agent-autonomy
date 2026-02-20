/**
 * @a2a/rag - RAG Indexing and Search Module
 * 
 * Provides local indexing and search capabilities for code projects.
 * Part of the A2A distributed system.
 * 
 * @module @a2a/rag
 */

const { RAGIndexer } = require('./indexer');
const { RAGSearcher } = require('./searcher');
const { ChunkManager } = require('./chunk-manager');

/**
 * Create a RAG instance with indexer and searcher
 * @param {Object} config - Configuration options
 * @param {string} config.projectPath - Path to project directory
 * @param {string[]} [config.includePatterns] - File patterns to include
 * @param {string[]} [config.excludePatterns] - File patterns to exclude
 * @returns {{indexer: RAGIndexer, searcher: RAGSearcher, chunks: ChunkManager}}
 */
function createRAG(config) {
  const indexer = new RAGIndexer(config);
  const searcher = new RAGSearcher(config);
  const chunks = new ChunkManager(config);
  
  return { indexer, searcher, chunks };
}

module.exports = {
  RAGIndexer,
  RAGSearcher,
  ChunkManager,
  createRAG,
};
