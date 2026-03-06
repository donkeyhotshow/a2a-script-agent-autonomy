/**
 * RAG Searcher - Search in indexed files
 *
 * This file re-exports from the modular searcher package for backward compatibility.
 * The actual implementation has been split into multiple modules:
 * - searcher/index.ts - Main entry point
 * - searcher/rag-searcher.ts - Core implementation
 * - searcher/types.ts - Type definitions
 * - searcher/search-strategies.ts - Search strategies
 * - searcher/result-ranker.ts - Result ranking
 * - searcher/caching.ts - Cache management
 */
export * from './searcher/index.js';
export * from './searcher/types.js';
export { RAGSearcher } from './searcher/rag-searcher.js';
