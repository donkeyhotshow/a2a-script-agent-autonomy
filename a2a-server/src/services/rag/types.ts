import type {EntityTypeName, RecognizedEntity} from '../../types/entity.types.js';

export interface EntityQuery {
    types: EntityTypeName[];
    names: string[];
    relations: string[];
    filePatterns: string[];
    contextDepth: number;
}

export interface FileScore {
    file: SearchResult;
    baseScore: number;
    entityScore: number;
    relationshipScore: number;
    finalScore: number;
}

export interface EnrichedContextFile {
    path: string;
    content: string;
    entities: RecognizedEntity[];
    relatedFiles: string[];
    relevanceExplanation: string;
    finalScore: number;
}

export interface ScoringConfig {
    baseWeight: number;
    entityWeight: number;
    relationshipWeight: number;
}

export interface SearchQuery {
    query: string;
    projectId?: string;
    fileTypes?: string[];
    limit?: number;
    threshold?: number;
    useEntityRecognition?: boolean;
    entityContext?: EntityQuery;
}

export interface SearchResult {
    id: string;
    filePath: string;
    content: string;
    lineStart: number;
    lineEnd: number;
    score: number;
    metadata?: {
        language?: string;
        chunkType?: string;
        baseScore?: number;
        entityScore?: number;
        relationshipScore?: number;
        explanation?: string;
    };
}

export interface RAGContext {
    query: string;
    results: SearchResult[];
    contextString: string;
    totalTokens: number;
    entityFiles?: EnrichedContextFile[];
}

export interface EmbeddingCacheEntry {
    query: string;
    embedding: number[];
    createdAt: number;
}
