import * as ts from 'typescript';
import * as fs from 'fs';
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
    const files = this.getFiles(rootPath);

    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        const fileSigs = this.extractSignatures(file);
        signatures.push(...fileSigs);
      }
    }

    return signatures;
  }

  private getFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const name = path.join(dir, file);
      if (fs.statSync(name).isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          this.getFiles(name, fileList);
        }
      } else {
        fileList.push(name);
      }
    }
    return fileList;
  }

  private extractSignatures(filePath: string): SymbolSignature[] {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
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
