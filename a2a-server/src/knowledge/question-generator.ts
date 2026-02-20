/**
 * Question Generator — generates questions from knowledge graph gaps
 * 8 types: concept_identity, missing_connection, missing_entity, etc.
 */

import type { StoredGraph } from './graph-store.js';

export type QuestionType =
  | 'graph_empty'
  | 'missing_entity_type'
  | 'missing_relation'
  | 'orphan_entity'
  | 'concept_identity'
  | 'missing_connection'
  | 'path_unknown'
  | 'namespace_mismatch';

export interface GeneratedQuestion {
  type: QuestionType;
  text: string;
  hint?: string;
}

const KEY_ENTITY_TYPES = ['controller', 'model', 'request', 'service', 'vue-component', 'vue-page'];

/**
 * Generate questions from graph state.
 * Empty graph → generic; has entities → specific gaps.
 */
export function generateQuestionsFromGraph(
  graph: StoredGraph | undefined,
  projectPath?: string
): GeneratedQuestion[] {
  if (!graph || !graph.entities?.length) {
    return [
      {
        type: 'graph_empty',
        text: 'Knowledge graph incomplete. Provide codeBlocks (controller, request, service, model, vue) with file paths and content.',
        hint: 'Send 1–5 key files: controller, request, model, service, vue page.',
      },
    ];
  }

  const questions: GeneratedQuestion[] = [];
  const entityTypes = new Set(graph.entities.map((e) => e.type));
  const relationCount = graph.relations?.length ?? 0;

  // Missing key entity types
  const missing = KEY_ENTITY_TYPES.filter((t) => !entityTypes.has(t));
  if (missing.length > 0) {
    questions.push({
      type: 'missing_entity_type',
      text: `Provide codeBlocks for: ${missing.join(', ')}.`,
      hint: `Missing: ${missing.join(', ')}`,
    });
  }

  // Entities but no relations
  if (entityTypes.size > 1 && relationCount === 0) {
    questions.push({
      type: 'missing_relation',
      text: 'Graph has entities but no relations. Provide files that define imports, extends, belongsTo, hasMany, or Inertia pages.',
      hint: 'Add files with use/import, extends, relationships.',
    });
  }

  // Orphan entities (no incoming or outgoing relations)
  const connectedIds = new Set<string>();
  for (const r of graph.relations ?? []) {
    connectedIds.add(r.sourceId);
    connectedIds.add(r.targetId);
  }
  const orphans = graph.entities.filter((e) => !connectedIds.has(e.id));
  if (orphans.length > 0 && orphans.length <= 3) {
    const names = orphans.map((e) => `${e.name} (${e.type})`).join(', ');
    questions.push({
      type: 'orphan_entity',
      text: `Entities without relations: ${names}. Which files connect them?`,
      hint: names,
    });
  }

  if (questions.length === 0) {
    return [
      {
        type: 'concept_identity',
        text: 'Graph looks complete. Add more codeBlocks to refine or specify a task.',
      },
    ];
  }

  return questions;
}

/**
 * Single question string for backward compatibility (result.question).
 */
export function generateQuestionFromGraph(
  graph: StoredGraph | undefined,
  projectPath?: string
): string {
  const qs = generateQuestionsFromGraph(graph, projectPath);
  return qs.map((q) => q.text).join(' ');
}
