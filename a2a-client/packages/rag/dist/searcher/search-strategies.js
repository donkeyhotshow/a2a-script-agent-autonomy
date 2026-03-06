"use strict";
/**
 * Search Strategies
 *
 * This module provides search strategy implementations.
 * Currently integrated within RAGSearcher for better performance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTENT_TYPES = exports.QueryUnderstandingEngine = exports.CodeSimilarityEngine = exports.TFIDFService = exports.BM25Scorer = exports.SearchStrategies = exports.QueryStrategy = exports.CodeSimilaritySearchStrategy = exports.TFIDFSearchStrategy = exports.BM25SearchStrategy = void 0;
const bm25_js_1 = require("../bm25.js");
Object.defineProperty(exports, "BM25Scorer", { enumerable: true, get: function () { return bm25_js_1.BM25Scorer; } });
const tfidf_js_1 = require("../tfidf.js");
Object.defineProperty(exports, "TFIDFService", { enumerable: true, get: function () { return tfidf_js_1.TFIDFService; } });
const code_similarity_js_1 = require("../code-similarity.js");
Object.defineProperty(exports, "CodeSimilarityEngine", { enumerable: true, get: function () { return code_similarity_js_1.CodeSimilarityEngine; } });
const query_understanding_js_1 = require("../query-understanding.js");
Object.defineProperty(exports, "QueryUnderstandingEngine", { enumerable: true, get: function () { return query_understanding_js_1.QueryUnderstandingEngine; } });
Object.defineProperty(exports, "INTENT_TYPES", { enumerable: true, get: function () { return query_understanding_js_1.INTENT_TYPES; } });
/**
 * BM25 Search Strategy
 * Uses BM25 algorithm for keyword-based search
 */
class BM25SearchStrategy {
    constructor() {
        this.indexed = false;
        this.scorer = new bm25_js_1.BM25Scorer();
    }
    index(chunks) {
        for (const chunk of chunks) {
            const chunkId = chunk.id ?? `${chunk.filePath}:${chunk.startLine}`;
            this.scorer.addDocument(chunkId, chunk.content);
        }
        this.indexed = true;
    }
    search(query, limit = 10) {
        if (!this.indexed)
            return [];
        return this.scorer.search(query, { limit });
    }
    serialize() {
        return this.scorer.serialize();
    }
    deserialize(data) {
        this.scorer.deserialize(data);
        this.indexed = true;
    }
}
exports.BM25SearchStrategy = BM25SearchStrategy;
/**
 * TF-IDF Search Strategy
 * Uses TF-IDF algorithm for term frequency-based search
 */
class TFIDFSearchStrategy {
    constructor() {
        this.service = new tfidf_js_1.TFIDFService();
    }
    index(chunks) {
        this.service.clear();
        for (const chunk of chunks) {
            const chunkId = chunk.id ?? `${chunk.filePath}:${chunk.startLine}`;
            this.service.addDocument(chunkId, chunk.content);
        }
    }
    search(query, limit = 10) {
        return this.service.search(query, limit);
    }
    clear() {
        this.service.clear();
    }
    getStats() {
        return this.service.getStats();
    }
}
exports.TFIDFSearchStrategy = TFIDFSearchStrategy;
/**
 * Code Similarity Search Strategy
 * Uses code similarity algorithms for semantic search
 */
class CodeSimilaritySearchStrategy {
    constructor() {
        this.engine = new code_similarity_js_1.CodeSimilarityEngine();
    }
    index(chunks) {
        this.engine.index(chunks);
    }
    findSimilar(query, options = {}) {
        return this.engine.findSimilar(query, options);
    }
}
exports.CodeSimilaritySearchStrategy = CodeSimilaritySearchStrategy;
/**
 * Query Understanding Strategy
 * Analyzes query intent to improve search results
 */
class QueryStrategy {
    constructor() {
        this.engine = query_understanding_js_1.QueryUnderstandingEngine ? new query_understanding_js_1.QueryUnderstandingEngine() : null;
    }
    analyze(query) {
        return this.engine.analyze(query);
    }
    getIntentTypes() {
        return query_understanding_js_1.INTENT_TYPES;
    }
}
exports.QueryStrategy = QueryStrategy;
/**
 * Search Strategies Container
 * Provides access to all available search strategies
 */
class SearchStrategies {
    constructor() {
        this.bm25 = new BM25SearchStrategy();
        this.tfidf = new TFIDFSearchStrategy();
        this.codeSimilarity = new CodeSimilaritySearchStrategy();
        this.queryUnderstanding = new QueryStrategy();
    }
    indexAll(chunks) {
        this.bm25.index(chunks);
        this.tfidf.index(chunks);
        this.codeSimilarity.index(chunks);
    }
    clear() {
        this.tfidf.clear();
    }
}
exports.SearchStrategies = SearchStrategies;
