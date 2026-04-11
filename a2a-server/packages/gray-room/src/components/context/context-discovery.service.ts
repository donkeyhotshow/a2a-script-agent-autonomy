import { execFile } from 'node:child_process';
import { statSync } from 'fs';
import { logger } from "@a2a/server-utils/logger.js""';

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

    // Validate rootPath
    if (!rootPath || typeof rootPath !== 'string') {
      logger.warn('[ContextDiscovery] Invalid rootPath', { rootPath });
      return [];
    }
    try {
      if (!statSync(rootPath).isDirectory()) {
        logger.warn('[ContextDiscovery] rootPath is not a directory', { rootPath });
        return [];
      }
    } catch (e) {
      logger.warn('[ContextDiscovery] rootPath does not exist or inaccessible', { rootPath });
      return [];
    }

    try {
      const output = await new Promise<string>((resolve, reject) => {
        execFile('grep', ['-rni', '--exclude-dir=node_modules', query, rootPath], {
          encoding: 'utf-8',
          timeout: 5000
        }, (error, stdout, stderr) => {
          if (error && !stdout) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
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
          lineNumber: parseInt(match[2], 10),
          lineContent: match[3].trim()
        });
      }
      if (results.length >= 20) break; // Limit results for token efficiency
    }

    return results;
  }
}

export const contextDiscoveryService = new ContextDiscoveryService();
