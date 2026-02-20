/**
 * Index Query — questions → codebase index → answers.
 * Placeholder: index not implemented. When search.service is ready, plug in.
 */

import type { BuiltQuestion } from './question-builder.js';

export interface IndexAnswer {
  question: string;
  filePath?: string;
  content?: string;
  score?: number;
}

/**
 * Query codebase index with questions.
 * Returns answers (file paths, snippets). Placeholder until index implemented.
 */
export async function queryIndex(
  _projectId: string,
  questions: BuiltQuestion[]
): Promise<IndexAnswer[]> {
  // TODO: integrate with search.service.semanticSearch / hybridSearch
  // For now: return empty. Questions are built, ready for index.
  return questions.map((q) => ({
    question: q.question,
  }));
}
