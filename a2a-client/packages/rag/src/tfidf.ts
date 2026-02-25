/**
 * TF-IDF/BM25 Service for sparse retrieval
 */

export class TFIDFService {
  private documents = new Map<string, string[]>();
  private idf = new Map<string, number>();
  private documentCount = 0;

  tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  addDocument(id: string, text: string): void {
    const tokens = this.tokenize(text);
    this.documents.set(id, tokens);
    this.documentCount++;
    this.recalculateIDF();
  }

  addDocuments(docs: Array<{ id: string; text: string }>): void {
    for (const { id, text } of docs) {
      const tokens = this.tokenize(text);
      this.documents.set(id, tokens);
      this.documentCount++;
    }
    this.recalculateIDF();
  }

  removeDocument(id: string): void {
    if (this.documents.has(id)) {
      this.documents.delete(id);
      this.documentCount--;
      this.recalculateIDF();
    }
  }

  clear(): void {
    this.documents.clear();
    this.idf.clear();
    this.documentCount = 0;
  }

  private recalculateIDF(): void {
    const df = new Map<string, number>();
    for (const tokens of this.documents.values()) {
      const unique = new Set(tokens);
      for (const term of unique) {
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }
    for (const [term, freq] of df) {
      this.idf.set(term, Math.log(this.documentCount / freq));
    }
  }

  bm25Score(queryTokens: string[], docTokens: string[], k1 = 1.5, b = 0.75): number {
    const avgDocLen = this.getAverageDocLength();
    const docLen = docTokens.length;
    const tf = new Map<string, number>();
    for (const token of docTokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }
    let score = 0;
    for (const term of queryTokens) {
      const termFreq = tf.get(term) ?? 0;
      const idf = this.idf.get(term) ?? 0;
      const numerator = termFreq * (k1 + 1);
      const denominator = termFreq + k1 * (1 - b + b * (docLen / avgDocLen));
      score += idf * (numerator / denominator);
    }
    return score;
  }

  search(query: string, topK = 10): Array<{ id: string; score: number }> {
    const queryTokens = this.tokenize(query);
    const scores: Array<{ id: string; score: number }> = [];
    for (const [id, docTokens] of this.documents) {
      const score = this.bm25Score(queryTokens, docTokens);
      if (score > 0) scores.push({ id, score });
    }
    return scores.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  getAverageDocLength(): number {
    if (this.documents.size === 0) return 0;
    let total = 0;
    for (const tokens of this.documents.values()) total += tokens.length;
    return total / this.documents.size;
  }

  getStats(): { documentCount: number; vocabularySize: number; avgDocLength: number } {
    return {
      documentCount: this.documentCount,
      vocabularySize: this.idf.size,
      avgDocLength: this.getAverageDocLength(),
    };
  }

  hasDocument(id: string): boolean {
    return this.documents.has(id);
  }

  size(): number {
    return this.documents.size;
  }
}
