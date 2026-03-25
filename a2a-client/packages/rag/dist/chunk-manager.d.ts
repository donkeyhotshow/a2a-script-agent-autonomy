/**
 * Chunk Manager - Manages code chunking for RAG
 */
export interface Chunk {
    id: string;
    filePath: string;
    type: string;
    name?: string;
    content: string;
    startLine: number;
    endLine?: number;
    visibility?: string;
    method?: string;
}
export interface ChunkManagerConfig {
    /**
     * Enable AST-based chunking for supported languages
     * @default true
     */
    useAST?: boolean;
    /**
     * Fallback to regex chunking if AST parsing fails
     * @default true
     */
    fallbackToRegex?: boolean;
    [key: string]: unknown;
}
export declare class ChunkManager {
    private config;
    private astChunker;
    constructor(config?: ChunkManagerConfig);
    hashContent(content: string): string;
    chunkFile(filePath: string, content: string, ext: string): Chunk[];
    /**
     * Attempt AST-based chunking for supported languages
     * Returns empty array if AST parsing fails or language not supported
     */
    private tryASTChunking;
    chunkVue(filePath: string, content: string): Chunk[];
    chunkPHP(filePath: string, content: string): Chunk[];
    chunkJS(filePath: string, content: string): Chunk[];
    chunkMarkdown(filePath: string, content: string): Chunk[];
    chunkLines(filePath: string, content: string, chunkSize?: number): Chunk[];
    extractBlock(content: string, startIndex: number): string;
}
