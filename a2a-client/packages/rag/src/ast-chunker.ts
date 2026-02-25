/**
 * AST-based Chunking - Parse code using AST
 */

import crypto from 'crypto';
import type { Chunk } from './chunk-manager.js';

export interface ASTChunkerConfig {
  [key: string]: unknown;
}

interface LocInfo {
  start: { line: number };
  end: { line: number };
}

interface ASTNode {
  type: string;
  id?: { name: string };
  body?: { body?: ASTNode[] };
  declarations?: Array<{ id?: { name: string }; loc?: LocInfo }>;
  declaration?: ASTNode & { id?: { name: string }; loc?: LocInfo };
  loc?: LocInfo;
  key?: { name: string };
  accessibility?: string;
  static?: boolean;
}

interface PHPNode {
  kind: string;
  name?: string;
  src?: string;
  loc?: { start: { line: number } };
  body?: { children?: PHPNode[] };
  children?: PHPNode[];
  visibility?: string;
}

type ParserFn = (filePath: string, content: string) => Chunk[];

export class ASTChunker {
  private config: ASTChunkerConfig;
  private parsers: Record<string, ParserFn | null> = {};

  constructor(config: ASTChunkerConfig = {}) {
    this.config = config;
    this._initParsers();
  }

  private _initParsers(): void {
    try {
      this.parsers.javascript = this._parseJavaScript.bind(this);
    } catch {
      this.parsers.javascript = null;
    }
    try {
      this.parsers.php = this._parsePHP.bind(this);
    } catch {
      this.parsers.php = null;
    }
    try {
      this.parsers.typescript = this._parseTypeScript.bind(this);
    } catch {
      this.parsers.typescript = null;
    }
  }

  private _getParser(ext: string): ParserFn | null {
    const parserMap: Record<string, string> = {
      '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript', '.php': 'php',
    };
    const name = parserMap[ext.toLowerCase()];
    if (name && this.parsers[name]) return this.parsers[name]!;
    return null;
  }

  chunkFile(filePath: string, content: string, ext: string): Chunk[] {
    const parser = this._getParser(ext);
    if (parser) {
      try {
        return parser(filePath, content);
      } catch {
        return this._chunkFileRegex(filePath, content, ext);
      }
    }
    return this._chunkFileRegex(filePath, content, ext);
  }

  private _parseJavaScript(filePath: string, content: string): Chunk[] {
    const chunks: Chunk[] = [];
    let ast: { body?: ASTNode[] };
    try {
      const acorn = require('acorn');
      ast = acorn.parse(content, { ecmaVersion: 2020, sourceType: 'module', locations: true });
    } catch {
      return this._chunkFileRegex(filePath, content, '.js');
    }
    this._extractDeclarations(ast, chunks, filePath, content);
    return chunks;
  }

  private _parseTypeScript(filePath: string, content: string): Chunk[] {
    const chunks: Chunk[] = [];
    try {
      const parser = require('@typescript-eslint/parser');
      const ast = parser.parse(content, { ecmaVersion: 2020, sourceType: 'module' });
      this._extractDeclarations(ast, chunks, filePath, content);
    } catch {
      return this._chunkFileRegex(filePath, content, '.ts');
    }
    return chunks;
  }

  private _parsePHP(filePath: string, content: string): Chunk[] {
    const chunks: Chunk[] = [];
    try {
      const parser = require('php-parser');
      const engine = new parser({
        parser: { extractDoc: true, php7: true },
        ast: { withPositions: true, withSource: true },
      });
      const ast = engine.parseCode(content) as PHPNode;
      this._extractPHPDeclarations(ast, chunks, filePath);
    } catch {
      return this._chunkFileRegex(filePath, content, '.php');
    }
    return chunks;
  }

  private _extractDeclarations(
    ast: { body?: ASTNode[] },
    chunks: Chunk[],
    filePath: string,
    content: string
  ): void {
    if (!ast?.body) return;
    for (const node of ast.body) {
      switch (node.type) {
        case 'FunctionDeclaration':
          if (node.id) {
            chunks.push(this._makeChunk(filePath, 'function', node.id.name, content, node));
          }
          break;
        case 'ClassDeclaration':
        case 'ClassExpression':
          if (node.id) {
            chunks.push(this._makeChunk(filePath, 'class', node.id.name, content, node));
            if (node.body?.body) {
              for (const member of node.body.body) {
                if (member.type === 'MethodDefinition' && member.key?.name) {
                  chunks.push({
                    ...this._makeChunk(filePath, 'method', member.key.name, content, member),
                    visibility: this._getMethodVisibility(member),
                  });
                }
              }
            }
          }
          break;
        case 'VariableDeclaration':
          for (const decl of node.declarations ?? []) {
            if (decl.id?.name) {
              chunks.push(this._makeChunk(filePath, 'variable', decl.id.name, content, decl));
            }
          }
          break;
        case 'ExportNamedDeclaration':
        case 'ExportDefaultDeclaration':
          if (node.declaration) {
            const d = node.declaration as ASTNode & { id?: { name: string }; loc?: LocInfo };
            const name = d.id?.name ?? 'default';
            const type = d.type === 'FunctionDeclaration' ? 'exported-function' : 'exported-class';
            chunks.push(this._makeChunk(filePath, type, name, content, d));
          }
          break;
      }
    }
  }

  private _makeChunk(
    filePath: string,
    type: string,
    name: string,
    content: string,
    node: { loc?: { start: { line: number }; end: { line: number } } }
  ): Chunk {
    const startLine = node.loc?.start?.line ?? 1;
    const endLine = node.loc?.end?.line ?? 1;
    return {
      id: this._hashContent(`${filePath}:${type}:${name}`),
      filePath,
      type,
      name,
      content: this._getNodeContent(content, node),
      startLine,
      endLine,
    };
  }

  private _extractPHPDeclarations(ast: PHPNode, chunks: Chunk[], filePath: string): void {
    if (!ast?.children) return;
    for (const node of ast.children) {
      if (node.kind === 'class' && node.name) {
        chunks.push({
          id: this._hashContent(`${filePath}:class:${node.name}`),
          filePath,
          type: 'class',
          name: node.name,
          content: node.src ?? '',
          startLine: node.loc?.start?.line ?? 1,
        });
        if (node.body?.children) {
          for (const member of node.body.children) {
            if (member.kind === 'method' && member.name) {
              chunks.push({
                id: this._hashContent(`${filePath}:method:${member.name}`),
                filePath,
                type: 'method',
                name: member.name,
                visibility: member.visibility ?? 'public',
                content: member.src ?? '',
                startLine: member.loc?.start?.line ?? 1,
              });
            }
          }
        }
      } else if (node.kind === 'function' && node.name) {
        chunks.push({
          id: this._hashContent(`${filePath}:func:${node.name}`),
          filePath,
          type: 'function',
          name: node.name,
          content: node.src ?? '',
          startLine: node.loc?.start?.line ?? 1,
        });
      } else if (node.kind === 'interface' && node.name) {
        chunks.push({
          id: this._hashContent(`${filePath}:interface:${node.name}`),
          filePath,
          type: 'interface',
          name: node.name,
          content: node.src ?? '',
          startLine: node.loc?.start?.line ?? 1,
        });
      }
    }
  }

  private _getMethodVisibility(member: ASTNode): string {
    if ((member as ASTNode & { accessibility?: string }).accessibility) return (member as ASTNode & { accessibility: string }).accessibility;
    if ((member as ASTNode & { static?: boolean }).static) return 'static';
    return 'public';
  }

  private _getNodeContent(content: string, node: { loc?: { start: { line: number }; end: { line: number } } }): string {
    if (node.loc) {
      const lines = content.split('\n');
      const start = node.loc.start.line - 1;
      const end = node.loc.end.line;
      return lines.slice(start, end).join('\n');
    }
    return '';
  }

  private _hashContent(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
  }

  private _chunkFileRegex(filePath: string, content: string, ext: string): Chunk[] {
    const chunks: Chunk[] = [];
    const funcRegex = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|class\s+(\w+))/g;
    let match: RegExpExecArray | null;
    if (ext === '.js' || ext === '.ts' || ext === '.jsx' || ext === '.tsx') {
      while ((match = funcRegex.exec(content)) !== null) {
        const name = match[1] ?? match[2] ?? match[3];
        if (name) {
          chunks.push({
            id: this._hashContent(`${filePath}:${match[0]}:${name}`),
            filePath,
            type: match[3] ? 'class' : 'function',
            name,
            content: match[0],
            startLine: content.substring(0, match.index).split('\n').length,
          });
        }
      }
    } else if (ext === '.php') {
      const classRegex = /class\s+(\w+)/g;
      const funcRegexPhp = /function\s+(\w+)/g;
      while ((match = classRegex.exec(content)) !== null) {
        chunks.push({
          id: this._hashContent(`${filePath}:class:${match[1]}`),
          filePath,
          type: 'class',
          name: match[1],
          content: match[0],
          startLine: content.substring(0, match.index).split('\n').length,
        });
      }
      while ((match = funcRegexPhp.exec(content)) !== null) {
        chunks.push({
          id: this._hashContent(`${filePath}:func:${match[1]}`),
          filePath,
          type: 'function',
          name: match[1],
          content: match[0],
          startLine: content.substring(0, match.index).split('\n').length,
        });
      }
    }
    return chunks;
  }
}

export function createASTChunker(config?: ASTChunkerConfig): ASTChunker {
  return new ASTChunker(config);
}
