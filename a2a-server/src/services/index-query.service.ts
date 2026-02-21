/**
 * Index Query Service
 * Orchestrates knowledge (questions) + ml (search).
 * Services may depend on both.
 */

import type { BuiltQuestion } from '../knowledge/question-builder.js';
import { hybridSearch } from '../ml/search.service.js';

export interface IndexAnswer {
  question: string;
  filePath?: string;
  content?: string;
  score?: number;
}

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
