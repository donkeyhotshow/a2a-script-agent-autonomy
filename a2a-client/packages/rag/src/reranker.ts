/**
 * Reranker Client - Cross-encoder reranking for search results
 */

export const PROVIDERS = {
  COHERE: 'cohere',
  JINA: 'jina',
  LOCAL: 'local',
} as const;

const DEFAULT_CONFIGS: Record<string, { model: string; maxChunks?: number; returnDocuments?: boolean; topN?: number }> = {
  cohere: { model: 'rerank-multilingual-v3.0', maxChunks: 1000, returnDocuments: true },
  jina: { model: 'jina-reranker-v2-base-multilingual', topN: 10 },
};

export interface RerankerConfig {
  provider?: 'cohere' | 'jina' | 'local';
  apiKey?: string;
  baseUrl?: string;
  modelOptions?: Record<string, unknown>;
}

export interface RerankDocument {
  id?: string;
  content?: string;
  text?: string;
}

export interface RerankResult {
  id: string;
  content: string;
  score: number;
}

export interface RerankOptions {
  topN?: number;
}

export class RerankerClient {
  provider: string;
  apiKey: string | undefined;
  baseUrl: string | undefined;
  modelOptions: Record<string, unknown>;

  constructor(config: RerankerConfig = {}) {
    this.provider = config.provider ?? PROVIDERS.COHERE;
    this.apiKey = config.apiKey ?? process.env.RERANKER_API_KEY;
    this.baseUrl = config.baseUrl;
    this.modelOptions = {
      ...DEFAULT_CONFIGS[this.provider],
      ...config.modelOptions,
    };
  }

  private _getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if ((this.provider === PROVIDERS.COHERE || this.provider === PROVIDERS.JINA) && this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  async rerank(
    query: string,
    documents: (string | RerankDocument)[],
    options: RerankOptions = {}
  ): Promise<RerankResult[]> {
    if (!query || !documents?.length) return [];
    const topN = options.topN ?? (this.modelOptions.topN as number) ?? 10;
    switch (this.provider) {
      case PROVIDERS.COHERE:
        return this._rerankCohere(query, documents, topN);
      case PROVIDERS.JINA:
        return this._rerankJina(query, documents, topN);
      case PROVIDERS.LOCAL:
        return this._rerankLocal(query, documents, topN);
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  private async _rerankCohere(
    query: string,
    documents: (string | RerankDocument)[],
    topN: number
  ): Promise<RerankResult[]> {
    const url = this.baseUrl ?? 'https://api.cohere.com/v1/rerank';
    const docStrings = documents.map((doc) =>
      typeof doc === 'string' ? doc : (doc.content ?? doc.text ?? '')
    );
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
    if (!response.ok) throw new Error(`Cohere rerank error: ${response.status} ${await response.text()}`);
    const data = (await response.json()) as {
      results: Array<{ index: number; relevance_score: number; document?: { text?: string } }>;
    };
    return data.results.map((result) => ({
      id: (documents[result.index] as RerankDocument)?.id ?? String(result.index),
      content: result.document?.text ?? docStrings[result.index] ?? '',
      score: result.relevance_score,
    }));
  }

  private async _rerankJina(
    query: string,
    documents: (string | RerankDocument)[],
    topN: number
  ): Promise<RerankResult[]> {
    const url = this.baseUrl ?? 'https://api.jina.ai/v1/rerank';
    const docObjects = documents.map((doc, idx) => ({
      id: (doc as RerankDocument).id ?? String(idx),
      text: typeof doc === 'string' ? doc : ((doc as RerankDocument).content ?? (doc as RerankDocument).text ?? ''),
    }));
    const response = await fetch(url, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ query, documents: docObjects, model: this.modelOptions.model, top_n: topN }),
    });
    if (!response.ok) throw new Error(`Jina rerank error: ${response.status} ${await response.text()}`);
    const data = (await response.json()) as {
      results: Array<{ index: number; relevance_score: number; document: { text: string } }>;
    };
    return data.results.map((result) => ({
      id: docObjects[result.index].id,
      content: result.document.text,
      score: result.relevance_score,
    }));
  }

  private _rerankLocal(
    query: string,
    documents: (string | RerankDocument)[],
    topN: number
  ): RerankResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const scored = documents.map((doc, idx) => {
      const content = (typeof doc === 'string' ? doc : (doc.content ?? doc.text ?? '')).toLowerCase();
      let score = 0;
      for (const term of queryTerms) {
        if (content.includes(term)) score += 1;
        if (content === term) score += 2;
      }
      return {
        id: (doc as RerankDocument).id ?? String(idx),
        content: typeof doc === 'string' ? doc : ((doc as RerankDocument).content ?? (doc as RerankDocument).text ?? ''),
        score,
      };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN);
  }

  async isAvailable(): Promise<boolean> {
    if (this.provider === PROVIDERS.LOCAL) return true;
    try {
      const url =
        this.baseUrl ??
        (this.provider === PROVIDERS.COHERE ? 'https://api.cohere.com/v1/models' : 'https://api.jina.ai/v1/models');
      const response = await fetch(url, { method: 'GET', headers: this._getHeaders() });
      return response.ok;
    } catch {
      return false;
    }
  }

  getInfo(): { provider: string; model: string; available: boolean } {
    return { provider: this.provider, model: String(this.modelOptions.model), available: true };
  }
}

export function createReranker(config?: RerankerConfig): RerankerClient {
  return new RerankerClient(config);
}

export { DEFAULT_CONFIGS };
