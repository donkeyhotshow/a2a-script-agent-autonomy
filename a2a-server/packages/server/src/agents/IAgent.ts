/**
 * IAgent — v2 multi-agent interface contract (ADR-004).
 *
 * All agents in the system must implement this interface.
 */

// ── SubTask ────────────────────────────────────────────────────────────────────

export interface SubTask {
    id: string;
    description: string;
    dependsOn: string[];
    expectedOutputs: string[];
    maxRetries?: number;
    timeoutMs?: number;
}

export interface SubTaskResult {
    taskId: string;
    status: 'completed' | 'failed' | 'skipped';
    output: unknown;
    error?: string;
    durationMs: number;
}

// ── ExecutionPlan ──────────────────────────────────────────────────────────────

export interface ExecutionPlan {
    sessionId: string;
    rootGoal: string;
    subtasks: SubTask[];
    estimatedTurns: number;
    riskFactors: string[];
    fallbackStrategy: string;
}

// ── Verdict (Critic output) ───────────────────────────────────────────────────

export interface Verdict {
    passed: boolean;
    critique?: string;
    failures?: string[];
    artifacts?: unknown[];
    confidence: number;
}

// ── AgentContext ──────────────────────────────────────────────────────────────

export interface AgentContext {
    sessionId: string;
    promiseId: string;
    aiHubUrl: string;
    model: string;
    task: string;
    history: unknown[];
    workingContext: Record<string, unknown>;
}

// ── AgentCard ─────────────────────────────────────────────────────────────────

export interface AgentCard {
    id: string;
    name: string;
    role: AgentRole;
    capabilities: string[];
    endpoint: string;
    version: string;
    maxConcurrent: number;
}

// ── AgentRole ─────────────────────────────────────────────────────────────────

export enum AgentRole {
    PLANNER    = 'planner',
    EXECUTOR   = 'executor',
    CRITIC     = 'critic',
    SPECIALIST = 'specialist',
}

// ── IAgent ─────────────────────────────────────────────────────────────────────

export interface IAgent {
    readonly id: string;
    readonly role: AgentRole;
    readonly capabilities: string[];
    execute(task: SubTask, ctx: AgentContext): Promise<SubTaskResult>;
    canHandle(task: SubTask): boolean;
    getAgentCard(): AgentCard;
}
