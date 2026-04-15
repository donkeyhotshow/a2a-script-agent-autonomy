import * as ts from "typescript";
import { promises as fsPromises } from "node:fs";
import * as path from "path";
import { logger } from '@a2a/server-utils/logger';

export interface ContextVersion {
  versionId: number;
  timestamp: number;
  data: Record<string, any>;
  message: string;
}

export interface SymbolSignature {
  name: string;
  kind: string;
  line: number;
  filePath: string;
}

export class UltraContextService {
  private sessions: Map<string, ContextVersion[]> = new Map();

  create(sessionId: string, initialData: Record<string, any> = {}): void {
    if (this.sessions.has(sessionId)) {
      logger.warn("[UltraContext] Session already exists, resetting", {
        sessionId,
      });
    }

    this.sessions.set(sessionId, [
      {
        versionId: 0,
        timestamp: Date.now(),
        data: initialData,
        message: "Initial state",
      },
    ]);
  }

  append(
    sessionId: string,
    delta: Record<string, any>,
    message: string,
  ): number {
    const history = this.sessions.get(sessionId);
    if (!history) {
      throw new Error(`Session ${sessionId} not found in UltraContext`);
    }

    const lastVersion = history[history.length - 1];
    if (!lastVersion) throw new Error(`Session ${sessionId} has no versions`);
    const newData = { ...lastVersion.data, ...delta };
    const newVersionId = lastVersion.versionId + 1;

    history.push({
      versionId: newVersionId,
      timestamp: Date.now(),
      data: newData,
      message,
    });

    logger.info("[UltraContext] Appended version", {
      sessionId,
      versionId: newVersionId,
    });
    return newVersionId;
  }

  getLatest(sessionId: string): Record<string, any> {
    const history = this.sessions.get(sessionId);
    if (!history || history.length === 0) return {};
    return history[history.length - 1]!.data;
  }

  timeTravel(sessionId: string, versionId: number): void {
    const history = this.sessions.get(sessionId);
    if (!history) throw new Error(`Session ${sessionId} not found`);

    const versionIndex = history.findIndex((v) => v.versionId === versionId);
    if (versionIndex === -1)
      throw new Error(`Version ${versionId} not found in session ${sessionId}`);

    // Truncate history to target version
    this.sessions.set(sessionId, history.slice(0, versionIndex + 1));
    logger.info("[UltraContext] Time traveled", {
      sessionId,
      toVersion: versionId,
    });
  }

  getHistory(sessionId: string): ContextVersion[] {
    return this.sessions.get(sessionId) || [];
  }

  /**
   * Scan project for TS/JS files and extract signatures
   */
  async scanProject(rootPath: string): Promise<SymbolSignature[]> {
    logger.info("[UltraContext] Scanning project structural signatures", {
      rootPath,
    });
    const signatures: SymbolSignature[] = [];
    const files = await this.getFiles(rootPath);

    // Process files in chunks to bound concurrency
    const chunkSize = 10;
    const chunks: string[][] = [];
    for (let i = 0; i < files.length; i += chunkSize) {
      chunks.push(files.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      const tsJsFiles = chunk.filter(
        (file) => file.endsWith(".ts") || file.endsWith(".js"),
      );
      const chunkSigs = await Promise.all(
        tsJsFiles.map((file) => this.extractSignatures(file)),
      );
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
            if (!file.startsWith(".") && file !== "node_modules") {
              queue.push(name);
            }
          } else {
            fileList.push(name);
          }
        }
      } catch (error) {
        logger.warn("[UltraContext] Error reading directory", {
          dir: currentDir,
          error,
        });
      }
    }
    return fileList;
  }

  private async extractSignatures(
    filePath: string,
  ): Promise<SymbolSignature[]> {
    const sourceCode = await fsPromises.readFile(filePath, "utf-8");
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
    );

    const fileSignatures: SymbolSignature[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        fileSignatures.push({
          name: node.name.text,
          kind: "class",
          line:
            sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          filePath,
        });
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        fileSignatures.push({
          name: node.name.text,
          kind: "function",
          line:
            sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          filePath,
        });
      } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
        fileSignatures.push({
          name: node.name.text,
          kind: "method",
          line:
            sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          filePath,
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
  async generateProjectMapMd(rootPath: string): Promise<string> {
    const sigs = await this.scanProject(rootPath);
    const filesMap = new Map<string, string[]>();

    for (const sig of sigs) {
      const relativePath = path.relative(rootPath, sig.filePath);
      if (!filesMap.has(relativePath)) {
        filesMap.set(relativePath, []);
      }
      filesMap
        .get(relativePath)!
        .push(`${sig.kind} ${sig.name} (L${sig.line})`);
    }

    let md = "# Project Repository Map\n\n";
    for (const [file, contents] of filesMap) {
      md += `### ${file}\n- ${contents.join("\n- ")}\n\n`;
    }
    return md;
  }

  /**
   * Append project context to session
   */
  async appendProjectContext(
    sessionId: string,
    rootPath: string,
  ): Promise<number> {
    const projectMap = await this.generateProjectMapMd(rootPath);
    return this.append(
      sessionId,
      { repo_map: projectMap },
      "Project structure scanned",
    );
  }
}

export const ultraContextService = new UltraContextService();
