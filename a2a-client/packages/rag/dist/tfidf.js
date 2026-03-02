"use strict";
/**
 * TF-IDF/BM25 Service for sparse retrieval
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TFIDFService = void 0;
class TFIDFService {
    constructor() {
        this.documents = new Map();
        this.idf = new Map();
        this.documentCount = 0;
    }
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter((t) => t.length > 2);
    }
    addDocument(id, text) {
        const tokens = this.tokenize(text);
        this.documents.set(id, tokens);
        this.documentCount++;
        this.recalculateIDF();
    }
    addDocuments(docs) {
        for (const { id, text } of docs) {
            const tokens = this.tokenize(text);
            this.documents.set(id, tokens);
            this.documentCount++;
        }
        this.recalculateIDF();
    }
    removeDocument(id) {
        if (this.documents.has(id)) {
            this.documents.delete(id);
            this.documentCount--;
            this.recalculateIDF();
        }
    }
    clear() {
        this.documents.clear();
        this.idf.clear();
        this.documentCount = 0;
    }
    recalculateIDF() {
        const df = new Map();
        for (const tokens of this.documents.values()) {
            const unique = new Set(tokens);
            for (const term of unique) {
                df.set(term, (df.get(term) ?? 0) + 1);
            }
        }
        for (const [term, freq] of df) {
            this.idf.set(term, Math.log(this.documentCount / freq));
        }
    }
    bm25Score(queryTokens, docTokens, k1 = 1.5, b = 0.75) {
        const avgDocLen = this.getAverageDocLength();
        const docLen = docTokens.length;
        const tf = new Map();
        for (const token of docTokens) {
            tf.set(token, (tf.get(token) ?? 0) + 1);
        }
        let score = 0;
        for (const term of queryTokens) {
            const termFreq = tf.get(term) ?? 0;
            const idf = this.idf.get(term) ?? 0;
            const numerator = termFreq * (k1 + 1);
            const denominator = termFreq + k1 * (1 - b + b * (docLen / avgDocLen));
            score += idf * (numerator / denominator);
        }
        return score;
    }
    search(query, topK = 10) {
        const queryTokens = this.tokenize(query);
        const scores = [];
        for (const [id, docTokens] of this.documents) {
            const score = this.bm25Score(queryTokens, docTokens);
            if (score > 0)
                scores.push({ id, score });
        }
        return scores.sort((a, b) => b.score - a.score).slice(0, topK);
    }
    getAverageDocLength() {
        if (this.documents.size === 0)
            return 0;
        let total = 0;
        for (const tokens of this.documents.values())
            total += tokens.length;
        return total / this.documents.size;
    }
    getStats() {
        return {
            documentCount: this.documentCount,
            vocabularySize: this.idf.size,
            avgDocLength: this.getAverageDocLength(),
        };
    }
    hasDocument(id) {
        return this.documents.has(id);
    }
    size() {
        return this.documents.size;
    }
}
exports.TFIDFService = TFIDFService;
