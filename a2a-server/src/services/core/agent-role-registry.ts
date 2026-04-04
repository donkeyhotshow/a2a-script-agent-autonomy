import { OrchestratorState } from './orchestrator-kernel.js';

export enum AgentRole {
    ARCHITECT = 'ARCHITECT',
    IMPLEMENTER = 'IMPLEMENTER',
    REVIEWER = 'REVIEWER',
    META_AGENT = 'META_AGENT'
}

export interface RoleInstruction {
    role: AgentRole;
    instruction: string;
}

export class AgentRoleRegistry {
    private roles: Map<AgentRole, string> = new Map();

    constructor() {
        this.roles.set(AgentRole.ARCHITECT, `
You are the LEAD ARCHITECT. Your goal is high-level design and compliance with ADRs.
Before coding starts, you provide the 'Design Manifesto'.
Focus on: modularity, scalability, and technical debt prevention.
`);
        this.roles.set(AgentRole.IMPLEMENTER, `
You are the IMPLEMENTER (Coder). Your goal is to write minimal, clean, and correct code.
Follow the Architect's instructions and the User's task strictly.
Focus on: readability, unit tests, and the fastest path to a working solution.
`);
        this.roles.set(AgentRole.REVIEWER, `
You are the ADVERSARIAL REVIEWER (Writer/Reviewer Pattern - ADR-0040). 
Your sole purpose is to reject implementations that are sub-optimal, buggy, or hallucinated.
Be extremely suspicious. Check for:
- Silent logic failures and "off-by-one" errors.
- Hallucinated imports or API calls.
- Inconsistent variable naming or state drift.
- Security vulnerabilities and non-deterministic behavior.
If you find ANY issue, set 'passed: false' and provide a harsh, structured critique.
`);
        this.roles.set(AgentRole.META_AGENT, `
You are the META AGENT. Your goal is to build consensus between the Architect and Reviewer.
If they disagree, you make the final call or suggest a compromise path.
`);
    }

    getInstruction(role: AgentRole): string {
        return this.roles.get(role) || '';
    }

    /**
     * Map Orchestrator state to the active role
     */
    getRoleForState(state: OrchestratorState): AgentRole {
        switch (state) {
            case OrchestratorState.SYNTHESIZING:
            case OrchestratorState.ENRICHING:
                return AgentRole.ARCHITECT;
            case OrchestratorState.EXECUTING:
            case OrchestratorState.SELF_CORRECTING:
                return AgentRole.IMPLEMENTER;
            case OrchestratorState.REVIEWING:
                return AgentRole.REVIEWER;
            case OrchestratorState.DEBATING:
                return AgentRole.META_AGENT;
            default:
                return AgentRole.IMPLEMENTER;
        }
    }
}

export const globalRoleRegistry = new AgentRoleRegistry();
