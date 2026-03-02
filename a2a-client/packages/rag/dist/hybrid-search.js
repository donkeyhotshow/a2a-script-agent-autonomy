"use strict";
/**
 * Hybrid Search - Combines Sparse (BM25) and Dense (Vector) search with RRF
 */
Object.defineProperty(exports, "__esModule", {value: true});
exports.DEFAULT_CONFIG = exports.HybridSearcher = void 0;
exports.createHybridSearcher = createHybridSearcher;
const DEFAULT_CONFIG = {
    sparseWeight: 0.5,
    denseWeight: 0.5,
    rrfK: 60,
    minScore: 0,
    maxResults: 20,
};
exports.DEFAULT_CONFIG = DEFAULT_CONFIG;

class HybridSearcher {
    constructor(config = {}) {
        this.sparseSearch = config.sparseSearch;
        this.denseSearch = config.denseSearch;
        this.sparseWeight = config.sparseWeight ?? DEFAULT_CONFIG.sparseWeight;
        this.denseWeight = config.denseWeight ?? DEFAULT_CONFIG.denseWeight;
        this.rrfK = config.rrfK ?? DEFAULT_CONFIG.rrfK;
    }

    async search(query, options = {}) {
        const limit = options.limit ?? DEFAULT_CONFIG.maxResults;
        const minScore = options.minScore ?? DEFAULT_CONFIG.minScore;
        const [sparseResults, denseResults] = await Promise.all([
            this._searchSparse(query, limit * 2),
            this._searchDense(query, limit * 2),
        ]);
        const fused = this._rrfFusion(sparseResults, denseResults);
        const weighted = this._applyWeights(fused);
        return weighted.filter((r) => r.score >= minScore).slice(0, limit);
    }

    async _searchSparse(query, limit) {
        if (!this.sparseSearch)
            return [];
        try {
            const s = this.sparseSearch;
            if (typeof s?.search === 'function') {
                return s.search(query, {limit});
            }
            const result = await this.sparseSearch.search(query, {limit});
            return (result.hits ?? []).map((hit) => ({
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

    async _searchDense(query, limit) {
        if (!this.denseSearch)
            return [];
        try {
            return this.denseSearch.search(query, {limit});
        } catch {
            return [];
        }
    }

    _rrfFusion(sparseResults, denseResults) {
        const scores = new Map();
        for (let rank = 0; rank < sparseResults.length; rank++) {
            const doc = sparseResults[rank];
            const docId = String(doc.id ?? doc.docId ?? doc.path ?? rank);
            if (!scores.has(docId))
                scores.set(docId, {...doc, rrfScore: 0});
            const e = scores.get(docId);
            e.rrfScore += 1 / (this.rrfK + rank + 1);
            e.sparseRank = rank;
        }
        for (let rank = 0; rank < denseResults.length; rank++) {
            const doc = denseResults[rank];
            const docId = String(doc.id ?? doc.docId ?? doc.path ?? rank);
            if (!scores.has(docId))
                scores.set(docId, {...doc, rrfScore: 0});
            const e = scores.get(docId);
            e.rrfScore += 1 / (this.rrfK + rank + 1);
            e.denseRank = rank;
        }
        return Array.from(scores.values()).sort((a, b) => (b.rrfScore ?? 0) - (a.rrfScore ?? 0));
    }

    _applyWeights(results) {
        let maxSparse = 0, maxDense = 0;
        for (const r of results) {
            if (r.sparseScore != null && r.sparseScore > maxSparse)
                maxSparse = r.sparseScore;
            if (r.denseScore != null && r.denseScore > maxDense)
                maxDense = r.denseScore;
        }
        return results.map((result) => {
            let finalScore = result.rrfScore ?? 0;
            if (result.sparseScore != null && maxSparse > 0)
                finalScore += this.sparseWeight * (result.sparseScore / maxSparse);
            if (result.denseScore != null && maxDense > 0)
                finalScore += this.denseWeight * (result.denseScore / maxDense);
            return {...result, score: finalScore, weights: {sparse: this.sparseWeight, dense: this.denseWeight}};
        });
    }

    setSparseSearch(sparseSearch) {
        this.sparseSearch = sparseSearch;
    }

    setDenseSearch(denseSearch) {
        this.denseSearch = denseSearch;
    }

    setWeights(sparseWeight, denseWeight) {
        const total = sparseWeight + denseWeight;
        this.sparseWeight = sparseWeight / total;
        this.denseWeight = denseWeight / total;
    }

    getConfig() {
        return {
            sparseWeight: this.sparseWeight,
            denseWeight: this.denseWeight,
            rrfK: this.rrfK,
            hasSparse: !!this.sparseSearch,
            hasDense: !!this.denseSearch,
        };
    }
}

exports.HybridSearcher = HybridSearcher;

function createHybridSearcher(config) {
    return new HybridSearcher(config);
}
