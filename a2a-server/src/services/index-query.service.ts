/**
 * Index Query Service
 * Orchestrates knowledge (questions) + search.
 * TODO: Re-implement when vector search is needed
 */

import type {BuiltQuestion} from '../types/knowledge.types.js';

export interface IndexAnswer {
    question: string;
    filePath?: string;
    content?: string;
    score?: number;
}

/**
 * Query index for questions
 * TODO: Implement with actual search when vector DB is ready
 */
export async function queryIndex(
    _projectId: string,
    questions: BuiltQuestion[]
): Promise<IndexAnswer[]> {
    // TODO: Implement index query when search infrastructure is ready
    // Return empty results for now - the stub ML services were never functional
    return questions.map((q) => ({question: q.question}));
}
