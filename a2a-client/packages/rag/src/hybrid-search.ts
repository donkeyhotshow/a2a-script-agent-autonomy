/**
 * Hybrid Search - Combines Sparse (BM25) and Dense (Vector) search with RRF
 */

const DEFAULT_CONFIG = {
  sparseWeight: 0.5,
  denseWeight: 0.5,
  rrfK: 60,
  minScore: 0,
  maxResults: 20,
};

export interface SparseSearchLike {
  search(query: string, options: { limit?: number }): Promise<Array<{ id?: string; docId?: string; path?: string; content?: string; score?: number }>>;
}

export interface DenseSearchLike {
  search(query: string, options: { limit?: number }): Promise<Array<{ id?: string; docId?: string; path?: string; content?: string; score?: number }>>;
}

export interface HybridSearchConfig {
  sparseSearch?: SparseSearchLike | { search: (q: string, o: { limit?: number }) => Promise<{ hits?: Array<{ id?: string; path?: string; content?: string; _rankingScore?: number }> }> };
  denseSearch?: DenseSearchLike;
  sparseWeight?: number;
  denseWeight?: number;
  rrfK?: number;
}

export interface HybridSearchOptions {
  limit?: number;
  minScore?: number;
}

interface RRFDoc {
  id?: string;
  docId?: string;
  path?: string;
  content?: string;
  score?: number;
  rrfScore?: number;
  sparseRank?: number;
  denseRank?: number;
  sparseScore?: number;
  denseScore?: number;
  weights?: { sparse: number; dense: number };
}

export class HybridSearcher {
  sparseSearch: HybridSearchConfig['sparseSearch'];
  denseSearch: HybridSearchConfig['denseSearch'];
  sparseWeight: number;
  denseWeight: number;
  rrfK: number;

  constructor(config: HybridSearchConfig = {}) {
    this.sparseSearch = config.sparseSearch;
    this.denseSearch = config.denseSearch;
    this.sparseWeight = config.sparseWeight ?? DEFAULT_CONFIG.sparseWeight;
    this.denseWeight = config.denseWeight ?? DEFAULT_CONFIG.denseWeight;
    this.rrfK = config.rrfK ?? DEFAULT_CONFIG.rrfK;
  }

  async search(query: string, options: HybridSearchOptions = {}): Promise<RRFDoc[]> {
    const limit = options.limit ?? DEFAULT_CONFIG.maxResults;
    const minScore = options.minScore ?? DEFAULT_CONFIG.minScore;
    const [sparseResults, denseResults] = await Promise.all([
      this._searchSparse(query, limit * 2),
      this._searchDense(query, limit * 2),
    ]);
    const fused = this._rrfFusion(sparseResults, denseResults);
    const weighted = this._applyWeights(fused);
    return weighted.filter((r) => r.score! >= minScore).slice(0, limit);
  }

  private async _searchSparse(query: string, limit: number): Promise<RRFDoc[]> {
    if (!this.sparseSearch) return [];
    try {
      const s = this.sparseSearch as SparseSearchLike;
      if (typeof s?.search === 'function') {
        return s.search(query, { limit });
      }
      type MeiliHit = { id?: string; path?: string; content?: string; _rankingScore?: number };
      const result = await (this.sparseSearch as { search(q: string, o: { limit: number }): Promise<{ hits?: MeiliHit[] }> }).search(query, { limit });
      return (result.hits ?? []).map((hit: MeiliHit) => ({
        id: hit.id ?? hit.path,
        docId: hit.id ?? hit.path,
        content: hit.content ?? '',
        path: hit.path ?? '',
        score: hit._rankingScore ?? 1,
      }));
    } catch {
      return [];
    }
  }

  private async _searchDense(query: string, limit: number): Promise<RRFDoc[]> {
    if (!this.denseSearch) return [];
    try {
      return this.denseSearch.search(query, { limit });
    } catch {
      return [];
    }
  }

  private _rrfFusion(sparseResults: RRFDoc[], denseResults: RRFDoc[]): RRFDoc[] {
    const scores = new Map<string, RRFDoc>();
    for (let rank = 0; rank < sparseResults.length; rank++) {
      const doc = sparseResults[rank];
      const docId = String(doc.id ?? doc.docId ?? doc.path ?? rank);
      if (!scores.has(docId)) scores.set(docId, { ...doc, rrfScore: 0 });
      const e = scores.get(docId)!;
      e.rrfScore! += 1 / (this.rrfK + rank + 1);
      (e as RRFDoc & { sparseRank: number }).sparseRank = rank;
    }
    for (let rank = 0; rank < denseResults.length; rank++) {
      const doc = denseResults[rank];
      const docId = String(doc.id ?? doc.docId ?? doc.path ?? rank);
      if (!scores.has(docId)) scores.set(docId, { ...doc, rrfScore: 0 });
      const e = scores.get(docId)!;
      e.rrfScore! += 1 / (this.rrfK + rank + 1);
      (e as RRFDoc & { denseRank: number }).denseRank = rank;
    }
    return Array.from(scores.values()).sort((a, b) => (b.rrfScore ?? 0) - (a.rrfScore ?? 0));
  }

  private _applyWeights(results: RRFDoc[]): RRFDoc[] {
    let maxSparse = 0,
      maxDense = 0;
    for (const r of results) {
      if (r.sparseScore != null && r.sparseScore > maxSparse) maxSparse = r.sparseScore;
      if (r.denseScore != null && r.denseScore > maxDense) maxDense = r.denseScore;
    }
    return results.map((result) => {
      let finalScore = result.rrfScore ?? 0;
      if (result.sparseScore != null && maxSparse > 0) finalScore += this.sparseWeight * (result.sparseScore / maxSparse);
      if (result.denseScore != null && maxDense > 0) finalScore += this.denseWeight * (result.denseScore / maxDense);
      return { ...result, score: finalScore, weights: { sparse: this.sparseWeight, dense: this.denseWeight } };
    });
  }

  setSparseSearch(sparseSearch: HybridSearchConfig['sparseSearch']): void {
    this.sparseSearch = sparseSearch;
  }

  setDenseSearch(denseSearch: HybridSearchConfig['denseSearch']): void {
    this.denseSearch = denseSearch;
  }

  setWeights(sparseWeight: number, denseWeight: number): void {
    const total = sparseWeight + denseWeight;
    this.sparseWeight = sparseWeight / total;
    this.denseWeight = denseWeight / total;
  }

  getConfig(): { sparseWeight: number; denseWeight: number; rrfK: number; hasSparse: boolean; hasDense: boolean } {
    return {
      sparseWeight: this.sparseWeight,
      denseWeight: this.denseWeight,
      rrfK: this.rrfK,
      hasSparse: !!this.sparseSearch,
      hasDense: !!this.denseSearch,
    };
  }
}

export function createHybridSearcher(config?: HybridSearchConfig): HybridSearcher {
  return new HybridSearcher(config);
}

export { DEFAULT_CONFIG };
