"use strict";
/**
 * Semantic Search - Code similarity using embeddings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticSearcher = void 0;
const searcher_js_1 = require("./searcher.js");
const embedding_1 = require("@a2a/embedding");
class SemanticSearcher extends searcher_js_1.RAGSearcher {
    constructor(config = {}) {
        super(config);
        this.vectorIndex = null;
        this.vectorIndexReady = false;
        this.embeddingCache = new Map();
        this.embeddingClient = (0, embedding_1.createEmbeddingClient)(config.embedding ?? {});
    }
    async buildVectorIndex() {
        if (this.vectorIndexReady)
            return;
        const index = await this.loadIndex();
        this.vectorIndex = new Map();
        for (const chunk of index.chunks) {
            const embedding = await this.getEmbedding(chunk.content);
            this.vectorIndex.set(chunk.id ?? `${chunk.filePath}:${chunk.startLine}`, embedding);
        }
        this.vectorIndexReady = true;
    }
    async getEmbedding(content) {
        const cacheKey = content.substring(0, 100);
        const cached = this.embeddingCache.get(cacheKey);
        if (cached)
            return cached;
        const embedding = await this.embeddingClient.embed(content);
        this.embeddingCache.set(cacheKey, embedding);
        return embedding;
    }
    calculateSimilarity(embedding1, embedding2) {
        let dotProduct = 0;
        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
        }
        return dotProduct;
    }
    async getChunkById(chunkId) {
        const index = await this.loadIndex();
        return index.chunks.find((c) => c.id === chunkId || `${c.filePath}:${c.startLine}` === chunkId);
    }
    async searchSimilar(query, options = {}) {
        const limit = options.limit ?? 10;
        const queryEmbedding = await this.getEmbedding(query);
        if (!this.vectorIndexReady)
            await this.buildVectorIndex();
        const similarities = [];
        for (const [chunkId, chunkEmbedding] of this.vectorIndex) {
            const similarity = this.calculateSimilarity(queryEmbedding, chunkEmbedding);
            similarities.push({ chunkId, similarity });
        }
        similarities.sort((a, b) => b.similarity - a.similarity);
        const topResults = similarities.slice(0, limit);
        const index = await this.loadIndex();
        const chunkMap = new Map();
        for (const chunk of index.chunks) {
            const key = chunk.id ?? `${chunk.filePath}:${chunk.startLine}`;
            chunkMap.set(key, chunk);
        }
        return topResults.map((r) => ({
            chunk: chunkMap.get(r.chunkId),
            similarity: r.similarity,
            details: { chunkId: r.chunkId },
        }));
    }
    async searchSimilarFunctions(query, options = {}) {
        const limit = options.limit ?? 10;
        const queryEmbedding = await this.getEmbedding(query);
        if (!this.vectorIndexReady)
            await this.buildVectorIndex();
        const functionChunks = [];
        for (const [chunkId, chunkEmbedding] of this.vectorIndex) {
            const chunk = await this.getChunkById(chunkId);
            if (chunk && (chunk.type === 'function' || chunk.type === 'method')) {
                const similarity = this.calculateSimilarity(queryEmbedding, chunkEmbedding);
                functionChunks.push({ chunkId, similarity, chunk });
            }
        }
        functionChunks.sort((a, b) => b.similarity - a.similarity);
        return functionChunks.slice(0, limit).map((r) => ({
            chunk: r.chunk,
            similarity: r.similarity,
            details: { chunkId: r.chunkId },
        }));
    }
    async searchHybridSemantic(query, options = {}) {
        const limit = options.limit ?? 10;
        const keywordWeight = options.keywordWeight ?? 0.3;
        const tfidfWeight = options.tfidfWeight ?? 0.3;
        const semanticWeight = options.semanticWeight ?? 0.4;
        const k = options.k ?? 60;
        const [keywordResults, tfidfResults, semanticResults] = await Promise.all([
            this.search(query, { limit: limit * 2 }),
            this.tfidf ? this.searchTFIDF(query, limit * 2) : Promise.resolve([]),
            this.searchSimilar(query, { limit: limit * 2 }),
        ]);
        const rrfScores = new Map();
        for (let i = 0; i < keywordResults.length; i++) {
            const result = keywordResults[i];
            const id = result.chunk.id ?? `${result.chunk.filePath}:${result.chunk.startLine}`;
            const rrfContribution = keywordWeight * (1 / (k + i + 1));
            if (rrfScores.has(id)) {
                const existing = rrfScores.get(id);
                existing.score += rrfContribution;
                existing.keywordRank = i + 1;
                existing.keywordScore = result.score;
            }
            else {
                rrfScores.set(id, {
                    chunk: result.chunk,
                    score: rrfContribution,
                    highlights: result.highlights,
                    keywordRank: i + 1,
                    keywordScore: result.score,
                    tfidfRank: null,
                    tfidfScore: 0,
                    semanticRank: null,
                    semanticScore: 0,
                });
            }
        }
        for (let i = 0; i < tfidfResults.length; i++) {
            const result = tfidfResults[i];
            const rrfContribution = tfidfWeight * (1 / (k + i + 1));
            if (rrfScores.has(result.id)) {
                const existing = rrfScores.get(result.id);
                existing.score += rrfContribution;
                existing.tfidfRank = i + 1;
                existing.tfidfScore = result.score;
            }
            else if (result.chunk) {
                rrfScores.set(result.id, {
                    chunk: result.chunk,
                    score: rrfContribution,
                    highlights: [],
                    keywordRank: null,
                    keywordScore: 0,
                    tfidfRank: i + 1,
                    tfidfScore: result.score,
                    semanticRank: null,
                    semanticScore: 0,
                });
            }
        }
        for (let i = 0; i < semanticResults.length; i++) {
            const result = semanticResults[i];
            const id = result.details.chunkId;
            const rrfContribution = semanticWeight * (1 / (k + i + 1));
            if (rrfScores.has(id)) {
                const existing = rrfScores.get(id);
                existing.score += rrfContribution;
                existing.semanticRank = i + 1;
                existing.semanticScore = result.similarity;
            }
            else if (result.chunk) {
                rrfScores.set(id, {
                    chunk: result.chunk,
                    score: rrfContribution,
                    highlights: [],
                    keywordRank: null,
                    keywordScore: 0,
                    tfidfRank: null,
                    tfidfScore: 0,
                    semanticRank: i + 1,
                    semanticScore: result.similarity,
                });
            }
        }
        return [...rrfScores.values()]
            .map((r) => ({
            chunk: r.chunk,
            score: r.score,
            highlights: r.highlights.slice(0, 5),
            details: {
                keywordRank: r.keywordRank,
                keywordScore: r.keywordScore,
                tfidfRank: r.tfidfRank,
                tfidfScore: r.tfidfScore,
                semanticRank: r.semanticRank,
                semanticScore: r.semanticScore,
            },
        }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
    clearVectorIndex() {
        this.vectorIndex = null;
        this.vectorIndexReady = false;
        this.embeddingCache.clear();
    }
    dispose() {
        this.clearVectorIndex();
        this.embeddingClient.dispose();
    }
}
exports.SemanticSearcher = SemanticSearcher;
