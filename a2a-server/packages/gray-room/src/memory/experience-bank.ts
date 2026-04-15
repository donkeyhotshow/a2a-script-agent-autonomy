// [STUB] memory/experience-bank — requires real implementation
// TODO: implement actual experience bank for agent memory
import { logger } from '@a2a/server-utils/logger';

export interface Experience {
  id: string;
  sessionId: string;
  timestamp: number;
  context: Record<string, unknown>;
  outcome: string;
}

class ExperienceBank {
  private experiences: Experience[] = [];

  store(exp: Experience): void {
    this.experiences.push(exp);
    logger.debug('[ExperienceBank] STUB: stored experience', { id: exp.id });
  }

  retrieve(_query: Record<string, unknown>): Experience[] {
    logger.debug('[ExperienceBank] STUB: retrieve not implemented');
    return [];
  }

  async getRelevantExperiences(_query: string): Promise<Array<{ action_payload: unknown }>> {
    logger.debug('[ExperienceBank] STUB: getRelevantExperiences not implemented');
    return [];
  }

  async recordTurn(
    _sessionId: string,
    _turnId: string,
    _context: string,
    _action: { type: string; payload: unknown },
    _confidenceDelta: number
  ): Promise<void> {
    logger.debug('[ExperienceBank] STUB: recordTurn not implemented');
  }

  clear(): void {
    this.experiences = [];
  }
}

export const globalExperienceBank = new ExperienceBank();
