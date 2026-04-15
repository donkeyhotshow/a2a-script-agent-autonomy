import { logger } from '@a2a/server-utils/logger';
import { ultracontext } from './Ultracontext.js';

export interface BranchResult {
  branchId: string;
  verdict: 'stable' | 'regressed' | 'advanced';
  data: unknown;
}

export class AgentSwing {
  /**
   * Adaptive Navigator: decides which context branch to follow
   */
  async navigate(branches: BranchResult[]): Promise<BranchResult> {
    logger.info('[AgentSwing] Evaluating branches', { count: branches.length });

    // Sort by priority: advanced -> stable -> regressed
    const sorted = [...branches].sort((a, b) => {
      const scores: Record<string, number> = { advanced: 3, stable: 2, regressed: 1 };
      return (scores[b.verdict] ?? 0) - (scores[a.verdict] ?? 0);
    });

    const best = sorted[0];
    if (!best) throw new Error('[AgentSwing] No branches to navigate');
    return best;
  }

  /**
   * Fork current context into parallel experiments with swinging strategies
   */
  async fork(baseId: string, permutations: Record<string, unknown>[]): Promise<string[]> {
    const baseData = await ultracontext.checkout(baseId) as Record<string, unknown>;
    const tokenCount = JSON.stringify(baseData).length / 4; // Mock token count
    const MAX_TOKENS = 128000;

    if (tokenCount > 0.7 * MAX_TOKENS) {
      logger.warn('[AgentSwing] Context overflow detected, swinging branches...', { tokenCount });
      const strategies = [
        { strategy: 'KeepLastN', data: this.keepLastN(baseData, 10) },
        { strategy: 'Summarize', data: this.summarize(baseData) },
        { strategy: 'Discard', data: this.discard(baseData) },
      ];

      const branchIds: string[] = [];
      for (const s of strategies) {
        const id = await ultracontext.commit(s.data, { type: 'swing_branch', strategy: s.strategy, base: baseId });
        branchIds.push(id);
      }
      return branchIds;
    }

    const branchIds: string[] = [];
    for (const p of permutations) {
      const branchedData = { ...baseData, ...p };
      const id = await ultracontext.commit(branchedData, { type: 'swing_fork', base: baseId });
      branchIds.push(id);
    }

    return branchIds;
  }

  private keepLastN(data: Record<string, unknown>, n: number): Record<string, unknown> {
    const history = Array.isArray(data['history']) ? data['history'].slice(-n) : [];
    return { ...data, history };
  }

  private summarize(data: Record<string, unknown>): Record<string, unknown> {
    return { ...data, history: [{ role: 'system', content: 'Summary of previous turns...' }] };
  }

  private discard(data: Record<string, unknown>): Record<string, unknown> {
    const { history: _history, ...rest } = data;
    return rest;
  }
}

export const agentSwing = new AgentSwing();
