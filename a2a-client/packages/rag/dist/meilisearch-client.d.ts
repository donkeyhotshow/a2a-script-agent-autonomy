/**
 * Meilisearch Client - BM25 search integration
 */
declare const DEFAULT_SETTINGS: {
    searchableAttributes: string[];
    filterableAttributes: string[];
    sortableAttributes: string[];
    rankingRules: string[];
};
export interface MeilisearchConfig {
    host?: string;
    apiKey?: string;
    indexName?: string;
}
export interface MeilisearchDocument {
    id: string;
    path?: string;
    content?: string;
    name?: string;
    type?: string;
    extension?: string;
    framework?: string;
    lastModified?: number;
}
export interface MeilisearchSearchOptions {
    limit?: number;
    offset?: number;
    filter?: string[];
    attributesToRetrieve?: string[];
    attributesToHighlight?: string[];
}
export interface MeilisearchSearchResult {
    hits: Array<Record<string, unknown>>;
    [key: string]: unknown;
}
export declare class MeilisearchClient {
    host: string;
    apiKey: string | undefined;
    indexName: string;
    index: unknown;
    initialized: boolean;
    constructor(config?: MeilisearchConfig);
    private _getHeaders;
    initialize(): Promise<void>;
    private _getIndexes;
    private _createIndex;
    private _waitForIndex;
    private _configureIndex;
    addDocuments(documents: MeilisearchDocument[]): Promise<string>;
    search(query: string, options?: MeilisearchSearchOptions): Promise<MeilisearchSearchResult>;
    deleteDocument(id: string): Promise<string>;
    deleteAllDocuments(): Promise<string>;
    getStats(): Promise<Record<string, unknown>>;
    isAvailable(): Promise<boolean>;
    getHealth(): Promise<Record<string, unknown>>;
}
export declare function createMeilisearchClient(config?: MeilisearchConfig): MeilisearchClient;
export { DEFAULT_SETTINGS };
