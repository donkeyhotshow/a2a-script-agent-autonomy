export interface MeilisearchConfig {
  host: string;
  apiKey?: string;
  index: string;
}

export interface MeilisearchDocument extends Record<string, unknown> {
  id: string;
}

export interface MeilisearchSearchOptions {
  limit?: number;
  offset?: number;
}

export interface MeilisearchSearchResult<TDoc extends MeilisearchDocument = MeilisearchDocument> {
  hits: TDoc[];
  estimatedTotalHits?: number;
}

export class MeilisearchClient {
  private readonly config: MeilisearchConfig;

  constructor(config: MeilisearchConfig) {
    this.config = config;
  }

  async search<TDoc extends MeilisearchDocument = MeilisearchDocument>(
    _query: string,
    _options: MeilisearchSearchOptions = {}
  ): Promise<MeilisearchSearchResult<TDoc>> {
    // Minimal stub to keep client-api/web-ui boot deterministic even when Meilisearch isn't configured.
    return { hits: [] };
  }
}

export function createMeilisearchClient(config: MeilisearchConfig): MeilisearchClient {
  return new MeilisearchClient(config);
}
