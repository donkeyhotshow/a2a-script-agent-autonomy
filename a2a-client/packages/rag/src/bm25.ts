/**
 * BM25 Scorer - Okapi BM25 implementation for code search
 */

const DEFAULT_PARAMS = {k1: 1.5, b: 0.75};

export interface BM25Params {
    k1?: number;
    b?: number;
}

interface DocEntry {
    tokens: string[];
    length: number;
}

export class BM25Scorer {
    k1: number;
    b: number;
    private documents = new Map<string, DocEntry>();
    private docCount = 0;
    private avgDocLength = 0;
    private totalDocLength = 0;
    private invertedIndex = new Map<string, Map<string, number>>();
    private docFrequency = new Map<string, number>();

    constructor(params: BM25Params = {}) {
        this.k1 = params.k1 ?? DEFAULT_PARAMS.k1;
        this.b = params.b ?? DEFAULT_PARAMS.b;
    }

    tokenize(text: string): string[] {
        if (!text || typeof text !== 'string') return [];
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter((token) => token.length > 1);
    }

    addDocument(docId: string, content: string): void {
        const tokens = this.tokenize(content);
        const docLength = tokens.length;
        this.documents.set(docId, {tokens, length: docLength});
        this.totalDocLength += docLength;
        this.docCount++;
        this.avgDocLength = this.totalDocLength / this.docCount;
        const termCounts = new Map<string, number>();
        for (const token of tokens) {
            termCounts.set(token, (termCounts.get(token) ?? 0) + 1);
        }
        for (const [term, count] of termCounts) {
            if (!this.invertedIndex.has(term)) this.invertedIndex.set(term, new Map());
            this.invertedIndex.get(term)!.set(docId, count);
            this.docFrequency.set(term, (this.docFrequency.get(term) ?? 0) + 1);
        }
    }

    private _calculateIDF(term: string): number {
        const df = this.docFrequency.get(term) ?? 0;
        if (df === 0) return 0;
        return Math.log((this.docCount - df + 0.5) / (df + 0.5));
    }

    private _scoreTerm(term: string, docId: string): number {
        const doc = this.documents.get(docId);
        if (!doc) return 0;
        const idf = this._calculateIDF(term);
        if (idf === 0) return 0;
        const termFreqMap = this.invertedIndex.get(term);
        if (!termFreqMap) return 0;
        const tf = termFreqMap.get(docId) ?? 0;
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (doc.length / this.avgDocLength));
        return idf * (numerator / denominator);
    }

    search(
        query: string,
        options: { limit?: number; minScore?: number } = {}
    ): Array<{ docId: string; score: number }> {
        const {limit = 10, minScore = 0} = options;
        const queryTokens = this.tokenize(query);
        if (queryTokens.length === 0) return [];
        const scores = new Map<string, number>();
        for (const docId of this.documents.keys()) {
            let score = 0;
            for (const term of queryTokens) score += this._scoreTerm(term, docId);
            if (score >= minScore) scores.set(docId, score);
        }
        return Array.from(scores.entries())
            .map(([docId, score]) => ({docId, score}))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    getTermFrequencies(docId: string): Map<string, number> {
        const doc = this.documents.get(docId);
        if (!doc) return new Map();
        const freq = new Map<string, number>();
        for (const token of doc.tokens) freq.set(token, (freq.get(token) ?? 0) + 1);
        return freq;
    }

    getDocumentFrequency(term: string): number {
        return this.docFrequency.get(term) ?? 0;
    }

    getStats(): Record<string, number> {
        return {
            docCount: this.docCount,
            avgDocLength: this.avgDocLength,
            totalDocLength: this.totalDocLength,
            uniqueTerms: this.invertedIndex.size,
            k1: this.k1,
            b: this.b,
        };
    }

    clear(): void {
        this.documents.clear();
        this.invertedIndex.clear();
        this.docFrequency.clear();
        this.docCount = 0;
        this.avgDocLength = 0;
        this.totalDocLength = 0;
    }

    serialize(): Record<string, unknown> {
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

    deserialize(data: Record<string, unknown>): void {
        this.clear();
        const d = data as {
            documents: [string, DocEntry][];
            docCount: number;
            avgDocLength: number;
            totalDocLength: number;
            invertedIndex: [string, [string, number][]][];
            docFrequency: [string, number][];
            k1: number;
            b: number;
        };
        this.documents = new Map(d.documents);
        this.docCount = d.docCount;
        this.avgDocLength = d.avgDocLength;
        this.totalDocLength = d.totalDocLength;
        this.k1 = d.k1;
        this.b = d.b;
        this.invertedIndex = new Map(
            d.invertedIndex.map(([term, docArray]) => [term, new Map(docArray)])
        );
        this.docFrequency = new Map(d.docFrequency);
    }
}

export function createBM25Scorer(params?: BM25Params): BM25Scorer {
    return new BM25Scorer(params);
}

export {DEFAULT_PARAMS};
