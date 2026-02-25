/**
 * Search Suggestions - Autocomplete and search suggestions
 */

import type { Chunk } from './chunk-manager.js';

export interface SuggestionsConfig {
  maxSuggestions?: number;
}

export interface SuggestionItem {
  text: string;
  type: string;
  filePath: string;
  score: number;
}

interface SymbolData {
  name: string;
  type: string;
  filePath: string;
  content?: string;
  frequency: number;
  variants: Set<string>;
}

export class SearchSuggestionsEngine {
  private config: SuggestionsConfig;
  private symbols = new Map<string, SymbolData>();
  private prefixIndex = new Map<string, Set<string>>();
  private maxSuggestions: number;

  constructor(config: SuggestionsConfig = {}) {
    this.config = config;
    this.maxSuggestions = config.maxSuggestions ?? 10;
  }

  indexSymbols(chunks: Chunk[]): void {
    for (const chunk of chunks) {
      if (chunk.name) this._addSymbol(chunk.name, { type: chunk.type, filePath: chunk.filePath, content: chunk.content });
    }
    this._buildPrefixIndex();
  }

  private _addSymbol(name: string, data: { type: string; filePath: string; content?: string }): void {
    const key = name.toLowerCase();
    if (!this.symbols.has(key)) {
      this.symbols.set(key, { name, type: data.type, filePath: data.filePath, content: data.content, frequency: 0, variants: new Set([name]) });
    }
    const s = this.symbols.get(key)!;
    s.frequency++;
    s.variants.add(name);
    s.type = data.type || s.type;
    s.filePath = data.filePath || s.filePath;
  }

  private _buildPrefixIndex(): void {
    this.prefixIndex.clear();
    for (const [key] of this.symbols) {
      for (const len of [1, 2, 3, 4]) {
        const prefix = key.slice(0, len);
        if (!this.prefixIndex.has(prefix)) this.prefixIndex.set(prefix, new Set());
        this.prefixIndex.get(prefix)!.add(key);
      }
    }
  }

  getSuggestions(query: string, options: { limit?: number } = {}): SuggestionItem[] {
    if (!query || query.length < 1) return this._getRecentSymbols(options.limit);
    const limit = options.limit ?? this.maxSuggestions;
    const lowerQuery = query.toLowerCase();
    const candidates = new Map<string, SymbolData & { score: number }>();
    const prefixMatches = this.prefixIndex.get(lowerQuery.slice(0, 2)) ?? new Set();
    for (const key of prefixMatches) {
      if (key.startsWith(lowerQuery)) {
        const symbol = this.symbols.get(key);
        if (symbol) candidates.set(key, { ...symbol, score: this._calculateScore(symbol, lowerQuery, query) });
      }
    }
    return Array.from(candidates.values()).sort((a, b) => b.score - a.score).slice(0, limit).map((s) => ({ text: s.name, type: s.type, filePath: s.filePath, score: s.score }));
  }

  private _calculateScore(symbol: SymbolData, lowerQuery: string, originalQuery: string): number {
    let score = 0;
    if (symbol.name.toLowerCase() === lowerQuery) score += 100;
    else if (symbol.name.toLowerCase().startsWith(lowerQuery)) score += 50;
    else if (symbol.name.toLowerCase().includes(lowerQuery)) score += 20;
    score += Math.min(symbol.frequency, 10);
    const typeBonus: Record<string, number> = { class: 15, function: 12, method: 10, interface: 8, service: 10, controller: 10 };
    score += typeBonus[symbol.type] ?? 0;
    if (originalQuery && symbol.name.startsWith(originalQuery.charAt(0).toUpperCase())) score += 5;
    return score;
  }

  private _getRecentSymbols(limit = 10): SuggestionItem[] {
    return Array.from(this.symbols.values()).sort((a, b) => b.frequency - a.frequency).slice(0, limit).map((s) => ({ text: s.name, type: s.type, filePath: s.filePath, score: s.frequency }));
  }

  getByType(type: string, limit = 10): SuggestionItem[] {
    return Array.from(this.symbols.values()).filter((s) => s.type === type).sort((a, b) => b.frequency - a.frequency).slice(0, limit).map((s) => ({ text: s.name, type: s.type, filePath: s.filePath, score: s.frequency }));
  }

  clear(): void {
    this.symbols.clear();
    this.prefixIndex.clear();
  }

  getStats(): { totalSymbols: number; typeCounts: Record<string, number>; prefixIndexSize: number } {
    const typeCounts: Record<string, number> = {};
    for (const s of this.symbols.values()) typeCounts[s.type] = (typeCounts[s.type] ?? 0) + 1;
    return { totalSymbols: this.symbols.size, typeCounts, prefixIndexSize: this.prefixIndex.size };
  }
}

export function createSuggestionsEngine(config?: SuggestionsConfig): SearchSuggestionsEngine {
  return new SearchSuggestionsEngine(config);
}

export class QueryExpander {
  private termRelations = new Map<string, Map<string, number>>();

  constructor(_config?: Record<string, unknown>) {}

  addRelation(term: string, related: string, weight = 1): void {
    const key = term.toLowerCase();
    if (!this.termRelations.has(key)) this.termRelations.set(key, new Map());
    const rel = this.termRelations.get(key)!;
    rel.set(related, (rel.get(related) ?? 0) + weight);
  }

  expand(query: string): string[] {
    const terms = query.toLowerCase().split(/\s+/);
    const expanded = new Set(terms);
    for (const term of terms) {
      const rel = this.termRelations.get(term.toLowerCase());
      if (rel) for (const [related, w] of rel) { if (w > 0.5) expanded.add(related); }
    }
    return Array.from(expanded);
  }

  learn(query: string, clickedResult: string): void {
    for (const term of query.toLowerCase().split(/\s+/)) {
      if (clickedResult.toLowerCase().includes(term)) this.addRelation(term, clickedResult, 1);
    }
  }
}

export function createQueryExpander(config?: Record<string, unknown>): QueryExpander {
  return new QueryExpander(config);
}
