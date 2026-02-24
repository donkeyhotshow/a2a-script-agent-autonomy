import { logger } from '../utils/logger.js';

/**
 * TF-IDF Service
 * Local implementation of TF-IDF/BM25 for sparse retrieval
 * No GPU/API required - classic information retrieval algorithm
 */
export class TFIDFService {
  private documents: Map<string, string[]> = new Map(); // id -> tokens
  private idf: Map<string, number> = new Map(); // term -> idf score
  private documentCount: number = 0;

  /**
   * Tokenize text into terms
   */
  tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  /**
   * Add document to the index
   */
  addDocument(id: string, text: string): void {
    const tokens = this.tokenize(text);
    this.documents.set(id, tokens);
    this.documentCount++;
    this.recalculateIDF();
    logger.debug(`Added document ${id} with ${tokens.length} tokens`);
  }

  /**
   * Remove document from the index
   */
  removeDocument(id: string): boolean {
    if (this.documents.has(id)) {
      this.documents.delete(id);
      this.documentCount--;
      this.recalculateIDF();
      logger.debug(`Removed document ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.documents.clear();
    this.idf.clear();
    this.documentCount = 0;
    logger.debug('Cleared all documents');
  }

  /**
   * Get document count
   */
  getDocumentCount(): number {
    return this.documentCount;
  }

  /**
   * Check if document exists
   */
  hasDocument(id: string): boolean {
    return this.documents.has(id);
  }

  /**
   * Recalculate IDF scores
   */
  private recalculateIDF(): void {
    const df = new Map<string, number>(); // document frequency

    for (const tokens of this.documents.values()) {
      const unique = new Set(tokens);
      for (const term of unique) {
        df.set(term, (df.get(term) || 0) + 1);
      }
    }

    this.idf.clear();
    for (const [term, freq] of df) {
      // Standard IDF formula: log(N / df)
      this.idf.set(term, Math.log(this.documentCount / freq));
    }
  }

  /**
   * Calculate TF-IDF vector for a document
   */
  getTFIDF(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();

    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    const tfidf = new Map<string, number>();
    for (const [term, freq] of tf) {
      const idf = this.idf.get(term) || 0;
      tfidf.set(term, freq * idf);
    }

    return tfidf;
  }

  /**
   * Get TF-IDF as array (for compatibility with embedding interface)
   */
  getTFIDFArray(tokens: string[]): number[] {
    const tfidf = this.getTFIDF(tokens);
    return Array.from(tfidf.values());
  }

  /**
   * Calculate BM25 score for a query-document pair
   */
  bm25Score(
    queryTokens: string[],
    docTokens: string[],
    k1: number = 1.5,
    b: number = 0.75
  ): number {
    const avgDocLen = this.getAverageDocLength();
    const docLen = docTokens.length;
    const tf = new Map<string, number>();

    for (const token of docTokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    let score = 0;
    for (const term of queryTokens) {
      const termFreq = tf.get(term) || 0;
      const idf = this.idf.get(term) || 0;

      // BM25 formula
      const numerator = termFreq * (k1 + 1);
      const denominator = termFreq + k1 * (1 - b + b * (docLen / avgDocLen));

      score += idf * (numerator / denominator);
    }

    return score;
  }

  /**
   * Search for top-k documents matching query
   */
  search(query: string, topK: number = 10): Array<{ id: string; score: number }> {
    const queryTokens = this.tokenize(query);
    const scores: Array<{ id: string; score: number }> = [];

    for (const [id, docTokens] of this.documents) {
      const score = this.bm25Score(queryTokens, docTokens);
      if (score > 0) {
        scores.push({ id, score });
      }
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Get average document length
   */
  private getAverageDocLength(): number {
    if (this.documents.size === 0) return 0;
    let total = 0;
    for (const tokens of this.documents.values()) {
      total += tokens.length;
    }
    return total / this.documents.size;
  }

  /**
   * Get vocabulary size
   */
  getVocabularySize(): number {
    return this.idf.size;
  }

  /**
   * Export index for persistence
   */
  exportIndex(): {
    documents: Array<[string, string[]]>;
    documentCount: number;
  } {
    return {
      documents: Array.from(this.documents.entries()),
      documentCount: this.documentCount,
    };
  }

  /**
   * Import index from exported data
   */
  importIndex(data: { documents: Array<[string, string[]]>; documentCount: number }): void {
    this.documents = new Map(data.documents);
    this.documentCount = data.documentCount;
    this.recalculateIDF();
    logger.debug(`Imported ${this.documentCount} documents`);
  }
}

// Singleton instance for global use
let tfidfInstance: TFIDFService | null = null;

/**
 * Get or create TF-IDF service instance
 */
export function getTFIDFService(): TFIDFService {
  if (!tfidfInstance) {
    tfidfInstance = new TFIDFService();
  }
  return tfidfInstance;
}
