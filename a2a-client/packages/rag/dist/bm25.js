"use strict";
/**
 * BM25 Scorer - Okapi BM25 implementation for code search
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PARAMS = exports.BM25Scorer = void 0;
exports.createBM25Scorer = createBM25Scorer;
const DEFAULT_PARAMS = { k1: 1.5, b: 0.75 };
exports.DEFAULT_PARAMS = DEFAULT_PARAMS;
class BM25Scorer {
    constructor(params = {}) {
        this.documents = new Map();
        this.docCount = 0;
        this.avgDocLength = 0;
        this.totalDocLength = 0;
        this.invertedIndex = new Map();
        this.docFrequency = new Map();
        this.k1 = params.k1 ?? DEFAULT_PARAMS.k1;
        this.b = params.b ?? DEFAULT_PARAMS.b;
    }
    tokenize(text) {
        if (!text || typeof text !== 'string')
            return [];
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter((token) => token.length > 1);
    }
    addDocument(docId, content) {
        const tokens = this.tokenize(content);
        const docLength = tokens.length;
        this.documents.set(docId, { tokens, length: docLength });
        this.totalDocLength += docLength;
        this.docCount++;
        this.avgDocLength = this.totalDocLength / this.docCount;
        const termCounts = new Map();
        for (const token of tokens) {
            termCounts.set(token, (termCounts.get(token) ?? 0) + 1);
        }
        for (const [term, count] of termCounts) {
            if (!this.invertedIndex.has(term))
                this.invertedIndex.set(term, new Map());
            this.invertedIndex.get(term).set(docId, count);
            this.docFrequency.set(term, (this.docFrequency.get(term) ?? 0) + 1);
        }
    }
    _calculateIDF(term) {
        const df = this.docFrequency.get(term) ?? 0;
        if (df === 0)
            return 0;
        return Math.log((this.docCount - df + 0.5) / (df + 0.5));
    }
    _scoreTerm(term, docId) {
        const doc = this.documents.get(docId);
        if (!doc)
            return 0;
        const idf = this._calculateIDF(term);
        if (idf === 0)
            return 0;
        const termFreqMap = this.invertedIndex.get(term);
        if (!termFreqMap)
            return 0;
        const tf = termFreqMap.get(docId) ?? 0;
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (doc.length / this.avgDocLength));
        return idf * (numerator / denominator);
    }
    search(query, options = {}) {
        const { limit = 10, minScore = 0 } = options;
        const queryTokens = this.tokenize(query);
        if (queryTokens.length === 0)
            return [];
        const scores = new Map();
        for (const docId of this.documents.keys()) {
            let score = 0;
            for (const term of queryTokens)
                score += this._scoreTerm(term, docId);
            if (score >= minScore)
                scores.set(docId, score);
        }
        return Array.from(scores.entries())
            .map(([docId, score]) => ({ docId, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
    getTermFrequencies(docId) {
        const doc = this.documents.get(docId);
        if (!doc)
            return new Map();
        const freq = new Map();
        for (const token of doc.tokens)
            freq.set(token, (freq.get(token) ?? 0) + 1);
        return freq;
    }
    getDocumentFrequency(term) {
        return this.docFrequency.get(term) ?? 0;
    }
    getStats() {
        return {
            docCount: this.docCount,
            avgDocLength: this.avgDocLength,
            totalDocLength: this.totalDocLength,
            uniqueTerms: this.invertedIndex.size,
            k1: this.k1,
            b: this.b,
        };
    }
    clear() {
        this.documents.clear();
        this.invertedIndex.clear();
        this.docFrequency.clear();
        this.docCount = 0;
        this.avgDocLength = 0;
        this.totalDocLength = 0;
    }
    serialize() {
        return {
            documents: Array.from(this.documents.entries()),
            docCount: this.docCount,
            avgDocLength: this.avgDocLength,
            totalDocLength: this.totalDocLength,
            invertedIndex: Array.from(this.invertedIndex.entries()).map(([term, docMap]) => [
                term,
                Array.from(docMap.entries()),
            ]),
            docFrequency: Array.from(this.docFrequency.entries()),
            k1: this.k1,
            b: this.b,
        };
    }
    deserialize(data) {
        this.clear();
        const d = data;
        this.documents = new Map(d.documents);
        this.docCount = d.docCount;
        this.avgDocLength = d.avgDocLength;
        this.totalDocLength = d.totalDocLength;
        this.k1 = d.k1;
        this.b = d.b;
        this.invertedIndex = new Map(d.invertedIndex.map(([term, docArray]) => [term, new Map(docArray)]));
        this.docFrequency = new Map(d.docFrequency);
    }
}
exports.BM25Scorer = BM25Scorer;
function createBM25Scorer(params) {
    return new BM25Scorer(params);
}
