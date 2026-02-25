# context-index

Build searchable index (vector/RAG) from project context. **План:** [actions-definitions-for-auto-ai](../../../../docs/actions-definitions-for-auto-ai.md).

## Priority
80

## Context
```json
{ "type": "index", "requires_embedding": true, "rag_enabled": true }
```

## Triggers
- context index
- build index
- index context
- индексация кода
- создай индекс

## Sub-actions

### 1. context-index-build
Построение индекса из отсканированных файлов (chunking, embeddings для RAG).

**Input:** files[], chunkSize?, overlap?  
**Output:** indexId, entryCount, chunks[]

```typescript
interface FileInfo {
  path: string;
  content?: string;
  size: number;
}

interface Chunk {
  id: string;
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  embedding?: number[];
}

interface IndexEntry {
  id: string;
  filePath: string;
  chunk: string;
  metadata: {
    size: number;
    language: string;
    modified?: number;
  };
}

const DEFAULT_CHUNK_SIZE = 1000; // characters
const DEFAULT_OVERLAP = 100; // characters

const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.vue': 'vue',
  '.py': 'python',
  '.php': 'php',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.cs': 'csharp',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.html': 'html',
  '.htm': 'html',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.md': 'markdown',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.gql': 'graphql'
};

export default async function buildIndex(input: { 
  files: FileInfo[];
  chunkSize?: number;
  overlap?: number;
}): Promise<{ 
  indexId: string; 
  entryCount: number;
  chunks: Chunk[];
}> {
  const chunkSize = input.chunkSize || DEFAULT_CHUNK_SIZE;
  const overlap = input.overlap || DEFAULT_OVERLAP;
  const chunks: Chunk[] = [];
  
  // Generate unique index ID
  const indexId = `idx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  for (const file of input.files) {
    const ext = file.path.substring(file.path.lastIndexOf('.'));
    const language = EXT_TO_LANG[ext] || 'text';
    
    // Skip if no content provided (we would need to read it)
    const content = file.content || '';
    
    if (!content.trim()) {
      continue;
    }
    
    // Split content into chunks
    let start = 0;
    let chunkIndex = 0;
    
    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      let chunkContent = content.substring(start, end);
      
      // Try to break at line boundary
      if (end < content.length) {
        const lastNewline = chunkContent.lastIndexOf('\n');
        if (lastNewline > chunkSize / 2) {
          chunkContent = chunkContent.substring(0, lastNewline);
        }
      }
      
      const chunkId = `${indexId}_${file.path}_${chunkIndex}`;
      
      // Calculate line numbers
      const linesBefore = content.substring(0, start).split('\n').length;
      const chunkLines = chunkContent.split('\n').length;
      
      chunks.push({
        id: chunkId,
        filePath: file.path,
        content: chunkContent,
        startLine: linesBefore,
        endLine: linesBefore + chunkLines - 1
      });
      
      start += chunkContent.length - overlap;
      chunkIndex++;
    }
  }
  
  // TODO: Generate embeddings using embedding service
  // This would typically call an external embedding API
  // For now, we'll mark chunks as pending embedding generation
  
  return {
    indexId,
    entryCount: chunks.length,
    chunks
  };
}
```

### 2. context-index-save
Сохранение индекса для последующих запросов.

**Input:** indexId, chunks[], storagePath?  
**Output:** saved, storageInfo

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface Chunk {
  id: string;
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  embedding?: number[];
}

interface StorageInfo {
  indexPath: string;
  chunkCount: number;
  embeddingCount: number;
}

export default async function saveIndex(input: { 
  indexId: string;
  chunks: Chunk[];
  storagePath?: string;
}): Promise<{ saved: boolean; storageInfo: StorageInfo }> {
  const storageDir = input.storagePath || path.join(process.cwd(), '.a2a-index');
  
  // Ensure storage directory exists
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  
  const indexPath = path.join(storageDir, `${input.indexId}.json`);
  
  // Separate chunks with and without embeddings
  const chunksWithEmbedding = input.chunks.filter(c => c.embedding);
  const chunksPendingEmbedding = input.chunks.filter(c => !c.embedding);
  
  const indexData = {
    id: input.indexId,
    created: new Date().toISOString(),
    chunkCount: input.chunks.length,
    embeddingCount: chunksWithEmbedding.length,
    chunks: chunksPendingEmbedding.map(c => ({
      id: c.id,
      filePath: c.filePath,
      content: c.content,
      startLine: c.startLine,
      endLine: c.endLine
    })),
    // Store embeddings separately if needed
    embeddings: chunksWithEmbedding.reduce((acc, c) => {
      acc[c.id] = c.embedding;
      return acc;
    }, {} as Record<string, number[]>)
  };
  
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
  
  return {
    saved: true,
    storageInfo: {
      indexPath,
      chunkCount: input.chunks.length,
      embeddingCount: chunksWithEmbedding.length
    }
  };
}
```

### 3. context-index-update
Обновление индекса с новыми или изменёнными файлами.

**Input:** indexId, newFiles[], deletedPaths[]  
**Output:** updated, addedCount, removedCount

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface FileInfo {
  path: string;
  content?: string;
}

interface UpdateResult {
  indexId: string;
  addedCount: number;
  removedCount: number;
  errors: string[];
}

export default async function updateIndex(input: { 
  indexId: string;
  newFiles: FileInfo[];
  deletedPaths: string[];
}): Promise<UpdateResult> {
  const storageDir = path.join(process.cwd(), '.a2a-index');
  const indexPath = path.join(storageDir, `${input.indexId}.json`);
  
  const errors: string[] = [];
  let addedCount = 0;
  let removedCount = 0;
  
  // Load existing index
  let indexData: Record<string, unknown>;
  try {
    const content = fs.readFileSync(indexPath, 'utf-8');
    indexData = JSON.parse(content);
  } catch (e) {
    return {
      indexId: input.indexId,
      addedCount: 0,
      removedCount: 0,
      errors: [`Index not found: ${input.indexId}`]
    };
  }
  
  const existingChunks = indexData.chunks as Array<{ id: string; filePath: string }>;
  const existingEmbeddings = indexData.embeddings as Record<string, number[]>;
  
  // Track current file paths in index
  const indexedPaths = new Set(existingChunks.map(c => c.filePath));
  
  // Remove deleted files
  for (const deletedPath of input.deletedPaths) {
    if (indexedPaths.has(deletedPath)) {
      // Mark for removal
      removedCount++;
    }
  }
  
  // Add new files (simplified - would need re-chunking logic)
  addedCount = input.newFiles.length;
  
  // Note: Full implementation would need to:
  // 1. Chunk new files
  // 2. Generate embeddings for new chunks
  // 3. Remove chunks from deleted files
  // 4. Update the index file
  
  return {
    indexId: input.indexId,
    addedCount,
    removedCount,
    errors
  };
}
```
