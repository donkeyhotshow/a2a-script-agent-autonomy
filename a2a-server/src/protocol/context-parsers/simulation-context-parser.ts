/**
 * Simulation Context Parser
 *
 * Specialized parser for simulation-related context
 * Handles replay data, simulation state, and execution history
 */

import {
    BaseContextParser,
    ParseContext,
} from './base-parser.js';

/**
 * Replay event structure
 */
export interface ReplayEvent {
    timestamp: number;
    type: string;
    data: unknown;
    stepId?: string;
}

/**
 * Simulation state
 */
export interface SimulationState {
    id: string;
    status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
    currentStep?: string;
    progress: number;
    startTime?: number;
    endTime?: number;
}

/**
 * Replay data structure
 */
export interface ReplayData {
    events: ReplayEvent[];
    initialState?: unknown;
    finalState?: unknown;
}

/**
 * Simulation context data
 */
export interface SimulationContext {
    sessionId: string;
    simulation?: SimulationState;
    replay?: ReplayData;
    metadata?: Record<string, unknown>;
}

/**
 * Parser for simulation-related context
 */
export class SimulationContextParser extends BaseContextParser<SimulationContext> {
    constructor(options: ParseContext = {}) {
        super(options);
    }

    /**
     * Validate simulation context data
     */
    validate(data: unknown): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.isObject(data)) {
            return { valid: false, errors: ['Simulation context must be an object'] };
        }

        const ctx = data as Record<string, unknown>;

        // Validate session_id
        if (!this.isString(ctx['session_id'])) {
            errors.push('session_id is required and must be a string');
        } else if (ctx['session_id'].length === 0) {
            errors.push('session_id cannot be empty');
        }

        // Validate simulation if present
        if (ctx['simulation'] !== undefined) {
            const simValidation = this.validateSimulationState(ctx['simulation']);
            errors.push(...simValidation);
        }

        // Validate replay if present
        if (ctx['replay'] !== undefined) {
            const replayValidation = this.validateReplayData(ctx['replay']);
            errors.push(...replayValidation);
        }

        // Validate metadata if present
        if (ctx['metadata'] !== undefined && !this.isObject(ctx['metadata'])) {
            errors.push('metadata must be an object');
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Parse simulation context from data
     */
    parse(data: unknown): SimulationContext {
        const validation = this.validate(data);
        if (!validation.valid) {
            throw new Error(`Invalid simulation context: ${validation.errors.join(', ')}`);
        }

        const ctx = data as Record<string, unknown>;

        const result: SimulationContext = {
            sessionId: ctx['session_id'] as string,
        };

        if (ctx['simulation']) {
            result.simulation = ctx['simulation'] as SimulationState;
        }

        if (ctx['replay']) {
            result.replay = ctx['replay'] as ReplayData;
        }

        if (ctx['metadata']) {
            result.metadata = ctx['metadata'] as Record<string, unknown>;
        }

        return result;
    }

    /**
     * Normalize simulation context to standard format
     */
    normalize(data: unknown): SimulationContext {
        if (!this.isObject(data)) {
            throw new Error('Cannot normalize non-object data');
        }

        const ctx = data as Record<string, unknown>;

        return {
            sessionId: this.isString(ctx['session_id']) ? ctx['session_id'] : 'unknown',
            simulation: this.normalizeSimulationState(ctx['simulation']),
            replay: this.normalizeReplayData(ctx['replay']),
            metadata: this.isObject(ctx['metadata']) ? ctx['metadata'] : undefined,
        };
    }

    /**
     * Create new simulation context
     */
    createSimulationContext(
        sessionId: string,
        simulationId: string
    ): SimulationContext {
        return {
            sessionId,
            simulation: {
                id: simulationId,
                status: 'pending',
                progress: 0,
                startTime: Date.now(),
            },
            replay: {
                events: [],
            },
        };
    }

    /**
     * Update simulation state
     */
    updateSimulationState(
        context: SimulationContext,
        state: Partial<SimulationState>
    ): SimulationContext {
        return {
            ...context,
            simulation: {
                ...context.simulation,
                ...state,
            } as SimulationState,
        };
    }

    /**
     * Add replay event
     */
    addReplayEvent(
        context: SimulationContext,
        event: Omit<ReplayEvent, 'timestamp'>
    ): SimulationContext {
        const newEvent: ReplayEvent = {
            ...event,
            timestamp: Date.now(),
        };

        return {
            ...context,
            replay: {
                ...context.replay,
                events: [...(context.replay?.events || []), newEvent],
            },
        };
    }

    /**
     * Start simulation
     */
    startSimulation(context: SimulationContext): SimulationContext {
        return this.updateSimulationState(context, {
            status: 'running',
            startTime: Date.now(),
        });
    }

    /**
     * Pause simulation
     */
    pauseSimulation(context: SimulationContext): SimulationContext {
        return this.updateSimulationState(context, {
            status: 'paused',
        });
    }

    /**
     * Complete simulation
     */
    completeSimulation(context: SimulationContext): SimulationContext {
        return this.updateSimulationState(context, {
            status: 'completed',
            progress: 100,
            endTime: Date.now(),
        });
    }

    /**
     * Fail simulation
     */
    failSimulation(context: SimulationContext, error?: string): SimulationContext {
        return this.updateSimulationState(context, {
            status: 'failed',
            endTime: Date.now(),
        });
    }

    /**
     * Update simulation progress
     */
    updateProgress(context: SimulationContext, progress: number): SimulationContext {
        return this.updateSimulationState(context, {
            progress: Math.max(0, Math.min(100, progress)),
        });
    }

    /**
     * Set current step
     */
    setCurrentStep(context: SimulationContext, stepId: string): SimulationContext {
        return this.updateSimulationState(context, {
            currentStep: stepId,
        });
    }

    /**
     * Check if simulation is active
     */
    isActive(context: SimulationContext): boolean {
        return context.simulation?.status === 'running';
    }

    /**
     * Check if simulation is completed
     */
    isCompleted(context: SimulationContext): boolean {
        return context.simulation?.status === 'completed';
    }

    /**
     * Get replay events by type
     */
    getEventsByType(context: SimulationContext, type: string): ReplayEvent[] {
        return context.replay?.events.filter((e) => e.type === type) || [];
    }

    /**
     * Get replay events by step
     */
    getEventsByStep(context: SimulationContext, stepId: string): ReplayEvent[] {
        return context.replay?.events.filter((e) => e.stepId === stepId) || [];
    }

    // ============================================
    // Private Helpers
    // ============================================

    private validateSimulationState(value: unknown): string[] {
        const errors: string[] = [];

        if (!this.isObject(value)) {
            return ['simulation must be an object'];
        }

        const sim = value as Record<string, unknown>;

        if (!this.isString(sim['id'])) {
            errors.push('simulation.id is required and must be a string');
        }

        const validStatuses = ['pending', 'running', 'paused', 'completed', 'failed'];
        if (!this.isString(sim['status']) || !validStatuses.includes(sim['status'])) {
            errors.push('simulation.status must be one of: ' + validStatuses.join(', '));
        }

        if (sim['progress'] !== undefined &&
            (typeof sim['progress'] !== 'number' || sim['progress'] < 0 || sim['progress'] > 100)) {
            errors.push('simulation.progress must be a number between 0 and 100');
        }

        return errors;
    }

    private validateReplayData(value: unknown): string[] {
        const errors: string[] = [];

        if (!this.isObject(value)) {
            return ['replay must be an object'];
        }

        const replay = value as Record<string, unknown>;

        if (!Array.isArray(replay['events'])) {
            errors.push('replay.events must be an array');
        } else {
            for (let i = 0; i < replay['events'].length; i++) {
                const event = replay['events'][i];
                if (!this.isValidReplayEvent(event)) {
                    errors.push(`replay.events[${i}] is invalid`);
                }
            }
        }

        return errors;
    }

    private isValidReplayEvent(value: unknown): boolean {
        if (!this.isObject(value)) return false;
        const event = value as Record<string, unknown>;
        return (
            typeof event['timestamp'] === 'number' &&
            this.isString(event['type']) &&
            event['data'] !== undefined
        );
    }

    private normalizeSimulationState(value: unknown): SimulationState | undefined {
        if (!this.isObject(value)) return undefined;

        const sim = value as Record<string, unknown>;
        const validStatuses = ['pending', 'running', 'paused', 'completed', 'failed'];
        const status = this.isString(sim['status']) && validStatuses.includes(sim['status'])
            ? sim['status']
            : 'pending';

        return {
            id: this.isString(sim['id']) ? sim['id'] : this.generateTaskId(),
            status: status as SimulationState['status'],
            currentStep: this.isString(sim['currentStep']) ? sim['currentStep'] : undefined,
            progress: typeof sim['progress'] === 'number' ? Math.max(0, Math.min(100, sim['progress'])) : 0,
            startTime: typeof sim['startTime'] === 'number' ? sim['startTime'] : undefined,
            endTime: typeof sim['endTime'] === 'number' ? sim['endTime'] : undefined,
        };
    }

    private normalizeReplayData(value: unknown): ReplayData | undefined {
        if (!this.isObject(value)) return undefined;

        const replay = value as Record<string, unknown>;
        const events = Array.isArray(replay['events'])
            ? replay['events'].filter(this.isValidReplayEvent.bind(this))
            : [];

        return {
            events: events as ReplayEvent[],
            initialState: replay['initialState'],
            finalState: replay['finalState'],
        };
    }
}

/**
 * Create a new simulation context parser
 */
export function createSimulationContextParser(options?: ParseContext): SimulationContextParser {
    return new SimulationContextParser(options);
}
