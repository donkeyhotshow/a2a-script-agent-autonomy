import { execSync } from 'child_process';
import { logger } from '../../utils/logger.js';

export interface DiscoveryResult {
  filePath: string;
  lineContent: string;
  lineNumber: number;
}

export class ContextDiscoveryService {
  /**
   * Search for keywords across the project (JIT Context)
   */
  async searchSymbols(query: string, rootPath: string): Promise<DiscoveryResult[]> {
    logger.info('[ContextDiscovery] JIT Searching for symbols', { query });
    
    try {
      // Use ripgrep or grep if available, fallback to simple recursive search
      const output = execSync(`grep -rni --exclude-dir=node_modules "${query}" "${rootPath}"`, { 
        encoding: 'utf-8',
        timeout: 5000 
      });

      return this.parseGrepOutput(output);
    } catch (e) {
      logger.warn('[ContextDiscovery] Search failed or no results', { query });
      return [];
    }
  }

  private parseGrepOutput(output: string): DiscoveryResult[] {
    const lines = output.split('\n');
    const results: DiscoveryResult[] = [];

    for (const line of lines) {
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        results.push({
          filePath: match[1],
          lineNumber: parseInt(match[2]),
          lineContent: match[3].trim()
        });
      }
      if (results.length >= 20) break; // Limit results for token efficiency
    }

    return results;
  }
}

export const contextDiscoveryService = new ContextDiscoveryService();
