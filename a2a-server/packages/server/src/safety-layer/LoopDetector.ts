import { createHash } from "node:crypto";
import { LoopSignal, SafetySignalSeverity } from './types.js';

/**
 * LoopDetector
 * 
 * Detects repetitive execution patterns in the agent's internal turns.
 * Matches by [reason + outcome_class + context_hash].
 */
export class LoopDetector {
    private history: Map<string, number> = new Map();
    private readonly MODERATE_THRESHOLD = 3;
    private readonly CRITICAL_THRESHOLD = 5;

    /**
     * Detect if the current pattern is repeating.
     * 
     * @param reason - The action/tool being called (e.g., "read-file:package.json")
     * @param outcomeClass - Classification of the result (e.g., "success", "no-change")
     * @param context - The current request context for hashing
     * @returns LoopSignal if repetition is detected, null otherwise
     */
    public detect(reason: string, outcomeClass: string, context: Record<string, unknown>): LoopSignal | null {
        const contextHash = this.calculateHash(context);
        const key = `${reason}|${outcomeClass}|${contextHash}`;
        
        const currentCount = (this.history.get(key) || 0) + 1;
        this.history.set(key, currentCount);

        if (currentCount >= this.MODERATE_THRESHOLD) {
            const severity: SafetySignalSeverity = currentCount >= this.CRITICAL_THRESHOLD ? 'critical' : 'moderate';
            
            return {
                reason,
                outcomeClass,
                contextHash,
                count: currentCount,
                severity,
                timestamp: new Date().toISOString(),
            };
        }

        return null;
    }

    /**
     * Clear the detection history.
     */
    public reset(): void {
        this.history.clear();
    }

    /**
     * Calculate a SHA256 hash of the context to detect stable states.
     */
    private calculateHash(data: unknown): string {
        try {
            // Simplified hash: we only care about workbench and parts of execution
            const relevantData = JSON.stringify(data);
            return createHash("sha256").update(relevantData).digest("hex");
        } catch (e) {
            // Fallback for circular structures or encoding errors
            return `error-hash-${Date.now()}`;
        }
    }
}
