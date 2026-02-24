/**
 * Entity Types for Knowledge Graph
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
