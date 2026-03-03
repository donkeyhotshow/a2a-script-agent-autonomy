/**
 * RAG Service (Server-side)
 * 
 * Серверная реализация rag-search:
 * - Интеграция с embedding моделями
 * - Векторный поиск по проекту
 * - Кэширование embeddings
 * - API для поиска релевантного кода
 */

import {logger} from '../utils/logger.js';
import {PrismaClient} from '@prisma/client';
import {AIService} from './ai-service.js';

const prisma = new PrismaClient();

export interface SearchQuery {
    query: string;
    projectId?: string;
    fileTypes?: string[];
    limit?: number;
    threshold?: number;
}

export interface SearchResult {
    id: string;
    filePath: string;
    content: string;
    lineStart: number;
    lineEnd: number;
    score: number;
    metadata?: {
        language?: string;
        chunkType?: string;
    };
}

export interface EmbeddingCacheEntry {
    query: string;
    embedding: number[];
    createdAt: number;
}

export interface RAGContext {
    query: string;
    results: SearchResult[];
    contextString: string;
    totalTokens: number;
}

/**
 * Service for Retrieval-Augmented Generation
 */
export class RAGService {
    private static instance: RAGService;
    private aiService: AIService | null = null;
    private embeddingCache: Map<string, EmbeddingCacheEntry> = new Map();
    private readonly cacheTtlMs = 30 * 60 * 1000; // 30 minutes
    private readonly maxCacheSize = 1000;

    private constructor() {
        this.initializeAIService();
        logger.info('[RAGService] Initialized');
    }

    static getInstance(): RAGService {
        if (!RAGService.instance) {
            RAGService.instance = new RAGService();
        }
        return RAGService.instance;
    }

    /**
     * Search for relevant code chunks
     */
    async search(query: SearchQuery): Promise<SearchResult[]> {
        logger.info('[RAGService] Searching', {
            query: query.query.slice(0, 100),
            projectId: query.projectId,
        });

        try {
            // Get query embedding
            const queryEmbedding = await this.getQueryEmbedding(query.query);

            // Search in database
            let results: SearchResult[] = [];

            if (query.projectId) {
                // Search within specific project
                results = await this.searchInProject(query, queryEmbedding);
            } else {
                // Global search across all projects
                results = await this.searchGlobal(query, queryEmbedding);
            }

            // Apply threshold filter
            const threshold = query.threshold ?? 0.5;
            results = results.filter(r => r.score >= threshold);

            // Sort by score and limit results
            results.sort((a, b) => b.score - a.score);
            const limit = query.limit ?? 10;
            results = results.slice(0, limit);

            logger.info('[RAGService] Search complete', {
                resultCount: results.length,
                topScore: results[0]?.score,
            });

            return results;
        } catch (error) {
            logger.error('[RAGService] Search failed', {error: String(error)});
            throw new Error(`RAG search failed: ${String(error)}`);
        }
    }

    /**
     * Build RAG context for LLM
     */
    async buildContext(query: SearchQuery): Promise<RAGContext> {
        const results = await this.search(query);

        // Build context string
        const contextParts: string[] = [];
        let totalTokens = 0;
        const approxTokensPerChar = 0.25;

        for (const result of results) {
            const contextPart = `[${result.filePath}:${result.lineStart}-${result.lineEnd}]\n${result.content}\n`;
            const approxTokens = Math.ceil(contextPart.length * approxTokensPerChar);
            
            // Limit total context to ~4000 tokens
            if (totalTokens + approxTokens > 4000) {
                break;
            }

            contextParts.push(contextPart);
            totalTokens += approxTokens;
        }

        return {
            query: query.query,
            results,
            contextString: contextParts.join('\n---\n'),
            totalTokens,
        };
    }

    /**
     * Index a file's content
     */
    async indexFile(
        fileId: string,
        content: string,
        options: {
            chunkSize?: number;
            chunkOverlap?: number;
        } = {}
    ): Promise<boolean> {
        logger.info('[RAGService] Indexing file', {fileId});

        try {
            const chunkSize = options.chunkSize ?? 500;
            const chunkOverlap = options.chunkOverlap ?? 50;

            // Split content into chunks
            const chunks = this.createChunks(content, chunkSize, chunkOverlap);

            // Generate embeddings and store
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                
                // Skip if chunk is too small
                if (chunk.content.length < 50) continue;

                try {
                    const embedding = await this.generateEmbedding(chunk.content);
                    
                    // Store in database
                    await prisma.embedding.create({
                        data: {
                            id: `${fileId}_${i}`,
                            fileId,
                            chunkType: chunk.type,
                            lineStart: chunk.lineStart,
                            lineEnd: chunk.lineEnd,
                            content: chunk.content,
                            metadata: {
                                embedding,
                            },
                        },
                    });
                } catch (err) {
                    logger.warn('[RAGService] Failed to index chunk', {
                        fileId,
                        chunkIndex: i,
                        error: String(err),
                    });
                }
            }

            logger.info('[RAGService] File indexed', {
                fileId,
                chunkCount: chunks.length,
            });

            return true;
        } catch (error) {
            logger.error('[RAGService] Failed to index file', {error: String(error)});
            return false;
        }
    }

    /**
     * Clear embedding cache
     */
    clearCache(): void {
        this.embeddingCache.clear();
        logger.info('[RAGService] Cache cleared');
    }

    /**
     * Get cache stats
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
    } {
        return {
            size: this.embeddingCache.size,
            maxSize: this.maxCacheSize,
            hitRate: 0, // Would need to track hits/misses
        };
    }

    // ============== Private Methods ==============

    private initializeAIService(): void {
        try {
            const proxyUrl = process.env.AI_HUB_URL || 'http://localhost:11434';
            this.aiService = new AIService({
                proxy: {
                    baseUrl: proxyUrl,
                },
            });
        } catch (error) {
            logger.warn('[RAGService] Failed to initialize AI service', {
                error: String(error),
            });
        }
    }

    private async getQueryEmbedding(query: string): Promise<number[]> {
        // Check cache
        const cacheKey = this.hashQuery(query);
        const cached = this.embeddingCache.get(cacheKey);
        
        if (cached && Date.now() - cached.createdAt < this.cacheTtlMs) {
            return cached.embedding;
        }

        // Generate embedding
        const embedding = await this.generateEmbedding(query);

        // Cache result
        if (this.embeddingCache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const oldestKey = this.embeddingCache.keys().next().value;
            if (oldestKey) {
                this.embeddingCache.delete(oldestKey);
            }
        }

        this.embeddingCache.set(cacheKey, {
            query,
            embedding,
            createdAt: Date.now(),
        });

        return embedding;
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        if (!this.aiService) {
            // Return mock embedding for testing
            logger.warn('[RAGService] AI service not available, using mock embedding');
            return this.createMockEmbedding(text);
        }

        try {
            const result = await this.aiService.createEmbedding(text);
            return result.embedding;
        } catch (error) {
            logger.warn('[RAGService] Failed to generate embedding, using mock', {
                error: String(error),
            });
            return this.createMockEmbedding(text);
        }
    }

    private createMockEmbedding(text: string): number[] {
        // Create deterministic mock embedding based on text hash
        const dimensions = 384; // Common embedding size
        const embedding: number[] = [];
        
        // Simple hash-based pseudo-embedding
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash = hash & hash;
        }

        const seed = Math.abs(hash);
        for (let i = 0; i < dimensions; i++) {
            // Generate pseudo-random values between -1 and 1
            const value = Math.sin(seed + i * 0.1) * Math.cos(seed + i * 0.2);
            embedding.push(value);
        }

        // Normalize
        const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
        return embedding.map(v => v / magnitude);
    }

    private async searchInProject(
        query: SearchQuery,
        queryEmbedding: number[]
    ): Promise<SearchResult[]> {
        // Get embeddings for project files
        const embeddings = await prisma.embedding.findMany({
            where: {
                file: {
                    projectId: query.projectId,
                },
            },
            include: {
                file: true,
            },
        });

        // Filter by file type if specified
        let filteredEmbeddings = embeddings;
        if (query.fileTypes && query.fileTypes.length > 0) {
            filteredEmbeddings = embeddings.filter(e =>
                query.fileTypes!.some(type => 
                    e.file.path.endsWith(type) || e.file.language === type
                )
            );
        }

        // Calculate similarities and return results
        return filteredEmbeddings.map(e => {
            const embedding = (e.metadata as {embedding?: number[]})?.embedding || [];
            const score = this.calculateCosineSimilarity(queryEmbedding, embedding);
            
            return {
                id: e.id,
                filePath: e.file.path,
                content: e.content,
                lineStart: e.lineStart,
                lineEnd: e.lineEnd,
                score,
                metadata: {
                    language: e.file.language || undefined,
                    chunkType: e.chunkType,
                },
            };
        });
    }

    private async searchGlobal(
        query: SearchQuery,
        queryEmbedding: number[]
    ): Promise<SearchResult[]> {
        // Get all embeddings (with limit)
        const embeddings = await prisma.embedding.findMany({
            take: 10000,
            include: {
                file: true,
            },
        });

        // Filter by file type if specified
        let filteredEmbeddings = embeddings;
        if (query.fileTypes && query.fileTypes.length > 0) {
            filteredEmbeddings = embeddings.filter(e =>
                query.fileTypes!.some(type => 
                    e.file.path.endsWith(type) || e.file.language === type
                )
            );
        }

        // Calculate similarities
        return filteredEmbeddings.map(e => {
            const embedding = (e.metadata as {embedding?: number[]})?.embedding || [];
            const score = this.calculateCosineSimilarity(queryEmbedding, embedding);
            
            return {
                id: e.id,
                filePath: e.file.path,
                content: e.content,
                lineStart: e.lineStart,
                lineEnd: e.lineEnd,
                score,
                metadata: {
                    language: e.file.language || undefined,
                    chunkType: e.chunkType,
                },
            };
        });
    }

    private calculateCosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length || a.length === 0) {
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private createChunks(
        content: string,
        chunkSize: number,
        chunkOverlap: number
    ): Array<{
        content: string;
        type: string;
        lineStart: number;
        lineEnd: number;
    }> {
        const lines = content.split('\n');
        const chunks: Array<{
            content: string;
            type: string;
            lineStart: number;
            lineEnd: number;
        }> = [];

        let currentChunk: string[] = [];
        let currentStart = 0;

        for (let i = 0; i < lines.length; i++) {
            currentChunk.push(lines[i]);

            const chunkContent = currentChunk.join('\n');
            if (chunkContent.length >= chunkSize || i === lines.length - 1) {
                chunks.push({
                    content: chunkContent,
                    type: this.detectChunkType(chunkContent),
                    lineStart: currentStart + 1,
                    lineEnd: i + 1,
                });

                // Overlap for next chunk
                const overlapLines = Math.floor(chunkOverlap / 50); // Approximate lines
                currentChunk = currentChunk.slice(-overlapLines);
                currentStart = i - overlapLines + 1;
            }
        }

        return chunks;
    }

    private detectChunkType(content: string): string {
        // Simple heuristics for chunk type detection
        if (content.includes('function') || content.includes('=>') || content.includes('def ')) {
            return 'FUNCTION';
        }
        if (content.includes('class') || content.includes('interface')) {
            return 'CLASS';
        }
        if (content.includes('import') || content.includes('require')) {
            return 'IMPORT';
        }
        if (content.includes('/*') || content.includes('//') || content.includes('#')) {
            return 'COMMENT';
        }
        return 'BLOCK';
    }

    private hashQuery(query: string): string {
        // Simple hash function for query caching
        let hash = 0;
        for (let i = 0; i < query.length; i++) {
            const char = query.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `query_${Math.abs(hash)}`;
    }
}

// Export singleton instance
export const ragService = RAGService.getInstance();
