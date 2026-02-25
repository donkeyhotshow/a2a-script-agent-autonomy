/**
 * RAG Searcher - Search in indexed files
 */

import fs from 'fs/promises';
import path from 'path';
import { TFIDFService } from './tfidf.js';
import type { Chunk } from './chunk-manager.js';
import type { RAGIndexData, IndexFileInfo } from './indexer.js';

export interface RAGSearcherConfig {
  projectPath?: string;
  useTFIDF?: boolean;
}

export interface SearchOptions {
  limit?: number;
}

export interface HybridSearchOptions extends SearchOptions {
  keywordWeight?: number;
  tfidfWeight?: number;
  k?: number;
}

export interface SearchResult {
  chunk: Chunk;
  score: number;
  highlights: string[];
}

export interface TFIDFResult {
  id: string;
  score: number;
  chunk?: Chunk;
}

interface RRFEntry {
  chunk: Chunk;
  score: number;
  highlights: string[];
  keywordRank: number | null;
  keywordScore: number;
  tfidfRank: number | null;
  tfidfScore: number;
}

interface ExtractedKeywords {
  words: string[];
  techTerms: string[];
  methodNames: string[];
}

export class RAGSearcher {
  projectPath: string;
  private indexPath: string;
  index: RAGIndexData | null = null;
  useTFIDF: boolean;
  tfidf: TFIDFService | null;
  private tfidfIndexed = false;

  constructor(config: RAGSearcherConfig = {}) {
    this.projectPath = config.projectPath ?? process.cwd();
    this.indexPath = path.join(this.projectPath, '.a2a', 'index');
    this.useTFIDF = config.useTFIDF !== false;
    this.tfidf = this.useTFIDF ? new TFIDFService() : null;
  }

  async loadIndex(): Promise<RAGIndexData> {
    if (this.index) return this.index;
    try {
      const indexPath = path.join(this.indexPath, 'rag-files.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      this.index = JSON.parse(content) as RAGIndexData;
      return this.index;
    } catch {
      this.index = { version: '1.0', timestamp: '', projectPath: this.projectPath, files: [], chunks: [] };
      return this.index;
    }
  }

  indexDocument(id: string, content: string): void {
    this.tfidf?.addDocument(id, content);
  }

  indexDocuments(documents: Array<{ id: string; content: string }>): void {
    if (this.tfidf) {
      this.tfidf.addDocuments(documents.map((doc) => ({ id: doc.id, text: doc.content })));
    }
  }

  async buildTFIDFIndex(): Promise<void> {
    if (!this.tfidf) throw new Error('TF-IDF not enabled');
    const index = await this.loadIndex();
    this.tfidf.clear();
    for (const chunk of index.chunks) {
      this.tfidf.addDocument(chunk.id ?? `${chunk.filePath}:${chunk.startLine}`, chunk.content);
    }
    this.tfidfIndexed = true;
  }

  async searchTFIDF(query: string, topK = 10): Promise<Array<TFIDFResult>> {
    if (!this.tfidf) throw new Error('TF-IDF not enabled');
    if (!this.tfidfIndexed) await this.buildTFIDFIndex();
    const results = this.tfidf.search(query, topK);
    const index = await this.loadIndex();
    const chunkMap = new Map<string, Chunk>();
    for (const chunk of index.chunks) {
      const key = chunk.id ?? `${chunk.filePath}:${chunk.startLine}`;
      chunkMap.set(key, chunk);
    }
    return results.map((r) => ({ ...r, chunk: chunkMap.get(r.id) }));
  }

  async searchHybrid(query: string, options: HybridSearchOptions = {}): Promise<Array<SearchResult & { details: Record<string, number | null> }>> {
    const limit = options.limit ?? 10;
    const keywordWeight = options.keywordWeight ?? 0.5;
    const tfidfWeight = options.tfidfWeight ?? 0.5;
    const k = options.k ?? 60;
    const [keywordResults, tfidfResults] = await Promise.all([
      this.search(query, { limit: limit * 2 }),
      this.tfidf ? this.searchTFIDF(query, limit * 2) : Promise.resolve([]),
    ]);
    const rrfScores = new Map<string, RRFEntry>();

    for (let i = 0; i < keywordResults.length; i++) {
      const result = keywordResults[i];
      const id = result.chunk.id ?? `${result.chunk.filePath}:${result.chunk.startLine}`;
      const rrfContribution = keywordWeight * (1 / (k + i + 1));
      if (rrfScores.has(id)) {
        const existing = rrfScores.get(id)!;
        existing.score += rrfContribution;
        existing.keywordRank = i + 1;
        existing.keywordScore = result.score;
        if (result.highlights?.length) existing.highlights = [...new Set([...existing.highlights, ...result.highlights])];
      } else {
        rrfScores.set(id, {
          chunk: result.chunk,
          score: rrfContribution,
          highlights: result.highlights ?? [],
          keywordRank: i + 1,
          keywordScore: result.score,
          tfidfRank: null,
          tfidfScore: 0,
        });
      }
    }

    for (let i = 0; i < tfidfResults.length; i++) {
      const result = tfidfResults[i];
      const rrfContribution = tfidfWeight * (1 / (k + i + 1));
      if (rrfScores.has(result.id)) {
        const existing = rrfScores.get(result.id)!;
        existing.score += rrfContribution;
        existing.tfidfRank = i + 1;
        existing.tfidfScore = result.score;
      } else if (result.chunk) {
        rrfScores.set(result.id, {
          chunk: result.chunk,
          score: rrfContribution,
          highlights: [],
          keywordRank: null,
          keywordScore: 0,
          tfidfRank: i + 1,
          tfidfScore: result.score,
        });
      }
    }

    return [...rrfScores.values()]
      .map((r) => ({
        chunk: r.chunk,
        score: r.score,
        highlights: r.highlights.slice(0, 5),
        details: { keywordRank: r.keywordRank, keywordScore: r.keywordScore, tfidfRank: r.tfidfRank, tfidfScore: r.tfidfScore },
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getTFIDFStats(): ReturnType<TFIDFService['getStats']> | null {
    return this.tfidf ? this.tfidf.getStats() : null;
  }

  clearTFIDFIndex(): void {
    if (this.tfidf) {
      this.tfidf.clear();
      this.tfidfIndexed = false;
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const index = await this.loadIndex();
    const keywords = this.extractKeywords(query);
    const results: SearchResult[] = [];
    for (const chunk of index.chunks) {
      const score = this.scoreChunk(chunk, keywords, query);
      if (score > 0) {
        results.push({
          chunk,
          score,
          highlights: this.findHighlights(chunk.content, keywords),
        });
      }
    }
    results.sort((a, b) => b.score - a.score);
    const limit = options.limit ?? 10;
    return results.slice(0, limit);
  }

  async searchFiles(pattern: string): Promise<IndexFileInfo[]> {
    const index = await this.loadIndex();
    return index.files.filter((file) => this.matchPattern(file.path, pattern));
  }

  async getFileContent(relativePath: string): Promise<string> {
    const fullPath = path.join(this.projectPath, relativePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  async getFileChunks(relativePath: string): Promise<Chunk[]> {
    const index = await this.loadIndex();
    return index.chunks.filter((c) => c.filePath === relativePath);
  }

  extractKeywords(query: string): ExtractedKeywords {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
      'добавь', 'создай', 'удали', 'измени', 'покажи', 'найди',
    ]);
    const words = query
      .toLowerCase()
      .replace(/[^\w\sа-яё]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
    const techTerms = query.match(/[A-Z][a-z]+[A-Z][a-z]+/g) ?? [];
    const classNames = query.match(/\b[A-Z][a-zA-Z]+\b/g) ?? [];
    const methodNames = (query.match(/\b[a-z][a-zA-Z]+\(\)/g) ?? []).map((m) => m.replace('()', ''));
    return { words, techTerms: [...techTerms, ...classNames], methodNames };
  }

  scoreChunk(chunk: Chunk, keywords: ExtractedKeywords, _originalQuery: string): number {
    let score = 0;
    const content = chunk.content.toLowerCase();
    for (const word of keywords.words) {
      const matches = content.match(new RegExp(word, 'gi'));
      if (matches) score += matches.length * 2;
    }
    for (const term of keywords.techTerms) {
      if (content.includes(term.toLowerCase())) score += 10;
    }
    for (const method of keywords.methodNames) {
      if (content.includes(method)) score += 15;
    }
    if (chunk.type === 'class' || chunk.type === 'method') score *= 1.2;
    if (chunk.name && keywords.techTerms.some((t) => chunk.name!.toLowerCase().includes(t.toLowerCase()))) score += 20;
    return score;
  }

  findHighlights(content: string, keywords: ExtractedKeywords): string[] {
    const allTerms = [...keywords.words, ...keywords.techTerms, ...keywords.methodNames];
    const highlights: string[] = [];
    for (const term of allTerms) {
      const regex = new RegExp(`.{0,50}${term}.{0,50}`, 'gi');
      const matches = content.match(regex);
      if (matches) highlights.push(...matches.slice(0, 2));
    }
    return [...new Set(highlights)].slice(0, 5);
  }

  matchPattern(filePath: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/{{GLOBSTAR}}/g, '.*');
    return new RegExp(regexPattern).test(filePath);
  }

  dispose(): void {
    this.index = null;
    this.clearTFIDFIndex();
  }
}
