/**
 * Entity Types for Knowledge Graph
 *
 * Реализация на основе плана: plans/types-improvements.md
 *
 * Recognized entities from code analysis
 */

// Entity types matching Prisma schema EntityType enum
export type EntityTypeName = 
  | 'MODEL'
  | 'CONTROLLER'
  | 'SERVICE'
  | 'REPOSITORY'
  | 'MIDDLEWARE'
  | 'VUE_COMPONENT'
  | 'COMPOSABLE'
  | 'PHP'
  | 'JS'
  | 'CONFIG'
  | 'REQUEST'
  | 'VUE_PAGE'
  | 'OTHER';

// Relation types matching Prisma RelationType enum
export type RelationTypeName =
  | 'USES'
  | 'CREATES'
  | 'VALIDATES'
  | 'HANDLES'
  | 'CALLS'
  | 'EXTENDS'
  | 'IMPLEMENTS'
  | 'IMPORTS'
  | 'RENDERS'
  | 'BELONGS_TO'
  | 'HAS_MANY'
  | 'HAS_ONE';

/**
 * Recognized Entity from code analysis
 */
export interface RecognizedEntity {
  id: string;           // Unique ID (e.g., 'model-user', 'controller-authcontroller')
  type: EntityTypeName;
  name: string;         // Class/function name
  path: string;         // File path
  lineStart?: number;   // Line where entity starts
  lineEnd?: number;     // Line where entity ends
  metadata?: EntityMetadata;
}

/**
 * Entity metadata - additional info extracted from code
 */
export interface EntityMetadata {
  // For Models
  tableName?: string | undefined;
  fillable?: string[] | undefined;
  casts?: Record<string, string> | undefined;
  relations?: ModelRelation[] | undefined;
  
  // For Controllers
  methods?: ControllerMethod[] | undefined;
  middleware?: string[] | undefined;
  
  // For Vue Components
  props?: VueProp[] | undefined;
  emits?: string[] | undefined;
  imports?: string[] | undefined;
  
  // For Requests
  rules?: Record<string, string> | undefined;
  
  // Generic
  extends?: string | undefined;
  implements?: string[] | undefined;
  namespace?: string | undefined;
}

/**
 * Model relation info
 */
export interface ModelRelation {
  name: string;         // Method name (e.g., 'posts')
  type: 'belongsTo' | 'hasMany' | 'hasOne' | 'belongsToMany' | 'morphTo' | 'morphMany';
  related?: string | undefined;     // Related model class
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
  id: string;           // Unique ID
  fromPath: string;     // Source entity path
  toPath?: string | undefined;      // Target entity path (may be unknown)
  fromId?: string | undefined;      // Source entity ID
  toId?: string | undefined;        // Target entity ID
  type: RelationTypeName;
  metadata?: RelationMetadata | undefined;
}

/**
 * Relation metadata
 */
export interface RelationMetadata {
  methodName?: string;  // For model relations
  line?: number;        // Line where relation is defined
  context?: string;     // Surrounding code context
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

// ============================================
// Type Guards (plans/types-improvements.md)
// ============================================

/**
 * Check if value is a valid EntityTypeName
 */
export function isEntityTypeName(value: unknown): value is EntityTypeName {
  if (typeof value !== 'string') return false;
  const validTypes: EntityTypeName[] = [
    'MODEL', 'CONTROLLER', 'SERVICE', 'REPOSITORY', 'MIDDLEWARE',
    'VUE_COMPONENT', 'COMPOSABLE', 'PHP', 'JS', 'CONFIG', 'REQUEST', 'VUE_PAGE', 'OTHER'
  ];
  return validTypes.includes(value as EntityTypeName);
}

/**
 * Check if value is a valid RelationTypeName
 */
export function isRelationTypeName(value: unknown): value is RelationTypeName {
  if (typeof value !== 'string') return false;
  const validTypes: RelationTypeName[] = [
    'USES', 'CREATES', 'VALIDATES', 'HANDLES', 'CALLS', 'EXTENDS',
    'IMPLEMENTS', 'IMPORTS', 'RENDERS', 'BELONGS_TO', 'HAS_MANY', 'HAS_ONE'
  ];
  return validTypes.includes(value as RelationTypeName);
}

/**
 * Check if value is a RecognizedEntity
 */
export function isRecognizedEntity(value: unknown): value is RecognizedEntity {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Partial<RecognizedEntity>;
  return (
    typeof obj.id === 'string' &&
    isEntityTypeName(obj.type) &&
    typeof obj.name === 'string' &&
    typeof obj.path === 'string'
  );
}

/**
 * Check if value is a RecognizedRelation
 */
export function isRecognizedRelation(value: unknown): value is RecognizedRelation {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Partial<RecognizedRelation>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.fromPath === 'string' &&
    isRelationTypeName(obj.type)
  );
}

/**
 * Check if value is a RecognitionResult
 */
export function isRecognitionResult(value: unknown): value is RecognitionResult {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Partial<RecognitionResult>;
  return (
    Array.isArray(obj.entities) &&
    Array.isArray(obj.relations) &&
    obj.entities.every(isRecognizedEntity) &&
    obj.relations.every(isRecognizedRelation)
  );
}
