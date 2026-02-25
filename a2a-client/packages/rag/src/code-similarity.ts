/**
 * Code Similarity Detection - Jaccard, cosine, edit distance
 */

import type { Chunk } from './chunk-manager.js';

export interface CodeSimilarityConfig {
  minSimilarity?: number;
}

export interface SimilarChunkResult {
  chunk: Chunk;
  similarity: number;
  sharedTokens: number;
}

export interface DuplicateGroup {
  chunks: Chunk[];
  avgSimilarity: number;
}

export class CodeSimilarityEngine {
  private config: CodeSimilarityConfig;
  chunks: Chunk[] = [];
  private tokenIndex = new Map<string, Set<number>>();
  private minSimilarity: number;

  constructor(config: CodeSimilarityConfig = {}) {
    this.config = config;
    this.minSimilarity = config.minSimilarity ?? 0.3;
  }

  index(chunks: Chunk[]): void {
    this.chunks = chunks;
    this.tokenIndex.clear();
    for (let i = 0; i < chunks.length; i++) {
      const tokens = this._tokenize(chunks[i].content);
      const unique = [...new Set(tokens)];
      for (const token of unique) {
        if (!this.tokenIndex.has(token)) this.tokenIndex.set(token, new Set());
        this.tokenIndex.get(token)!.add(i);
      }
    }
  }

  private _tokenize(content: string): string[] {
    if (!content) return [];
    return content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  findSimilar(
    query: string | Chunk,
    options: { limit?: number; method?: 'jaccard' | 'cosine' | 'overlap' | 'dice'; threshold?: number } = {}
  ): SimilarChunkResult[] {
    const limit = options.limit ?? 5;
    const method = options.method ?? 'jaccard';
    const threshold = options.threshold ?? this.minSimilarity;
    const queryContent = typeof query === 'string' ? query : query.content;
    const queryTokens = new Set(this._tokenize(queryContent));
    if (queryTokens.size === 0) return [];
    const candidates = new Map<number, number>();
    for (const token of queryTokens) {
      const indices = this.tokenIndex.get(token) ?? new Set();
      for (const idx of indices) {
        candidates.set(idx, (candidates.get(idx) ?? 0) + 1);
      }
    }
    const results: SimilarChunkResult[] = [];
    for (const [idx, sharedCount] of candidates) {
      const chunk = this.chunks[idx];
      if (!chunk) continue;
      const chunkTokens = new Set(this._tokenize(chunk.content));
      let similarity: number;
      switch (method) {
        case 'cosine':
          similarity = this._cosineSimilarity(queryTokens, chunkTokens);
          break;
        case 'overlap':
          similarity = this._overlapCoefficient(queryTokens, chunkTokens);
          break;
        case 'dice':
          similarity = this._diceCoefficient(queryTokens, chunkTokens);
          break;
        default:
          similarity = this._jaccardSimilarity(queryTokens, chunkTokens);
      }
      if (similarity >= threshold) {
        results.push({ chunk, similarity, sharedTokens: sharedCount });
      }
    }
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  private _jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    const intersection = new Set([...a].filter((x) => b.has(x)));
    const union = new Set([...a, ...b]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private _cosineSimilarity(a: Set<string>, b: Set<string>): number {
    const intersection = new Set([...a].filter((x) => b.has(x)));
    const magA = Math.sqrt(a.size);
    const magB = Math.sqrt(b.size);
    if (magA === 0 || magB === 0) return 0;
    return intersection.size / (magA * magB);
  }

  private _overlapCoefficient(a: Set<string>, b: Set<string>): number {
    const intersection = new Set([...a].filter((x) => b.has(x)));
    const minSize = Math.min(a.size, b.size);
    return minSize > 0 ? intersection.size / minSize : 0;
  }

  private _diceCoefficient(a: Set<string>, b: Set<string>): number {
    const intersection = new Set([...a].filter((x) => b.has(x)));
    const sum = a.size + b.size;
    return sum > 0 ? (2 * intersection.size) / sum : 0;
  }

  findDuplicates(options: { threshold?: number } = {}): DuplicateGroup[] {
    const threshold = options.threshold ?? 0.8;
    const duplicates: DuplicateGroup[] = [];
    const processed = new Set<number>();
    for (let i = 0; i < this.chunks.length; i++) {
      if (processed.has(i)) continue;
      const group: Chunk[] = [this.chunks[i]];
      processed.add(i);
      for (let j = i + 1; j < this.chunks.length; j++) {
        if (processed.has(j)) continue;
        const sim = this._jaccardSimilarity(
          new Set(this._tokenize(this.chunks[i].content)),
          new Set(this._tokenize(this.chunks[j].content))
        );
        if (sim >= threshold) {
          group.push(this.chunks[j]);
          processed.add(j);
        }
      }
      if (group.length > 1) {
        duplicates.push({ chunks: group, avgSimilarity: this._calculateGroupSimilarity(group) });
      }
    }
    return duplicates;
  }

  private _calculateGroupSimilarity(group: Chunk[]): number {
    let total = 0;
    let count = 0;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        total += this._jaccardSimilarity(
          new Set(this._tokenize(group[i].content)),
          new Set(this._tokenize(group[j].content))
        );
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }

  getStats(): { totalChunks: number; uniqueTokens: number; minSimilarity: number } {
    return {
      totalChunks: this.chunks.length,
      uniqueTokens: this.tokenIndex.size,
      minSimilarity: this.minSimilarity,
    };
  }
}

export function createSimilarityEngine(config?: CodeSimilarityConfig): CodeSimilarityEngine {
  return new CodeSimilarityEngine(config);
}
