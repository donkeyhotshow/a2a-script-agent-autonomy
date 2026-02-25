# context-query

Семантический поиск релевантных файлов по запросу. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md).

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

## Sub-actions

### 1. query-parse
Парсинг запроса, извлечение ключевых слов.

**Input:** query  
**Output:** parsed_query

```typescript
export default async function run(input: { query: string }): Promise<{ parsed_query: { original: string; keywords: string[] } }> {
  const keywords = input.query.toLowerCase().split(/\s+/).filter(Boolean);
  return { parsed_query: { original: input.query, keywords } };
}
```

### 2. query-search
Поиск в индексе (RAG/семантический).

**Input:** parsed_query, indexId?  
**Output:** search_results

```typescript
export default async function run(input: { parsed_query: { keywords: string[] }; indexId?: string }): Promise<{ search_results: unknown[] }> {
  // const results = await semanticSearch(input.parsed_query.keywords, input.indexId);
  return { search_results: [] };
}
```

### 3. query-rank
Ранжирование результатов по релевантности.

**Input:** search_results  
**Output:** ranked_results

```typescript
export default async function run(input: { search_results: unknown[] }): Promise<{ ranked_results: unknown[] }> {
  const ranked = Array.isArray(input.search_results)
    ? [...input.search_results].sort((a: { score?: number }, b: { score?: number }) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 10)
    : [];
  return { ranked_results: ranked };
}
```
