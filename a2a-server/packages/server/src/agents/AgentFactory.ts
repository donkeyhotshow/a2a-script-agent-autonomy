/**
 * AgentFactory — creates and pools agent instances.
 */

import { logger } from '@a2a/server-utils/logger';
import { AgentRole } from './IAgent.js';
import type { IAgent, SubTask } from './IAgent.js';
import { PlannerAgent } from './PlannerAgent.js';
import { ExecutorAgent } from './ExecutorAgent.js';
import { CriticAgent } from './CriticAgent.js';

export class AgentFactory {
    private readonly registry = new Map<string, IAgent>();

    constructor() {
        this.register(new PlannerAgent());
        this.register(new CriticAgent());
    }

    register(agent: IAgent): void {
        this.registry.set(agent.id, agent);
        logger.debug('[AgentFactory] Registered', { id: agent.id, role: agent.role });
    }

    getPlanner(): PlannerAgent {
        const found = [...this.registry.values()].find((a) => a.role === AgentRole.PLANNER);
        if (found instanceof PlannerAgent) return found;
        const p = new PlannerAgent();
        this.register(p);
        return p;
    }

    getCritic(): CriticAgent {
        const found = [...this.registry.values()].find((a) => a.role === AgentRole.CRITIC);
        if (found instanceof CriticAgent) return found;
        const c = new CriticAgent();
        this.register(c);
        return c;
    }

    resolve(task: SubTask): IAgent {
        for (const agent of this.registry.values()) {
            if (agent.role === AgentRole.SPECIALIST && agent.canHandle(task)) return agent;
        }
        return new ExecutorAgent();
    }

    list(): IAgent[] {
        return [...this.registry.values()];
    }

    deregister(id: string): void {
        this.registry.delete(id);
    }
}

export const globalAgentFactory = new AgentFactory();
