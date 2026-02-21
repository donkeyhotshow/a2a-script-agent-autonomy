/**
 * Request Processor Service
 * Timer-based loop: picks first pending request, attempts to resolve.
 * Entity recognition + graph store. Neurons process context. Placeholder for ChatGPT.
 */

import { requestService } from './request.service.js';
import { processNewTaskToContext } from '../knowledge/context-handler.js';
import { resolveInjections, mergeInjectedContext } from '../knowledge/context-injector.js';
import { extractSemantics } from '../knowledge/semantic-extractor.js';
import { buildQuestions } from '../knowledge/question-builder.js';
import { queryIndex } from './index-query.service.js';
import { recognizeEntitiesBatch } from '../knowledge/entity-recognizer.js';
import { getGraph, buildAndStoreGraph, mergeEntitiesById } from '../knowledge/graph-store.js';
import { generateQuestionsFromGraph } from '../knowledge/question-generator.js';
import { logger } from '../utils/logger.js';
const DEFAULT_INTERVAL_MS = 5000;

let timerId: ReturnType<typeof setInterval> | null = null;

export type ProcessOutcome = 'completed' | 'failed';

/**
 * Process one request. Neurons: new_task → tasks. No graph.
 */
export async function processOneRequest(): Promise<ProcessOutcome | null> {
  const request = await requestService.getNextPending();
  if (!request) return null;

  const { promiseId, context, codeBlocks } = request;
  const ctx = context as Record<string, unknown> | null;
  let workingContext = ctx ?? {};
  const codeBlocksArr = codeBlocks ?? [];

  // Neurons: move new_task → tasks
  let activatedNeurons: Array<{ neuron: { id: string; name: string }; matchedTriggers: string[] }> = [];
  if (workingContext['new_task']) {
    const { context, activatedNeurons: an } = processNewTaskToContext(workingContext, codeBlocksArr);
    workingContext = context;
    activatedNeurons = an;
    logger.info('[RequestProcessor] new_task moved to tasks', {
      promiseId,
      tasksCount: (workingContext['tasks'] as unknown[])?.length ?? 0,
    });
  }

  const injectedContent = mergeInjectedContext(resolveInjections(activatedNeurons));
  const activatedNeuronIds = activatedNeurons.map((a) => a.neuron.id);

  // Build context block for client (tasks, request_files, architectural_features, activated_neurons)
  const contextBlock: Record<string, unknown> = {
    ...workingContext,
    tasks: workingContext['tasks'],
    request_files: workingContext['request_files'],
    architectural_features: workingContext['architectural_features'],
    ...(activatedNeurons.length > 0 && {
      activated_neurons: activatedNeurons.map((a) => ({ id: a.neuron.id, name: a.neuron.name })),
    }),
  };

  // Graph: recognize entities → merge → store (when codeBlocks present)
  const projectPath = (workingContext['project_path'] as string) ?? 'default';
  if (codeBlocksArr.length > 0 && projectPath) {
    const newEntities = recognizeEntitiesBatch(
      codeBlocksArr.map((c) => ({ path: c.path, content: c.content ?? '' }))
    );
    const existing = getGraph(projectPath);
    const merged = mergeEntitiesById(existing?.entities ?? [], newEntities);
    buildAndStoreGraph(projectPath, merged);
    logger.info('[RequestProcessor] graph updated', {
      promiseId,
      entitiesCount: merged.length,
    });
  }

  // Graph incomplete check
  const graph = getGraph(projectPath);
  const graphQuestions = generateQuestionsFromGraph(graph, projectPath);
  const isIncomplete =
    !projectPath ||
    !graph ||
    (!graph.entities?.length && !graph.relations?.length) ||
    (graphQuestions[0]?.type !== 'concept_identity' && graphQuestions[0]?.type !== undefined);

  if (isIncomplete && graphQuestions[0]) {
    try {
      await requestService.updateStatus(promiseId, 'completed', {
        outcome: 'graph_incomplete',
        question: graphQuestions[0].text,
        context: contextBlock,
        injected_content: injectedContent,
        activated_neuron_ids: activatedNeuronIds,
      });
      return 'completed';
    } catch (err) {
      logger.error('[RequestProcessor] Error updating graph_incomplete', {
        promiseId,
        error: String(err),
      });
      await requestService.updateStatus(promiseId, 'failed', undefined, {
        code: 'PROCESS_ERROR',
        message: String(err),
      });
      return 'failed';
    }
  }

  // Semantic layer: extract → questions → index
  const projectId = (workingContext['project_path'] as string) ?? 'default';
  const tasks = (workingContext['tasks'] as Array<{ target?: string }>) ?? [];
  const taskTexts = tasks.map((t) => t.target).filter(Boolean) as string[];
  const chunks = extractSemantics(codeBlocksArr);
  const questions = buildQuestions(chunks, taskTexts);
  const indexAnswers = await queryIndex(projectId, questions);

  // External AI: placeholder — too early to integrate
  const message = 'Request processed (placeholder for external AI)';

  try {
    await requestService.updateStatus(promiseId, 'completed', {
      outcome: 'completed',
      message,
      context: contextBlock,
      injected_content: injectedContent,
      activated_neuron_ids: activatedNeuronIds,
      questions: questions.map((q) => q.question),
      index_answers: indexAnswers,
    });
    return 'completed';
  } catch (err) {
    logger.error('[RequestProcessor] Error processing request', {
      promiseId,
      error: String(err),
      stack: (err as Error)?.stack,
    });
    await requestService.updateStatus(promiseId, 'failed', undefined, {
      code: 'PROCESS_ERROR',
      message: String(err),
    });
    return 'failed';
  }
}

/**
 * Run one iteration. Stops loop on error.
 */
async function tick(): Promise<void> {
  const outcome = await processOneRequest();
  if (outcome === 'failed') {
    stopRequestProcessor();
  }
}

/**
 * Start the request processor timer loop.
 */
export function startRequestProcessor(intervalMs: number = DEFAULT_INTERVAL_MS): void {
  if (timerId) return;
  logger.info('[RequestProcessor] Started', { intervalMs });
  timerId = setInterval(() => {
    tick().catch((err) => {
      logger.error('[RequestProcessor] Tick error', { error: String(err) });
      stopRequestProcessor();
    });
  }, intervalMs);
}

/**
 * Stop the request processor.
 */
export function stopRequestProcessor(): void {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
    logger.info('[RequestProcessor] Stopped');
  }
}
