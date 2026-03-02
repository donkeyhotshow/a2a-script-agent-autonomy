/**
 * Search Suggestions - Autocomplete and search suggestions
 */
import type {Chunk} from './chunk-manager.js';

export interface SuggestionsConfig {
    maxSuggestions?: number;
}

export interface SuggestionItem {
    text: string;
    type: string;
    filePath: string;
    score: number;
}

export declare class SearchSuggestionsEngine {
    private config;
    private symbols;
    private prefixIndex;
    private maxSuggestions;

    constructor(config?: SuggestionsConfig);

    indexSymbols(chunks: Chunk[]): void;

    private _addSymbol;
    private _buildPrefixIndex;

    getSuggestions(query: string, options?: {
        limit?: number;
    }): SuggestionItem[];

    private _calculateScore;
    private _getRecentSymbols;

    getByType(type: string, limit?: number): SuggestionItem[];

    clear(): void;

    getStats(): {
        totalSymbols: number;
        typeCounts: Record<string, number>;
        prefixIndexSize: number;
    };
}

export declare function createSuggestionsEngine(config?: SuggestionsConfig): SearchSuggestionsEngine;

export declare class QueryExpander {
    private termRelations;

    constructor(_config?: Record<string, unknown>);

    addRelation(term: string, related: string, weight?: number): void;

    expand(query: string): string[];

    learn(query: string, clickedResult: string): void;
}

export declare function createQueryExpander(config?: Record<string, unknown>): QueryExpander;
