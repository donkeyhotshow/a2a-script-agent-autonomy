"use strict";
/**
 * @a2a/rag - RAG Indexing and Search Module
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRAGClientService = exports.RAGClientService = exports.createWatchManager = exports.RAGWatchManager = exports.createSimilarityEngine = exports.CodeSimilarityEngine = exports.createQueryExpander = exports.QueryExpander = exports.createSuggestionsEngine = exports.SearchSuggestionsEngine = exports.INTENT_TYPES = exports.createQueryUnderstandingEngine = exports.QueryUnderstandingEngine = exports.createASTChunker = exports.ASTChunker = exports.createMeilisearchClient = exports.MeilisearchClient = exports.createHybridSearcher = exports.HybridSearcher = exports.createReranker = exports.RerankerClient = exports.createBM25Scorer = exports.BM25Scorer = exports.SemanticSearcher = exports.RAGIntegrator = exports.TFIDFService = exports.ChunkManager = exports.RAGSearcher = exports.RAGIndexer = void 0;
exports.createRAG = createRAG;
const indexer_1 = require("./indexer");
Object.defineProperty(exports, "RAGIndexer", { enumerable: true, get: function () { return indexer_1.RAGIndexer; } });
const searcher_1 = require("./searcher");
Object.defineProperty(exports, "RAGSearcher", { enumerable: true, get: function () { return searcher_1.RAGSearcher; } });
const chunk_manager_1 = require("./chunk-manager");
Object.defineProperty(exports, "ChunkManager", { enumerable: true, get: function () { return chunk_manager_1.ChunkManager; } });
const tfidf_1 = require("./tfidf");
Object.defineProperty(exports, "TFIDFService", { enumerable: true, get: function () { return tfidf_1.TFIDFService; } });
const rag_integrator_1 = require("./rag-integrator");
Object.defineProperty(exports, "RAGIntegrator", { enumerable: true, get: function () { return rag_integrator_1.RAGIntegrator; } });
const semantic_search_1 = require("./semantic-search");
Object.defineProperty(exports, "SemanticSearcher", { enumerable: true, get: function () { return semantic_search_1.SemanticSearcher; } });
const bm25_1 = require("./bm25");
Object.defineProperty(exports, "BM25Scorer", { enumerable: true, get: function () { return bm25_1.BM25Scorer; } });
Object.defineProperty(exports, "createBM25Scorer", { enumerable: true, get: function () { return bm25_1.createBM25Scorer; } });
const reranker_1 = require("./reranker");
Object.defineProperty(exports, "RerankerClient", { enumerable: true, get: function () { return reranker_1.RerankerClient; } });
Object.defineProperty(exports, "createReranker", { enumerable: true, get: function () { return reranker_1.createReranker; } });
const hybrid_search_1 = require("./hybrid-search");
Object.defineProperty(exports, "HybridSearcher", { enumerable: true, get: function () { return hybrid_search_1.HybridSearcher; } });
Object.defineProperty(exports, "createHybridSearcher", { enumerable: true, get: function () { return hybrid_search_1.createHybridSearcher; } });
const meilisearch_client_1 = require("./meilisearch-client");
Object.defineProperty(exports, "MeilisearchClient", { enumerable: true, get: function () { return meilisearch_client_1.MeilisearchClient; } });
Object.defineProperty(exports, "createMeilisearchClient", { enumerable: true, get: function () { return meilisearch_client_1.createMeilisearchClient; } });
const ast_chunker_1 = require("./ast-chunker");
Object.defineProperty(exports, "ASTChunker", { enumerable: true, get: function () { return ast_chunker_1.ASTChunker; } });
Object.defineProperty(exports, "createASTChunker", { enumerable: true, get: function () { return ast_chunker_1.createASTChunker; } });
const query_understanding_1 = require("./query-understanding");
Object.defineProperty(exports, "QueryUnderstandingEngine", { enumerable: true, get: function () { return query_understanding_1.QueryUnderstandingEngine; } });
Object.defineProperty(exports, "createQueryUnderstandingEngine", { enumerable: true, get: function () { return query_understanding_1.createQueryUnderstandingEngine; } });
Object.defineProperty(exports, "INTENT_TYPES", { enumerable: true, get: function () { return query_understanding_1.INTENT_TYPES; } });
const suggestions_1 = require("./suggestions");
Object.defineProperty(exports, "SearchSuggestionsEngine", { enumerable: true, get: function () { return suggestions_1.SearchSuggestionsEngine; } });
Object.defineProperty(exports, "createSuggestionsEngine", { enumerable: true, get: function () { return suggestions_1.createSuggestionsEngine; } });
Object.defineProperty(exports, "QueryExpander", { enumerable: true, get: function () { return suggestions_1.QueryExpander; } });
Object.defineProperty(exports, "createQueryExpander", { enumerable: true, get: function () { return suggestions_1.createQueryExpander; } });
const code_similarity_1 = require("./code-similarity");
Object.defineProperty(exports, "CodeSimilarityEngine", { enumerable: true, get: function () { return code_similarity_1.CodeSimilarityEngine; } });
Object.defineProperty(exports, "createSimilarityEngine", { enumerable: true, get: function () { return code_similarity_1.createSimilarityEngine; } });
function createRAG(config = {}) {
    const projectPath = config.projectPath ?? process.cwd();
    const indexerConfig = { ...config, projectPath };
    const indexer = new indexer_1.RAGIndexer(indexerConfig);
    const searcher = new searcher_1.RAGSearcher({
        projectPath,
        fileRelevanceModel: config.fileRelevanceModel,
        queryCacheTTL: config.queryCacheTTL,
        relevanceFeedback: config.relevanceFeedback,
    });
    const chunks = new chunk_manager_1.ChunkManager({
        useAST: config.useAST,
        fallbackToRegex: config.fallbackToRegex,
    });
    const tfidf = new tfidf_1.TFIDFService();
    return { indexer, searcher, chunks, tfidf };
}
var watch_manager_js_1 = require("./watch-manager.js");
Object.defineProperty(exports, "RAGWatchManager", { enumerable: true, get: function () { return watch_manager_js_1.RAGWatchManager; } });
Object.defineProperty(exports, "createWatchManager", { enumerable: true, get: function () { return watch_manager_js_1.createWatchManager; } });
var protocol_integration_js_1 = require("./protocol-integration.js");
Object.defineProperty(exports, "RAGClientService", { enumerable: true, get: function () { return protocol_integration_js_1.RAGClientService; } });
Object.defineProperty(exports, "createRAGClientService", { enumerable: true, get: function () { return protocol_integration_js_1.createRAGClientService; } });
