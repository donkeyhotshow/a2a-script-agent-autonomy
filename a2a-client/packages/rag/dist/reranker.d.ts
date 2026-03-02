/**
 * Reranker Client - Cross-encoder reranking for search results
 */
export declare const PROVIDERS: {
    readonly COHERE: "cohere";
    readonly JINA: "jina";
    readonly LOCAL: "local";
};
declare const DEFAULT_CONFIGS: Record<string, {
    model: string;
    maxChunks?: number;
    returnDocuments?: boolean;
    topN?: number;
}>;
export interface RerankerConfig {
    provider?: 'cohere' | 'jina' | 'local';
    apiKey?: string;
    baseUrl?: string;
    modelOptions?: Record<string, unknown>;
}
export interface RerankDocument {
    id?: string;
    content?: string;
    text?: string;
}
export interface RerankResult {
    id: string;
    content: string;
    score: number;
}
export interface RerankOptions {
    topN?: number;
}
export declare class RerankerClient {
    provider: string;
    apiKey: string | undefined;
    baseUrl: string | undefined;
    modelOptions: Record<string, unknown>;
    constructor(config?: RerankerConfig);
    private _getHeaders;
    rerank(query: string, documents: (string | RerankDocument)[], options?: RerankOptions): Promise<RerankResult[]>;
    private _rerankCohere;
    private _rerankJina;
    private _rerankLocal;
    isAvailable(): Promise<boolean>;
    getInfo(): {
        provider: string;
        model: string;
        available: boolean;
    };
}
export declare function createReranker(config?: RerankerConfig): RerankerClient;
export { DEFAULT_CONFIGS };
