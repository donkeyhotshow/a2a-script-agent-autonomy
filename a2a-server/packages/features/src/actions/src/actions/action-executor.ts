import { ActionDefinition, ExecutionState, SubAction, StepHistory } from './types.js';

export interface StepResult {
    stepId: string;
    status: 'completed' | 'failed';
    result: unknown;
    nextStepAvailable: boolean;
    nextStep?: SubAction;
}

export interface ActionResult {
    actionId: string;
    status: 'completed' | 'failed';
    stepsCompleted: number;
    totalSteps: number;
    history: StepHistory[];
    /** Set when status is completed (e.g. timestamp). */
    completion: unknown;
}

export class ActionExecutor {
    private executionStates: Map<string, ExecutionState> = new Map();

    initializeExecution(sessionId: string, action: ActionDefinition): ExecutionState {
        const state: ExecutionState = { actionId: action.id, currentStepIndex: 0, history: [] };
        this.executionStates.set(sessionId, state);
        return state;
    }

    getExecutionState(sessionId: string): ExecutionState | null {
        return this.executionStates.get(sessionId) ?? null;
    }

    getCurrentStep(action: ActionDefinition, state: ExecutionState): SubAction | null {
        if (state.currentStepIndex >= action.subActions.length) return null;
        return action.subActions[state.currentStepIndex] ?? null;
    }

    async executeStep(sessionId: string, action: ActionDefinition, input: unknown): Promise<StepResult> {
        const state = this.getExecutionState(sessionId);
        if (!state) return { stepId: '', status: 'failed', result: { error: 'Execution state not found' }, nextStepAvailable: false };

        const currentStep = this.getCurrentStep(action, state);
        if (!currentStep) return { stepId: '', status: 'failed', result: { error: 'Current step not found' }, nextStepAvailable: false };

        const mockResult = { stepId: currentStep.id, input, output: currentStep.output, executedAt: new Date().toISOString() };
        state.history.push({ stepId: currentStep.id, status: 'completed', result: mockResult });

        const hasNextStep = this.advanceToNextStep(sessionId, action);
        const nextStep = hasNextStep ? action.subActions[state.currentStepIndex] : undefined;

        return { stepId: currentStep.id, status: 'completed', result: mockResult, nextStepAvailable: hasNextStep, ...(nextStep ? { nextStep } : {}) };
    }

    advanceToNextStep(sessionId: string, action: ActionDefinition): boolean {
        const state = this.getExecutionState(sessionId);
        if (!state) return false;
        const nextIndex = state.currentStepIndex + 1;
        const hasMore = nextIndex < action.subActions.length;
        // Move past end when finishing the last step so getCurrentStep() is null and completion runs.
        state.currentStepIndex = hasMore ? nextIndex : action.subActions.length;
        return hasMore;
    }

    completeExecution(sessionId: string): ActionResult {
        const state = this.getExecutionState(sessionId);
        if (!state) return { actionId: '', status: 'failed', stepsCompleted: 0, totalSteps: 0, history: [], completion: { error: 'Execution state not found' } };

        const result: ActionResult = {
            actionId: state.actionId,
            status: 'completed',
            stepsCompleted: state.history.length,
            totalSteps: state.history.length,
            history: state.history,
            completion: { completedAt: new Date().toISOString() },
        };
        this.executionStates.delete(sessionId);
        return result;
    }

    cancelExecution(sessionId: string): void {
        this.executionStates.delete(sessionId);
    }

    getNextSteps(action: ActionDefinition, state: ExecutionState): SubAction[] {
        return action.subActions.slice(state.currentStepIndex + 1);
    }
}
