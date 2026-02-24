import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

interface RepoMapOptions {
  excludeDirs?: string[];
  excludeFiles?: string[];
  maxDepth?: number;
}

/**
 * RepoMapService
 * Generates a high-level overview of the repository structure and symbols
 * to provide context to the AI agent without overwhelming it with full files.
 */
export class RepoMapService {
  private baseDir: string;
  private options: Required<RepoMapOptions>;

  constructor(baseDir: string, options: RepoMapOptions = {}) {
    this.baseDir = baseDir;
    this.options = {
      excludeDirs: options.excludeDirs ?? ['node_modules', '.git', 'dist', 'vendor', 'storage'],
      excludeFiles: options.excludeFiles ?? ['package-lock.json', 'composer.lock', '.env'],
      maxDepth: options.maxDepth ?? 5,
    };
  }

  /**
   * Generates a text representation of the repo map
   */
  public async generateMap(): Promise<string> {
    logger.info('RepoMap: Starting map generation', { dir: this.baseDir });
    const structure = await this.scanDirectory(this.baseDir, 0);
    return structure;
  }

  private async scanDirectory(currentDir: string, depth: number): Promise<string> {
    if (depth > this.options.maxDepth) return '';

    let output = '';
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    // Sort: directories first, then files
    const sortedEntries = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sortedEntries) {
      if (this.shouldExclude(entry)) continue;

      const fullPath = path.join(currentDir, entry.name);
      const indent = '  '.repeat(depth);

      if (entry.isDirectory()) {
        output += `${indent}📁 ${entry.name}/\n`;
        output += await this.scanDirectory(fullPath, depth + 1);
      } else {
        const symbols = this.extractSymbols(fullPath);
        output += `${indent}📄 ${entry.name} ${symbols ? `(${symbols})` : ''}\n`;
      }
    }

    return output;
  }

  private shouldExclude(entry: fs.Dirent): boolean {
    if (entry.isDirectory()) {
      return this.options.excludeDirs.includes(entry.name);
    }
    return this.options.excludeFiles.includes(entry.name) || entry.name.startsWith('.');
  }

  /**
   * Extremely lightweight symbol extraction using regex for TS/JS/PHP
   */
  private extractSymbols(filePath: string): string {
    const ext = path.extname(filePath);
    if (!['.ts', '.js', '.php', '.vue'].includes(ext)) return '';

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const symbols: string[] = [];

      // Regex for class names
      const classMatches = content.matchAll(/class\s+([a-zA-Z0-9_]+)/g);
      for (const match of classMatches) {
        symbols.push(`class:${match[1]}`);
      }

      // Regex for main function signatures (simplified)
      const funcMatches = content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/g);
      for (const match of funcMatches) {
        symbols.push(`fn:${match[1]}`);
      }
      
      // Interface names
      if (ext === '.ts' || ext === '.vue') {
        const interfaceMatches = content.matchAll(/interface\s+([a-zA-Z0-9_]+)/g);
        for (const match of interfaceMatches) {
          symbols.push(`int:${match[1]}`);
        }
      }

      return symbols.slice(0, 5).join(', ') + (symbols.length > 5 ? '...' : '');
    } catch (err) {
      return '';
    }
  }
}

export const repoMapService = new RepoMapService(process.cwd());
