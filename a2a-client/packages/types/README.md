# @a2a/types - Shared TypeScript Types

> Common type definitions for A2A packages.

## Installation

```bash
npm install @a2a/types
```

## Usage

```javascript
const { createContextBlock, createTask, createFileBlock, createSearchQuery } = require('@a2a/types');

// Create context block
const context = createContextBlock({
  sessionId: 'session-123',
  newTask: ['Create UserService'],
  architecturalFeatures: ['laravel'],
});

// Create task
const task = createTask({
  id: 'task-1',
  type: 'create',
  status: 'pending',
  target: 'app/Services/UserService.php',
});

// Create file block
const file = createFileBlock({
  path: 'app/Services/UserService.php',
  content: '<?php class UserService { ... }',
  startLine: 1,
  endLine: 50,
});

// Create search query
const query = createSearchQuery({
  query: 'UserService',
  filters: { file_types: ['php'] },
  options: { limit: 10 },
});
```

## Types

### ContextBlock

```typescript
interface ContextBlock {
  version: '1.0';
  session_id: string;
  new_task?: string[];
  architectural_features?: string[];
  continue?: boolean;
  tasks?: Task[];
  request_files?: string[];
  confirm?: boolean;
  errors?: ProtocolError[];
}
```

### Task

```typescript
interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  target?: string;
  progress?: number;
}

type TaskType = 'analyze' | 'refactor' | 'test' | 'document' | 'fix' | 'create' | 'delete';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
```

### FileBlock

```typescript
interface FileBlock {
  path: string;
  content: string;
  startLine?: number;
  endLine?: number;
}
```

### SearchQuery

```typescript
interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  options?: SearchOptions;
}

interface SearchFilters {
  file_types?: string[];
  directories?: string[];
  framework?: string;
  exclude?: string[];
}

interface SearchOptions {
  limit?: number;
  min_score?: number;
  include_context?: boolean;
  highlight_matches?: boolean;
}
```

### SearchResult

```typescript
interface SearchResult {
  results: SearchMatch[];
  total: number;
  query_time_ms: number;
  algorithm_used: string;
}

interface SearchMatch {
  file: string;
  score: number;
  matches: MatchDetail[];
  metadata: FileMetadata;
}
```

### RAG Types

```typescript
interface RAGConfig {
  projectPath: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  useTFIDF?: boolean;
  useBM25?: boolean;
  useSemantic?: boolean;
  maxDepth?: number;
  maxFiles?: number;
  embeddingModel?: string;
  embeddingProvider?: string;
}

interface Chunk {
  id: string;
  filePath: string;
  type: string;
  name: string;
  content: string;
  startLine: number;
  endLine?: number;
  visibility?: string;
  method?: string;
}

interface IndexStats {
  filesIndexed: number;
  chunksIndexed: number;
  lastUpdated: number;
  indexedExtensions?: string[];
}
```

### API Types

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}
```

### WebSocket Types

```typescript
interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
  timestamp: Date;
}

type WsEventType = 
  | 'task:progress'
  | 'task:completed'
  | 'files:updated'
  | 'files:requested'
  | 'error';
```

## License

MIT
