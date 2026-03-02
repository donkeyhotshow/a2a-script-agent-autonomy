# graph-build

Построение графа знаний: извлечение сущностей и связей. **План:
** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md).

## Priority

80

## Triggers

- graph build
- build graph
- knowledge graph
- построй граф
- найди зависимости

## Sub-actions

### 1. graph-parse

Парсинг кода (PHP/JS/TS/Vue).

**Input:** rootDir, files[]?  
**Output:** ast_or_tokens

```typescript
// graph-parse: Parse code files (PHP/JS/TS/Vue) to extract AST/tokens
// Uses basic regex-based parsing for demo. In production, use proper parsers (PHP-Parser, Babel, etc.)

export default async function run(input: { rootDir: string; files?: string[] }): Promise<{ ast_or_tokens: { [file: string]: { type: string; tokens: unknown[] } } }> {
  const fs = await import('fs');
  const path = await import('path');
  const rootDir = input.rootDir || process.cwd();
  const files = input.files || [];
  
  const ast_or_tokens: { [file: string]: { type: string; tokens: unknown[] } } = {};
  
  // Default file extensions to scan
  const extensions = ['.php', '.js', '.ts', '.vue', '.jsx', '.tsx'];
  
  // If no files provided, scan directory
  if (files.length === 0) {
    const scanDir = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith('.') && !['node_modules', 'vendor', 'dist'].includes(entry.name)) {
            scanDir(fullPath);
          } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch (e) {
        // Ignore permission errors
      }
    };
    scanDir(rootDir);
  }
  
  // Parse each file
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const ext = path.extname(file);
      
      // Simple token extraction based on file type
      const tokens: unknown[] = [];
      
      if (ext === '.php') {
        // Extract PHP constructs
        const classMatches = content.matchAll(/class\s+(\w+)/g);
        const functionMatches = content.matchAll(/function\s+(\w+)/g);
        const useMatches = content.matchAll(/use\s+([\w\\]+)/g);
        const extendsMatches = content.matchAll(/extends\s+(\w+)/g);
        const implementsMatches = content.matchAll(/implements\s+([\w, ]+)/g);
        
        for (const match of classMatches) tokens.push({ type: 'class', name: match[1] });
        for (const match of functionMatches) tokens.push({ type: 'function', name: match[1] });
        for (const match of useMatches) tokens.push({ type: 'use', name: match[1] });
        for (const match of extendsMatches) tokens.push({ type: 'extends', name: match[1] });
        for (const match of implementsMatches) tokens.push({ type: 'implements', name: match[1] });
        
      } else if (ext === '.js' || ext === '.ts' || ext === '.jsx' || ext === '.tsx') {
        // Extract JS/TS constructs
        const classMatches = content.matchAll(/class\s+(\w+)/g);
        const functionMatches = content.matchAll(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*\(\s*\)/g);
        const importMatches = content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
        const exportMatches = content.matchAll(/export\s+(?:default\s+)?(?:function|class|const|let|var)/g);
        
        for (const match of classMatches) tokens.push({ type: 'class', name: match[1] });
        for (const match of importMatches) tokens.push({ type: 'import', name: match[1] });
        for (const match of exportMatches) tokens.push({ type: 'export', name: match[0] });
        
      } else if (ext === '.vue') {
        // Extract Vue components
        const scriptMatches = content.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);
        const templateMatches = content.matchAll(/<template[^>]*>([\s\S]*?)<\/template>/gi);
        
        for (const match of scriptMatches) {
          const scriptContent = match[1];
          const classMatches = scriptContent.matchAll(/class\s+(\w+)/g);
          const functionMatches = scriptContent.matchAll(/(?:function|const|let)\s+(\w+)/g);
          for (const m of classMatches) tokens.push({ type: 'class', name: m[1] });
          for (const m of functionMatches) tokens.push({ type: 'function', name: m[1] });
        }
        
        for (const match of templateMatches) {
          const templateContent = match[1];
          const componentMatches = templateContent.matchAll(/<(\w+)[^>]*>/g);
          for (const m of componentMatches) tokens.push({ type: 'component', name: m[1] });
        }
      }
      
      ast_or_tokens[file] = { type: ext.slice(1), tokens };
      
    } catch (e) {
      // Skip files that can't be read
    }
  }
  
  return { ast_or_tokens };
}
```

### 2. graph-entities

Извлечение сущностей (классы, функции, модели, контроллеры).

**Input:** ast_or_tokens  
**Output:** entities[]

```typescript
// graph-entities: Extract entities (classes, functions, models, controllers) from parsed code

export default async function run(input: { ast_or_tokens: { [file: string]: { type: string; tokens: unknown[] } } }): Promise<{ entities: Array<{ id: string; type: string; name: string; file: string; line?: number }> }> {
  const entities: Array<{ id: string; type: string; name: string; file: string; line?: number }> = [];
  
  const { ast_or_tokens } = input;
  
  for (const [file, data] of Object.entries(ast_or_tokens)) {
    const tokens = data.tokens as Array<{ type: string; name: string }>;
    
    for (const token of tokens) {
      const entityType = token.type;
      let normalizedType = entityType;
      
      // Normalize entity types
      if (['class', 'interface', 'trait'].includes(entityType)) {
        normalizedType = 'class';
      } else if (['function', 'method'].includes(entityType)) {
        normalizedType = 'function';
      } else if (['import', 'use', 'require'].includes(entityType)) {
        normalizedType = 'import';
      } else if (['component'].includes(entityType)) {
        normalizedType = 'component';
      }
      
      // Generate unique ID
      const id = `${file}:${token.name}`;
      
      entities.push({
        id,
        type: normalizedType,
        name: token.name,
        file
      });
    }
  }
  
  // Deduplicate by ID
  const uniqueEntities = Array.from(
    new Map(entities.map(e => [e.id, e])).values()
  );
  
  return { entities: uniqueEntities };
}
```

### 3. graph-relations

Построение связей (imports, extends, uses, calls).

**Input:** entities[], ast_or_tokens  
**Output:** relations[]

```typescript
// graph-relations: Build relationships between entities (imports, extends, uses, calls)

export default async function run(input: { entities: Array<{ id: string; type: string; name: string; file: string }>; ast_or_tokens: { [file: string]: { type: string; tokens: unknown[] } } }): Promise<{ relations: Array<{ from: string; to: string; type: string; file?: string }> }> {
  const relations: Array<{ from: string; to: string; type: string; file?: string }> = [];
  const { entities, ast_or_tokens } = input;
  
  // Create entity lookup by name
  const entityMap = new Map<string, typeof entities[0]>();
  for (const entity of entities) {
    entityMap.set(entity.name, entity);
    entityMap.set(entity.id, entity);
  }
  
  // Build relations from tokens
  for (const [file, data] of Object.entries(ast_or_tokens)) {
    const tokens = data.tokens as Array<{ type: string; name: string }>;
    let currentClass: string | null = null;
    
    for (const token of tokens) {
      // Track current class context
      if (token.type === 'class') {
        currentClass = token.name;
        continue;
      }
      
      // Import relations
      if (token.type === 'import' || token.type === 'use') {
        // Try to resolve import to entity
        const importName = token.name.split(/[\\/]/).pop() || token.name;
        const resolved = entityMap.get(importName) || entityMap.get(token.name);
        
        if (resolved) {
          relations.push({
            from: file,
            to: resolved.id,
            type: 'imports',
            file
          });
        }
      }
      
      // Extends relations
      if (token.type === 'extends') {
        const parentClass = entityMap.get(token.name);
        if (currentClass && parentClass) {
          const childEntity = entityMap.get(currentClass);
          if (childEntity) {
            relations.push({
              from: childEntity.id,
              to: parentClass.id,
              type: 'extends'
            });
          }
        }
      }
      
      // Implements relations
      if (token.type === 'implements') {
        const interfaces = token.name.split(',').map(s => s.trim());
        for (const iface of interfaces) {
          const interfaceEntity = entityMap.get(iface);
          if (currentClass && interfaceEntity) {
            const childEntity = entityMap.get(currentClass);
            if (childEntity) {
              relations.push({
                from: childEntity.id,
                to: interfaceEntity.id,
                type: 'implements'
              });
            }
          }
        }
      }
    }
  }
  
  // Add call relationships for methods within classes
  for (const entity of entities) {
    if (entity.type === 'function' || entity.type === 'method') {
      // Check if it's called from other functions
      for (const caller of entities) {
        if (caller.type === 'function' && caller.id !== entity.id) {
          // Simple heuristic: if function names appear in same file
          const callerFile = caller.file;
          const calleeFile = entity.file;
          
          if (callerFile === calleeFile && entity.name) {
            relations.push({
              from: caller.id,
              to: entity.id,
              type: 'calls'
            });
          }
        }
      }
    }
  }
  
  return { relations };
}
```

### 4. graph-store

Сохранение графа (память/БД).

**Input:** entities[], relations[]  
**Output:** graphId, nodeCount

```typescript
// graph-store: Save graph to memory/DB (in-memory store for this implementation)
// In production, this would save to a database like Neo4j, or a file-based store

interface GraphStore {
  entities: Map<string, unknown>;
  relations: Map<string, unknown[]>;
}

// In-memory graph storage (singleton)
const graphStore: GraphStore = {
  entities: new Map(),
  relations: new Map()
};

export default async function run(input: { entities: Array<{ id: string; type: string; name: string; file: string }>; relations: Array<{ from: string; to: string; type: string }> }): Promise<{ graphId: string; nodeCount: number; relationCount: number }> {
  const { entities, relations } = input;
  
  // Generate graph ID
  const graphId = `graph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store entities
  for (const entity of entities) {
    graphStore.entities.set(entity.id, entity);
  }
  
  // Store relations (grouped by source)
  for (const relation of relations) {
    const existing = graphStore.relations.get(relation.from) || [];
    existing.push(relation);
    graphStore.relations.set(relation.from, existing);
  }
  
  const nodeCount = graphStore.entities.size;
  const relationCount = relations.length;
  
  return {
    graphId,
    nodeCount,
    relationCount
  };
}

// Export for testing
export { graphStore };
```
