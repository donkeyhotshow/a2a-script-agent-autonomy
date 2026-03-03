/**
 * Entity Recognizer Service
 *
 * Main service for extracting entities and relations from code files.
 * Delegates to specialized extractors based on file type.
 *
 * Supported file types:
 * - PHP (.php): Models, Controllers, Services, Requests, Middleware
 * - Vue (.vue): Components, Pages (with Inertia.js support)
 * - TypeScript/JavaScript (.ts, .js): Composables
 */

import type {
    CodeBlock,
    RecognitionResult,
    RecognizedEntity,
    RecognizedRelation,
    EntityTypeName,
} from '../../types/entity.types.js';
import { extractEntity, canExtract } from './extractors/index.js';
import { generateEntityId, getFileExtension } from './utils.js';
import { logger } from '../../utils/logger.js';

/**
 * Recognize entities from a single code block
 */
export function recognizeEntities(block: CodeBlock): RecognitionResult {
    const { path, content } = block;
    const entities: RecognizedEntity[] = [];
    const relations: RecognizedRelation[] = [];
    const errors: string[] = [];

    try {
        // Use specialized extractor if available
        const result = extractEntity({ content, path });

        if (result?.entity) {
            entities.push(result.entity);
            relations.push(...result.relations);
        } else {
            // Fallback for unsupported file types (TS/JS composables)
            const ext = getFileExtension(path);
            if (ext === 'ts' || ext === 'js') {
                handleTypeScriptFile(path, entities);
            }
        }
    } catch (error) {
        const errorMsg = `Error recognizing entities in ${path}: ${error}`;
        logger.error(errorMsg);
        errors.push(errorMsg);
    }

    return {
        entities,
        relations,
        errors: errors.length > 0 ? errors : undefined,
    };
}

/**
 * Handle TypeScript/JavaScript files (composables, configs)
 */
function handleTypeScriptFile(path: string, entities: RecognizedEntity[]): void {
    const filename = path.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || 'unknown';

    if (path.includes('/composables/')) {
        entities.push({
            id: generateEntityId('COMPOSABLE', filename, path),
            type: 'COMPOSABLE',
            name: filename,
            path,
        });
    }
}

/**
 * Recognize entities from multiple code blocks
 */
export function recognizeEntitiesBatch(blocks: CodeBlock[]): RecognitionResult {
    const allEntities: RecognizedEntity[] = [];
    const allRelations: RecognizedRelation[] = [];
    const allErrors: string[] = [];

    for (const block of blocks) {
        const result = recognizeEntities(block);
        allEntities.push(...result.entities);
        allRelations.push(...result.relations);
        if (result.errors) {
            allErrors.push(...result.errors);
        }
    }

    // Deduplicate entities by id
    const entityMap = new Map<string, RecognizedEntity>();
    for (const entity of allEntities) {
        entityMap.set(entity.id, entity);
    }

    // Deduplicate relations by id
    const relationMap = new Map<string, RecognizedRelation>();
    for (const relation of allRelations) {
        relationMap.set(relation.id, relation);
    }

    return {
        entities: Array.from(entityMap.values()),
        relations: Array.from(relationMap.values()),
        errors: allErrors.length > 0 ? allErrors : undefined,
    };
}

/**
 * Get entity type from file path (heuristic)
 */
export function guessEntityTypeFromPath(path: string): EntityTypeName | null {
    if (path.includes('/Models/') && path.endsWith('.php')) return 'MODEL';
    if (path.includes('/Controllers/') && path.endsWith('.php')) return 'CONTROLLER';
    if (path.includes('/Services/') && path.endsWith('.php')) return 'SERVICE';
    if (path.includes('/Requests/') && path.endsWith('.php')) return 'REQUEST';
    if (path.includes('/Middleware/') && path.endsWith('.php')) return 'MIDDLEWARE';
    if (path.includes('/Components/') && path.endsWith('.vue')) return 'VUE_COMPONENT';
    if (path.includes('/Pages/') && path.endsWith('.vue')) return 'VUE_PAGE';
    if (path.includes('/composables/') && (path.endsWith('.ts') || path.endsWith('.js'))) return 'COMPOSABLE';
    if (path.includes('/config/') && path.endsWith('.php')) return 'CONFIG';

    return null;
}

/**
 * Check if file can be processed
 */
export function canRecognize(path: string): boolean {
    return canExtract(path) || ['.ts', '.js'].some(ext => path.toLowerCase().endsWith(ext));
}
