/**
 * Entity Recognizer
 * Recognizes code entities: Model, Controller, Service, Repository, Vue components
 * Production-ready: regex patterns, metadata extraction
 */

// ============================================
// Types
// ============================================

export type EntityType =
  | 'model'
  | 'controller'
  | 'service'
  | 'repository'
  | 'middleware'
  | 'request'
  | 'resource'
  | 'policy'
  | 'observer'
  | 'event'
  | 'listener'
  | 'job'
  | 'migration'
  | 'factory'
  | 'seeder'
  | 'vue-component'
  | 'vue-page'
  | 'vue-layout'
  | 'composable'
  | 'store'
  | 'type'
  | 'interface';

export interface EntityMetadata {
  name: string;
  namespace?: string;
  extends?: string;
  implements?: string[];
  traits?: string[];
  methods?: string[];
  properties?: string[];
  relationships?: EloquentRelationship[];
  imports?: string[];
  exports?: string[];
  props?: VueProp[];
  emits?: string[];
  routes?: RouteDefinition[];
}

export interface EloquentRelationship {
  type: 'hasMany' | 'belongsTo' | 'belongsToMany' | 'hasOne' | 'morphMany' | 'morphTo';
  name: string;
  related: string;
}

export interface VueProp {
  name: string;
  type: string;
  required: boolean;
  default?: string;
}

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  action?: string;
  name?: string;
}

export interface RecognizedEntity {
  id: string;
  type: EntityType;
  filePath: string;
  name: string;
  metadata: EntityMetadata;
  startLine: number;
  endLine: number;
  confidence: number; // 0-1
}

// ============================================
// Patterns
// ============================================

const ENTITY_PATTERNS: Record<EntityType, {
  patterns: RegExp[];
  extractors: Array<(content: string, filePath: string) => EntityMetadata | null>;
}> = {
  model: {
    patterns: [
      /class\s+(\w+)\s+extends\s+Model/i,
      /use\s+Illuminate\\Database\\Eloquent\\Model/i,
      /namespace\s+App\\Models/i,
    ],
    extractors: [extractModelMetadata],
  },
  controller: {
    patterns: [
      /class\s+(\w+)Controller\s+extends\s+Controller/i,
      /use\s+Illuminate\\Routing\\Controller/i,
      /namespace\s+App\\Http\\Controllers/i,
    ],
    extractors: [extractControllerMetadata],
  },
  service: {
    patterns: [
      /class\s+(\w+)Service/i,
      /namespace\s+App\\Services/i,
    ],
    extractors: [extractClassMetadata],
  },
  repository: {
    patterns: [
      /class\s+(\w+)Repository/i,
      /namespace\s+App\\Repositories/i,
      /implements\s+(\w+)RepositoryInterface/i,
    ],
    extractors: [extractClassMetadata],
  },
  middleware: {
    patterns: [
      /class\s+(\w+)Middleware/i,
      /namespace\s+App\\Http\\Middleware/i,
    ],
    extractors: [extractClassMetadata],
  },
  request: {
    patterns: [
      /class\s+(\w+)Request\s+extends\s+FormRequest/i,
      /use\s+Illuminate\\Foundation\\Http\\FormRequest/i,
    ],
    extractors: [extractFormRequestMetadata],
  },
  resource: {
    patterns: [
      /class\s+(\w+)Resource\s+extends\s+JsonResource/i,
      /use\s+Illuminate\\Http\\Resources\\Json\\JsonResource/i,
    ],
    extractors: [extractClassMetadata],
  },
  policy: {
    patterns: [
      /class\s+(\w+)Policy/i,
      /namespace\s+App\\Policies/i,
    ],
    extractors: [extractClassMetadata],
  },
  observer: {
    patterns: [
      /class\s+(\w+)Observer/i,
      /namespace\s+App\\Observers/i,
    ],
    extractors: [extractClassMetadata],
  },
  event: {
    patterns: [
      /class\s+(\w+)\s+extends\s+Event/i,
      /namespace\s+App\\Events/i,
    ],
    extractors: [extractClassMetadata],
  },
  listener: {
    patterns: [
      /class\s+(\w+)\s+implements\s+ShouldHandleEvents/i,
      /namespace\s+App\\Listeners/i,
    ],
    extractors: [extractClassMetadata],
  },
  job: {
    patterns: [
      /class\s+(\w+)\s+implements\s+ShouldQueue/i,
      /namespace\s+App\\Jobs/i,
    ],
    extractors: [extractClassMetadata],
  },
  migration: {
    patterns: [
      /class\s+\w+\s+extends\s+Migration/i,
      /Schema::(create|table|drop)/i,
    ],
    extractors: [extractMigrationMetadata],
  },
  factory: {
    patterns: [
      /class\s+(\w+)Factory/i,
      /use\s+Illuminate\\Database\\Eloquent\\Factories\\Factory/i,
    ],
    extractors: [extractClassMetadata],
  },
  seeder: {
    patterns: [
      /class\s+(\w+)Seeder/i,
      /use\s+Illuminate\\Database\\Seeder/i,
    ],
    extractors: [extractClassMetadata],
  },
  'vue-component': {
    patterns: [
      /<script\s+setup\s+lang="ts">/,
      /defineComponent/,
      /<template>/,
    ],
    extractors: [extractVueComponentMetadata],
  },
  'vue-page': {
    patterns: [
      /resources\/js\/Pages\//i,
      /pages\/.*\.vue$/i,
    ],
    extractors: [extractVuePageMetadata],
  },
  'vue-layout': {
    patterns: [
      /layouts\/.*\.vue$/i,
      /resources\/js\/Layouts\//i,
    ],
    extractors: [extractVueComponentMetadata],
  },
  composable: {
    patterns: [
      /export\s+(function|const)\s+use\w+/i,
      /composables\/.*\.ts$/i,
    ],
    extractors: [extractComposableMetadata],
  },
  store: {
    patterns: [
      /defineStore\s*\(/i,
      /stores\/.*\.ts$/i,
    ],
    extractors: [extractStoreMetadata],
  },
  type: {
    patterns: [
      /export\s+type\s+\w+/i,
      /types\/.*\.ts$/i,
    ],
    extractors: [extractTypeMetadata],
  },
  interface: {
    patterns: [
      /export\s+interface\s+\w+/i,
    ],
    extractors: [extractInterfaceMetadata],
  },
};

// ============================================
// Main Functions
// ============================================

/**
 * Recognize entities in file content
 */
export function recognizeEntities(
  content: string,
  filePath: string
): RecognizedEntity[] {
  const entities: RecognizedEntity[] = [];
  
  for (const [type, config] of Object.entries(ENTITY_PATTERNS)) {
    const entityType = type as EntityType;
    
    // Check if any pattern matches
    const matchedPatterns = config.patterns.filter((p) => p.test(content));
    
    if (matchedPatterns.length > 0) {
      // Run extractors
      for (const extractor of config.extractors) {
        const metadata = extractor(content, filePath);
        
        if (metadata) {
          const entity = createEntity(
            entityType,
            filePath,
            metadata,
            content,
            matchedPatterns.length / config.patterns.length
          );
          entities.push(entity);
        }
      }
    }
  }
  
  return deduplicateEntities(entities);
}

/**
 * Recognize entities in multiple files
 */
export function recognizeEntitiesBatch(
  files: Array<{ path: string; content: string }>
): RecognizedEntity[] {
  const allEntities: RecognizedEntity[] = [];
  
  for (const file of files) {
    const entities = recognizeEntities(file.content, file.path);
    allEntities.push(...entities);
  }
  
  return allEntities;
}

/**
 * Get entity type from file path
 */
export function getEntityTypeFromPath(filePath: string): EntityType | null {
  const path = filePath.toLowerCase();
  
  // PHP entities
  if (path.includes('/models/') && path.endsWith('.php')) return 'model';
  if (path.includes('/controllers/') && path.endsWith('.php')) return 'controller';
  if (path.includes('/services/') && path.endsWith('.php')) return 'service';
  if (path.includes('/repositories/') && path.endsWith('.php')) return 'repository';
  if (path.includes('/middleware/') && path.endsWith('.php')) return 'middleware';
  if (path.includes('/requests/') && path.endsWith('.php')) return 'request';
  if (path.includes('/resources/') && path.endsWith('.php')) return 'resource';
  if (path.includes('/policies/') && path.endsWith('.php')) return 'policy';
  if (path.includes('/observers/') && path.endsWith('.php')) return 'observer';
  if (path.includes('/events/') && path.endsWith('.php')) return 'event';
  if (path.includes('/listeners/') && path.endsWith('.php')) return 'listener';
  if (path.includes('/jobs/') && path.endsWith('.php')) return 'job';
  if (path.includes('/migrations/') && path.endsWith('.php')) return 'migration';
  if (path.includes('/factories/') && path.endsWith('.php')) return 'factory';
  if (path.includes('/seeders/') && path.endsWith('.php')) return 'seeder';
  
  // Vue entities
  if (path.includes('/pages/') && path.endsWith('.vue')) return 'vue-page';
  if (path.includes('/layouts/') && path.endsWith('.vue')) return 'vue-layout';
  if (path.endsWith('.vue')) return 'vue-component';
  
  // TypeScript entities
  if (path.includes('/composables/') && path.endsWith('.ts')) return 'composable';
  if (path.includes('/stores/') && path.endsWith('.ts')) return 'store';
  if (path.includes('/types/') && path.endsWith('.ts')) return 'type';
  
  return null;
}

// ============================================
// Extractors
// ============================================

function extractModelMetadata(content: string, _filePath: string): EntityMetadata | null {
  const nameMatch = content.match(/class\s+(\w+)\s+extends\s+Model/);
  if (!nameMatch) return null;
  
  const name = nameMatch[1]!;
  const metadata: EntityMetadata = { name };
  
  const namespace = extractNamespace(content);
  if (namespace) metadata.namespace = namespace;
  
  const traits = extractTraits(content);
  if (traits) metadata.traits = traits;
  
  const methods = extractMethods(content);
  if (methods) metadata.methods = methods;
  
  const relationships = extractEloquentRelationships(content);
  if (relationships.length > 0) metadata.relationships = relationships;
  
  return metadata;
}

function extractControllerMetadata(content: string, _filePath: string): EntityMetadata | null {
  const nameMatch = content.match(/class\s+(\w+)Controller\b/);
  if (!nameMatch) return null;
  
  const name = nameMatch[1]!;
  const metadata: EntityMetadata = { name };
  
  const namespace = extractNamespace(content);
  if (namespace) metadata.namespace = namespace;
  
  const methods = extractPublicMethods(content);
  if (methods) metadata.methods = methods;
  
  return metadata;
}

function extractClassMetadata(content: string, _filePath: string): EntityMetadata | null {
  const nameMatch = content.match(/class\s+(\w+)/);
  if (!nameMatch) return null;
  
  const name = nameMatch[1]!;
  const metadata: EntityMetadata = { name };
  
  const namespace = extractNamespace(content);
  if (namespace) metadata.namespace = namespace;
  
  const extends_ = extractExtends(content);
  if (extends_) metadata.extends = extends_;
  
  const implements_ = extractImplements(content);
  if (implements_) metadata.implements = implements_;
  
  const traits = extractTraits(content);
  if (traits) metadata.traits = traits;
  
  const methods = extractMethods(content);
  if (methods) metadata.methods = methods;
  
  return metadata;
}

function extractFormRequestMetadata(content: string, _filePath: string): EntityMetadata | null {
  const nameMatch = content.match(/class\s+(\w+)Request\b/);
  if (!nameMatch) return null;
  
  const name = nameMatch[1]!;
  const metadata: EntityMetadata = { name };
  
  const namespace = extractNamespace(content);
  if (namespace) metadata.namespace = namespace;
  
  const rules = extractValidationRules(content);
  if (rules && rules.length > 0) {
    metadata.methods = ['rules'];
    metadata.properties = rules;
  }
  
  return metadata;
}

function extractMigrationMetadata(content: string, _filePath: string): EntityMetadata | null {
  const tableMatch = content.match(/Schema::(create|table)\s*\(\s*['"](\w+)['"]/);
  if (!tableMatch) return null;
  
  const tableName = tableMatch[2]!;
  const operation = tableMatch[1]!;
  
  return {
    name: `${operation}_${tableName}`,
    methods: [operation],
  };
}

function extractVueComponentMetadata(content: string, filePath: string): EntityMetadata | null {
  const nameMatch = filePath.match(/([^\/]+)\.vue$/);
  const name = nameMatch ? nameMatch[1]! : 'Unknown';
  
  const metadata: EntityMetadata = { name };
  
  const props = extractVueProps(content);
  if (props.length > 0) metadata.props = props;
  
  const emits = extractVueEmits(content);
  if (emits) metadata.emits = emits;
  
  const imports = extractImports(content);
  if (imports) metadata.imports = imports;
  
  return metadata;
}

function extractVuePageMetadata(content: string, filePath: string): EntityMetadata | null {
  const base = extractVueComponentMetadata(content, filePath);
  if (!base) return null;
  
  // Extract Inertia props
  const propsMatch = content.match(/defineProps<(\w+)>/);
  if (propsMatch && propsMatch[1]) {
    base.properties = [propsMatch[1]];
  }
  
  return base;
}

function extractComposableMetadata(content: string, _filePath: string): EntityMetadata | null {
  const nameMatch = content.match(/export\s+(function|const)\s+(use\w+)/);
  if (!nameMatch) return null;
  
  const name = nameMatch[2]!;
  const metadata: EntityMetadata = { name };
  
  const exports = extractExports(content);
  if (exports) metadata.exports = exports;
  
  return metadata;
}

function extractStoreMetadata(content: string, _filePath: string): EntityMetadata | null {
  const nameMatch = content.match(/defineStore\s*\(\s*['"](\w+)['"]/);
  if (!nameMatch) return null;
  
  const name = nameMatch[1]!;
  const metadata: EntityMetadata = { name };
  
  const methods = extractStoreMethods(content);
  if (methods) metadata.methods = methods;
  
  return metadata;
}

function extractTypeMetadata(content: string, _filePath: string): EntityMetadata | null {
  const nameMatch = content.match(/export\s+type\s+(\w+)/);
  if (!nameMatch) return null;
  
  return { name: nameMatch[1]! };
}

function extractInterfaceMetadata(content: string, _filePath: string): EntityMetadata | null {
  const nameMatch = content.match(/export\s+interface\s+(\w+)/);
  if (!nameMatch) return null;
  
  return { name: nameMatch[1]! };
}

// ============================================
// Helper Functions
// ============================================

function extractNamespace(content: string): string | undefined {
  const match = content.match(/namespace\s+([\w\\]+);/);
  return match && match[1] ? match[1] : undefined;
}

function extractExtends(content: string): string | undefined {
  const match = content.match(/extends\s+(\w+)/);
  return match && match[1] ? match[1] : undefined;
}

function extractImplements(content: string): string[] | undefined {
  const match = content.match(/implements\s+([\w,\s]+)/);
  if (!match || !match[1]) return undefined;
  return match[1].split(',').map((s) => s.trim()).filter(Boolean);
}

function extractTraits(content: string): string[] | undefined {
  const matches = content.matchAll(/use\s+(\w+);/g);
  const traits = Array.from(matches, (m) => m[1]).filter((s): s is string => typeof s === 'string');
  return traits.length > 0 ? traits : undefined;
}

function extractMethods(content: string): string[] | undefined {
  const matches = content.matchAll(/(?:public|protected|private)\s+function\s+(\w+)\s*\(/g);
  const methods = Array.from(matches, (m) => m[1]).filter((s): s is string => typeof s === 'string');
  return methods.length > 0 ? methods : undefined;
}

function extractPublicMethods(content: string): string[] | undefined {
  const matches = content.matchAll(/public\s+function\s+(\w+)\s*\(/g);
  const methods = Array.from(matches, (m) => m[1]).filter((s): s is string => typeof s === 'string');
  return methods.length > 0 ? methods : undefined;
}

function extractEloquentRelationships(content: string): EloquentRelationship[] {
  const relationships: EloquentRelationship[] = [];
  const types = ['hasMany', 'belongsTo', 'belongsToMany', 'hasOne', 'morphMany', 'morphTo'];
  
  for (const type of types) {
    const regex = new RegExp(
      `function\\s+(\\w+)\\s*\\(\\s*\\)\\s*:\\s*${type}\\s*<\\s*(\\w+)`,
      'g'
    );
    const matches = content.matchAll(regex);
    
    for (const match of matches) {
      if (match[1] && match[2]) {
        relationships.push({
          type: type as EloquentRelationship['type'],
          name: match[1],
          related: match[2],
        });
      }
    }
  }
  
  return relationships;
}

function extractValidationRules(content: string): string[] | undefined {
  const match = content.match(/function\s+rules\s*\(\s*\)\s*:\s*array\s*\{([\s\S]*?)\}/);
  if (!match || !match[1]) return undefined;
  
  const rulesBody = match[1];
  const fieldMatches = rulesBody.matchAll(/['"](\w+)['"]\s*=>/g);
  return Array.from(fieldMatches, (m) => m[1]).filter((s): s is string => typeof s === 'string');
}

function extractVueProps(content: string): VueProp[] {
  const props: VueProp[] = [];
  
  // defineProps with TypeScript
  const tsPropsMatch = content.match(/defineProps<\{([^}]+)\}>/);
  if (tsPropsMatch && tsPropsMatch[1]) {
    const propsBody = tsPropsMatch[1];
    const propMatches = propsBody.matchAll(/(\w+)\s*:\s*(\w+)/g);
    
    for (const match of propMatches) {
      if (match[1] && match[2]) {
        props.push({
          name: match[1],
          type: match[2],
          required: !match[2].includes('?'),
        });
      }
    }
  }
  
  return props;
}

function extractVueEmits(content: string): string[] | undefined {
  const match = content.match(/defineEmits<\{([^}]+)\}>/);
  if (!match || !match[1]) return undefined;
  
  const emitsBody = match[1];
  const emitMatches = emitsBody.matchAll(/['"](\w+)['"]/g);
  const result = Array.from(emitMatches, (m) => m[1]).filter((s): s is string => typeof s === 'string');
  return result.length > 0 ? result : undefined;
}

function extractImports(content: string): string[] | undefined {
  const matches = content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
  const imports = Array.from(matches, (m) => m[1]).filter((s): s is string => typeof s === 'string');
  return imports.length > 0 ? imports : undefined;
}

function extractExports(content: string): string[] | undefined {
  const matches = content.matchAll(/export\s+(?:const|function|class|type|interface)\s+(\w+)/g);
  const exports = Array.from(matches, (m) => m[1]).filter((s): s is string => typeof s === 'string');
  return exports.length > 0 ? exports : undefined;
}

function extractStoreMethods(content: string): string[] | undefined {
  const matches = content.matchAll(/(\w+)\s*:\s*(?:async\s+)?(?:function\s+)?\(/g);
  const methods = Array.from(matches, (m) => m[1]).filter((s): s is string => typeof s === 'string');
  return methods.length > 0 ? methods : undefined;
}

// ============================================
// Utilities
// ============================================

function createEntity(
  type: EntityType,
  filePath: string,
  metadata: EntityMetadata,
  content: string,
  confidence: number
): RecognizedEntity {
  const lines = content.split('\n');
  const name = metadata.name ?? 'Unknown';
  
  return {
    id: `${type}:${filePath}:${name}`,
    type,
    filePath,
    name,
    metadata,
    startLine: 1,
    endLine: lines.length,
    confidence: Math.min(1, confidence + 0.3), // Boost confidence for pattern match
  };
}

function deduplicateEntities(entities: RecognizedEntity[]): RecognizedEntity[] {
  const seen = new Map<string, RecognizedEntity>();
  
  for (const entity of entities) {
    const existing = seen.get(entity.id);
    if (!existing || entity.confidence > existing.confidence) {
      seen.set(entity.id, entity);
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Get all entities of a specific type
 */
export function filterEntitiesByType(
  entities: RecognizedEntity[],
  type: EntityType
): RecognizedEntity[] {
  return entities.filter((e) => e.type === type);
}

/**
 * Get entity by name
 */
export function findEntityByName(
  entities: RecognizedEntity[],
  name: string
): RecognizedEntity | undefined {
  return entities.find((e) => e.name === name);
}

/**
 * Get entities by file path
 */
export function findEntitiesByFile(
  entities: RecognizedEntity[],
  filePath: string
): RecognizedEntity[] {
  return entities.filter((e) => e.filePath === filePath);
}
