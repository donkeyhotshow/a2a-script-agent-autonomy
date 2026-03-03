/**
 * PHP Entity Extractor
 *
 * Extracts PHP entities (Models, Controllers, Services, Requests, etc.)
 * from PHP source code files.
 */

import type {
    RecognizedEntity,
    RecognizedRelation,
    EntityTypeName,
    EntityMetadata,
    ModelRelation,
    ControllerMethod,
} from '../../../types/entity.types.js';
import type { ExtractionInput, ExtractionResult, ClassInfo } from '../types.js';
import {
    PHP_PATTERNS,
    RELATION_PATTERNS,
} from '../patterns/index.js';
import { generateEntityId, generateRelationId } from '../utils.js';

/**
 * Extract class information from PHP content
 */
function extractClassInfo(content: string): ClassInfo | null {
    // Reset regex lastIndex
    PHP_PATTERNS.classDeclaration.lastIndex = 0;
    const match = PHP_PATTERNS.classDeclaration.exec(content);
    if (!match || !match[1]) return null;

    return {
        name: match[1],
        extends: match[2] || undefined,
        implements: match[3]?.split(',').map(s => s.trim()).filter(Boolean),
    };
}

/**
 * Extract namespace from PHP content
 */
function extractNamespace(content: string): string | undefined {
    PHP_PATTERNS.namespace.lastIndex = 0;
    const match = PHP_PATTERNS.namespace.exec(content);
    return match?.[1];
}

/**
 * Extract model relations using Eloquent patterns
 */
function extractModelRelations(content: string): ModelRelation[] {
    const relations: ModelRelation[] = [];

    for (const { pattern, type } of RELATION_PATTERNS) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(content)) !== null) {
            if (match[1]) {
                const relation: ModelRelation = {
                    name: match[1],
                    type,
                };

                // Some relations have a related model
                if (match[2]) {
                    relation.related = match[2].trim().replace(/['"]/g, '');
                }

                relations.push(relation);
            }
        }
    }

    return relations;
}

/**
 * Extract controller methods
 */
function extractControllerMethods(content: string): ControllerMethod[] {
    const methods: ControllerMethod[] = [];
    PHP_PATTERNS.controllerMethod.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = PHP_PATTERNS.controllerMethod.exec(content)) !== null) {
        if (!match[1]) continue;

        const visibility = match[0].startsWith('public') ? 'public'
            : match[0].startsWith('protected') ? 'protected'
                : 'private';

        methods.push({
            name: match[1],
            visibility,
            parameters: match[2]?.split(',').map(s => s.trim()).filter(Boolean) || [],
        });
    }

    // Filter out constructor and middleware method
    return methods.filter(m => !['__construct', 'middleware'].includes(m.name));
}

/**
 * Extract middleware from controller
 */
function extractMiddleware(content: string): string[] {
    const middleware: string[] = [];
    PHP_PATTERNS.middleware.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = PHP_PATTERNS.middleware.exec(content)) !== null) {
        if (match[1]) {
            middleware.push(match[1]);
        }
    }

    return middleware;
}

/**
 * Determine entity type from class characteristics
 */
function determineEntityType(content: string, classInfo: ClassInfo): EntityTypeName {
    // Check for Model
    if (PHP_PATTERNS.modelExtends.test(content)) {
        return 'MODEL';
    }

    // Check for Controller
    if (PHP_PATTERNS.controllerExtends.test(content)) {
        return 'CONTROLLER';
    }

    // Check for FormRequest
    if (PHP_PATTERNS.formRequestExtends.test(content)) {
        return 'REQUEST';
    }

    // Check by naming conventions
    if (classInfo.name.endsWith('Service') || PHP_PATTERNS.serviceClass.test(content)) {
        return 'SERVICE';
    }

    if (classInfo.name.endsWith('Repository')) {
        return 'REPOSITORY';
    }

    if (classInfo.name.endsWith('Middleware')) {
        return 'MIDDLEWARE';
    }

    // Default
    return 'PHP';
}

/**
 * Extract model-specific metadata
 */
function extractModelMetadata(content: string, metadata: EntityMetadata): void {
    const tableMatch = content.match(PHP_PATTERNS.modelTable);
    if (tableMatch?.[1]) {
        metadata.tableName = tableMatch[1];
    }

    const fillableMatch = content.match(PHP_PATTERNS.modelFillable);
    if (fillableMatch?.[1]) {
        metadata.fillable = fillableMatch[1]
            .split(',')
            .map(s => s.trim().replace(/['"]/g, ''))
            .filter(Boolean);
    }

    const castsMatch = content.match(PHP_PATTERNS.modelCasts);
    if (castsMatch?.[1]) {
        // Parse casts into Record<string, string>
        metadata.casts = {};
        const castEntries = castsMatch[1].split(',');
        for (const entry of castEntries) {
            const keyValue = entry.match(/['"](\w+)['"]\s*=>\s*['"](\w+)['"]/);
            if (keyValue) {
                metadata.casts[keyValue[1]] = keyValue[2];
            }
        }
    }

    metadata.relations = extractModelRelations(content);
}

/**
 * Extract controller-specific metadata
 */
function extractControllerMetadata(content: string, metadata: EntityMetadata): void {
    metadata.methods = extractControllerMethods(content);
    metadata.middleware = extractMiddleware(content);
}

/**
 * Extract request-specific metadata
 */
function extractRequestMetadata(content: string, metadata: EntityMetadata): void {
    const rulesMatch = content.match(PHP_PATTERNS.rulesMethod);
    if (rulesMatch) {
        // Basic extraction - could be enhanced to parse actual rules
        metadata.rules = {};
    }
}

/**
 * Build relations from entity metadata
 */
function buildRelations(entity: RecognizedEntity, content: string): RecognizedRelation[] {
    const relations: RecognizedRelation[] = [];

    // Model relations
    if (entity.type === 'MODEL' && entity.metadata?.relations) {
        for (const rel of entity.metadata.relations) {
            const relationType =
                rel.type === 'belongsTo' ? 'BELONGS_TO' :
                    rel.type === 'hasMany' ? 'HAS_MANY' :
                        rel.type === 'hasOne' ? 'HAS_ONE' :
                            'USES';

            relations.push({
                id: generateRelationId(entity.path, rel.related, relationType),
                fromPath: entity.path,
                toPath: rel.related ? `app/Models/${rel.related}.php` : undefined,
                fromId: entity.id,
                type: relationType,
                metadata: {
                    methodName: rel.name,
                },
            });
        }
    }

    // Controller relations
    if (entity.type === 'CONTROLLER' && entity.metadata?.methods) {
        for (const method of entity.metadata.methods) {
            // Check for CRUD method names
            const crudMethods = ['index', 'show', 'store', 'update', 'destroy', 'create', 'edit'];
            if (crudMethods.includes(method.name)) {
                relations.push({
                    id: generateRelationId(entity.path, undefined, 'HANDLES'),
                    fromPath: entity.path,
                    fromId: entity.id,
                    type: 'HANDLES',
                    metadata: {
                        methodName: method.name,
                    },
                });
            }
        }
    }

    return relations;
}

/**
 * Main function: Extract PHP entity from content
 */
export function extractPHPEntity(input: ExtractionInput): ExtractionResult {
    const { content, path } = input;
    const classInfo = extractClassInfo(content);

    if (!classInfo) {
        return { entity: null, relations: [] };
    }

    const namespace = extractNamespace(content);
    const type = determineEntityType(content, classInfo);
    const metadata: EntityMetadata = {};

    // Extract type-specific metadata
    switch (type) {
        case 'MODEL':
            extractModelMetadata(content, metadata);
            break;
        case 'CONTROLLER':
            extractControllerMetadata(content, metadata);
            break;
        case 'REQUEST':
            extractRequestMetadata(content, metadata);
            break;
    }

    // Add generic metadata
    if (classInfo.extends) {
        metadata.extends = classInfo.extends;
    }
    if (classInfo.implements) {
        metadata.implements = classInfo.implements;
    }
    if (namespace) {
        metadata.namespace = namespace;
    }

    const entity: RecognizedEntity = {
        id: generateEntityId(type, classInfo.name, path),
        type,
        name: classInfo.name,
        path,
        metadata,
    };

    const relations = buildRelations(entity, content);

    return { entity, relations };
}

/**
 * Check if extractor can handle this file
 */
export function canHandlePHP(path: string): boolean {
    return path.toLowerCase().endsWith('.php');
}
