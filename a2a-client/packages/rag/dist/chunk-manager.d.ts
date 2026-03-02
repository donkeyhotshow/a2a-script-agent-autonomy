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
    [key: string]: unknown;
}

export declare class ChunkManager {
    private config;

    constructor(config?: ChunkManagerConfig);

    hashContent(content: string): string;

    chunkFile(filePath: string, content: string, ext: string): Chunk[];

    chunkVue(filePath: string, content: string): Chunk[];

    chunkPHP(filePath: string, content: string): Chunk[];

    chunkJS(filePath: string, content: string): Chunk[];

    chunkMarkdown(filePath: string, content: string): Chunk[];

    chunkLines(filePath: string, content: string, chunkSize?: number): Chunk[];

    extractBlock(content: string, startIndex: number): string;
}
