/**
 * Search Types
 * 
 * Types related to search functionality
 */

export interface SearchFilters {
    file_types?: string[];
    directories?: string[];
    framework?: string;
    exclude?: string[];
}

export interface SearchOptions {
    limit?: number;
    min_score?: number;
    include_context?: boolean;
    highlight_matches?: boolean;
}

export interface SearchQuery {
    query: string;
    filters?: SearchFilters;
    options?: SearchOptions;
}

export interface MatchDetail {
    line_start: number;
    line_end: number;
    content: string;
    highlight: string;
    context_score: number;
}

export interface FileMetadata {
    framework: string;
    type: string;
    last_modified: string;
}

export interface SearchMatch {
    file: string;
    score: number;
    matches: MatchDetail[];
    metadata: FileMetadata;
}

export interface SearchResult {
    results: SearchMatch[];
    total: number;
    query_time_ms: number;
    algorithm_used: string;
}

/**
 * Factory options for creating search queries
 */
export interface CreateSearchQueryOptions {
    query: string;
    filters?: SearchFilters;
    options?: SearchOptions;
}

/**
 * Create a search query with default values
 */
export function createSearchQuery(options: CreateSearchQueryOptions): SearchQuery {
    return {
        query: options.query,
        filters: options.filters,
        options: options.options,
    };
}
