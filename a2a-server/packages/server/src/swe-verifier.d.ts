export interface VerificationResult {
    file_path: string;
    stage: 'zero_stage' | 'hero_stage' | 'guardrails';
    passed: boolean;
    errors?: string[];
    output?: string;
    timestamp: string;
}
export declare class SWEVerifier {
    private readonly COMPONENT_ID;
    constructor();
    verify(filePath: string, content: string): Promise<VerificationResult>;
    private emitArtifact;
}
//# sourceMappingURL=swe-verifier.d.ts.map