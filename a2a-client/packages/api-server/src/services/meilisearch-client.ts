/**
 * Meilisearch Client (shared with RAG package).
 *
 * Provides a lightweight wrapper around Meilisearch HTTP API so the API server
 * can reuse the same search/indexing flow as the RAG package.
 */

const DEFAULT_SETTINGS = {
    searchableAttributes: ['content', 'name', 'path', 'type'],
    filterableAttributes: ['type', 'extension', 'framework'],
    sortableAttributes: ['score', 'lastModified', 'path'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
};

export interface MeilisearchConfig {
    host?: string;
    apiKey?: string;
    indexName?: string;
}

export interface MeilisearchDocument {
    id: string;
    path?: string;
    content?: string;
    name?: string;
    type?: string;
    extension?: string;
    framework?: string;
    lastModified?: number;
}

export interface MeilisearchSearchOptions {
    limit?: number;
    offset?: number;
    filter?: string[];
    attributesToRetrieve?: string[];
    attributesToHighlight?: string[];
}

export interface MeilisearchSearchResult {
    hits: Array<Record<string, unknown>>;
    [key: string]: unknown;
}

export class MeilisearchClient {
    host: string;
    apiKey: string | undefined;
    indexName: string;
    private initialized = false;

    constructor(config: MeilisearchConfig = {}) {
        this.host = config.host ?? process.env.MEILISEARCH_HOST ?? 'http://localhost:7700';
        this.apiKey = config.apiKey ?? process.env.MEILISEARCH_API_KEY;
        this.indexName = config.indexName ?? process.env.MEILISEARCH_INDEX ?? 'code';
    }

    private _getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {'Content-Type': 'application/json'};
        if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
        return headers;
    }

    async initialize(): Promise<void> {
        const indexes = await this._getIndexes();
        const exists = indexes.some((idx) => idx.uid === this.indexName);
        if (!exists) await this._createIndex();
        await this._configureIndex();
        this.initialized = true;
    }

    private async _getIndexes(): Promise<Array<{uid: string}>> {
        const response = await fetch(`${this.host}/indexes`, {
            method: 'GET',
            headers: this._getHeaders(),
        });
        if (!response.ok) throw new Error(`Failed to get indexes: ${response.status}`);
        const data = (await response.json()) as {results?: Array<{uid: string}>};
        return data.results ?? [];
    }

    private async _createIndex(): Promise<void> {
        const response = await fetch(`${this.host}/indexes`, {
            method: 'POST',
            headers: this._getHeaders(),
            body: JSON.stringify({uid: this.indexName, primaryKey: 'id'}),
        });
        if (!response.ok) throw new Error(`Failed to create index: ${response.status}`);
        await this._waitForIndex();
    }

    private async _waitForIndex(): Promise<void> {
        for (let i = 0; i < 10; i++) {
            try {
                const response = await fetch(`${this.host}/indexes/${this.indexName}`, {
                    method: 'GET',
                    headers: this._getHeaders(),
                });
                if (response.ok) {
                    const data = (await response.json()) as {status?: string};
                    if (data.status === 'ready') return;
                }
            } catch {
                // continue retrying
            }
            await new Promise((r) => setTimeout(r, 500));
        }
        throw new Error('Index did not become ready in time');
    }

    private async _configureIndex(): Promise<void> {
        const response = await fetch(`${this.host}/indexes/${this.indexName}/settings`, {
            method: 'PATCH',
            headers: this._getHeaders(),
            body: JSON.stringify(DEFAULT_SETTINGS),
        });
        if (!response.ok) throw new Error(`Failed to configure index: ${response.status}`);
    }

    async addDocuments(documents: MeilisearchDocument[]): Promise<string> {
        if (!this.initialized) await this.initialize();
        const response = await fetch(`${this.host}/indexes/${this.indexName}/documents`, {
            method: 'POST',
            headers: this._getHeaders(),
            body: JSON.stringify(documents),
        });
        if (!response.ok) throw new Error(`Failed to add documents: ${response.status} ${await response.text()}`);
        const data = (await response.json()) as {taskUid: string};
        return data.taskUid;
    }

    async search(query: string, options: MeilisearchSearchOptions = {}): Promise<MeilisearchSearchResult> {
        if (!this.initialized) await this.initialize();
        const payload: Record<string, unknown> = {
            q: query,
            limit: options.limit ?? 20,
            offset: options.offset ?? 0,
        };
        if (options.filter?.length) payload.filter = options.filter;
        if (options.attributesToRetrieve) payload.attributesToRetrieve = options.attributesToRetrieve;
        if (options.attributesToHighlight) payload.attributesToHighlight = options.attributesToHighlight;
        const response = await fetch(`${this.host}/indexes/${this.indexName}/search`, {
            method: 'POST',
            headers: this._getHeaders(),
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Search failed: ${response.status} ${await response.text()}`);
        return response.json();
    }

    async deleteDocument(id: string): Promise<string> {
        const response = await fetch(`${this.host}/indexes/${this.indexName}/documents/${id}`, {
            method: 'DELETE',
            headers: this._getHeaders(),
        });
        if (!response.ok) throw new Error(`Failed to delete document: ${response.status}`);
        const data = (await response.json()) as {taskUid: string};
        return data.taskUid;
    }

    async deleteAllDocuments(): Promise<string> {
        const response = await fetch(`${this.host}/indexes/${this.indexName}/documents`, {
            method: 'DELETE',
            headers: this._getHeaders(),
        });
        if (!response.ok) throw new Error(`Failed to delete all documents: ${response.status}`);
        const data = (await response.json()) as {taskUid: string};
        return data.taskUid;
    }

    async getStats(): Promise<Record<string, unknown>> {
        const response = await fetch(`${this.host}/indexes/${this.indexName}/stats`, {
            method: 'GET',
            headers: this._getHeaders(),
        });
        if (!response.ok) throw new Error(`Failed to get stats: ${response.status}`);
        return response.json();
    }

    async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.host}/health`, {
                method: 'GET',
                headers: {'Content-Type': 'application/json'},
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    async getHealth(): Promise<Record<string, unknown>> {
        const response = await fetch(`${this.host}/health`, {
            method: 'GET',
            headers: this._getHeaders(),
        });
        if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
        return response.json();
    }
}

export function createMeilisearchClient(config?: MeilisearchConfig): MeilisearchClient {
    return new MeilisearchClient(config);
}

export {DEFAULT_SETTINGS};
