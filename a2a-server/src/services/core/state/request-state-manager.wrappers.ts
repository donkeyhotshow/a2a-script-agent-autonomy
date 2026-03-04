/**
 * Request State Manager Wrappers
 * 
 * Функции-обёртки для интеграции ContextManager и PhaseMachine с интерфейсами RequestStateManager
 */

import {ContextManager} from './context-manager.service.js';
import {PhaseMachine} from './context-manager.service.js';
import type {
    RequestContextManager,
    RequestPhaseMachine,
    ContextType,
    RetentionPolicy,
    ContextStats,
    TransitionResult,
    TransitionConditions,
    PhaseStats,
    RequestPhase
} from './request-processor.interfaces.js';

/**
 * Wrap ContextManager to implement RequestContextManager interface
 */
export function wrapContextManager(contextManager: ContextManager): RequestContextManager {
    return {
        set: (type: ContextType, data: unknown) => {
            const result = contextManager.set(type, data);
            return {
                type,
                size: result.size,
                totalSize: result.totalSize
            };
        },
        get: <T>(type: ContextType): T | null => contextManager.get<T>(type),
        has: (type: ContextType): boolean => contextManager.has(type),
        delete: (type: ContextType): boolean => contextManager.delete(type),
        getAll: (): Record<string, unknown> => contextManager.getAll(),
        getForPhase: (phase: RequestPhase): Record<string, unknown> => contextManager.getForPhase(phase),
        clearByRetention: (retention: RetentionPolicy): void => contextManager.clearByRetention(retention),
        reset: (): void => contextManager.reset(),
        getStats: (): ContextStats => contextManager.getStats(),
        serialize: (): string => contextManager.serialize()
    };
}

/**
 * Wrap PhaseMachine to implement RequestPhaseMachine interface
 */
export function wrapPhaseMachine(phaseMachine: PhaseMachine): RequestPhaseMachine {
    return {
        getCurrentPhase: (): RequestPhase => phaseMachine.getCurrentPhase() as RequestPhase,
        canTransitionTo: (phase: RequestPhase): boolean => phaseMachine.canTransitionTo(phase),
        transition: (nextPhase: RequestPhase, reason?: string): TransitionResult => {
            const result = phaseMachine.transition(nextPhase, reason);
            return {
                success: result.success,
                previousPhase: result.previousPhase as RequestPhase,
                currentPhase: result.currentPhase as RequestPhase,
                iterations: result.iterations,
                canContinue: result.canContinue,
                error: result.error ?? undefined
            };
        },
        autoTransition: (result: TransitionConditions): TransitionResult => {
            // Convert TransitionConditions to the format expected by PhaseMachine
            const phaseResult = phaseMachine.autoTransition({
                hasEntities: result.hasEntities,
                isComplete: result.isComplete,
                hasQuestions: result.hasQuestions,
                needsMoreFiles: result.needsMoreFiles
            });
            
            return {
                success: phaseResult.success,
                previousPhase: phaseResult.previousPhase as RequestPhase,
                currentPhase: phaseResult.currentPhase as RequestPhase,
                iterations: phaseResult.iterations,
                canContinue: phaseResult.canContinue,
                error: phaseResult.error ?? undefined
            };
        },
        updateContext: (data: Record<string, unknown>): void => phaseMachine.updateContext(data),
        getContext: (): Record<string, unknown> => phaseMachine.getContext(),
        isTimedOut: (): boolean => phaseMachine.isTimedOut(),
        getPhaseDuration: (): number => phaseMachine.getPhaseDuration(),
        getTotalDuration: (): number => phaseMachine.getTotalDuration(),
        isExhausted: (): boolean => phaseMachine.isExhausted(),
        reset: (newContext: Record<string, unknown>): void => phaseMachine.reset(newContext),
        getStats: (): PhaseStats => {
            const stats = phaseMachine.getStats();
            return {
                currentPhase: stats.currentPhase as RequestPhase,
                totalIterations: stats.totalIterations,
                phaseIterations: stats.phaseIterations as Record<RequestPhase, number>,
                totalDuration: stats.totalDuration,
                phaseDuration: stats.phaseDuration,
                historyLength: stats.historyLength,
                isExhausted: stats.isExhausted,
                isTimedOut: stats.isTimedOut
            };
        },
        serialize: (): string => phaseMachine.serialize()
    };
}
