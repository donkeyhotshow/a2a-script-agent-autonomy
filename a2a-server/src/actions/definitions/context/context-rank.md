# context-rank

Ранжирование результатов: сортировка по релевантности. **План:** [actions-definitions-for-auto-ai](../../../../docs/actions-definitions-for-auto-ai.md).

## Priority
75

## Context
```json
{ "type": "rank", "requires_scoring": true }
```

## Triggers
- context rank
- rank context
- relevance filter
- найди релевантные файлы
- отсортируй по релевантности

## Sub-actions

### 1. context-rank-score
Оценка контекстных элементов по релевантности к запросу.

**Input:** items[], query, options?  
**Output:** ranked[]

```typescript
interface RankItem {
  id: string;
  filePath: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

interface ScoredItem extends RankItem {
  score: number;
  scoreBreakdown: {
    keyword: number;
    path: number;
    recency: number;
    size: number;
  };
}

// Weight configuration
const DEFAULT_WEIGHTS = {
  keyword: 0.4,
  path: 0.3,
  recency: 0.15,
  size: 0.15
};

export default async function scoreItems(input: { 
  items: RankItem[];
  query: string;
  options?: {
    weights?: Partial<typeof DEFAULT_WEIGHTS>;
  };
}): Promise<{ ranked: ScoredItem[] }> {
  const weights = { ...DEFAULT_WEIGHTS, ...input.options?.weights };
  const keywords = input.query.toLowerCase().split(/\s+/).filter(Boolean);
  
  const now = Date.now();
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
  
  const scoredItems = input.items.map(item => {
    const pathLower = item.filePath.toLowerCase();
    const contentLower = (item.content || '').toLowerCase();
    
    // Keyword score
    let keywordScore = 0;
    for (const keyword of keywords) {
      // Exact match in path (highest weight)
      if (pathLower.includes(keyword)) {
        keywordScore += 1;
      }
      // Match in content
      if (contentLower.includes(keyword)) {
        keywordScore += 0.5;
      }
      // Exact word match in content
      const exactRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const exactMatches = contentLower.match(exactRegex);
      if (exactMatches) {
        keywordScore += exactMatches.length * 0.3;
      }
    }
    keywordScore = Math.min(keywordScore / Math.max(keywords.length, 1), 1);
    
    // Path score (how central is this file in the project structure)
    const pathScore = calculatePathScore(pathLower, keywords);
    
    // Recency score (if we have modification info)
    let recencyScore = 0.5; // default middle
    if (item.metadata?.modified) {
      const modTime = item.metadata.modified as number;
      if (modTime > oneYearAgo) {
        recencyScore = 1;
      } else if (modTime > now - 2 * oneYearAgo) {
        recencyScore = 0.7;
      } else if (modTime > now - 3 * oneYearAgo) {
        recencyScore = 0.4;
      }
    }
    
    // Size score (prefer reasonable size files)
    let sizeScore = 0.5;
    if (item.metadata?.size) {
      const size = item.metadata.size as number;
      if (size < 5000) {
        sizeScore = 1;
      } else if (size < 20000) {
        sizeScore = 0.8;
      } else if (size < 100000) {
        sizeScore = 0.5;
      } else {
        sizeScore = 0.3;
      }
    }
    
    // Calculate total score
    const totalScore = 
      (keywordScore * weights.keyword) +
      (pathScore * weights.path) +
      (recencyScore * weights.recency) +
      (sizeScore * weights.size);
    
    return {
      ...item,
      score: totalScore,
      scoreBreakdown: {
        keyword: keywordScore,
        path: pathScore,
        recency: recencyScore,
        size: sizeScore
      }
    };
  });
  
  // Sort by score descending
  scoredItems.sort((a, b) => b.score - a.score);
  
  return { ranked: scoredItems };
}

function calculatePathScore(path: string, keywords: string[]): number {
  let score = 0;
  
  // Core directories get higher scores
  const coreDirs = ['/src/', '/lib/', '/app/', '/core/'];
  const hasCoreDir = coreDirs.some(d => path.includes(d));
  if (hasCoreDir) {
    score += 0.3;
  }
  
  // Directories with matching keywords
  for (const keyword of keywords) {
    const dirMatch = path.match(/\/([^\/]*)\//);
    if (dirMatch && dirMatch[1].toLowerCase().includes(keyword)) {
      score += 0.2;
    }
  }
  
  return Math.min(score + 0.2, 1); // Base score + bonus, max 1
}
```

### 2. context-rank-filter
Фильтрация по порогу оценки или top-k.

**Input:** ranked[], topK?, minScore?, groupBy?  
**Output:** filtered[]

```typescript
interface ScoredItem {
  id: string;
  filePath: string;
  score: number;
  scoreBreakdown?: {
    keyword: number;
    path: number;
    recency: number;
    size: number;
  };
}

interface FilterOptions {
  topK?: number;
  minScore?: number;
  groupBy?: 'directory' | 'extension' | 'none';
}

interface GroupedResults {
  [key: string]: ScoredItem[];
}

export default async function filterItems(input: { 
  ranked: ScoredItem[];
  topK?: number;
  minScore?: number;
  groupBy?: 'directory' | 'extension' | 'none';
}): Promise<{ 
  filtered: ScoredItem[] | GroupedResults;
  stats: {
    totalInput: number;
    totalOutput: number;
    filterReason: string;
  };
}> {
  const topK = input.topK || 10;
  const minScore = input.minScore || 0;
  const groupBy = input.groupBy || 'none';
  
  let filtered = input.ranked.filter(item => item.score >= minScore);
  
  let filterReason = '';
  if (minScore > 0) {
    filterReason = `minScore=${minScore}`;
  }
  
  if (groupBy === 'none') {
    // Simple top-k filtering
    filtered = filtered.slice(0, topK);
    if (topK < input.ranked.length) {
      filterReason = filterReason 
        ? `${filterReason}, topK=${topK}` 
        : `topK=${topK}`;
    }
    
    return {
      filtered,
      stats: {
        totalInput: input.ranked.length,
        totalOutput: filtered.length,
        filterReason
      }
    };
  }
  
  // Group by directory or extension
  const groups: GroupedResults = {};
  
  for (const item of filtered) {
    let key: string;
    
    if (groupBy === 'directory') {
      // Extract parent directory
      const parts = item.filePath.split(/[/\\]/);
      key = parts.slice(-2, -1)[0] || 'root';
    } else if (groupBy === 'extension') {
      const ext = item.filePath.match(/\.([^.]+)$/);
      key = ext ? ext[1] : 'no-ext';
    } else {
      key = 'all';
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  }
  
  // Sort groups by highest-scoring item
  for (const groupKey of Object.keys(groups)) {
    groups[groupKey].sort((a, b) => b.score - a.score);
    groups[groupKey] = groups[groupKey].slice(0, topK);
  }
  
  return {
    filtered: groups,
    stats: {
      totalInput: input.ranked.length,
      totalOutput: Object.values(groups).reduce((sum, arr) => sum + arr.length, 0),
      filterReason: filterReason || `groupBy=${groupBy}, topK=${topK}`
    }
  };
}
```

### 3. context-rank-explain
Генерация объяснения ranking для пользователя.

**Input:** filtered[], query  
**Output:** explanation

```typescript
interface ScoredItem {
  id: string;
  filePath: string;
  score: number;
  scoreBreakdown?: {
    keyword: number;
    path: number;
    recency: number;
    size: number;
  };
}

export default async function explainRanking(input: { 
  filtered: ScoredItem[];
  query: string;
}): Promise<{ explanation: string }> {
  if (input.filtered.length === 0) {
    return { 
      explanation: `No results found for "${input.query}". Try different keywords or broaden your search.` 
    };
  }
  
  const topItems = input.filtered.slice(0, 3);
  const lines: string[] = [];
  
  lines.push(`## Search Results for "${input.query}"\n`);
  lines.push(`Found ${input.filtered.length} relevant files:\n`);
  
  for (const item of topItems) {
    const filename = item.filePath.split(/[/\\]/).pop();
    const scorePercent = Math.round(item.score * 100);
    
    lines.push(`### ${filename} (${scorePercent}% match)`);
    lines.push(`\`${item.filePath}\``);
    
    if (item.scoreBreakdown) {
      const bd = item.scoreBreakdown;
      lines.push(`- Keyword match: ${Math.round(bd.keyword * 100)}%`);
      lines.push(`- Path relevance: ${Math.round(bd.path * 100)}%`);
      lines.push(`- File recency: ${Math.round(bd.recency * 100)}%`);
      lines.push(`- Size suitability: ${Math.round(bd.size * 100)}%`);
    }
    
    lines.push('');
  }
  
  if (input.filtered.length > 3) {
    lines.push(`_... and ${input.filtered.length - 3} more files_`);
  }
  
  return { explanation: lines.join('\n') };
}
```
