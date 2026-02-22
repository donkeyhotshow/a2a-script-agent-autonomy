/**
 * Request Processor Service
 * Processes requests: activates neurons, returns context + request_files
 */

import { requestService } from './request.service.js';
import { logger } from '../utils/logger.js';
import { activateNeurons } from './neuron-activator.service.js';

const DEFAULT_INTERVAL_MS = 5000;

let timerId: ReturnType<typeof setInterval> | null = null;

export type ProcessOutcome = 'completed' | 'failed';

function parseTaskText(ctx: Record<string, unknown>): string {
  const nt = ctx['new_task'];
  if (Array.isArray(nt)) return nt.join(' ');
  if (typeof nt === 'string') return nt;
  return '';
}

function parseArchFeatures(ctx: Record<string, unknown>): string[] {
  const af = ctx['architectural_features'];
  if (Array.isArray(af)) return af.filter((x): x is string => typeof x === 'string');
  return [];
}

export async function processOneRequest(): Promise<ProcessOutcome | null> {
  const request = await requestService.getNextPending();
  if (!request) return null;

  const { promiseId, context, codeBlocks } = request;
  const ctx = (context as Record<string, unknown>) ?? {};

  try {
    const activationResult = activateNeurons({
      taskText: parseTaskText(ctx),
      codeBlocks: codeBlocks ?? [],
      architecturalFeatures: parseArchFeatures(ctx),
    });

    const activatedIds = activationResult.activatedNeurons.map((a) => a.neuron.id);
    const requestFiles = [...new Set([...(activationResult.requestFiles ?? []), ...((ctx['request_files'] as string[]) ?? [])])];

    await requestService.updateStatus(promiseId, 'completed', {
      outcome: 'completed',
      message: 'Request processed',
      context: { ...ctx, tasks: ctx['tasks'], request_files: requestFiles },
      injected_content: activationResult.injectedContent,
      activated_neuron_ids: activatedIds,
      questions: [],
      index_answers: [],
    });
    logger.info('[RequestProcessor] Completed', { promiseId, activatedCount: activatedIds.length, activatedIds: activatedIds.slice(0, 5) });
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
  logger.info('[RequestProcessor] Started', { intervalMs });
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
