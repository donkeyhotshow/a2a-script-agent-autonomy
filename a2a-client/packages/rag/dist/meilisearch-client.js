"use strict";
/**
 * Meilisearch Client - BM25 search integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = exports.MeilisearchClient = void 0;
exports.createMeilisearchClient = createMeilisearchClient;
const meilisearch_defaults_js_1 = require("./meilisearch-defaults.js");
Object.defineProperty(exports, "DEFAULT_SETTINGS", { enumerable: true, get: function () { return meilisearch_defaults_js_1.DEFAULT_SETTINGS; } });
class MeilisearchClient {
    constructor(config = {}) {
        this.index = null;
        this.initialized = false;
        this.host = config.host ?? process.env.MEILISEARCH_HOST ?? 'http://localhost:7700';
        this.apiKey = config.apiKey ?? process.env.MEILISEARCH_API_KEY;
        this.indexName = config.indexName ?? 'code';
    }
    _getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey)
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        return headers;
    }
    async initialize() {
        const indexes = await this._getIndexes();
        const exists = indexes.some((idx) => idx.uid === this.indexName);
        if (!exists)
            await this._createIndex();
        await this._configureIndex();
        this.initialized = true;
    }
    async _getIndexes() {
        const response = await fetch(`${this.host}/indexes`, { method: 'GET', headers: this._getHeaders() });
        if (!response.ok)
            throw new Error(`Failed to get indexes: ${response.status}`);
        const data = (await response.json());
        return data.results ?? [];
    }
    async _createIndex() {
        const response = await fetch(`${this.host}/indexes`, {
            method: 'POST',
            headers: this._getHeaders(),
            body: JSON.stringify({ uid: this.indexName, primaryKey: 'id' }),
        });
        if (!response.ok)
            throw new Error(`Failed to create index: ${response.status}`);
        await this._waitForIndex();
    }
    async _waitForIndex() {
        for (let i = 0; i < 10; i++) {
            try {
                const response = await fetch(`${this.host}/indexes/${this.indexName}`, {
                    method: 'GET',
                    headers: this._getHeaders(),
                });
                if (response.ok) {
                    const data = (await response.json());
                    if (data.status === 'ready')
                        return;
                }
            }
            catch {
                // continue
            }
            await new Promise((r) => setTimeout(r, 500));
        }
        throw new Error('Index did not become ready in time');
    }
    async _configureIndex() {
        const response = await fetch(`${this.host}/indexes/${this.indexName}/settings`, {
            method: 'PATCH',
            headers: this._getHeaders(),
            body: JSON.stringify(meilisearch_defaults_js_1.DEFAULT_SETTINGS),
        });
        if (!response.ok)
            throw new Error(`Failed to configure index: ${response.status}`);
    }
    async addDocuments(documents) {
        if (!this.initialized)
            await this.initialize();
        const response = await fetch(`${this.host}/indexes/${this.indexName}/documents`, {
            method: 'POST',
            headers: this._getHeaders(),
            body: JSON.stringify(documents),
        });
        if (!response.ok)
            throw new Error(`Failed to add documents: ${response.status} ${await response.text()}`);
        const data = (await response.json());
        return data.taskUid;
    }
    async search(query, options = {}) {
        if (!this.initialized)
            await this.initialize();
        const searchParams = {
            q: query,
            limit: options.limit ?? 20,
            offset: options.offset ?? 0,
        };
        if (options.filter?.length)
            searchParams.filter = options.filter;
        if (options.attributesToRetrieve)
            searchParams.attributesToRetrieve = options.attributesToRetrieve;
        if (options.attributesToHighlight)
            searchParams.attributesToHighlight = options.attributesToHighlight;
        const response = await fetch(`${this.host}/indexes/${this.indexName}/search`, {
            method: 'POST',
            headers: this._getHeaders(),
            body: JSON.stringify(searchParams),
        });
        if (!response.ok)
            throw new Error(`Search failed: ${response.status} ${await response.text()}`);
        return response.json();
    }
    async deleteDocument(id) {
        const response = await fetch(`${this.host}/indexes/${this.indexName}/documents/${id}`, {
            method: 'DELETE',
            headers: this._getHeaders(),
        });
        if (!response.ok)
            throw new Error(`Failed to delete document: ${response.status}`);
        const data = (await response.json());
        return data.taskUid;
    }
    async deleteAllDocuments() {
        const response = await fetch(`${this.host}/indexes/${this.indexName}/documents`, {
            method: 'DELETE',
            headers: this._getHeaders(),
        });
        if (!response.ok)
            throw new Error(`Failed to delete all documents: ${response.status}`);
        const data = (await response.json());
        return data.taskUid;
    }
    async getStats() {
        const response = await fetch(`${this.host}/indexes/${this.indexName}/stats`, {
            method: 'GET',
            headers: this._getHeaders(),
        });
        if (!response.ok)
            throw new Error(`Failed to get stats: ${response.status}`);
        return response.json();
    }
    async isAvailable() {
        try {
            const response = await fetch(`${this.host}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    async getHealth() {
        const response = await fetch(`${this.host}/health`, { method: 'GET', headers: this._getHeaders() });
        if (!response.ok)
            throw new Error(`Health check failed: ${response.status}`);
        return response.json();
    }
}
exports.MeilisearchClient = MeilisearchClient;
function createMeilisearchClient(config) {
    return new MeilisearchClient(config);
}
