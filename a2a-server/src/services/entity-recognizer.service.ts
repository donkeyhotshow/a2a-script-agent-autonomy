/**
 * Entity Recognizer Service
 * Extracts entities and relations from code files
 * 
 * Supports: PHP (Model, Controller, Service, Request), Vue (Component, Page)
 */

import type { 
  CodeBlock, 
  RecognitionResult, 
  RecognizedEntity, 
  RecognizedRelation,
  EntityTypeName,
  RelationTypeName,
  EntityMetadata,
  ModelRelation,
  ControllerMethod,
  VueProp
} from '../types/entity.types.js';
import { logger } from '../utils/logger.js';

// ============================================
// Regex Patterns for PHP
// ============================================

const PHP_PATTERNS = {
  // Class detection
  classDeclaration: /class\s+(\w+)\s*(?:extends\s+(\w+))?\s*(?:implements\s+([\w,\s]+))?/g,
  namespace: /namespace\s+([\w\\]+);/g,
  
  // Model patterns
  modelExtends: /extends\s+Model\b/,
  modelTable: /protected\s+\$table\s*=\s*['"](\w+)['"];/,
  modelFillable: /protected\s+\$fillable\s*=\s*\[([\s\S]*?)\];/,
  modelCasts: /protected\s+\$casts\s*=\s*\[([\s\S]*?)\];/,
  
  // Eloquent relations
  belongsTo: /(?:public|protected)\s+function\s+(\w+)\s*\(\)\s*\{[\s\S]*?return\s+\$this->belongsTo\(([^)]+)\)/g,
  hasMany: /(?:public|protected)\s+function\s+(\w+)\s*\(\)\s*\{[\s\S]*?return\s+\$this->hasMany\(([^)]+)\)/g,
  hasOne: /(?:public|protected)\s+function\s+(\w+)\s*\(\)\s*\{[\s\S]*?return\s+\$this->hasOne\(([^)]+)\)/g,
  belongsToMany: /(?:public|protected)\s+function\s+(\w+)\s*\(\)\s*\{[\s\S]*?return\s+\$this->belongsToMany\(([^)]+)\)/g,
  morphTo: /(?:public|protected)\s+function\s+(\w+)\s*\(\)\s*\{[\s\S]*?return\s+\$this->morphTo\(\)/g,
  morphMany: /(?:public|protected)\s+function\s+(\w+)\s*\(\)\s*\{[\s\S]*?return\s+\$this->morphMany\(([^)]+)\)/g,
  
  // Controller patterns
  controllerExtends: /extends\s+Controller\b/,
  controllerMethod: /(?:public|protected|private)\s+function\s+(\w+)\s*\(([^)]*)\)/g,
  middleware: /\$this->middleware\(['"](\w+)['"]\)/g,
  
  // Request patterns
  formRequestExtends: /extends\s+FormRequest\b/,
  rulesMethod: /public\s+function\s+rules\s*\(\)[\s\S]*?\{([\s\S]*?)\n\s*\}/,
  
  // Service patterns
  serviceClass: /class\s+(\w+)Service\b/,
};

// ============================================
// Regex Patterns for Vue
// ============================================

const VUE_PATTERNS = {
  // Script setup
  scriptSetup: /<script\s+setup[^>]*>([\s\S]*?)<\/script>/,
  
  // Props
  defineProps: /defineProps<([^>]+)>|defineProps\s*\(\s*\{([\s\S]*?)\}\s*\)/,
  withDefaults: /withDefaults\s*\(\s*defineProps<([^>]+)>/,
  
  // Emits
  defineEmits: /defineEmits<([^>]+)>|defineEmits\s*\(\s*\[([\s\S]*?)\]\s*\)/,
  
  // Imports
  importStatement: /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/g,
  
  // Inertia
  inertiaLink: /<InertiaLink|<Link\b/,
  inertiaUsePage: /usePage\s*\(\)/,
  inertiaUseForm: /useForm\s*\(/,
  inertiaRouter: /router\.(?:visit|get|post|put|patch|delete)/,
  
  // Component detection
  componentOptions: /export\s+default\s*\{[\s\S]*?(?:name:\s*['"](\w+)['"])?/,
  defineComponent: /defineComponent\s*\(\s*\{[\s\S]*?name:\s*['"](\w+)['"]/,
};

// ============================================
// Helper Functions
// ============================================

function extractClassName(content: string): { name: string; extends?: string | undefined; implements?: string[] | undefined } | null {
  const match = content.match(/class\s+(\w+)\s*(?:extends\s+(\w+))?\s*(?:implements\s+([\w,\s]+))?/);
  if (!match || !match[1]) return null;
  
  return {
    name: match[1],
    extends: match[2] || undefined,
    implements: match[3]?.split(',').map(s => s.trim()).filter(Boolean),
  };
}

function extractNamespace(content: string): string | undefined {
  const match = content.match(/namespace\s+([\w\\]+);/);
  return match?.[1];
}

function extractModelRelations(content: string): ModelRelation[] {
  const relations: ModelRelation[] = [];
  
  // belongsTo
  let match: RegExpExecArray | null;
  while ((match = PHP_PATTERNS.belongsTo.exec(content)) !== null) {
    if (match[1]) {
      relations.push({
        name: match[1],
        type: 'belongsTo',
        related: match[2]?.trim().replace(/['"]/g, ''),
      });
    }
  }
  
  // hasMany
  PHP_PATTERNS.hasMany.lastIndex = 0;
  while ((match = PHP_PATTERNS.hasMany.exec(content)) !== null) {
    if (match[1]) {
      relations.push({
        name: match[1],
        type: 'hasMany',
        related: match[2]?.trim().replace(/['"]/g, ''),
      });
    }
  }
  
  // hasOne
  PHP_PATTERNS.hasOne.lastIndex = 0;
  while ((match = PHP_PATTERNS.hasOne.exec(content)) !== null) {
    if (match[1]) {
      relations.push({
        name: match[1],
        type: 'hasOne',
        related: match[2]?.trim().replace(/['"]/g, ''),
      });
    }
  }
  
  // belongsToMany
  PHP_PATTERNS.belongsToMany.lastIndex = 0;
  while ((match = PHP_PATTERNS.belongsToMany.exec(content)) !== null) {
    if (match[1]) {
      relations.push({
        name: match[1],
        type: 'belongsToMany',
        related: match[2]?.trim().replace(/['"]/g, ''),
      });
    }
  }
  
  // morphTo
  PHP_PATTERNS.morphTo.lastIndex = 0;
  while ((match = PHP_PATTERNS.morphTo.exec(content)) !== null) {
    if (match[1]) {
      relations.push({
        name: match[1],
        type: 'morphTo',
      });
    }
  }
  
  // morphMany
  PHP_PATTERNS.morphMany.lastIndex = 0;
  while ((match = PHP_PATTERNS.morphMany.exec(content)) !== null) {
    if (match[1]) {
      relations.push({
        name: match[1],
        type: 'morphMany',
        related: match[2]?.trim().replace(/['"]/g, ''),
      });
    }
  }
  
  return relations;
}

function extractControllerMethods(content: string): ControllerMethod[] {
  const methods: ControllerMethod[] = [];
  const regex = /(?:public|protected|private)\s+function\s+(\w+)\s*\(([^)]*)\)/g;
  
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
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
  
  return methods.filter(m => !['__construct', 'middleware'].includes(m.name));
}

function extractMiddleware(content: string): string[] {
  const middleware: string[] = [];
  const regex = /\$this->middleware\(['"](\w+)['"]\)/g;
  
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      middleware.push(match[1]);
    }
  }
  
  return middleware;
}

function extractVueProps(content: string): VueProp[] {
  const props: VueProp[] = [];
  
  // TypeScript defineProps<T>
  const tsMatch = content.match(/defineProps<\{([^}]+)\}>/);
  if (tsMatch && tsMatch[1]) {
    const propsStr = tsMatch[1];
    const propLines = propsStr.split(';').filter(s => s.trim());
    
    for (const line of propLines) {
      const propMatch = line.trim().match(/(\w+)\s*(\?)?(?::\s*(\w+))?/);
      if (propMatch && propMatch[1]) {
        props.push({
          name: propMatch[1],
          type: propMatch[3],
          required: !propMatch[2],
        });
      }
    }
  }
  
  // Object defineProps
  const objMatch = content.match(/defineProps\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (objMatch && objMatch[1]) {
    const propsStr = objMatch[1];
    const propRegex = /(\w+):\s*\{([^}]+)\}/g;
    
    let match: RegExpExecArray | null;
    while ((match = propRegex.exec(propsStr)) !== null) {
      if (!match[1] || !match[2]) continue;
      
      const typeMatch = match[2].match(/type:\s*(\w+)/);
      const requiredMatch = match[2].match(/required:\s*(true|false)/);
      const defaultMatch = match[2].match(/default:\s*([^,}\n]+)/);
      
      props.push({
        name: match[1],
        type: typeMatch?.[1],
        required: requiredMatch?.[1] === 'true',
        default: defaultMatch?.[1]?.trim(),
      });
    }
  }
  
  return props;
}

function extractVueEmits(content: string): string[] {
  const emits: string[] = [];
  
  // Array form
  const arrMatch = content.match(/defineEmits\s*\(\s*\[([\s\S]*?)\]\s*\)/);
  if (arrMatch && arrMatch[1]) {
    const emitStr = arrMatch[1];
    const emitRegex = /['"](\w+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = emitRegex.exec(emitStr)) !== null) {
      if (match[1]) {
        emits.push(match[1]);
      }
    }
  }
  
  // TypeScript form
  const tsMatch = content.match(/defineEmits<\{([^}]+)\}>/);
  if (tsMatch && tsMatch[1]) {
    const emitStr = tsMatch[1];
    const emitRegex = /(\w+)\s*:/g;
    let match: RegExpExecArray | null;
    while ((match = emitRegex.exec(emitStr)) !== null) {
      if (match[1]) {
        emits.push(match[1]);
      }
    }
  }
  
  return emits;
}

function extractVueImports(content: string): string[] {
  const imports: string[] = [];
  const regex = /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
  
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const names = match[1]?.split(',').map(s => s.trim()).filter(Boolean) || (match[2] ? [match[2]] : []);
    imports.push(...names);
  }
  
  return imports;
}

function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

function generateEntityId(type: EntityTypeName, name: string, path: string): string {
  const normalizedPath = path.replace(/[\\/]/g, '-').replace(/\.[^.]+$/, '');
  return `${type.toLowerCase()}-${normalizedPath}-${name.toLowerCase()}`;
}

function generateRelationId(fromPath: string, toPath: string | undefined, type: RelationTypeName): string {
  return `rel-${type.toLowerCase()}-${fromPath.replace(/[\\/]/g, '-')}-${toPath || 'unknown'}`;
}

// ============================================
// Main Recognition Functions
// ============================================

function recognizePhpEntity(content: string, path: string): RecognizedEntity | null {
  const classInfo = extractClassName(content);
  if (!classInfo) return null;
  
  const namespace = extractNamespace(content);
  let type: EntityTypeName = 'PHP';
  const metadata: EntityMetadata = {};
  
  // Determine entity type based on class characteristics
  if (PHP_PATTERNS.modelExtends.test(content)) {
    type = 'MODEL';
    
    // Extract model metadata
    const tableMatch = content.match(PHP_PATTERNS.modelTable);
    if (tableMatch && tableMatch[1]) {
      metadata.tableName = tableMatch[1];
    }
    
    const fillableMatch = content.match(PHP_PATTERNS.modelFillable);
    if (fillableMatch && fillableMatch[1]) {
      metadata.fillable = fillableMatch[1]
        .split(',')
        .map(s => s.trim().replace(/['"]/g, ''))
        .filter(Boolean);
    }
    
    metadata.relations = extractModelRelations(content);
    
  } else if (PHP_PATTERNS.controllerExtends.test(content)) {
    type = 'CONTROLLER';
    metadata.methods = extractControllerMethods(content);
    metadata.middleware = extractMiddleware(content);
    
  } else if (PHP_PATTERNS.formRequestExtends.test(content)) {
    type = 'REQUEST';
    const rulesMatch = content.match(PHP_PATTERNS.rulesMethod);
    if (rulesMatch) {
      // Basic extraction of rules (simplified)
      metadata.rules = {};
    }
    
  } else if (classInfo.name.endsWith('Service') || PHP_PATTERNS.serviceClass.test(content)) {
    type = 'SERVICE';
    
  } else if (classInfo.name.endsWith('Repository')) {
    type = 'REPOSITORY';
    
  } else if (classInfo.name.endsWith('Middleware')) {
    type = 'MIDDLEWARE';
  }
  
  if (classInfo.extends) {
    metadata.extends = classInfo.extends;
  }
  if (classInfo.implements) {
    metadata.implements = classInfo.implements;
  }
  if (namespace) {
    metadata.namespace = namespace;
  }
  
  return {
    id: generateEntityId(type, classInfo.name, path),
    type,
    name: classInfo.name,
    path,
    metadata,
  };
}

function recognizeVueEntity(content: string, path: string): RecognizedEntity | null {
  // Check if it's a Vue file
  if (!content.includes('<template') && !content.includes('<script')) {
    return null;
  }
  
  // Determine if it's a Page (Inertia) or Component
  const isInertiaPage = path.includes('/Pages/') || 
    VUE_PATTERNS.inertiaUsePage.test(content) ||
    VUE_PATTERNS.inertiaUseForm.test(content);
  
  const type: EntityTypeName = isInertiaPage ? 'VUE_PAGE' : 'VUE_COMPONENT';
  
  // Extract component name from filename
  const filename = path.split(/[\\/]/).pop()?.replace('.vue', '') || 'Unknown';
  const name = filename
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  
  const metadata: EntityMetadata = {};
  
  // Extract script content
  const scriptMatch = content.match(VUE_PATTERNS.scriptSetup);
  const scriptContent = scriptMatch?.[1] || '';
  
  if (scriptContent) {
    metadata.props = extractVueProps(scriptContent);
    metadata.emits = extractVueEmits(scriptContent);
    metadata.imports = extractVueImports(scriptContent);
  }
  
  return {
    id: generateEntityId(type, name, path),
    type,
    name,
    path,
    metadata,
  };
}

function extractRelationsFromEntity(entity: RecognizedEntity, content: string): RecognizedRelation[] {
  const relations: RecognizedRelation[] = [];
  
  if (entity.type === 'MODEL' && entity.metadata?.relations) {
    for (const rel of entity.metadata.relations) {
      const relationType: RelationTypeName = 
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
  
  if (entity.type === 'CONTROLLER' && entity.metadata?.methods) {
    for (const method of entity.metadata.methods) {
      // Check if method name suggests a model interaction
      const modelMatch = method.name.match(/^(index|show|store|update|destroy|create|edit)$/);
      if (modelMatch) {
        // Controller method likely handles a model
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
  
  if (entity.type === 'VUE_COMPONENT' || entity.type === 'VUE_PAGE') {
    // Check for Inertia usage
    if (content.includes('useForm') || content.includes('router.')) {
      relations.push({
        id: generateRelationId(entity.path, undefined, 'USES'),
        fromPath: entity.path,
        fromId: entity.id,
        type: 'USES',
        metadata: {
          context: 'Inertia form/router',
        },
      });
    }
  }
  
  return relations;
}

// ============================================
// Public API
// ============================================

/**
 * Recognize entities from a single code block
 */
export function recognizeEntities(block: CodeBlock): RecognitionResult {
  const { path, content } = block;
  const entities: RecognizedEntity[] = [];
  const relations: RecognizedRelation[] = [];
  const errors: string[] = [];
  
  try {
    const ext = path.split('.').pop()?.toLowerCase();
    
    if (ext === 'php') {
      const entity = recognizePhpEntity(content, path);
      if (entity) {
        entities.push(entity);
        relations.push(...extractRelationsFromEntity(entity, content));
      }
    } else if (ext === 'vue') {
      const entity = recognizeVueEntity(content, path);
      if (entity) {
        entities.push(entity);
        relations.push(...extractRelationsFromEntity(entity, content));
      }
    } else if (ext === 'ts' || ext === 'js') {
      // TypeScript/JavaScript files - basic recognition
      // Could be composables, configs, etc.
      if (path.includes('/composables/')) {
        entities.push({
          id: generateEntityId('COMPOSABLE', path.split('/').pop()?.replace(/\.[^.]+$/, '') || 'unknown', path),
          type: 'COMPOSABLE',
          name: path.split('/').pop()?.replace(/\.[^.]+$/, '') || 'unknown',
          path,
        });
      }
    }
    
  } catch (error) {
    errors.push(`Error recognizing entities in ${path}: ${error}`);
  }
  
  return { entities, relations, errors: errors.length > 0 ? errors : undefined };
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

// Export for testing
export const _internal = {
  extractClassName,
  extractNamespace,
  extractModelRelations,
  extractControllerMethods,
  extractVueProps,
  extractVueEmits,
  PHP_PATTERNS,
  VUE_PATTERNS,
};
