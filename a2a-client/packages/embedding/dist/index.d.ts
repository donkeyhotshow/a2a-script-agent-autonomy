/**
 * @a2a/embedding - Embedding client for semantic search.
 * Supports local HTTP embeddings, OpenAI, Cohere, Voyage AI, mock.
 */
export declare const PROVIDERS: {
    readonly LOCAL_HUB: "local_hub";
    readonly OPENAI: "openai";
    readonly COHERE: "cohere";
    readonly VOYAGE: "voyage";
    readonly MOCK: "mock";
};
export type Provider = (typeof PROVIDERS)[keyof typeof PROVIDERS];
export declare const DIMENSIONS: Record<string, number>;
export declare const DEFAULT_MODELS: Record<string, string>;
export interface EmbeddingConfig {
    provider?: Provider | string;
    baseUrl?: string;
    model?: string;
    apiKey?: string;
    cacheFile?: string | null;
    batchSize?: number;
    timeout?: number;
}
export interface CacheStats {
    size: number;
    provider: string;
    model: string;
    dimension: number;
    baseUrl?: string;
}
export declare function createEmbeddingClient(config?: EmbeddingConfig): EmbeddingClient;
export declare class EmbeddingClient {
    provider: string;
    apiKey: string | undefined;
    baseUrl: string | undefined;
    model: string;
    cache: Map<string, number[]>;
    cacheFile: string | null;
    batchSize: number;
    timeout: number;
    constructor(config?: EmbeddingConfig);
    getDimension(): number;
    private _hashText;
    private _loadCache;
    private _saveCache;
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    private getLocalHubEmbedBaseUrl;
    private _embedLocalHub;
    private _embedBatchLocalHub;
    private _embedOpenAI;
    private _embedBatchOpenAI;
    private _embedCohere;
    private _embedBatchCohere;
    private _embedVoyage;
    private _embedBatchVoyage;
    private _embedDeterministic;
    private _zeroVector;
    clearCache(): void;
    getCacheStats(): CacheStats;
    isAvailable(): Promise<boolean>;
    listModels(): Promise<string[]>;
    dispose(): void;
}
