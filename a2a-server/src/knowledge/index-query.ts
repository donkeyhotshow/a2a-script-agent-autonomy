/**
 * Index Query — questions → codebase index → answers.
 * Integrates with search.service.hybridSearch when implemented.
 */

import type { BuiltQuestion } from './question-builder.js';
import { hybridSearch } from '../ml/search.service.js';

export interface IndexAnswer {
  question: string;
  filePath?: string;
  content?: string;
  score?: number;
}

/**
 * Query codebase index with questions.
 * Uses hybridSearch when available; falls back to placeholder on error.
 */
export async function queryIndex(
  projectId: string,
  questions: BuiltQuestion[]
): Promise<IndexAnswer[]> {
  const results: IndexAnswer[] = [];
  for (const q of questions) {
    try {
      const matches = await hybridSearch(projectId, q.question, { topK: 5 });
      const best = matches[0];
      results.push({
        question: q.question,
        filePath: best?.file,
        content: best?.matches?.[0]?.content,
        score: best?.score,
      });
    } catch {
      results.push({ question: q.question });
    }
  }
  return results;
}
