import { logger } from "@a2a/server-utils/logger";
import { ultracontext } from './Ultracontext';

export interface BranchResult {
  branchId: string;
  verdict: 'stable' | 'regressed' | 'advanced';
  data: any;
}

export class AgentSwing {
  /**
   * Adaptive Navigator: decides which context branch to follow
   */
  async navigate(branches: BranchResult[]): Promise<BranchResult> {
    logger.info('[AgentSwing] Evaluating branches', { count: branches.length });
    
    // Sort by priority: advanced -> stable -> regressed
    const sorted = [...branches].sort((a, b) => {
      const scores = { advanced: 3, stable: 2, regressed: 1 };
      return scores[b.verdict] - scores[a.verdict];
    });

    return sorted[0];
  }

  /**
   * Fork current context into parallel experiments with swinging strategies
   */
  async fork(baseId: string, permutations: any[]): Promise<string[]> {
    const baseData = await ultracontext.checkout(baseId);
    const tokenCount = JSON.stringify(baseData).length / 4; // Mock token count
    const MAX_TOKENS = 128000;

    if (tokenCount > 0.7 * MAX_TOKENS) {
      logger.warn('[AgentSwing] Context overflow detected, swinging branches...', { tokenCount });
      // Adaptive swinging: branch into strategies
      const strategies = [
        { strategy: 'KeepLastN', data: this.keepLastN(baseData, 10) },
        { strategy: 'Summarize', data: this.summarize(baseData) },
        { strategy: 'Discard', data: this.discard(baseData) }
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

  private keepLastN(data: any, n: number) { return { ...data, history: (data.history || []).slice(-n) }; }
  private summarize(data: any) { return { ...data, history: [{ role: 'system', content: 'Summary of previous turns...' }] }; }
  private discard(data: any) { 
      const { history, ...rest } = data;
      return rest; 
  }
}

export const agentSwing = new AgentSwing();
