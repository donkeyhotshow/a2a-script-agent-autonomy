"use strict";
/**
 * Reranker Client - Cross-encoder reranking for search results
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIGS = exports.RerankerClient = exports.PROVIDERS = void 0;
exports.createReranker = createReranker;
exports.PROVIDERS = {
    COHERE: 'cohere',
    JINA: 'jina',
    LOCAL: 'local',
};
const DEFAULT_CONFIGS = {
    cohere: { model: 'rerank-multilingual-v3.0', maxChunks: 1000, returnDocuments: true },
    jina: { model: 'jina-reranker-v2-base-multilingual', topN: 10 },
};
exports.DEFAULT_CONFIGS = DEFAULT_CONFIGS;
class RerankerClient {
    constructor(config = {}) {
        this.provider = config.provider ?? exports.PROVIDERS.COHERE;
        this.apiKey = config.apiKey ?? process.env.RERANKER_API_KEY;
        this.baseUrl = config.baseUrl;
        this.modelOptions = {
            ...DEFAULT_CONFIGS[this.provider],
            ...config.modelOptions,
        };
    }
    _getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if ((this.provider === exports.PROVIDERS.COHERE || this.provider === exports.PROVIDERS.JINA) && this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        return headers;
    }
    async rerank(query, documents, options = {}) {
        if (!query || !documents?.length)
            return [];
        const topN = options.topN ?? this.modelOptions.topN ?? 10;
        switch (this.provider) {
            case exports.PROVIDERS.COHERE:
                return this._rerankCohere(query, documents, topN);
            case exports.PROVIDERS.JINA:
                return this._rerankJina(query, documents, topN);
            case exports.PROVIDERS.LOCAL:
                return this._rerankLocal(query, documents, topN);
            default:
                throw new Error(`Unknown provider: ${this.provider}`);
        }
    }
    async _rerankCohere(query, documents, topN) {
        const url = this.baseUrl ?? 'https://api.cohere.com/v1/rerank';
        const docStrings = documents.map((doc) => typeof doc === 'string' ? doc : (doc.content ?? doc.text ?? ''));
        const response = await fetch(url, {
            method: 'POST',
            headers: this._getHeaders(),
            body: JSON.stringify({
                query,
                documents: docStrings,
                model: this.modelOptions.model,
                top_n: topN,
                return_documents: this.modelOptions.returnDocuments,
            }),
        });
        if (!response.ok)
            throw new Error(`Cohere rerank error: ${response.status} ${await response.text()}`);
        const data = (await response.json());
        return data.results.map((result) => ({
            id: documents[result.index]?.id ?? String(result.index),
            content: result.document?.text ?? docStrings[result.index] ?? '',
            score: result.relevance_score,
        }));
    }
    async _rerankJina(query, documents, topN) {
        const url = this.baseUrl ?? 'https://api.jina.ai/v1/rerank';
        const docObjects = documents.map((doc, idx) => ({
            id: doc.id ?? String(idx),
            text: typeof doc === 'string' ? doc : (doc.content ?? doc.text ?? ''),
        }));
        const response = await fetch(url, {
            method: 'POST',
            headers: this._getHeaders(),
            body: JSON.stringify({ query, documents: docObjects, model: this.modelOptions.model, top_n: topN }),
        });
        if (!response.ok)
            throw new Error(`Jina rerank error: ${response.status} ${await response.text()}`);
        const data = (await response.json());
        return data.results.map((result) => ({
            id: docObjects[result.index].id,
            content: result.document.text,
            score: result.relevance_score,
        }));
    }
    _rerankLocal(query, documents, topN) {
        const queryTerms = query.toLowerCase().split(/\s+/);
        const scored = documents.map((doc, idx) => {
            const content = (typeof doc === 'string' ? doc : (doc.content ?? doc.text ?? '')).toLowerCase();
            let score = 0;
            for (const term of queryTerms) {
                if (content.includes(term))
                    score += 1;
                if (content === term)
                    score += 2;
            }
            return {
                id: doc.id ?? String(idx),
                content: typeof doc === 'string' ? doc : (doc.content ?? doc.text ?? ''),
                score,
            };
        });
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topN);
    }
    async isAvailable() {
        if (this.provider === exports.PROVIDERS.LOCAL)
            return true;
        try {
            const url = this.baseUrl ??
                (this.provider === exports.PROVIDERS.COHERE ? 'https://api.cohere.com/v1/models' : 'https://api.jina.ai/v1/models');
            const response = await fetch(url, { method: 'GET', headers: this._getHeaders() });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    getInfo() {
        return { provider: this.provider, model: String(this.modelOptions.model), available: true };
    }
}
exports.RerankerClient = RerankerClient;
function createReranker(config) {
    return new RerankerClient(config);
}
