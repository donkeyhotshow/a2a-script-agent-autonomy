# graph-extract-entities

Извлечение сущностей: классы, функции, модели, контроллеры. План: actions-definitions-for-auto-ai.

## Priority

78

## Triggers

- extract entities
- graph entities
- parse code entities

## Sub-actions

### 1. graph-entities-parse

Parse files and extract entity nodes.

**Input:** files[], rootDir?  
**Output:** entities[]

```typescript
// graph-entities-parse: Parse files and extract entity nodes (classes, functions, models, controllers)

export default async function run(input: { files: string[]; rootDir?: string }): Promise<{ entities: Array<{ id: string; type: string; name: string; file: string; modifiers?: string[] }> }> {
  const fs = await import('fs');
  const path = await import('path');
  const rootDir = input.rootDir || process.cwd();
  const files = input.files || [];
  
  const entities: Array<{ id: string; type: string; name: string; file: string; modifiers?: string[] }> = [];
  
  // Determine file type and parse accordingly
  const parseFile = (filePath: string) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath);
    const relativePath = path.relative(rootDir, filePath);
    
    if (ext === '.php') {
      // PHP: Extract classes, interfaces, traits, functions
      const classRegex = /(?:abstract\s+|final\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w, ]+))?/g;
      const interfaceRegex = /interface\s+(\w+)(?:\s+extends\s+([\w, ]+))?/g;
      const traitRegex = /trait\s+(\w+)/g;
      const functionRegex = /function\s+(\w+)\s*\(/g;
      const methodRegex = /(?:public|private|protected|static)?\s*function\s+(\w+)\s*\(/g;
      
      let match;
      while ((match = classRegex.exec(content)) !== null) {
        const modifiers: string[] = [];
        if (content.substring(match.index, match.index + 8) === 'abstract') modifiers.push('abstract');
        if (content.substring(match.index, match.index + 5) === 'final') modifiers.push('final');
        
        entities.push({
          id: `${relativePath}:${match[1]}`,
          type: 'class',
          name: match[1],
          file: relativePath,
          modifiers
        });
      }
      
      while ((match = interfaceRegex.exec(content)) !== null) {
        entities.push({
          id: `${relativePath}:${match[1]}`,
          type: 'interface',
          name: match[1],
          file: relativePath
        });
      }
      
      while ((match = traitRegex.exec(content)) !== null) {
        entities.push({
          id: `${relativePath}:${match[1]}`,
          type: 'trait',
          name: match[1],
          file: relativePath
        });
      }
      
    } else if (ext === '.js' || ext === '.ts' || ext === '.jsx' || ext === '.tsx') {
      // JS/TS: Extract classes, functions, interfaces, types
      const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w, ]+))?/g;
      const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g;
      const constFunctionRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
      const arrowFunctionRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
      const interfaceRegex = /interface\s+(\w+)/g;
      const typeRegex = /type\s+(\w+)\s*=/g;
      
      let match;
      while ((match = classRegex.exec(content)) !== null) {
        entities.push({
          id: `${relativePath}:${match[1]}`,
          type: 'class',
          name: match[1],
          file: relativePath
        });
      }
      
      while ((match = interfaceRegex.exec(content)) !== null) {
        entities.push({
          id: `${relativePath}:${match[1]}`,
          type: 'interface',
          name: match[1],
          file: relativePath
        });
      }
      
    } else if (ext === '.vue') {
      // Vue: Extract components, methods, props
      const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      if (scriptMatch) {
        const scriptContent = scriptMatch[1];
        const classMatch = scriptContent.match(/class\s+(\w+)/);
        if (classMatch) {
          entities.push({
            id: `${relativePath}:${classMatch[1]}`,
            type: 'component',
            name: classMatch[1],
            file: relativePath
          });
        }
      }
      
      // Extract from template
      const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
      if (templateMatch) {
        const componentRegex = /<(\w+)[^>]*v-model[^>]*>/g;
        let match;
        while ((match = componentRegex.exec(templateMatch[1])) !== null) {
          entities.push({
            id: `${relativePath}:${match[1]}`,
            type: 'component',
            name: match[1],
            file: relativePath
          });
        }
      }
    }
  };
  
  // Process all files
  for (const file of files) {
    try {
      parseFile(file);
    } catch (e) {
      // Skip files that can't be parsed
    }
  }
  
  // Deduplicate
  const uniqueEntities = Array.from(
    new Map(entities.map(e => [e.id, e])).values()
  );
  
  return { entities: uniqueEntities };
}
```
