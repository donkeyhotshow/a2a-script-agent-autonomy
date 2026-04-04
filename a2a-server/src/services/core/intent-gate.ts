import { createLogger } from '../utils/logger.js';

const logger = createLogger('IntentGate');

export class IntentGate {
    private originalIntent: string = '';
    private lastPlan: string = '';

    /**
     * Set the initial intent and lock it
     */
    public lockIntent(intent: string): void {
        this.originalIntent = intent;
        logger.info('[IntentGate] Intent locked', { intent: intent.slice(0, 50) + '...' });
    }

    /**
     * Check for drift against the locked intent
     * In a production system, this would be an LLM-based semantic comparison.
     * Here we implement a placeholder for semantic verification.
     */
    public checkDrift(currentPlan: string, context: Record<string, any>): boolean {
        this.lastPlan = currentPlan;
        
        // Semantic Drift Check logic (Simplified)
        // If the task changes radically (e.g. from "fix bug" to "delete all files")
        // we should flag it.
        
        // Placeholder: detect if common stop-words or radical shifts occur.
        // In reality, this triggers a small LLM call: "Is [currentPlan] still pursuing [originalIntent]?"
        
        return false; // No drift detected by default in current logic
    }

    public getLockedIntent(): string {
        return this.originalIntent;
    }
}

export const globalIntentGate = new IntentGate();
