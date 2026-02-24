import { SearchQuery, SearchResult, SearchMatch, MatchDetail, FileMetadata } from '../types/index.js';
import { getTextEmbedding } from './embedding.service.js';
import { vectorSearch, fullTextSearch, listFilesByProject } from '../repositories/file.repository.js';
import { logger } from '../utils/logger.js';

/**
 * Search Service
 * Handles semantic and hybrid search operations
 */

export interface SearchOptions {
  mode: 'semantic' | 'lexical' | 'hybrid';
  topK?: number;
  minScore?: number;
  rerank?: boolean;
}

/**
 * Search project code
 */
export async function searchProject(
  projectId: string,
  query: SearchQuery
): Promise<SearchResult> {
  const started = Date.now();

  const mode: SearchOptions['mode'] =
    (query.options as unknown as SearchOptions | undefined)?.mode ?? 'hybrid';

  const topK =
    (query.options as unknown as SearchOptions | undefined)?.topK ??
    (query.options?.limit ?? 20);

  let matches: SearchMatch[];

  if (mode === 'semantic') {
    matches = await semanticSearch(projectId, query.query, topK);
  } else if (mode === 'lexical') {
    matches = await lexicalSearch(projectId, query.query, topK);
  } else {
    matches = await hybridSearch(projectId, query.query, {
      topK,
      semanticWeight: 0.6,
      lexicalWeight: 0.4,
    });
  }

  if (query.filters) {
    matches = applyFilters(matches, query.filters);
  }

  const rerankRequested = (query.options as unknown as SearchOptions | undefined)?.rerank;
  if (rerankRequested) {
    matches = await rerankResults(query.query, matches);
  }

  const elapsed = Date.now() - started;

  return formatResults(matches, elapsed, mode);
}

/**
 * Semantic search using embeddings
 */
export async function semanticSearch(
  projectId: string,
  query: string,
  topK: number = 10
): Promise<SearchMatch[]> {
  if (!query.trim()) {
    return [];
  }

  const queryEmbedding = await getTextEmbedding(query);
  const rawResults = await vectorSearch(projectId, queryEmbedding, {
    limit: topK * 2,
    minScore: 0,
  });

  const byFile = new Map<
    string,
    {
      score: number;
      matches: MatchDetail[];
      metadata: FileMetadata;
    }
  >();

  for (const { embedding, file, score } of rawResults) {
    const existing = byFile.get(file.path);

    const match: MatchDetail = {
      line_start: embedding.lineStart,
      line_end: embedding.lineEnd,
      content: embedding.content,
      highlight: embedding.content,
      context_score: score,
    };

    const metadata: FileMetadata = {
      framework: 'unknown',
      type: inferFileType(file.path),
      last_modified: file.lastModified.toISOString(),
    };

    if (!existing) {
      byFile.set(file.path, {
        score,
        matches: [match],
        metadata,
      });
    } else {
      existing.score = Math.max(existing.score, score);
      existing.matches.push(match);
    }
  }

  const matches: SearchMatch[] = Array.from(byFile.entries()).map(([filePath, value]) => ({
    file: filePath,
    score: value.score,
    matches: value.matches,
    metadata: value.metadata,
  }));

  matches.sort((a, b) => b.score - a.score);

  if (matches.length <= topK) {
    return matches;
  }

  return matches.slice(0, topK);
}

/**
 * Lexical search using full-text
 */
export async function lexicalSearch(
  projectId: string,
  query: string,
  topK: number = 10
): Promise<SearchMatch[]> {
  if (!query.trim()) {
    return [];
  }

  const rawResults = await fullTextSearch(projectId, query, { limit: topK * 2 });

  const byFile = new Map<
    string,
    {
      score: number;
      matches: MatchDetail[];
      metadata: FileMetadata;
    }
  >();

  for (const { embedding, file, rank } of rawResults) {
    const existing = byFile.get(file.path);

    const highlight = highlightMatches(embedding.content, query);

    const match: MatchDetail = {
      line_start: embedding.lineStart,
      line_end: embedding.lineEnd,
      content: embedding.content,
      highlight,
      context_score: rank,
    };

    const metadata: FileMetadata = {
      framework: 'unknown',
      type: inferFileType(file.path),
      last_modified: file.lastModified.toISOString(),
    };

    if (!existing) {
      byFile.set(file.path, {
        score: rank,
        matches: [match],
        metadata,
      });
    } else {
      existing.score = Math.max(existing.score, rank);
      existing.matches.push(match);
    }
  }

  const matches: SearchMatch[] = Array.from(byFile.entries()).map(([filePath, value]) => ({
    file: filePath,
    score: value.score,
    matches: value.matches,
    metadata: value.metadata,
  }));

  matches.sort((a, b) => b.score - a.score);

  if (matches.length <= topK) {
    return matches;
  }

  return matches.slice(0, topK);
}

/**
 * Hybrid search combining semantic and lexical
 */
export async function hybridSearch(
  projectId: string,
  query: string,
  options?: {
    topK?: number;
    semanticWeight?: number;
    lexicalWeight?: number;
  }
): Promise<SearchMatch[]> {
  const topK = options?.topK ?? 20;
  const semanticWeight = options?.semanticWeight ?? 0.6;
  const lexicalWeight = options?.lexicalWeight ?? 0.4;

  const [semantic, lexical] = await Promise.all([
    semanticSearch(projectId, query, topK),
    lexicalSearch(projectId, query, topK),
  ]);

  const combined = new Map<
    string,
    {
      score: number;
      matches: MatchDetail[];
      metadata: FileMetadata;
    }
  >();

  const applyResults = (items: SearchMatch[], weight: number) => {
    for (const item of items) {
      const existing = combined.get(item.file);
      const weightedScore = item.score * weight;

      if (!existing) {
        combined.set(item.file, {
          score: weightedScore,
          matches: [...item.matches],
          metadata: item.metadata,
        });
      } else {
        existing.score += weightedScore;
        existing.matches.push(...item.matches);
      }
    }
  };

  applyResults(semantic, semanticWeight);
  applyResults(lexical, lexicalWeight);

  const merged: SearchMatch[] = Array.from(combined.entries()).map(([file, value]) => ({
    file,
    score: value.score,
    matches: value.matches,
    metadata: value.metadata,
  }));

  merged.sort((a, b) => b.score - a.score);

  if (merged.length <= topK) {
    return merged;
  }

  return merged.slice(0, topK);
}

/**
 * Search for code similar to query
 */
export async function findSimilarCode(
  projectId: string,
  code: string,
  topK: number = 5
): Promise<SearchMatch[]> {
  if (!code.trim()) {
    return [];
  }

  const queryEmbedding = await getTextEmbedding(code);
  const rawResults = await vectorSearch(projectId, queryEmbedding, {
    limit: topK * 2,
    minScore: 0,
  });

  const matches: SearchMatch[] = rawResults.map(({ embedding, file, score }) => {
    const detail: MatchDetail = {
      line_start: embedding.lineStart,
      line_end: embedding.lineEnd,
      content: embedding.content,
      highlight: embedding.content,
      context_score: score,
    };

    const metadata: FileMetadata = {
      framework: 'unknown',
      type: inferFileType(file.path),
      last_modified: file.lastModified.toISOString(),
    };

    return {
      file: file.path,
      score,
      matches: [detail],
      metadata,
    };
  });

  matches.sort((a, b) => b.score - a.score);

  if (matches.length <= topK) {
    return matches;
  }

  return matches.slice(0, topK);
}

/**
 * Search by file path pattern
 */
export async function searchByPath(
  projectId: string,
  pattern: string
): Promise<SearchMatch[]> {
  const files = await listFilesByProject(projectId);
  if (files.length === 0) {
    return [];
  }

  const regex = globToRegExp(pattern);
  const matches: SearchMatch[] = [];

  for (const file of files) {
    if (!regex.test(file.path)) {
      continue;
    }

    const metadata: FileMetadata = {
      framework: 'unknown',
      type: inferFileType(file.path),
      last_modified: file.lastModified.toISOString(),
    };

    const detail: MatchDetail = {
      line_start: 1,
      line_end: file.linesCount,
      content: '',
      highlight: '',
      context_score: 1,
    };

    matches.push({
      file: file.path,
      score: 1,
      matches: [detail],
      metadata,
    });
  }

  return matches;
}

/**
 * Rerank search results
 */
export async function rerankResults(
  query: string,
  results: SearchMatch[]
): Promise<SearchMatch[]> {
  if (results.length === 0) {
    return results;
  }

  // Простая реализация: лёгкий буст результатов, где путь содержит текст запроса.
  const lowerQuery = query.toLowerCase();

  const reranked = results.map((result) => {
    let boostedScore = result.score;
    if (result.file.toLowerCase().includes(lowerQuery)) {
      boostedScore *= 1.1;
    }
    return {
      ...result,
      score: boostedScore,
    };
  });

  reranked.sort((a, b) => b.score - a.score);

  return reranked;
}

/**
 * Format search results
 */
export function formatResults(
  matches: SearchMatch[],
  queryTime: number,
  algorithm: string
): SearchResult {
  return {
    results: matches,
    total: matches.length,
    query_time_ms: queryTime,
    algorithm_used: algorithm,
  };
}

/**
 * Apply filters to results
 */
export function applyFilters(
  results: SearchMatch[],
  filters: SearchQuery['filters']
): SearchMatch[] {
  if (!filters) {
    return results;
  }

  let filtered = results;

  if (filters.file_types && filters.file_types.length > 0) {
    const exts = filters.file_types.map((ext) =>
      ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`
    );
    filtered = filtered.filter((item) =>
      exts.some((ext) => item.file.toLowerCase().endsWith(ext))
    );
  }

  if (filters.directories && filters.directories.length > 0) {
    filtered = filtered.filter((item) =>
      filters.directories!.some((dir) =>
        item.file.toLowerCase().startsWith(dir.toLowerCase().replace(/\\/g, '/'))
      )
    );
  }

  if (filters.framework) {
    filtered = filtered.filter(
      (item) => item.metadata.framework.toLowerCase() === filters.framework!.toLowerCase()
    );
  }

  if (filters.exclude && filters.exclude.length > 0) {
    filtered = filtered.filter(
      (item) => !filters.exclude!.some((pattern) => globToRegExp(pattern).test(item.file))
    );
  }

  return filtered;
}

/**
 * Highlight matches in content
 */
export function highlightMatches(
  content: string,
  query: string
): string {
  if (!query.trim() || !content) {
    return content;
  }

  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    return content.replace(regex, (match) => `**${match}**`);
  } catch (error) {
    logger.warn('Failed to apply highlight regex, returning original content.', { error });
    return content;
  }
}

function inferFileType(path: string): string {
  const lower = path.toLowerCase();

  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.js') || lower.endsWith('.jsx')) return 'javascript';
  if (lower.endsWith('.php')) return 'php';
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.vue')) return 'vue';
  if (lower.endsWith('.md')) return 'markdown';
  if (lower.endsWith('.json')) return 'json';

  return 'unknown';
}

function globToRegExp(pattern: string): RegExp {
  // Очень упрощённая поддержка glob: * -> .*
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}
