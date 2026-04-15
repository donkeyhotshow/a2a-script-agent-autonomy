// [STUB] context/repo-map.service — requires real implementation
// TODO: implement actual repo map generation
import { logger } from '@a2a/server-utils/logger';

class RepoMapService {
  async generateMapMd(repoRoot: string): Promise<string> {
    logger.debug('[RepoMapService] STUB: generateMapMd not implemented', { repoRoot });
    return `# Repo Map\n\nRoot: ${repoRoot}\n\n(stub — not implemented)`;
  }
}

export const repoMapService = new RepoMapService();
