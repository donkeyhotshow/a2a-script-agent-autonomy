import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

interface SymbolInfo {
  type: 'class' | 'function' | 'interface' | 'method';
  name: string;
  signature?: string;
  extends?: string;
}

/**
 * RepoMapServiceV2
 * Enhanced project structure mapping with detailed symbol extraction.
 */
export class RepoMapServiceV2 {
  private baseDir: string;

  constructor(baseDir: string = process.cwd()) {
    this.baseDir = baseDir;
  }

  public async generateEnhancedMap(maxFiles: number = 100): Promise<string> {
    logger.info('RepoMapV2: Starting enhanced map generation');
    const files = this.findFiles(this.baseDir, ['.ts', '.js', '.php', '.vue']);
    let output = '# Repository Map (v2 - Enhanced)\n\n';

    for (const file of files.slice(0, maxFiles)) {
      const relativePath = path.relative(this.baseDir, file);
      const symbols = this.extractDetailedSymbols(file);
      
      if (symbols.length > 0) {
        output += `## ${relativePath}\n`;
        for (const sym of symbols) {
          const prefix = sym.type === 'class' ? '🏢' : sym.type === 'method' ? '  ⚙️' : '📄';
          const extInfo = sym.extends ? ` <: ${sym.extends}` : '';
          output += `${prefix} ${sym.name}${sym.signature || ''}${extInfo}\n`;
        }
        output += '\n';
      }
    }

    return output;
  }

  private findFiles(dir: string, extensions: string[], depth: number = 0): string[] {
    if (depth > 5) return [];
    let results: string[] = [];
    const list = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of list) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'vendor'].includes(entry.name)) continue;
        results = results.concat(this.findFiles(fullPath, extensions, depth + 1));
      } else if (extensions.includes(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
    return results;
  }

  private extractDetailedSymbols(filePath: string): SymbolInfo[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const symbols: SymbolInfo[] = [];

    // Class extraction with inheritance
    const classRegex = /class\s+([a-zA-Z0-9_]+)(?:\s+extends\s+([a-zA-Z0-9_]+))?/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      symbols.push({ type: 'class', name: match[1], extends: match[2] });
    }

    // Method extraction (basic)
    const methodRegex = /(?:public|private|protected|static|async)\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*[:{]/g;
    while ((match = methodRegex.exec(content)) !== null) {
      if (!['if', 'for', 'while', 'switch'].includes(match[1])) {
        symbols.push({ type: 'method', name: match[1], signature: `(${match[2]})` });
      }
    }

    // Function extraction
    const funcRegex = /function\s+([a-zA-Z0-9_]+)\s*\((.*?)\)/g;
    while ((match = funcRegex.exec(content)) !== null) {
      symbols.push({ type: 'function', name: match[1], signature: `(${match[2]})` });
    }

    return symbols;
  }
}

export const repoMapServiceV2 = new RepoMapServiceV2();
