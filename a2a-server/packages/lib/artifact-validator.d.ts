/**
 * Server-side artifact validator — used by ArtifactStore (ADR-0053).
 *
 * Validates mandatory base fields that every artifact must carry.
 * Uses manual checks to avoid AJV ESM/CJS compat issues present
 * in the existing server codebase.
 */
export interface ArtifactValidationResult {
    valid: boolean;
    errors: string[];
}
export declare function validateArtifact(artifact: unknown): ArtifactValidationResult;
//# sourceMappingURL=artifact-validator.d.ts.map