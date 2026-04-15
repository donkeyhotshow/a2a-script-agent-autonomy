import { createArtifactWriteInput, globalArtifactStore } from './artifact-store.js';
import { SWEVerifier } from './swe-verifier.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { logger } from '@a2a/server-utils/logger';
export class SkillEvolver {
    COMPONENT_ID = 'SkillEvolver';
    constructor() {
        globalArtifactStore.registerWriter('SKILL_EVOLUTION', this.COMPONENT_ID);
    }
    async evolve(skillName, recentErrors, context) {
        const failurePattern = this.detectFailurePattern(recentErrors);
        const verifier = new SWEVerifier();
        const tmpPath = path.resolve(process.cwd(), '.a2a-tmp', `skill_${Date.now()}.ts`);
        let baseFix = `// Simulated advanced fix for ${skillName}\nexport function handle() { /* handles: ${failurePattern} */ }`;
        await fs.mkdir(path.dirname(tmpPath), { recursive: true });
        await fs.writeFile(tmpPath, baseFix);
        const verification = await verifier.verify(tmpPath, baseFix);
        const errMsgs = verification.errors ?? [];
        const verificationDetail = errMsgs.length > 0 ? errMsgs.join(', ') : 'verifier reported failure with no error messages';
        if (!verification.passed) {
            baseFix += `\n/* VERIFICATION FAILED: ${verificationDetail} */`;
        }
        const proposal = {
            skill_name: skillName,
            failure_pattern: failurePattern,
            proposed_fix: baseFix,
            confidence: verification.passed ? 0.85 : 0.2,
        };
        try {
            await fs.unlink(tmpPath);
        }
        catch (err) {
            const code = err?.code;
            logger.warn('[SkillEvolver] temp file unlink failed', {
                tmpPath,
                code: code ?? 'UNKNOWN',
                error: err instanceof Error ? err.message : String(err),
            });
        }
        const turnId = context.stepId ?? context.actionId;
        await globalArtifactStore.write(createArtifactWriteInput({
            artifact_id: `evo-${Date.now()}-${skillName.replace(/[^a-zA-Z0-9]/g, '')}`,
            artifact_type: 'SKILL_EVOLUTION',
            session_id: context.sessionId,
            turn_id: turnId,
            schema_version: '1.0',
            data: proposal,
            summary: `Proposing evolution for ${skillName} due to ${failurePattern}`,
            severity: 'info',
        }), this.COMPONENT_ID);
        return proposal;
    }
    detectFailurePattern(errors) {
        if (errors.length === 0) {
            throw new Error('SkillEvolver.detectFailurePattern: errors array must not be empty');
        }
        // Simplified pattern extraction: just take the most common or latest error type
        const latest = errors[errors.length - 1];
        if (latest.includes('ENOENT'))
            return 'File Not Found';
        if (latest.includes('validation'))
            return 'Input Validation Error';
        if (latest.includes('timeout'))
            return 'Timeout exceeded';
        return latest.slice(0, 50) + '...';
    }
}
//# sourceMappingURL=skill-evolver.js.map