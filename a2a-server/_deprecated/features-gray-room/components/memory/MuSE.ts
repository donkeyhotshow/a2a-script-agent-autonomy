import { logger } from '@a2a/server-utils/logger';

export interface Experience {
  taskId: string;
  goal: string;
  trajectory: { step: string; action: string }[];
  result: 'success' | 'failure';
  embeddings?: number[];
}

export class MuSE {
  private memory: Experience[] = [];

  async record(exp: Experience) {
    this.memory.push(exp);
    logger.info('[MuSE] Recorded stateful experience', { taskId: exp.taskId, result: exp.result });
  }

  async recall(goal: string): Promise<Experience[]> {
    // Basic string matching for prototype
    // Production would use vector search / semantic similarity
    const matches = this.memory.filter(e => 
      e.goal.toLowerCase().includes(goal.toLowerCase()) && e.result === 'success'
    );

    return matches.slice(0, 3);
  }

  getMemorySize(): number {
    return this.memory.length;
  }
}

export const muse = new MuSE();
