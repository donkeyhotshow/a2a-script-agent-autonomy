/**
 * Request Processor Service
 * Timer-based loop: picks first pending request, attempts to resolve.
 * Stops on error. Stops on incomplete graph (generates question, logs).
 */

import { requestService, type RequestResult } from './request.service.js';
import { getGraph } from '../knowledge/graph-store.js';
import { logger } from '../utils/logger.js';

const DEFAULT_INTERVAL_MS = 5000;

let timerId: ReturnType<typeof setInterval> | null = null;

export type ProcessOutcome = 'completed' | 'failed' | 'graph_incomplete';

function isGraphIncomplete(projectId: string | undefined): boolean {
  if (!projectId) return true;
  const graph = getGraph(projectId);
  if (!graph) return true;
  if (!graph.entities?.length && !graph.relations?.length) return true;
  return false;
}

function generateQuestion(request: RequestResult): string {
  const projectId = (request.context?.projectId as string) || 'unknown';
  return `Knowledge graph is incomplete for project ${projectId}. Please index the project or provide more context.`;
}

/**
 * Process one request. Returns outcome; on error or graph_incomplete, iteration stops.
 */
export async function processOneRequest(): Promise<ProcessOutcome | null> {
  const request = await requestService.getNextPending();
  if (!request) return null;

  const { promiseId, context } = request;
  const projectId = context?.projectId as string | undefined;

  try {
    if (isGraphIncomplete(projectId)) {
      const question = generateQuestion(request);
      logger.info('[RequestProcessor] Graph incomplete, question generated', {
        promiseId,
        projectId: projectId ?? 'none',
        question,
      });
      await requestService.updateStatus(promiseId, 'completed', {
        outcome: 'graph_incomplete',
        question,
        message: 'Server stopped: knowledge graph incomplete. Answer the question to continue.',
      });
      return 'graph_incomplete';
    }

    // TODO: full processing (neurons, external AI) — for now just complete
    await requestService.updateStatus(promiseId, 'completed', {
      outcome: 'completed',
      message: 'Request processed (placeholder)',
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
 * Run one iteration. Stops loop on error or graph_incomplete.
 */
async function tick(): Promise<void> {
  const outcome = await processOneRequest();
  if (outcome === 'failed' || outcome === 'graph_incomplete') {
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
