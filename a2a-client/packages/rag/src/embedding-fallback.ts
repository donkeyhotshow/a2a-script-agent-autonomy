export interface EmbeddingClient {
  embed(text: string): Promise<number[]>;
  dispose(): void;
}

export function createEmbeddingClient(_config: Record<string, unknown> = {}): EmbeddingClient {
  return {
    async embed(text: string): Promise<number[]> {
      const dims = 128;
      const v = new Array<number>(dims).fill(0);
      let h = 2166136261;
      for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
        v[(h >>> 0) % dims] += 1;
      }
      const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
      return v.map((x) => x / norm);
    },
    dispose(): void {},
  };
}

