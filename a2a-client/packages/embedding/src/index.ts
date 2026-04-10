/**
 * @a2a-client/embedding - Embedding client for semantic search.
 * Supports local HTTP embeddings, OpenAI, Cohere, Voyage AI, mock.
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export const PROVIDERS = {
    LOCAL_HUB: 'local_hub',
    OPENAI: 'openai',
    COHERE: 'cohere',
    VOYAGE: 'voyage',
    MOCK: 'mock',
} as const;

export type Provider = (typeof PROVIDERS)[keyof typeof PROVIDERS];

export const DIMENSIONS: Record<string, number> = {
    'nomic-embed-text': 768,
    'mxbai-embed-large': 1536,
    'bge-m3': 1024,
    'bge-large': 1024,
    'bge-small': 384,
    'sentence-transformers': 384,
    'text-embedding-3-small': 1536,
    'text-embedding-3-large': 3072,
    'text-embedding-ada-002': 1536,
    'embed-multilingual-v3.0': 1024,
    'embed-english-v3.0': 1024,
    'voyage-law-2': 1024,
    'voyage-code-2': 1536,
};

export const DEFAULT_MODELS: Record<string, string> = {
    local_hub: 'nomic-embed-text',
    openai: 'text-embedding-3-small',
    cohere: 'embed-multilingual-v3.0',
    voyage: 'voyage-code-2',
    mock: 'nomic-embed-text',
};

export interface EmbeddingConfig {
    provider?: Provider | string;
    baseUrl?: string;
    model?: string;
    apiKey?: string;
    cacheFile?: string | null;
    batchSize?: number;
    timeout?: number;
}

export interface CacheStats {
    size: number;
    provider: string;
    model: string;
    dimension: number;
    baseUrl?: string;
}

export function createEmbeddingClient(config: EmbeddingConfig = {}): EmbeddingClient {
    return new EmbeddingClient(config);
}

export class EmbeddingClient {
    provider: string;
    apiKey: string | undefined;
    baseUrl: string | undefined;
    model: string;
    cache = new Map<string, number[]>();
    cacheFile: string | null;
    batchSize: number;
    timeout: number;

    constructor(config: EmbeddingConfig = {}) {
        this.provider = config.provider ?? PROVIDERS.LOCAL_HUB;
        this.apiKey = config.apiKey ?? process.env.EMBEDDING_API_KEY;
        this.baseUrl = config.baseUrl ?? (this.provider === PROVIDERS.LOCAL_HUB ? (process.env.LOCAL_LLM_EMBEDDING_BASE_URL ?? 'http://localhost:11435') : undefined);
        const resolvedModel = config.model ?? DEFAULT_MODELS[this.provider];
        if (!resolvedModel || !String(resolvedModel).trim()) {
            throw new Error(
                `[EmbeddingClient] model is required for provider "${this.provider}" (set config.model or add DEFAULT_MODELS entry)`
            );
        }
        this.model = resolvedModel;
        this.cacheFile = config.cacheFile ?? null;
        this.batchSize = config.batchSize ?? 100;
        this.timeout = config.timeout ?? 60000;
        this._loadCache();
    }

    getDimension(): number {
        const d = DIMENSIONS[this.model];
        if (d === undefined) {
            throw new Error(
                `[EmbeddingClient] Unknown model "${this.model}" — add DIMENSIONS entry or pass a known model`
            );
        }
        return d;
    }

    private _hashText(text: string): string {
        return crypto.createHash('md5').update(text).digest('hex');
    }

    private async _loadCache(): Promise<void> {
        if (!this.cacheFile) return;
        try {
            const content = await fs.readFile(this.cacheFile, 'utf-8');
            const data = JSON.parse(content) as [string, number[]][];
            this.cache = new Map(data);
        } catch (e) {
            const code =
                e && typeof e === 'object' && 'code' in e
                    ? String((e as {code?: unknown}).code)
                    : undefined;
            if (code === 'ENOENT') return;
            throw e instanceof Error ? e : new Error(String(e));
        }
    }

    private async _saveCache(): Promise<void> {
        if (!this.cacheFile) return;
        try {
            const dir = path.dirname(this.cacheFile);
            await fs.mkdir(dir, {recursive: true});
            await fs.writeFile(this.cacheFile, JSON.stringify([...this.cache]));
        } catch (e) {
            throw e instanceof Error ? e : new Error(String(e));
        }
    }

    async embed(text: string): Promise<number[]> {
        if (!text || text.trim().length === 0) return this._zeroVector();
        const cacheKey = this._hashText(text);
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

        let embedding: number[];
        switch (this.provider) {
            case PROVIDERS.LOCAL_HUB:
                embedding = await this._embedLocalHub(text);
                break;
            case PROVIDERS.OPENAI:
                embedding = await this._embedOpenAI(text);
                break;
            case PROVIDERS.COHERE:
                embedding = await this._embedCohere(text);
                break;
            case PROVIDERS.VOYAGE:
                embedding = await this._embedVoyage(text);
                break;
            case PROVIDERS.MOCK:
            default:
                embedding = this._embedDeterministic(text);
        }
        this.cache.set(cacheKey, embedding);
        if (this.cacheFile) this._saveCache();
        return embedding;
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        const results: (number[] | null)[] = [];
        const toEmbed: { text: string; cacheKey: string }[] = [];

        for (const text of texts) {
            if (!text || text.trim().length === 0) {
                results.push(this._zeroVector());
                continue;
            }
            const cacheKey = this._hashText(text);
            if (this.cache.has(cacheKey)) {
                results.push(this.cache.get(cacheKey)!);
            } else {
                results.push(null);
                toEmbed.push({text, cacheKey});
            }
        }

        if (toEmbed.length > 0 && this.provider !== PROVIDERS.MOCK) {
            let embeddings: number[][];
            switch (this.provider) {
                case PROVIDERS.LOCAL_HUB:
                    embeddings = await this._embedBatchLocalHub(toEmbed.map((t) => t.text));
                    break;
                case PROVIDERS.OPENAI:
                    embeddings = await this._embedBatchOpenAI(toEmbed.map((t) => t.text));
                    break;
                case PROVIDERS.COHERE:
                    embeddings = await this._embedBatchCohere(toEmbed.map((t) => t.text));
                    break;
                case PROVIDERS.VOYAGE:
                    embeddings = await this._embedBatchVoyage(toEmbed.map((t) => t.text));
                    break;
                default:
                    embeddings = toEmbed.map((t) => this._embedDeterministic(t.text));
            }
            for (let i = 0; i < toEmbed.length; i++) {
                const {cacheKey} = toEmbed[i];
                const emb = embeddings[i];
                if (emb) {
                    this.cache.set(cacheKey, emb);
                    const idx = results.indexOf(null);
                    if (idx !== -1) results[idx] = emb;
                }
            }
        } else if (toEmbed.length > 0) {
            for (const {text, cacheKey} of toEmbed) {
                const embedding = this._embedDeterministic(text);
                this.cache.set(cacheKey, embedding);
                const idx = results.indexOf(null);
                if (idx !== -1) results[idx] = embedding;
            }
        }
        if (this.cacheFile && toEmbed.length > 0) this._saveCache();
        return results as number[][];
    }

    private getLocalHubEmbedBaseUrl(): string {
        return this.baseUrl ?? process.env.LOCAL_LLM_EMBEDDING_BASE_URL ?? 'http://localhost:11435';
    }

    private async _embedLocalHub(text: string): Promise<number[]> {
        const baseUrl = this.getLocalHubEmbedBaseUrl();
        const response = await fetch(`${baseUrl}/api/embeddings`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({model: this.model, prompt: text}),
            signal: AbortSignal.timeout(this.timeout),
        });
        if (!response.ok) throw new Error(`Local embedding API error: ${response.status} ${await response.text()}`);
        const data = (await response.json()) as { embedding: number[] };
        return data.embedding;
    }

    private async _embedBatchLocalHub(texts: string[]): Promise<number[][]> {
        const baseUrl = this.getLocalHubEmbedBaseUrl();
        const all: number[][] = [];
        for (let i = 0; i < texts.length; i += this.batchSize) {
            const batch = texts.slice(i, i + this.batchSize);
            const batchEmbeddings = await Promise.all(
                batch.map(async (text) => {
                    const response = await fetch(`${baseUrl}/api/embeddings`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({model: this.model, prompt: text}),
                        signal: AbortSignal.timeout(this.timeout),
                    });
                    if (!response.ok) {
                        throw new Error(`Local embedding API error: ${response.status} ${await response.text()}`);
                    }
                    const data = (await response.json()) as { embedding: number[] };
                    return data.embedding;
                })
            );
            all.push(...batchEmbeddings);
        }
        return all;
    }

    private async _embedOpenAI(text: string): Promise<number[]> {
        const baseUrl = this.baseUrl ?? 'https://api.openai.com/v1';
        const apiKey = this.apiKey ?? process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OpenAI API key required');
        const response = await fetch(`${baseUrl}/embeddings`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`},
            body: JSON.stringify({model: this.model, input: text}),
            signal: AbortSignal.timeout(this.timeout),
        });
        if (!response.ok) throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
        const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
        return data.data[0].embedding;
    }

    private async _embedBatchOpenAI(texts: string[]): Promise<number[][]> {
        const baseUrl = this.baseUrl ?? 'https://api.openai.com/v1';
        const apiKey = this.apiKey ?? process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OpenAI API key required');
        const response = await fetch(`${baseUrl}/embeddings`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`},
            body: JSON.stringify({model: this.model, input: texts}),
            signal: AbortSignal.timeout(this.timeout),
        });
        if (!response.ok) throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
        const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
        return data.data.map((d) => d.embedding);
    }

    private async _embedCohere(text: string): Promise<number[]> {
        const apiKey = this.apiKey ?? process.env.COHERE_API_KEY;
        if (!apiKey) throw new Error('Cohere API key required');
        const response = await fetch('https://api.cohere.ai/v1/embed', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`},
            body: JSON.stringify({model: this.model, texts: [text], input_type: 'search_document'}),
            signal: AbortSignal.timeout(this.timeout),
        });
        if (!response.ok) throw new Error(`Cohere API error: ${response.status} ${await response.text()}`);
        const data = (await response.json()) as { embeddings: number[][] };
        return data.embeddings[0];
    }

    private async _embedBatchCohere(texts: string[]): Promise<number[][]> {
        const apiKey = this.apiKey ?? process.env.COHERE_API_KEY;
        if (!apiKey) throw new Error('Cohere API key required');
        const all: number[][] = [];
        for (let i = 0; i < texts.length; i += 96) {
            const batch = texts.slice(i, i + 96);
            const response = await fetch('https://api.cohere.ai/v1/embed', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`},
                body: JSON.stringify({model: this.model, texts: batch, input_type: 'search_document'}),
                signal: AbortSignal.timeout(this.timeout),
            });
            if (!response.ok) throw new Error(`Cohere API error: ${response.status} ${await response.text()}`);
            const data = (await response.json()) as { embeddings: number[][] };
            all.push(...data.embeddings);
        }
        return all;
    }

    private async _embedVoyage(text: string): Promise<number[]> {
        const apiKey = this.apiKey ?? process.env.VOYAGE_API_KEY;
        if (!apiKey) throw new Error('Voyage AI API key required');
        const response = await fetch('https://api.voyageai.com/v1/embeddings', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`},
            body: JSON.stringify({model: this.model, input: text}),
            signal: AbortSignal.timeout(this.timeout),
        });
        if (!response.ok) throw new Error(`Voyage API error: ${response.status} ${await response.text()}`);
        const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
        return data.data[0].embedding;
    }

    private async _embedBatchVoyage(texts: string[]): Promise<number[][]> {
        const apiKey = this.apiKey ?? process.env.VOYAGE_API_KEY;
        if (!apiKey) throw new Error('Voyage AI API key required');
        const all: number[][] = [];
        for (let i = 0; i < texts.length; i += 64) {
            const batch = texts.slice(i, i + 64);
            const response = await fetch('https://api.voyageai.com/v1/embeddings', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`},
                body: JSON.stringify({model: this.model, input: batch}),
                signal: AbortSignal.timeout(this.timeout),
            });
            if (!response.ok) throw new Error(`Voyage API error: ${response.status} ${await response.text()}`);
            const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
            all.push(...data.data.map((d) => d.embedding));
        }
        return all;
    }

    private _embedDeterministic(text: string): number[] {
        const dimension = this.getDimension();
        const hash = crypto.createHash('sha256').update(text).digest();
        const embedding = new Array<number>(dimension);
        for (let i = 0; i < dimension; i++) embedding[i] = (hash[i % hash.length]! - 128) / 128;
        const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
        return embedding.map((v) => v / magnitude);
    }

    private _zeroVector(): number[] {
        return new Array<number>(this.getDimension()).fill(0);
    }

    clearCache(): void {
        this.cache.clear();
    }

    getCacheStats(): CacheStats {
        return {
            size: this.cache.size,
            provider: this.provider,
            model: this.model,
            dimension: this.getDimension(),
            baseUrl: this.baseUrl,
        };
    }

    async isAvailable(): Promise<boolean> {
        try {
            switch (this.provider) {
                case PROVIDERS.LOCAL_HUB: {
                    const url = this.getLocalHubEmbedBaseUrl();
                    const r = await fetch(`${url}/api/tags`, {method: 'GET', signal: AbortSignal.timeout(5000)});
                    return r.ok;
                }
                case PROVIDERS.OPENAI:
                    return !!(this.apiKey ?? process.env.OPENAI_API_KEY);
                case PROVIDERS.COHERE:
                    return !!(this.apiKey ?? process.env.COHERE_API_KEY);
                case PROVIDERS.VOYAGE:
                    return !!(this.apiKey ?? process.env.VOYAGE_API_KEY);
                default:
                    return true;
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error('[EmbeddingClient] isAvailable check failed:', msg);
            return false;
        }
    }

    async listModels(): Promise<string[]> {
        if (this.provider === PROVIDERS.LOCAL_HUB) {
            const url = this.getLocalHubEmbedBaseUrl();
            const response = await fetch(`${url}/api/tags`);
            if (!response.ok) {
                throw new Error(`[EmbeddingClient] listModels failed: ${response.status} ${await response.text()}`);
            }
            const data = (await response.json()) as { models?: Array<{ name: string }> };
            return data.models?.map((m) => m.name) ?? [];
        }
        return [this.model];
    }

    dispose(): void {
        this.clearCache();
    }
}
