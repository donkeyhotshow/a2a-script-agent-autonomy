import { createLogger, hashSha256 } from '@a2a/server-utils';
import { LoopDetector } from './safety-layer/LoopDetector.js';

const logger = createLogger('SafetyLayer');

// Lazily resolved to avoid circular-dep at module load time
async function recordFailureExperience(
    sessionId: string,
    turnId: string,
    contextJson: string,
    action: string,
): Promise<void> {
    try {
        const { globalExperienceBank } = await import(
            '../../gray-room/src/memory/experience-bank.js'
        );
        await globalExperienceBank.recordTurn(
            sessionId,
            turnId,
            contextJson,
            { type: action, payload: null },
            -1,
            'failure',
        );
    } catch {
        // best-effort — never throw from safety path
    }
}

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
            // Record the repeating action as a failure experience so future
            // sessions can learn to avoid this pattern via getRelevantExperiences().
            const sessionId = String(ctx['session_id'] ?? 'unknown');
            void recordFailureExperience(
                sessionId,
                `turn-${this.turnCounter}`,
                JSON.stringify(ctx).slice(0, 2_000),
                currentAction,
            );
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
