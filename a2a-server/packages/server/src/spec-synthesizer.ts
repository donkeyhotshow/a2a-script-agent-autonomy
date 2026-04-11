import { createLogger } from "@a2a/server-utils/logger";
import { globalArtifactStore } from './artifact-store';
import fs from 'node:fs/promises';
import path from 'path';

const logger = createLogger('SpecSynthesizer');

export class SpecSynthesizer {
    /**
     * Analyze the codebase against MASTER.md to identify missing features.
     */
    public async analyzeGaps(projectRoot: string): Promise<string[]> {
        const masterPath = path.join(projectRoot, 'MASTER.md');
        const gaps: string[] = [];

        try {
            const masterContent = await fs.readFile(masterPath, 'utf8');
            logger.info('[SpecSynthesizer] Analyzing MASTER.md', { path: masterPath });

            // Extract requirements (Simplified regex-based extraction)
            const requirements = masterContent.match(/\[ \] .+/g) || [];
            
            for (const req of requirements) {
                const cleanedReq = req.replace('[ ] ', '').trim();
                const isFound = await this.searchInCode(projectRoot, cleanedReq);
                
                if (!isFound) {
                    logger.warn('[SpecSynthesizer] Gap detected!', { requirement: cleanedReq });
                    gaps.push(cleanedReq);
                }
            }

            if (gaps.length > 0) {
                logger.warn('[SpecSynthesizer] Gaps detected', { count: gaps.length, gaps });
            }

        } catch (err) {
            logger.error('[SpecSynthesizer] Analysis failed', { error: String(err) });
        }

        return gaps;
    }

    private async searchInCode(root: string, query: string): Promise<boolean> {
        // In a real implementation, this would use codebase_search or embeddings.
        // For now, we simulate a check by looking for key terms in artifacts.
        const artifacts = await globalArtifactStore.query({});
        return artifacts.some(a => JSON.stringify(a.data).includes(query));
    }
}

export const globalSpecSynthesizer = new SpecSynthesizer();
