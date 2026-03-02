"use strict";
/**
 * Search Suggestions - Autocomplete and search suggestions
 */
Object.defineProperty(exports, "__esModule", {value: true});
exports.QueryExpander = exports.SearchSuggestionsEngine = void 0;
exports.createSuggestionsEngine = createSuggestionsEngine;
exports.createQueryExpander = createQueryExpander;

class SearchSuggestionsEngine {
    constructor(config = {}) {
        this.symbols = new Map();
        this.prefixIndex = new Map();
        this.config = config;
        this.maxSuggestions = config.maxSuggestions ?? 10;
    }

    indexSymbols(chunks) {
        for (const chunk of chunks) {
            if (chunk.name)
                this._addSymbol(chunk.name, {type: chunk.type, filePath: chunk.filePath, content: chunk.content});
        }
        this._buildPrefixIndex();
    }

    _addSymbol(name, data) {
        const key = name.toLowerCase();
        if (!this.symbols.has(key)) {
            this.symbols.set(key, {
                name,
                type: data.type,
                filePath: data.filePath,
                content: data.content,
                frequency: 0,
                variants: new Set([name])
            });
        }
        const s = this.symbols.get(key);
        s.frequency++;
        s.variants.add(name);
        s.type = data.type || s.type;
        s.filePath = data.filePath || s.filePath;
    }

    _buildPrefixIndex() {
        this.prefixIndex.clear();
        for (const [key] of this.symbols) {
            for (const len of [1, 2, 3, 4]) {
                const prefix = key.slice(0, len);
                if (!this.prefixIndex.has(prefix))
                    this.prefixIndex.set(prefix, new Set());
                this.prefixIndex.get(prefix).add(key);
            }
        }
    }

    getSuggestions(query, options = {}) {
        if (!query || query.length < 1)
            return this._getRecentSymbols(options.limit);
        const limit = options.limit ?? this.maxSuggestions;
        const lowerQuery = query.toLowerCase();
        const candidates = new Map();
        const prefixMatches = this.prefixIndex.get(lowerQuery.slice(0, 2)) ?? new Set();
        for (const key of prefixMatches) {
            if (key.startsWith(lowerQuery)) {
                const symbol = this.symbols.get(key);
                if (symbol)
                    candidates.set(key, {...symbol, score: this._calculateScore(symbol, lowerQuery, query)});
            }
        }
        return Array.from(candidates.values()).sort((a, b) => b.score - a.score).slice(0, limit).map((s) => ({
            text: s.name,
            type: s.type,
            filePath: s.filePath,
            score: s.score
        }));
    }

    _calculateScore(symbol, lowerQuery, originalQuery) {
        let score = 0;
        if (symbol.name.toLowerCase() === lowerQuery)
            score += 100;
        else if (symbol.name.toLowerCase().startsWith(lowerQuery))
            score += 50;
        else if (symbol.name.toLowerCase().includes(lowerQuery))
            score += 20;
        score += Math.min(symbol.frequency, 10);
        const typeBonus = {class: 15, function: 12, method: 10, interface: 8, service: 10, controller: 10};
        score += typeBonus[symbol.type] ?? 0;
        if (originalQuery && symbol.name.startsWith(originalQuery.charAt(0).toUpperCase()))
            score += 5;
        return score;
    }

    _getRecentSymbols(limit = 10) {
        return Array.from(this.symbols.values()).sort((a, b) => b.frequency - a.frequency).slice(0, limit).map((s) => ({
            text: s.name,
            type: s.type,
            filePath: s.filePath,
            score: s.frequency
        }));
    }

    getByType(type, limit = 10) {
        return Array.from(this.symbols.values()).filter((s) => s.type === type).sort((a, b) => b.frequency - a.frequency).slice(0, limit).map((s) => ({
            text: s.name,
            type: s.type,
            filePath: s.filePath,
            score: s.frequency
        }));
    }

    clear() {
        this.symbols.clear();
        this.prefixIndex.clear();
    }

    getStats() {
        const typeCounts = {};
        for (const s of this.symbols.values())
            typeCounts[s.type] = (typeCounts[s.type] ?? 0) + 1;
        return {totalSymbols: this.symbols.size, typeCounts, prefixIndexSize: this.prefixIndex.size};
    }
}

exports.SearchSuggestionsEngine = SearchSuggestionsEngine;

function createSuggestionsEngine(config) {
    return new SearchSuggestionsEngine(config);
}

class QueryExpander {
    constructor(_config) {
        this.termRelations = new Map();
    }

    addRelation(term, related, weight = 1) {
        const key = term.toLowerCase();
        if (!this.termRelations.has(key))
            this.termRelations.set(key, new Map());
        const rel = this.termRelations.get(key);
        rel.set(related, (rel.get(related) ?? 0) + weight);
    }

    expand(query) {
        const terms = query.toLowerCase().split(/\s+/);
        const expanded = new Set(terms);
        for (const term of terms) {
            const rel = this.termRelations.get(term.toLowerCase());
            if (rel)
                for (const [related, w] of rel) {
                    if (w > 0.5)
                        expanded.add(related);
                }
        }
        return Array.from(expanded);
    }

    learn(query, clickedResult) {
        for (const term of query.toLowerCase().split(/\s+/)) {
            if (clickedResult.toLowerCase().includes(term))
                this.addRelation(term, clickedResult, 1);
        }
    }
}

exports.QueryExpander = QueryExpander;

function createQueryExpander(config) {
    return new QueryExpander(config);
}
