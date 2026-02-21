/**
 * Question Builder — semantics → many questions.
 * Questions go to codebase index for answers (neurons-and-paths-law).
 */

import type { SemanticChunk } from './semantic-extractor.js';

export interface BuiltQuestion {
  question: string;
  source?: string;
  type: string;
}

/**
 * Build many questions from semantic chunks and task text.
 */
export function buildQuestions(
  chunks: SemanticChunk[],
  taskTexts: string[] = []
): BuiltQuestion[] {
  const questions: BuiltQuestion[] = [];

  for (const t of taskTexts) {
    if (t && t.trim().length > 2) {
      questions.push({
        question: t.trim(),
        type: 'task',
      });
    }
  }

  for (const c of chunks) {
    if (c.type === 'comment' || c.type === 'docblock') {
      const q = `Where is: ${c.text.slice(0, 80)}${c.text.length > 80 ? '...' : ''}`;
      questions.push({ question: q, source: c.source, type: 'comment' });
    }
    if (c.type === 'identifier') {
      const [kind, name] = c.text.split(' ');
      questions.push({
        question: `Where is ${kind} ${name} used?`,
        source: c.source,
        type: 'identifier',
      });
    }
  }

  return dedupeQuestions(questions);
}

function dedupeQuestions(qs: BuiltQuestion[]): BuiltQuestion[] {
  const seen = new Set<string>();
  return qs.filter((q) => {
    const key = q.question.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
