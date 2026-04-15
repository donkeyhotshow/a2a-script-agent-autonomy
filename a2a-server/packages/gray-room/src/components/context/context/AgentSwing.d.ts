export interface BranchResult {
    branchId: string;
    verdict: 'stable' | 'regressed' | 'advanced';
    data: unknown;
}
export declare class AgentSwing {
    /**
     * Adaptive Navigator: decides which context branch to follow
     */
    navigate(branches: BranchResult[]): Promise<BranchResult>;
    /**
     * Fork current context into parallel experiments with swinging strategies
     */
    fork(baseId: string, permutations: Record<string, unknown>[]): Promise<string[]>;
    private keepLastN;
    private summarize;
    private discard;
}
export declare const agentSwing: AgentSwing;
//# sourceMappingURL=AgentSwing.d.ts.map