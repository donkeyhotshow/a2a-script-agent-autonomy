import { logger } from '@a2a/server-utils/logger';

export type AgentRole = 'planner' | 'builder' | 'reviewer' | 'tester';

export interface AgentSquad {
  id: string;
  members: Array<{
    role: AgentRole;
    count: number;
  }>;
}

export class VibeScaleRegistry {
  private templates: Map<string, AgentSquad> = new Map();

  constructor() {
    this.registerTemplate('enterprise_refactor', {
      id: 'enterprise_refactor',
      members: [
        { role: 'planner', count: 1 },
        { role: 'builder', count: 50 },
        { role: 'reviewer', count: 50 },
        { role: 'tester', count: 35 }
      ]
    });
  }

  registerTemplate(id: string, squad: AgentSquad): void {
    this.templates.set(id, squad);
  }

  spawnTeam(type: string): AgentSquad {
    const template = this.templates.get(type);
    if (!template) {
      logger.warn('[VibeScale] Template not found, using default', { type });
      return {
        id: 'default_squad',
        members: [{ role: 'builder', count: 1 }]
      };
    }
    
    logger.info('[VibeScale] Spawning agent team', { type, totalAgents: 136 });
    return template;
  }
}

export const vibeScaleRegistry = new VibeScaleRegistry();
