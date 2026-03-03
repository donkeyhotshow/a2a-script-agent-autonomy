/**
 * Entity Recognition Module Types
 *
 * Internal types specific to entity recognition functionality.
 * Public types are re-exported from entity.types.js
 */

import type {
    RecognizedEntity,
    RecognizedRelation,
    RecognitionResult,
} from '../../types/entity.types.js';

/**
 * Input for entity extraction
 */
export interface ExtractionInput {
    content: string;
    path: string;
}

/**
 * Result of entity extraction
 */
export interface ExtractionResult {
    entity: RecognizedEntity | null;
    relations: RecognizedRelation[];
}

/**
 * Interface for entity extractors
 */
export interface EntityExtractor {
    /**
     * Check if this extractor can handle the given file
     */
    canHandle(path: string): boolean;

    /**
     * Extract entity from content
     */
    extract(input: ExtractionInput): ExtractionResult;
}

/**
 * Class info extracted from PHP code
 */
export interface ClassInfo {
    name: string;
    extends?: string;
    implements?: string[];
}

/**
 * Re-export public types for convenience
 */
export type {
    RecognizedEntity,
    RecognizedRelation,
    RecognitionResult,
    CodeBlock,
    EntityTypeName,
    RelationTypeName,
    EntityMetadata,
    ModelRelation,
    ControllerMethod,
    VueProp,
} from '../../types/entity.types.js';
