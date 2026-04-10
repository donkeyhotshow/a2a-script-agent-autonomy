import { createLogger } from '@a2a/server-utils/logger.js';
import { hashSha256 } from '../../utils/crypto.js';
import { LoopDetector } from './safety-layer/LoopDetector.js';

const logger = createLogger('SafetyLayer');

export interface SafetyInterceptResult {
    halt: boolean;
    reason?: string;
    signal?: 'LOOP_DETECTED' | 'INTEGRITY_VIOLATION' | 'DRIFT_DETECTED';
}

function mapOutcome(raw: string): 'success' | 'fail' | 'partial' | 'noop' {
    const o = String(raw).toLowerCase();
    if (o === 'success' || o === 'ok') return 'success';
    if (o === 'fail' || o === 'error' || o === 'failed') return 'fail';
    if (o === 'partial') return 'partial';
    return 'noop';
}

/**
 * Gray Room invoke-context safety: loop detection only (ADR-0035).
 * Delegates counting to {@link LoopDetector} — same thresholds as the ADR module.
 */
export class SafetyLayer {
    private readonly loopDetector = new LoopDetector();
    private turnCounter = 0;

    public intercept(ctx: Record<string, unknown>): SafetyInterceptResult {
        const currentAction = JSON.stringify(ctx['execute'] ?? {});
        const lastOutcome = String((ctx['result'] as { outcome?: string } | undefined)?.outcome ?? 'noop');
        const ctxHash = hashSha256(JSON.stringify(ctx['messages'] ?? []));
        const outcomeClass = mapOutcome(lastOutcome);

        this.turnCounter += 1;
        const signal = this.loopDetector.check(currentAction, outcomeClass, ctxHash, String(this.turnCounter));

        if (signal?.severity === 'critical') {
            logger.error('[Safety] Loop detected!', { action: currentAction });
            return {
                halt: true,
                reason: 'Infinite loop detected: agent is repeating the same action and outcome.',
                signal: 'LOOP_DETECTED',
            };
        }

        return { halt: false };
    }

    public reset(): void {
        this.loopDetector.reset();
        this.turnCounter = 0;
    }
}

export const globalSafetyLayer = new SafetyLayer();
