import { globalArtifactStore } from './artifact-store.js';
import { SWEVerifier } from './swe-verifier.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface EvolutionProposal {
  skill_name: string;
  failure_pattern: string;
  proposed_fix: string;
  confidence: number;
}

export class SkillEvolver {
  private readonly COMPONENT_ID = 'SkillEvolver';

  constructor() {
    globalArtifactStore.registerWriter('SKILL_EVOLUTION', this.COMPONENT_ID);
  }

  async evolve(skillName: string, recentErrors: string[], contextStats: any): Promise<EvolutionProposal> {
    // 1. Analyze errors (mock logic)
    const failurePattern = this.detectFailurePattern(recentErrors);

    // 2. Generate proposed fix
    const proposal: EvolutionProposal = {
      skill_name: skillName,
      failure_pattern: failurePattern,
      proposed_fix: `// Simulated advanced fix for ${skillName}\nexport function handle() { /* handles: ${failurePattern} */ }`,
      confidence: 0.85
    };

    // 2.5 Validation via SWEVerifier
    const verifier = new SWEVerifier();
    const tmpPath = path.resolve(process.cwd(), '.a2a-tmp', `skill_${Date.now()}.ts`);
    await fs.mkdir(path.dirname(tmpPath), { recursive: true });
    await fs.writeFile(tmpPath, proposal.proposed_fix);
    
    const verification = await verifier.verify(tmpPath, proposal.proposed_fix);
    if (!verification.passed) {
      proposal.confidence = 0.2; // Severely penalize confidence
      proposal.proposed_fix += `\n/* VERIFICATION FAILED: ${verification.errors?.join(', ')} */`;
    }
    
    // Cleanup
    await fs.unlink(tmpPath).catch(() => {});


    // 3. Emit artifact
    await globalArtifactStore.write({
      artifact_id: `evo-${Date.now()}-${skillName.replace(/[^a-zA-Z0-9]/g, '')}`,
      artifact_type: 'SKILL_EVOLUTION',
      session_id: 'unknown',
      turn_id: 'unknown',
      created_at: new Date().toISOString(),
      schema_version: '1.0',
      data: proposal as unknown as Record<string, unknown>,
      summary: `Proposing evolution for ${skillName} due to ${failurePattern}`,
      severity: 'info',
    }, this.COMPONENT_ID);

    return proposal;
  }

  private detectFailurePattern(errors: string[]): string {
    if (errors.length === 0) return 'No errors recorded';
    // Simplified pattern extraction: just take the most common or latest error type
    const latest = errors[errors.length - 1]!;
    if (latest.includes('ENOENT')) return 'File Not Found';
    if (latest.includes('validation')) return 'Input Validation Error';
    if (latest.includes('timeout')) return 'Timeout exceeded';
    return latest.slice(0, 50) + '...';
  }
}
