import * as ts from 'typescript';
import { promises as fsPromises } from 'node:fs';
import * as path from 'path';
import { logger } from '../../utils/logger.js';

export interface SymbolSignature {
  name: string;
  kind: string;
  line: number;
  filePath: string;
}

export class RepoMapService {
  /**
   * Scan directory for TS/JS files and extract signatures
   */
  async scanProject(rootPath: string): Promise<SymbolSignature[]> {
    logger.info('[RepoMap] Scanning project structural signatures', { rootPath });
    const signatures: SymbolSignature[] = [];
    const files = await this.getFiles(rootPath);

    // Process files in chunks to bound concurrency
    const chunkSize = 10;
    const chunks: string[][] = [];
    for (let i = 0; i < files.length; i += chunkSize) {
      chunks.push(files.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      const tsJsFiles = chunk.filter(file => file.endsWith('.ts') || file.endsWith('.js'));
      const chunkSigs = await Promise.all(tsJsFiles.map(file => this.extractSignatures(file)));
      for (const sigs of chunkSigs) {
        signatures.push(...sigs);
      }
    }

    return signatures;
  }

  private async getFiles(dir: string): Promise<string[]> {
    const fileList: string[] = [];
    const queue: string[] = [dir];

    while (queue.length > 0) {
      const currentDir = queue.shift()!;
      try {
        const files = await fsPromises.readdir(currentDir);
        for (const file of files) {
          const name = path.join(currentDir, file);
          const stat = await fsPromises.stat(name);
          if (stat.isDirectory()) {
            if (!file.startsWith('.') && file !== 'node_modules') {
              queue.push(name);
            }
          } else {
            fileList.push(name);
          }
        }
      } catch (error) {
        logger.warn('[RepoMap] Error reading directory', { dir: currentDir, error });
      }
    }
    return fileList;
  }

  private async extractSignatures(filePath: string): Promise<SymbolSignature[]> {
    const sourceCode = await fsPromises.readFile(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const fileSignatures: SymbolSignature[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        fileSignatures.push({
          name: node.name.text,
          kind: 'class',
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          filePath
        });
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        fileSignatures.push({
          name: node.name.text,
          kind: 'function',
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          filePath
        });
      } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
        fileSignatures.push({
          name: node.name.text,
          kind: 'method',
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          filePath
        });
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return fileSignatures;
  }

  /**
   * Generate a condensed markdown representation of the project map
   */
  async generateMapMd(rootPath: string): Promise<string> {
    const sigs = await this.scanProject(rootPath);
    const filesMap = new Map<string, string[]>();

    for (const sig of sigs) {
      const relativePath = path.relative(rootPath, sig.filePath);
      if (!filesMap.has(relativePath)) {
        filesMap.set(relativePath, []);
      }
      filesMap.get(relativePath)!.push(`${sig.kind} ${sig.name} (L${sig.line})`);
    }

    let md = '# Project Repository Map\\n\\n';
    for (const [file, contents] of filesMap) {
      md += `### ${file}\\n- ${contents.join('\\n- ')}\\n\\n`;
    }
    return md;
  }
}

export const repoMapService = new RepoMapService();
