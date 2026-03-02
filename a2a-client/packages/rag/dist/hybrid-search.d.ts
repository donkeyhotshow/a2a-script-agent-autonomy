/**
 * Hybrid Search - Combines Sparse (BM25) and Dense (Vector) search with RRF
 */
declare const DEFAULT_CONFIG: {
    sparseWeight: number;
    denseWeight: number;
    rrfK: number;
    minScore: number;
    maxResults: number;
};

export interface SparseSearchLike {
    search(query: string, options: {
        limit?: number;
    }): Promise<Array<{
        id?: string;
        docId?: string;
        path?: string;
        content?: string;
        score?: number;
    }>>;
}

export interface DenseSearchLike {
    search(query: string, options: {
        limit?: number;
    }): Promise<Array<{
        id?: string;
        docId?: string;
        path?: string;
        content?: string;
        score?: number;
    }>>;
}

export interface HybridSearchConfig {
    sparseSearch?: SparseSearchLike | {
        search: (q: string, o: {
            limit?: number;
        }) => Promise<{
            hits?: Array<{
                id?: string;
                path?: string;
                content?: string;
                _rankingScore?: number;
            }>;
        }>;
    };
    denseSearch?: DenseSearchLike;
    sparseWeight?: number;
    denseWeight?: number;
    rrfK?: number;
}

export interface HybridSearchOptions {
    limit?: number;
    minScore?: number;
}

interface RRFDoc {
    id?: string;
    docId?: string;
    path?: string;
    content?: string;
    score?: number;
    rrfScore?: number;
    sparseRank?: number;
    denseRank?: number;
    sparseScore?: number;
    denseScore?: number;
    weights?: {
        sparse: number;
        dense: number;
    };
}

export declare class HybridSearcher {
    sparseSearch: HybridSearchConfig['sparseSearch'];
    denseSearch: HybridSearchConfig['denseSearch'];
    sparseWeight: number;
    denseWeight: number;
    rrfK: number;

    constructor(config?: HybridSearchConfig);

    search(query: string, options?: HybridSearchOptions): Promise<RRFDoc[]>;

    private _searchSparse;
    private _searchDense;
    private _rrfFusion;
    private _applyWeights;

    setSparseSearch(sparseSearch: HybridSearchConfig['sparseSearch']): void;

    setDenseSearch(denseSearch: HybridSearchConfig['denseSearch']): void;

    setWeights(sparseWeight: number, denseWeight: number): void;

    getConfig(): {
        sparseWeight: number;
        denseWeight: number;
        rrfK: number;
        hasSparse: boolean;
        hasDense: boolean;
    };
}

export declare function createHybridSearcher(config?: HybridSearchConfig): HybridSearcher;

export {DEFAULT_CONFIG};
