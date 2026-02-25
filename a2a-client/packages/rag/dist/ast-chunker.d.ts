/**
 * AST-based Chunking - Parse code using AST
 */
import type { Chunk } from './chunk-manager.js';
export interface ASTChunkerConfig {
    [key: string]: unknown;
}
export declare class ASTChunker {
    private config;
    private parsers;
    constructor(config?: ASTChunkerConfig);
    private _initParsers;
    private _getParser;
    chunkFile(filePath: string, content: string, ext: string): Chunk[];
    private _parseJavaScript;
    private _parseTypeScript;
    private _parsePHP;
    private _extractDeclarations;
    private _makeChunk;
    private _extractPHPDeclarations;
    private _getMethodVisibility;
    private _getNodeContent;
    private _hashContent;
    private _chunkFileRegex;
}
export declare function createASTChunker(config?: ASTChunkerConfig): ASTChunker;
