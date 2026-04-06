"use strict";
/**
 * RAG Searcher - Main Entry Point
 * Integrates: TFIDF, QueryUnderstanding, CodeSimilarity, BM25
 *
 * Modules:
 * - rag-searcher.ts - main searcher class
 * - query-planner.ts - query planning and analysis
 * - chunk-pipeline.ts - chunk processing and scoring
 * - ranking-pipeline.ts - result ranking and fusion
 * - output-shaping.ts - output formatting
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatForDisplay = exports.createSnippets = exports.limitFiles = exports.filterByExtensions = exports.filterByDirectories = exports.paginateResults = exports.shapeOutput = exports.calculateTotalScore = exports.sortAndLimitResults = exports.groupByFile = exports.fuseResultsWithRRF = exports.calculateRRFScore = exports.isCandidateChunk = exports.matchPattern = exports.getFileExtension = exports.findHighlights = exports.createCandidateSet = exports.getChunkId = exports.scoreChunk = exports.matchesFilters = exports.INTENT_TYPES = exports.calculateFileTypeBoost = exports.planSearchStrategy = exports.analyzeQueryIntent = exports.extractKeywords = exports.SearchCache = exports.ResultRanker = exports.SearchStrategies = exports.RAGSearcher = void 0;
__exportStar(require("./types.js"), exports);
var rag_searcher_js_1 = require("./rag-searcher.js");
Object.defineProperty(exports, "RAGSearcher", { enumerable: true, get: function () { return rag_searcher_js_1.RAGSearcher; } });
var search_strategies_js_1 = require("./search-strategies.js");
Object.defineProperty(exports, "SearchStrategies", { enumerable: true, get: function () { return search_strategies_js_1.SearchStrategies; } });
var result_ranker_js_1 = require("./result-ranker.js");
Object.defineProperty(exports, "ResultRanker", { enumerable: true, get: function () { return result_ranker_js_1.ResultRanker; } });
var caching_js_1 = require("./caching.js");
Object.defineProperty(exports, "SearchCache", { enumerable: true, get: function () { return caching_js_1.SearchCache; } });
__exportStar(require("./snippet-generator.js"), exports);
// Export new pipeline modules
var query_planner_js_1 = require("./query-planner.js");
Object.defineProperty(exports, "extractKeywords", { enumerable: true, get: function () { return query_planner_js_1.extractKeywords; } });
Object.defineProperty(exports, "analyzeQueryIntent", { enumerable: true, get: function () { return query_planner_js_1.analyzeQueryIntent; } });
Object.defineProperty(exports, "planSearchStrategy", { enumerable: true, get: function () { return query_planner_js_1.planSearchStrategy; } });
Object.defineProperty(exports, "calculateFileTypeBoost", { enumerable: true, get: function () { return query_planner_js_1.calculateFileTypeBoost; } });
Object.defineProperty(exports, "INTENT_TYPES", { enumerable: true, get: function () { return query_planner_js_1.INTENT_TYPES; } });
var chunk_pipeline_js_1 = require("./chunk-pipeline.js");
Object.defineProperty(exports, "matchesFilters", { enumerable: true, get: function () { return chunk_pipeline_js_1.matchesFilters; } });
Object.defineProperty(exports, "scoreChunk", { enumerable: true, get: function () { return chunk_pipeline_js_1.scoreChunk; } });
Object.defineProperty(exports, "getChunkId", { enumerable: true, get: function () { return chunk_pipeline_js_1.getChunkId; } });
Object.defineProperty(exports, "createCandidateSet", { enumerable: true, get: function () { return chunk_pipeline_js_1.createCandidateSet; } });
Object.defineProperty(exports, "findHighlights", { enumerable: true, get: function () { return chunk_pipeline_js_1.findHighlights; } });
Object.defineProperty(exports, "getFileExtension", { enumerable: true, get: function () { return chunk_pipeline_js_1.getFileExtension; } });
Object.defineProperty(exports, "matchPattern", { enumerable: true, get: function () { return chunk_pipeline_js_1.matchPattern; } });
Object.defineProperty(exports, "isCandidateChunk", { enumerable: true, get: function () { return chunk_pipeline_js_1.isCandidateChunk; } });
var ranking_pipeline_js_1 = require("./ranking-pipeline.js");
Object.defineProperty(exports, "calculateRRFScore", { enumerable: true, get: function () { return ranking_pipeline_js_1.calculateRRFScore; } });
Object.defineProperty(exports, "fuseResultsWithRRF", { enumerable: true, get: function () { return ranking_pipeline_js_1.fuseResultsWithRRF; } });
Object.defineProperty(exports, "groupByFile", { enumerable: true, get: function () { return ranking_pipeline_js_1.groupByFile; } });
Object.defineProperty(exports, "sortAndLimitResults", { enumerable: true, get: function () { return ranking_pipeline_js_1.sortAndLimitResults; } });
Object.defineProperty(exports, "calculateTotalScore", { enumerable: true, get: function () { return ranking_pipeline_js_1.calculateTotalScore; } });
var output_shaping_js_1 = require("./output-shaping.js");
Object.defineProperty(exports, "shapeOutput", { enumerable: true, get: function () { return output_shaping_js_1.shapeOutput; } });
Object.defineProperty(exports, "paginateResults", { enumerable: true, get: function () { return output_shaping_js_1.paginateResults; } });
Object.defineProperty(exports, "filterByDirectories", { enumerable: true, get: function () { return output_shaping_js_1.filterByDirectories; } });
Object.defineProperty(exports, "filterByExtensions", { enumerable: true, get: function () { return output_shaping_js_1.filterByExtensions; } });
Object.defineProperty(exports, "limitFiles", { enumerable: true, get: function () { return output_shaping_js_1.limitFiles; } });
Object.defineProperty(exports, "createSnippets", { enumerable: true, get: function () { return output_shaping_js_1.createSnippets; } });
Object.defineProperty(exports, "formatForDisplay", { enumerable: true, get: function () { return output_shaping_js_1.formatForDisplay; } });
