/**
 * Request Processor Service
 * Stub: knowledge archived. Returns completed with minimal data.
 */

import { requestService } from './request.service.js';
import { logger } from '../utils/logger.js';

const DEFAULT_INTERVAL_MS = 5000;

let timerId: ReturnType<typeof setInterval> | null = null;

export type ProcessOutcome = 'completed' | 'failed';

export async function processOneRequest(): Promise<ProcessOutcome | null> {
  const request = await requestService.getNextPending();
  if (!request) return null;

  const { promiseId, context } = request;
  const ctx = (context as Record<string, unknown>) ?? {};

  try {
    await requestService.updateStatus(promiseId, 'completed', {
      outcome: 'completed',
      message: 'Request processed (knowledge archived)',
      context: { ...ctx, tasks: ctx['tasks'], request_files: ctx['request_files'] },
      injected_content: '',
      activated_neuron_ids: [],
      questions: [],
      index_answers: [],
    });
    return 'completed';
  } catch (err) {
    logger.error('[RequestProcessor] Error', { promiseId, error: String(err) });
    await requestService.updateStatus(promiseId, 'failed', undefined, {
      code: 'PROCESS_ERROR',
      message: String(err),
    });
    return 'failed';
  }
}

async function tick(): Promise<void> {
  const outcome = await processOneRequest();
  if (outcome === 'failed') {
    stopRequestProcessor();
  }
}

export function startRequestProcessor(intervalMs: number = DEFAULT_INTERVAL_MS): void {
  if (timerId) return;
  logger.info('[RequestProcessor] Started (stub)', { intervalMs });
  timerId = setInterval(() => {
    tick().catch((err) => {
      logger.error('[RequestProcessor] Tick error', { error: String(err) });
      stopRequestProcessor();
    });
  }, intervalMs);
}

export function stopRequestProcessor(): void {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
    logger.info('[RequestProcessor] Stopped');
  }
}
