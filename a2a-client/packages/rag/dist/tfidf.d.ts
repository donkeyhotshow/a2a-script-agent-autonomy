/**
 * TF-IDF/BM25 Service for sparse retrieval
 */
export declare class TFIDFService {
    private documents;
    private idf;
    private documentCount;
    tokenize(text: string): string[];
    addDocument(id: string, text: string): void;
    addDocuments(docs: Array<{
        id: string;
        text: string;
    }>): void;
    removeDocument(id: string): void;
    clear(): void;
    private recalculateIDF;
    bm25Score(queryTokens: string[], docTokens: string[], k1?: number, b?: number): number;
    search(query: string, topK?: number): Array<{
        id: string;
        score: number;
    }>;
    getAverageDocLength(): number;
    getStats(): {
        documentCount: number;
        vocabularySize: number;
        avgDocLength: number;
    };
    hasDocument(id: string): boolean;
    size(): number;
}
