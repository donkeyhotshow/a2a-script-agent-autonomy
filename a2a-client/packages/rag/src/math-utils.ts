/**
 * Mathematical utilities for vector operations
 */

export class MathUtils {
  /**
   * Calculate cosine similarity between two numerical vectors
   * @param vecA First vector
   * @param vecB Second vector
   * @returns Cosine similarity score between -1 and 1
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Calculate cosine similarity between two token sets (Jaccard-like cosine)
   * @param a First token set
   * @param b Second token set
   * @returns Cosine similarity score between 0 and 1
   */
  static setCosineSimilarity(a: Set<string>, b: Set<string>): number {
    const intersection = new Set([...a].filter((x) => b.has(x)));
    const magA = Math.sqrt(a.size);
    const magB = Math.sqrt(b.size);
    
    if (magA === 0 || magB === 0) {
      return 0;
    }
    
    return intersection.size / (magA * magB);
  }
}