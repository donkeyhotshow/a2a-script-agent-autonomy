/**
 * BM25 Scorer - Okapi BM25 implementation for code search
 */
declare const DEFAULT_PARAMS: {
    k1: number;
    b: number;
};
export interface BM25Params {
    k1?: number;
    b?: number;
}
export declare class BM25Scorer {
    k1: number;
    b: number;
    private documents;
    private docCount;
    private avgDocLength;
    private totalDocLength;
    private invertedIndex;
    private docFrequency;
    constructor(params?: BM25Params);
    tokenize(text: string): string[];
    addDocument(docId: string, content: string): void;
    private _calculateIDF;
    private _scoreTerm;
    search(query: string, options?: {
        limit?: number;
        minScore?: number;
    }): Array<{
        docId: string;
        score: number;
    }>;
    getTermFrequencies(docId: string): Map<string, number>;
    getDocumentFrequency(term: string): number;
    getStats(): Record<string, number>;
    clear(): void;
    serialize(): Record<string, unknown>;
    deserialize(data: Record<string, unknown>): void;
}
export declare function createBM25Scorer(params?: BM25Params): BM25Scorer;
export { DEFAULT_PARAMS };
