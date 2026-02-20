/**
 * Request Processor Service
 * Timer-based loop: picks first pending request, attempts to resolve.
 * No graph extraction. Neurons process context. Placeholder for ChatGPT.
 */

import { requestService } from './request.service.js';
import { processNewTaskToContext } from '../knowledge/context-handler.js';
import { extractSemantics } from '../knowledge/semantic-extractor.js';
import { buildQuestions } from '../knowledge/question-builder.js';
import { queryIndex } from '../knowledge/index-query.js';
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
  if (workingContext['new_task']) {
    workingContext = processNewTaskToContext(workingContext, codeBlocksArr);
    logger.info('[RequestProcessor] new_task moved to tasks', {
      promiseId,
      tasksCount: (workingContext['tasks'] as unknown[])?.length ?? 0,
    });
  }

  // Semantic layer: extract → questions → index
  const projectId = (workingContext['project_path'] as string) ?? 'default';
  const tasks = (workingContext['tasks'] as Array<{ target?: string }>) ?? [];
  const taskTexts = tasks.map((t) => t.target).filter(Boolean) as string[];
  const chunks = extractSemantics(codeBlocksArr);
  const questions = buildQuestions(chunks, taskTexts);
  const indexAnswers = await queryIndex(projectId, questions);

  try {
    await requestService.updateStatus(promiseId, 'completed', {
      outcome: 'completed',
      message: 'Request processed (placeholder for ChatGPT)',
      context: workingContext,
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
