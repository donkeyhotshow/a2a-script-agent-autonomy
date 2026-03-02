# graph-extract-relations

Извлечение связей: imports, extends, uses, calls. План: actions-definitions-for-auto-ai.

## Priority

78

## Triggers

- extract relations
- graph relations
- build relations

## Sub-actions

### 1. graph-relations-parse

Build relations between entities from AST/code.

**Input:** entities[], ast_or_files  
**Output:** relations[]

```typescript
// graph-relations-parse: Build relations between entities from AST/code
// Extracts: imports, extends, implements, uses, calls

export default async function run(input: { entities: Array<{ id: string; type: string; name: string; file: string }>; ast_or_files?: { [file: string]: { type: string; tokens: unknown[] } } }): Promise<{ relations: Array<{ from: string; to: string; type: string; file?: string }> }> {
  const relations: Array<{ from: string; to: string; type: string; file?: string }> = [];
  const { entities, ast_or_files } = input;
  
  // Build entity lookup maps
  const entityByName = new Map<string, typeof entities[0]>();
  const entityById = new Map<string, typeof entities[0]>();
  
  for (const entity of entities) {
    entityById.set(entity.id, entity);
    entityByName.set(entity.name, entity);
    // Also index by simple name (without path)
    const simpleName = entity.name;
    if (!entityByName.has(simpleName)) {
      entityByName.set(simpleName, entity);
    }
  }
  
  // Group entities by file
  const entitiesByFile = new Map<string, typeof entities>();
  for (const entity of entities) {
    const existing = entitiesByFile.get(entity.file) || [];
    existing.push(entity);
    entitiesByFile.set(entity.file, existing);
  }
  
  // Process relations from AST/tokens if provided
  if (ast_or_files) {
    for (const [file, data] of Object.entries(ast_or_files)) {
      const tokens = data.tokens as Array<{ type: string; name: string }>;
      let currentEntity: string | null = null;
      
      for (const token of tokens) {
        // Track context (current class/function)
        if (token.type === 'class' || token.type === 'function') {
          currentEntity = token.name;
        }
        
        // Import/use relations
        if (token.type === 'import' || token.type === 'use') {
          const importPath = token.name;
          const importName = importPath.split(/[\\/]/).pop() || importPath;
          
          // Try to resolve to known entity
          let targetEntity = entityByName.get(importName);
          if (!targetEntity) {
            // Try without extension
            const cleanName = importName.replace(/\.[^.]+$/, '');
            targetEntity = entityByName.get(cleanName);
          }
          
          if (targetEntity) {
            relations.push({
              from: file,
              to: targetEntity.id,
              type: 'imports',
              file
            });
          }
        }
        
        // Extends relations
        if (token.type === 'extends' && currentEntity) {
          const parentEntity = entityByName.get(token.name);
          if (parentEntity) {
            const childEntity = entityByName.get(currentEntity);
            if (childEntity) {
              relations.push({
                from: childEntity.id,
                to: parentEntity.id,
                type: 'extends'
              });
            }
          }
        }
        
        // Implements relations
        if (token.type === 'implements' && currentEntity) {
          const interfaces = token.name.split(',').map(s => s.trim());
          for (const ifaceName of interfaces) {
            const ifaceEntity = entityByName.get(ifaceName);
            if (ifaceEntity) {
              const childEntity = entityByName.get(currentEntity);
              if (childEntity) {
                relations.push({
                  from: childEntity.id,
                  to: ifaceEntity.id,
                  type: 'implements'
                });
              }
            }
          }
        }
      }
    }
  }
  
  // Infer relations from entity proximity in same file
  for (const [file, fileEntities] of entitiesByFile) {
    const classes = fileEntities.filter(e => e.type === 'class');
    const functions = fileEntities.filter(e => e.type === 'function');
    
    // Functions within same class are related
    for (const cls of classes) {
      for (const fn of functions) {
        // Only add if not already connected
        const exists = relations.some(r => 
          r.from === fn.id && r.to === cls.id && r.type === 'contains'
        );
        if (!exists) {
          relations.push({
            from: cls.id,
            to: fn.id,
            type: 'contains',
            file
          });
        }
      }
    }
  }
  
  // Cross-file relations: if one class imports another file and there's a class with same name
  for (const relation of relations) {
    if (relation.type === 'imports') {
      const importedFile = relation.to;
      const importingFile = relation.file || relation.from;
      
      // Find entities in imported file
      const importedEntities = entitiesByFile.get(importedFile) || [];
      for (const importedEntity of importedEntities) {
        if (importedEntity.type === 'class' || importedEntity.type === 'interface') {
          relations.push({
            from: relation.from,
            to: importedEntity.id,
            type: 'uses',
            file: importingFile
          });
        }
      }
    }
  }
  
  // Deduplicate
  const uniqueRelations = Array.from(
    new Map(relations.map(r => [`${r.from}->${r.to}->${r.type}`, r])).values()
  );
  
  return { relations: uniqueRelations };
}
```
