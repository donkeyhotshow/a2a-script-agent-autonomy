import crypto from 'crypto';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SafetyLayer');

export interface SafetyInterceptResult {
    halt: boolean;
    reason?: string;
    signal?: 'LOOP_DETECTED' | 'INTEGRITY_VIOLATION' | 'DRIFT_DETECTED';
}

export class SafetyLayer {
    private historyHashes: string[] = [];
    private actionLog: Array<{action: string; outcome: string; ctxHash: string}> = [];
    private readonly MAX_REPETITIONS = 3;

    /**
     * Inspect the current execution step for safety violations
     */
    public intercept(ctx: Record<string, any>): SafetyInterceptResult {
        const currentAction = JSON.stringify(ctx['execute'] || {});
        const lastOutcome = (ctx['result'] as any)?.['outcome'] || 'noop';
        const ctxHash = this.computeHash(JSON.stringify(ctx['messages'] || []));

        // 1. Loop Detection (ADR-0035)
        this.actionLog.push({ action: currentAction, outcome: lastOutcome, ctxHash });
        if (this.isLooping()) {
            logger.error('[Safety] Loop detected!', { action: currentAction });
            return {
                halt: true,
                reason: 'Infinite loop detected: agent is repeating the same action and outcome.',
                signal: 'LOOP_DETECTED'
            };
        }

        // 2. Context Integrity (ADR-0035)
        // Check if messages have changed unexpectedly (unsupported drift)
        // For now, we just track the sequence of hashes.
        this.historyHashes.push(ctxHash);

        return { halt: false };
    }

    private computeHash(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    private isLooping(): boolean {
        if (this.actionLog.length < this.MAX_REPETITIONS) return false;

        const last = this.actionLog[this.actionLog.length - 1];
        let count = 0;

        // Check if the last action/outcome/ctxHash triple is repeated
        for (let i = this.actionLog.length - 1; i >= 0; i--) {
            const entry = this.actionLog[i];
            if (entry.action === last.action && 
                entry.outcome === last.outcome && 
                entry.ctxHash === last.ctxHash) {
                count++;
            } else {
                // If anything differs, it's not a strictly identical loop sequence
                // However, ADR-0035 suggests we should be even more aggressive.
            }
        }

        return count >= this.MAX_REPETITIONS;
    }

    public reset(): void {
        this.historyHashes = [];
        this.actionLog = [];
    }
}

export const globalSafetyLayer = new SafetyLayer();
