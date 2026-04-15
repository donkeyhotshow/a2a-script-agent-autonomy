/** Caller identity for artifacts (matches ActionHandlerContext fields used here). */
export interface SkillEvolverContext {
    sessionId: string;
    actionId: string;
    stepId?: string;
}
export interface EvolutionProposal {
    skill_name: string;
    failure_pattern: string;
    proposed_fix: string;
    confidence: number;
}
export declare class SkillEvolver {
    private readonly COMPONENT_ID;
    constructor();
    evolve(skillName: string, recentErrors: string[], context: SkillEvolverContext): Promise<EvolutionProposal>;
    private detectFailurePattern;
}
//# sourceMappingURL=skill-evolver.d.ts.map