# context-query

Семантический поиск релевантных файлов по запросу. **План:** [actions-definitions-for-auto-ai](../../../../docs/actions-definitions-for-auto-ai.md).

## Priority
75

## Context
```json
{ "type": "search", "requires_embedding": true, "rag_enabled": true }
```

## Triggers
- context query
- query context
- search context
- найди файлы
- семантический поиск
- что содержит

## Sub-actions

### 1. query-parse
Парсинг запроса, извлечение ключевых слов и намерения.

**Input:** query  
**Output:** parsed_query

```typescript
interface ParsedQuery {
  original: string;
  keywords: string[];
  intent: 'search' | 'find' | 'explain' | 'analyze' | 'modify';
  filters?: {
    extension?: string[];
    path?: string;
    language?: string;
  };
}

const INTENT_PATTERNS = {
  search: ['find', 'search', 'where', 'найди', 'поиск', 'найти'],
  find: ['find', ' locate', 'show', 'покажи', 'найди'],
  explain: ['explain', 'how', 'why', 'explain', 'объясни', 'почему'],
  analyze: ['analyze', 'check', 'review', 'анализ', 'проверь'],
  modify: ['change', 'update', 'fix', 'modify', 'измени', 'исправь']
};

const KEYWORD_EXTRACTOR = /[a-zA-Zа-яА-ЯёЁ]{2,}/g;

export default async function parseQuery(input: { 
  query: string 
}): Promise<{ parsed_query: ParsedQuery }> {
  const queryLower = input.query.toLowerCase();
  
  // Extract keywords
  const keywords = (input.query.match(KEYWORD_EXTRACTOR) || [])
    .map(w => w.toLowerCase())
    .filter(w => w.length > 2);
  
  // Determine intent
  let intent: ParsedQuery['intent'] = 'search';
  for (const [intentName, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some(p => queryLower.includes(p))) {
      intent = intentName as ParsedQuery['intent'];
      break;
    }
  }
  
  // Extract filters
  const filters: ParsedQuery['filters'] = {};
  
  // Extension filters
  const extMatches = input.query.match(/\.([a-z]+)/gi);
  if (extMatches) {
    filters.extension = extMatches.map(e => '.' + e.replace('.', ''));
  }
  
  // Language filters
  const langPatterns: [RegExp, string][] = [
    [/\bts\b|\btypescript\b/i, 'typescript'],
    [/\bjs\b|\bjavascript\b/i, 'javascript'],
    [/\bpy\b|\bpython\b/i, 'python'],
    [/\bphp\b/i, 'php'],
    [/\bvue\b/i, 'vue'],
    [/\brb\b|\bruby\b/i, 'ruby'],
    [/\bgo\b|\bgolang\b/i, 'go'],
    [/\brs\b|\brust\b/i, 'rust']
  ];
  
  for (const [pattern, lang] of langPatterns) {
    if (pattern.test(input.query)) {
      filters.language = lang;
      break;
    }
  }
  
  return {
    parsed_query: {
      original: input.query,
      keywords,
      intent,
      filters
    }
  };
}
```

### 2. query-search
Поиск в индексе (RAG/семантический).

**Input:** parsed_query, indexId?  
**Output:** search_results

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface ParsedQuery {
  keywords: string[];
  intent: string;
  filters?: {
    extension?: string[];
    path?: string;
    language?: string;
  };
}

interface SearchResult {
  filePath: string;
  chunk: string;
  startLine: number;
  endLine: number;
  score: number;
  matches: string[];
}

// Simple keyword-based search (would be replaced with vector search in production)
export default async function searchIndex(input: { 
  parsed_query: ParsedQuery;
  indexId?: string;
}): Promise<{ search_results: SearchResult[] }> {
  const storageDir = path.join(process.cwd(), '.a2a-index');
  const indexId = input.indexId || fs.readdirSync(storageDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .pop()?.replace('.json', '');
  
  if (!indexId) {
    return { search_results: [] };
  }
  
  const indexPath = path.join(storageDir, `${indexId}.json`);
  let indexData: {
    chunks: Array<{
      id: string;
      filePath: string;
      content: string;
      startLine: number;
      endLine: number;
    }>;
  };
  
  try {
    const content = fs.readFileSync(indexPath, 'utf-8');
    indexData = JSON.parse(content);
  } catch (e) {
    return { search_results: [] };
  }
  
  const results: SearchResult[] = [];
  const { keywords, filters } = input.parsed_query;
  
  for (const chunk of indexData.chunks) {
    let score = 0;
    const matches: string[] = [];
    
    // Check extension/language filters
    if (filters?.extension?.length) {
      const hasExt = filters.extension.some(ext => chunk.filePath.endsWith(ext));
      if (!hasExt) continue;
    }
    
    if (filters?.path) {
      if (!chunk.filePath.includes(filters.path)) continue;
    }
    
    // Keyword matching
    const contentLower = chunk.content.toLowerCase();
    for (const keyword of keywords) {
      if (contentLower.includes(keyword)) {
        score += 1;
        matches.push(keyword);
        
        // Boost score for exact matches
        const exactRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const exactMatches = contentLower.match(exactRegex);
        if (exactMatches) {
          score += exactMatches.length * 0.5;
        }
      }
    }
    
    // Boost for file path matches
    const pathLower = chunk.filePath.toLowerCase();
    for (const keyword of keywords) {
      if (pathLower.includes(keyword)) {
        score += 2;
        matches.push(keyword);
      }
    }
    
    if (score > 0) {
      results.push({
        filePath: chunk.filePath,
        chunk: chunk.content,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        score,
        matches: [...new Set(matches)]
      });
    }
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  return { search_results: results };
}
```

### 3. query-filter-results
Фильтрация и пагинация результатов поиска.

**Input:** search_results, topK?, minScore?, offset?  
**Output:** filtered_results, total

```typescript
interface SearchResult {
  filePath: string;
  chunk: string;
  startLine: number;
  endLine: number;
  score: number;
  matches: string[];
}

interface FilteredResult extends SearchResult {
  rank: number;
}

interface FilterOutput {
  filtered_results: FilteredResult[];
  total: number;
  hasMore: boolean;
}

export default async function filterResults(input: { 
  search_results: SearchResult[];
  topK?: number;
  minScore?: number;
  offset?: number;
}): Promise<FilterOutput> {
  const topK = input.topK || 10;
  const minScore = input.minScore || 0.5;
  const offset = input.offset || 0;
  
  // Filter by minimum score
  let filtered = input.search_results.filter(r => r.score >= minScore);
  
  // Deduplicate by file path (keep highest scoring chunk per file)
  const byFile = new Map<string, SearchResult>();
  for (const result of filtered) {
    const existing = byFile.get(result.filePath);
    if (!existing || result.score > existing.score) {
      byFile.set(result.filePath, result);
    }
  }
  
  filtered = Array.from(byFile.values());
  
  // Sort by score
  filtered.sort((a, b) => b.score - a.score);
  
  const total = filtered.length;
  
  // Apply pagination
  const paginated = filtered.slice(offset, offset + topK);
  
  // Add rank
  const ranked: FilteredResult[] = paginated.map((r, i) => ({
    ...r,
    rank: offset + i + 1
  }));
  
  return {
    filtered_results: ranked,
    total,
    hasMore: offset + topK < total
  };
}
```
