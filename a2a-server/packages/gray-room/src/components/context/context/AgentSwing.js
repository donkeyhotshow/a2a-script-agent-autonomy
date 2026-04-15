import { logger } from '@a2a/server-utils/logger';
import { ultracontext } from './Ultracontext.js';
export class AgentSwing {
    /**
     * Adaptive Navigator: decides which context branch to follow
     */
    async navigate(branches) {
        logger.info('[AgentSwing] Evaluating branches', { count: branches.length });
        // Sort by priority: advanced -> stable -> regressed
        const sorted = [...branches].sort((a, b) => {
            const scores = { advanced: 3, stable: 2, regressed: 1 };
            return (scores[b.verdict] ?? 0) - (scores[a.verdict] ?? 0);
        });
        const best = sorted[0];
        if (!best)
            throw new Error('[AgentSwing] No branches to navigate');
        return best;
    }
    /**
     * Fork current context into parallel experiments with swinging strategies
     */
    async fork(baseId, permutations) {
        const baseData = await ultracontext.checkout(baseId);
        const tokenCount = JSON.stringify(baseData).length / 4; // Mock token count
        const MAX_TOKENS = 128000;
        if (tokenCount > 0.7 * MAX_TOKENS) {
            logger.warn('[AgentSwing] Context overflow detected, swinging branches...', { tokenCount });
            const strategies = [
                { strategy: 'KeepLastN', data: this.keepLastN(baseData, 10) },
                { strategy: 'Summarize', data: this.summarize(baseData) },
                { strategy: 'Discard', data: this.discard(baseData) },
            ];
            const branchIds = [];
            for (const s of strategies) {
                const id = await ultracontext.commit(s.data, { type: 'swing_branch', strategy: s.strategy, base: baseId });
                branchIds.push(id);
            }
            return branchIds;
        }
        const branchIds = [];
        for (const p of permutations) {
            const branchedData = { ...baseData, ...p };
            const id = await ultracontext.commit(branchedData, { type: 'swing_fork', base: baseId });
            branchIds.push(id);
        }
        return branchIds;
    }
    keepLastN(data, n) {
        const history = Array.isArray(data['history']) ? data['history'].slice(-n) : [];
        return { ...data, history };
    }
    summarize(data) {
        return { ...data, history: [{ role: 'system', content: 'Summary of previous turns...' }] };
    }
    discard(data) {
        const { history: _history, ...rest } = data;
        return rest;
    }
}
export const agentSwing = new AgentSwing();
//# sourceMappingURL=AgentSwing.js.map