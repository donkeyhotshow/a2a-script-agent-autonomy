import { LoopDetector } from './LoopDetector.js';
import { ContextValidator } from './ContextValidator.js';
import { SafetySignalSeverity, SafetyInterceptResult, LoopSignal } from './types.js';

/**
 * SafetyLayer
 * 
 * The main orchestrator for autonomous agent safety.
 * Intercepts internal turns to detect loops, context drift, and confidence drops.
 */
export class SafetyLayer {
    private loopDetector: LoopDetector;
    private contextValidator: ContextValidator;

    constructor() {
        this.loopDetector = new LoopDetector();
        this.contextValidator = new ContextValidator();
    }

    /**
     * Intercept the agent's turn to perform safety checks.
     * 
     * @param turn - Content of the current turn (action, reasoning)
     * @param context - Full application context
     * @returns SafetyInterceptResult
     */
    public async intercept(
        action: string, 
        outcomeClass: string, 
        context: Record<string, unknown>
    ): Promise<SafetyInterceptResult> {
        // 1. Check for loops
        const loopSignal = this.loopDetector.detect(action, outcomeClass, context);
        
        if (loopSignal) {
            if (loopSignal.severity === 'critical') {
                return {
                    shouldInterrupt: true,
                    signal: loopSignal,
                    action: 'stop',
                };
            }
            if (loopSignal.severity === 'moderate') {
                return {
                    shouldInterrupt: true,
                    signal: loopSignal,
                    action: 'clarify',
                };
            }
        }

        // 2. Default: continue
        return {
            shouldInterrupt: false,
            action: 'continue',
        };
    }

    /**
     * Reset safety state (e.g., when a new task starts).
     */
    public reset(): void {
        this.loopDetector.reset();
    }
}
