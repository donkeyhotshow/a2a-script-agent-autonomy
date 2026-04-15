/**
 * Entity Types for Knowledge Graph
 *
 * Реализация на основе плана: plans/types-improvements.md
 *
 * Recognized entities from code analysis
 */
export type EntityTypeName = 'MODEL' | 'CONTROLLER' | 'SERVICE' | 'REPOSITORY' | 'MIDDLEWARE' | 'VUE_COMPONENT' | 'COMPOSABLE' | 'PHP' | 'JS' | 'CONFIG' | 'REQUEST' | 'VUE_PAGE' | 'OTHER';
export type RelationTypeName = 'USES' | 'CREATES' | 'VALIDATES' | 'HANDLES' | 'CALLS' | 'EXTENDS' | 'IMPLEMENTS' | 'IMPORTS' | 'RENDERS' | 'BELONGS_TO' | 'HAS_MANY' | 'HAS_ONE';
/**
 * Recognized Entity from code analysis
 */
export interface RecognizedEntity {
    id: string;
    type: EntityTypeName;
    name: string;
    path: string;
    lineStart?: number;
    lineEnd?: number;
    metadata?: EntityMetadata;
}
/**
 * Entity metadata - additional info extracted from code
 */
export interface EntityMetadata {
    tableName?: string | undefined;
    fillable?: string[] | undefined;
    casts?: Record<string, string> | undefined;
    relations?: ModelRelation[] | undefined;
    methods?: ControllerMethod[] | undefined;
    middleware?: string[] | undefined;
    props?: VueProp[] | undefined;
    emits?: string[] | undefined;
    imports?: string[] | undefined;
    rules?: Record<string, string> | undefined;
    extends?: string | undefined;
    implements?: string[] | undefined;
    namespace?: string | undefined;
}
/**
 * Model relation info
 */
export interface ModelRelation {
    name: string;
    type: 'belongsTo' | 'hasMany' | 'hasOne' | 'belongsToMany' | 'morphTo' | 'morphMany';
    related?: string | undefined;
}
/**
 * Controller method info
 */
export interface ControllerMethod {
    name: string;
    visibility: 'public' | 'protected' | 'private';
    parameters?: string[];
    returnType?: string;
}
/**
 * Vue prop info
 */
export interface VueProp {
    name: string;
    type?: string | undefined;
    required?: boolean | undefined;
    default?: string | undefined;
}
/**
 * Recognized Relation between entities
 */
export interface RecognizedRelation {
    id: string;
    fromPath: string;
    toPath?: string | undefined;
    fromId?: string | undefined;
    toId?: string | undefined;
    type: RelationTypeName;
    metadata?: RelationMetadata | undefined;
}
/**
 * Relation metadata
 */
export interface RelationMetadata {
    methodName?: string;
    line?: number;
    context?: string;
}
/**
 * Result of entity recognition from a single file
 */
export interface RecognitionResult {
    entities: RecognizedEntity[];
    relations: RecognizedRelation[];
    errors?: string[] | undefined;
}
/**
 * Code block input for recognition
 */
export interface CodeBlock {
    path: string;
    content: string;
}
/**
 * Check if value is a valid EntityTypeName
 */
export declare function isEntityTypeName(value: unknown): value is EntityTypeName;
/**
 * Check if value is a valid RelationTypeName
 */
export declare function isRelationTypeName(value: unknown): value is RelationTypeName;
/**
 * Check if value is a RecognizedEntity
 */
export declare function isRecognizedEntity(value: unknown): value is RecognizedEntity;
/**
 * Check if value is a RecognizedRelation
 */
export declare function isRecognizedRelation(value: unknown): value is RecognizedRelation;
/**
 * Check if value is a RecognitionResult
 */
export declare function isRecognitionResult(value: unknown): value is RecognitionResult;
//# sourceMappingURL=entity.types.d.ts.map