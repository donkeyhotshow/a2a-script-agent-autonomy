/**
 * Query Understanding - Intent detection and query analysis
 */
export declare const INTENT_TYPES: {
    readonly EXACT_NAME: "exact_name";
    readonly CODE_PATTERN: "code_pattern";
    readonly SEMANTIC: "semantic";
    readonly DEPENDENCY: "dependency";
    readonly FILE_PATH: "file_path";
    readonly SYMBOL: "symbol";
    readonly DOCUMENTATION: "documentation";
    readonly MIXED: "mixed";
};
export interface QueryUnderstandingConfig {
    [key: string]: unknown;
}
export interface IntentResult {
    type: string;
    confidence: number;
    terms: string[];
    entities: {
        frameworks: string[];
        fileTypes: string[];
        symbols: string[];
        namespaces: string[];
    };
    suggestions: string[];
    modifiers: {
        isNegation: boolean;
        isFuzzy: boolean;
        isExact: boolean;
        isWildcard: boolean;
    };
    originalQuery: string;
}
export declare class QueryUnderstandingEngine {
    private config;
    private patterns;
    constructor(config?: QueryUnderstandingConfig);
    analyze(query: string): IntentResult;
    private _tokenize;
    private _detectIntents;
    private _selectPrimaryIntent;
    private _generateSuggestions;
    private _extractEntities;
    private _extractModifiers;
}
export declare function createQueryUnderstandingEngine(config?: QueryUnderstandingConfig): QueryUnderstandingEngine;
