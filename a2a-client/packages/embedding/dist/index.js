"use strict";
/**
 * @a2a/embedding - Embedding client for semantic search.
 * Supports Ollama, OpenAI, Cohere, Voyage AI, mock.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingClient = exports.DEFAULT_MODELS = exports.DIMENSIONS = exports.PROVIDERS = void 0;
exports.createEmbeddingClient = createEmbeddingClient;
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
exports.PROVIDERS = {
    OLLAMA: 'ollama',
    OPENAI: 'openai',
    COHERE: 'cohere',
    VOYAGE: 'voyage',
    MOCK: 'mock',
};
exports.DIMENSIONS = {
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
exports.DEFAULT_MODELS = {
    ollama: 'nomic-embed-text',
    openai: 'text-embedding-3-small',
    cohere: 'embed-multilingual-v3.0',
    voyage: 'voyage-code-2',
    mock: 'nomic-embed-text',
};
function createEmbeddingClient(config = {}) {
    return new EmbeddingClient(config);
}
class EmbeddingClient {
    constructor(config = {}) {
        this.cache = new Map();
        this.provider = config.provider ?? exports.PROVIDERS.OLLAMA;
        this.apiKey = config.apiKey ?? process.env.EMBEDDING_API_KEY;
        this.baseUrl = config.baseUrl ?? (this.provider === exports.PROVIDERS.OLLAMA ? (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11435') : undefined);
        const resolvedModel = config.model ?? exports.DEFAULT_MODELS[this.provider];
        if (!resolvedModel || !String(resolvedModel).trim()) {
            throw new Error(`[EmbeddingClient] model is required for provider "${this.provider}" (set config.model or add DEFAULT_MODELS entry)`);
        }
        this.model = resolvedModel;
        this.cacheFile = config.cacheFile ?? null;
        this.batchSize = config.batchSize ?? 100;
        this.timeout = config.timeout ?? 60000;
        this._loadCache();
    }
    getDimension() {
        const d = exports.DIMENSIONS[this.model];
        if (d === undefined) {
            throw new Error(`[EmbeddingClient] Unknown model "${this.model}" — add DIMENSIONS entry or pass a known model`);
        }
        return d;
    }
    _hashText(text) {
        return crypto_1.default.createHash('md5').update(text).digest('hex');
    }
    async _loadCache() {
        if (!this.cacheFile)
            return;
        try {
            const content = await promises_1.default.readFile(this.cacheFile, 'utf-8');
            const data = JSON.parse(content);
            this.cache = new Map(data);
        }
        catch (e) {
            const code = e && typeof e === 'object' && 'code' in e
                ? String(e.code)
                : undefined;
            if (code === 'ENOENT')
                return;
            throw e instanceof Error ? e : new Error(String(e));
        }
    }
    async _saveCache() {
        if (!this.cacheFile)
            return;
        try {
            const dir = path_1.default.dirname(this.cacheFile);
            await promises_1.default.mkdir(dir, { recursive: true });
            await promises_1.default.writeFile(this.cacheFile, JSON.stringify([...this.cache]));
        }
        catch (e) {
            throw e instanceof Error ? e : new Error(String(e));
        }
    }
    async embed(text) {
        if (!text || text.trim().length === 0)
            return this._zeroVector();
        const cacheKey = this._hashText(text);
        if (this.cache.has(cacheKey))
            return this.cache.get(cacheKey);
        let embedding;
        switch (this.provider) {
            case exports.PROVIDERS.OLLAMA:
                embedding = await this._embedOllama(text);
                break;
            case exports.PROVIDERS.OPENAI:
                embedding = await this._embedOpenAI(text);
                break;
            case exports.PROVIDERS.COHERE:
                embedding = await this._embedCohere(text);
                break;
            case exports.PROVIDERS.VOYAGE:
                embedding = await this._embedVoyage(text);
                break;
            case exports.PROVIDERS.MOCK:
            default:
                embedding = this._embedDeterministic(text);
        }
        this.cache.set(cacheKey, embedding);
        if (this.cacheFile)
            this._saveCache();
        return embedding;
    }
    async embedBatch(texts) {
        const results = [];
        const toEmbed = [];
        for (const text of texts) {
            if (!text || text.trim().length === 0) {
                results.push(this._zeroVector());
                continue;
            }
            const cacheKey = this._hashText(text);
            if (this.cache.has(cacheKey)) {
                results.push(this.cache.get(cacheKey));
            }
            else {
                results.push(null);
                toEmbed.push({ text, cacheKey });
            }
        }
        if (toEmbed.length > 0 && this.provider !== exports.PROVIDERS.MOCK) {
            let embeddings;
            switch (this.provider) {
                case exports.PROVIDERS.OLLAMA:
                    embeddings = await this._embedBatchOllama(toEmbed.map((t) => t.text));
                    break;
                case exports.PROVIDERS.OPENAI:
                    embeddings = await this._embedBatchOpenAI(toEmbed.map((t) => t.text));
                    break;
                case exports.PROVIDERS.COHERE:
                    embeddings = await this._embedBatchCohere(toEmbed.map((t) => t.text));
                    break;
                case exports.PROVIDERS.VOYAGE:
                    embeddings = await this._embedBatchVoyage(toEmbed.map((t) => t.text));
                    break;
                default:
                    embeddings = toEmbed.map((t) => this._embedDeterministic(t.text));
            }
            for (let i = 0; i < toEmbed.length; i++) {
                const { cacheKey } = toEmbed[i];
                const emb = embeddings[i];
                if (emb) {
                    this.cache.set(cacheKey, emb);
                    const idx = results.indexOf(null);
                    if (idx !== -1)
                        results[idx] = emb;
                }
            }
        }
        else if (toEmbed.length > 0) {
            for (const { text, cacheKey } of toEmbed) {
                const embedding = this._embedDeterministic(text);
                this.cache.set(cacheKey, embedding);
                const idx = results.indexOf(null);
                if (idx !== -1)
                    results[idx] = embedding;
            }
        }
        if (this.cacheFile && toEmbed.length > 0)
            this._saveCache();
        return results;
    }
    getOllamaBaseUrl() {
        return this.baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11435';
    }
    async _embedOllama(text) {
        const baseUrl = this.getOllamaBaseUrl();
        const response = await fetch(`${baseUrl}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: this.model, prompt: text }),
            signal: AbortSignal.timeout(this.timeout),
        });
        if (!response.ok)
            throw new Error(`Ollama API error: ${response.status} ${await response.text()}`);
        const data = (await response.json());
        return data.embedding;
    }
    async _embedBatchOllama(texts) {
        const baseUrl = this.getOllamaBaseUrl();
        const all = [];
        for (let i = 0; i < texts.length; i += this.batchSize) {
            const batch = texts.slice(i, i + this.batchSize);
            const batchEmbeddings = await Promise.all(batch.map(async (text) => {
                const response = await fetch(`${baseUrl}/api/embeddings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: this.model, prompt: text }),
                    signal: AbortSignal.timeout(this.timeout),
                });
                if (!response.ok) {
                    throw new Error(`Ollama API error: ${response.status} ${await response.text()}`);
                }
                const data = (await response.json());
                return data.embedding;
            }));
            all.push(...batchEmbeddings);
        }
        return all;
    }
    async _embedOpenAI(text) {
        const baseUrl = this.baseUrl ?? 'https://api.openai.com/v1';
        const apiKey = this.apiKey ?? process.env.OPENAI_API_KEY;
        if (!apiKey)
            throw new Error('OpenAI API key required');
        const response = await fetch(`${baseUrl}/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model: this.model, input: text }),
            signal: AbortSignal.timeout(this.timeout),
        });
        if (!response.ok)
            throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
        const data = (await response.json());
        return data.data[0].embedding;
    }
    async _embedBatchOpenAI(texts) {
        const baseUrl = this.baseUrl ?? 'https://api.openai.com/v1';
        const apiKey = this.apiKey ?? process.env.OPENAI_API_KEY;
        if (!apiKey)
            throw new Error('OpenAI API key required');
        const response = await fetch(`${baseUrl}/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model: this.model, input: texts }),
            signal: AbortSignal.timeout(this.timeout),
        });
        if (!response.ok)
            throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
        const data = (await response.json());
        return data.data.map((d) => d.embedding);
    }
    async _embedCohere(text) {
        const apiKey = this.apiKey ?? process.env.COHERE_API_KEY;
        if (!apiKey)
            throw new Error('Cohere API key required');
        const response = await fetch('https://api.cohere.ai/v1/embed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model: this.model, texts: [text], input_type: 'search_document' }),
            signal: AbortSignal.timeout(this.timeout),
        });
        if (!response.ok)
            throw new Error(`Cohere API error: ${response.status} ${await response.text()}`);
        const data = (await response.json());
        return data.embeddings[0];
    }
    async _embedBatchCohere(texts) {
        const apiKey = this.apiKey ?? process.env.COHERE_API_KEY;
        if (!apiKey)
            throw new Error('Cohere API key required');
        const all = [];
        for (let i = 0; i < texts.length; i += 96) {
            const batch = texts.slice(i, i + 96);
            const response = await fetch('https://api.cohere.ai/v1/embed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({ model: this.model, texts: batch, input_type: 'search_document' }),
                signal: AbortSignal.timeout(this.timeout),
            });
            if (!response.ok)
                throw new Error(`Cohere API error: ${response.status} ${await response.text()}`);
            const data = (await response.json());
            all.push(...data.embeddings);
        }
        return all;
    }
    async _embedVoyage(text) {
        const apiKey = this.apiKey ?? process.env.VOYAGE_API_KEY;
        if (!apiKey)
            throw new Error('Voyage AI API key required');
        const response = await fetch('https://api.voyageai.com/v1/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model: this.model, input: text }),
            signal: AbortSignal.timeout(this.timeout),
        });
        if (!response.ok)
            throw new Error(`Voyage API error: ${response.status} ${await response.text()}`);
        const data = (await response.json());
        return data.data[0].embedding;
    }
    async _embedBatchVoyage(texts) {
        const apiKey = this.apiKey ?? process.env.VOYAGE_API_KEY;
        if (!apiKey)
            throw new Error('Voyage AI API key required');
        const all = [];
        for (let i = 0; i < texts.length; i += 64) {
            const batch = texts.slice(i, i + 64);
            const response = await fetch('https://api.voyageai.com/v1/embeddings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({ model: this.model, input: batch }),
                signal: AbortSignal.timeout(this.timeout),
            });
            if (!response.ok)
                throw new Error(`Voyage API error: ${response.status} ${await response.text()}`);
            const data = (await response.json());
            all.push(...data.data.map((d) => d.embedding));
        }
        return all;
    }
    _embedDeterministic(text) {
        const dimension = this.getDimension();
        const hash = crypto_1.default.createHash('sha256').update(text).digest();
        const embedding = new Array(dimension);
        for (let i = 0; i < dimension; i++)
            embedding[i] = (hash[i % hash.length] - 128) / 128;
        const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
        return embedding.map((v) => v / magnitude);
    }
    _zeroVector() {
        return new Array(this.getDimension()).fill(0);
    }
    clearCache() {
        this.cache.clear();
    }
    getCacheStats() {
        return {
            size: this.cache.size,
            provider: this.provider,
            model: this.model,
            dimension: this.getDimension(),
            baseUrl: this.baseUrl,
        };
    }
    async isAvailable() {
        try {
            switch (this.provider) {
                case exports.PROVIDERS.OLLAMA: {
                    const url = this.getOllamaBaseUrl();
                    const r = await fetch(`${url}/api/tags`, { method: 'GET', signal: AbortSignal.timeout(5000) });
                    return r.ok;
                }
                case exports.PROVIDERS.OPENAI:
                    return !!(this.apiKey ?? process.env.OPENAI_API_KEY);
                case exports.PROVIDERS.COHERE:
                    return !!(this.apiKey ?? process.env.COHERE_API_KEY);
                case exports.PROVIDERS.VOYAGE:
                    return !!(this.apiKey ?? process.env.VOYAGE_API_KEY);
                default:
                    return true;
            }
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error('[EmbeddingClient] isAvailable check failed:', msg);
            return false;
        }
    }
    async listModels() {
        if (this.provider === exports.PROVIDERS.OLLAMA) {
            const url = this.getOllamaBaseUrl();
            const response = await fetch(`${url}/api/tags`);
            if (!response.ok) {
                throw new Error(`[EmbeddingClient] listModels failed: ${response.status} ${await response.text()}`);
            }
            const data = (await response.json());
            return data.models?.map((m) => m.name) ?? [];
        }
        return [this.model];
    }
    dispose() {
        this.clearCache();
    }
}
exports.EmbeddingClient = EmbeddingClient;
