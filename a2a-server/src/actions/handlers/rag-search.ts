/**
 * Action Handler: rag-search
 * 
 * Handles RAG (Retrieval-Augmented Generation) search actions.
 */

import {logger} from '../../utils/logger.js';
import {
    ragService,
    type SearchQuery,
    type SearchResult,
} from '../../services/rag.service.js';

export interface RagSearchActionInput {
    query: string;
    projectId?: string;
    fileTypes?: string[];
    limit?: number;
    threshold?: number;
    buildContext?: boolean;
}

export interface RagIndexActionInput {
    fileId: string;
    content: string;
    chunkSize?: number;
    chunkOverlap?: number;
}

export interface RagSearchActionOutput {
    success: boolean;
    results?: SearchResult[];
    contextString?: string;
    totalTokens?: number;
    resultCount?: number;
    error?: string;
}

export interface RagIndexActionOutput {
    success: boolean;
    indexed?: boolean;
    error?: string;
}

/**
 * Execute rag-search action
 */
export async function executeRagSearch(
    input: RagSearchActionInput
): Promise<RagSearchActionOutput> {
    logger.info('[rag-search] Executing', {
        query: input.query.slice(0, 100),
        projectId: input.projectId,
        buildContext: input.buildContext,
    });

    try {
        const searchQuery: SearchQuery = {
            query: input.query,
            projectId: input.projectId,
            fileTypes: input.fileTypes,
            limit: input.limit,
            threshold: input.threshold,
        };

        if (input.buildContext) {
            // Build full RAG context
            const context = await ragService.buildContext(searchQuery);

            logger.info('[rag-search] Context built', {
                resultCount: context.results.length,
                totalTokens: context.totalTokens,
            });

            return {
                success: true,
                results: context.results,
                contextString: context.contextString,
                totalTokens: context.totalTokens,
                resultCount: context.results.length,
            };
        } else {
            // Just search for results
            const results = await ragService.search(searchQuery);

            logger.info('[rag-search] Search complete', {
                resultCount: results.length,
            });

            return {
                success: true,
                results,
                resultCount: results.length,
            };
        }
    } catch (error) {
        logger.error('[rag-search] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute rag-index action
 */
export async function executeRagIndex(
    input: RagIndexActionInput
): Promise<RagIndexActionOutput> {
    logger.info('[rag-index] Executing', {fileId: input.fileId});

    try {
        const indexed = await ragService.indexFile(
            input.fileId,
            input.content,
            {
                chunkSize: input.chunkSize,
                chunkOverlap: input.chunkOverlap,
            }
        );

        logger.info('[rag-index] Indexing complete', {
            fileId: input.fileId,
            indexed,
        });

        return {
            success: true,
            indexed,
        };
    } catch (error) {
        logger.error('[rag-index] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute rag-clear-cache action
 */
export async function executeRagClearCache(): Promise<{
    success: boolean;
}> {
    logger.info('[rag-clear-cache] Executing');

    try {
        ragService.clearCache();

        return {
            success: true,
        };
    } catch (error) {
        logger.error('[rag-clear-cache] Execution failed', {error: String(error)});
        return {
            success: false,
        };
    }
}

/**
 * Execute rag-get-cache-stats action
 */
export async function executeRagGetCacheStats(): Promise<{
    success: boolean;
    stats?: {
        size: number;
        maxSize: number;
        hitRate: number;
    };
}> {
    logger.info('[rag-get-cache-stats] Executing');

    try {
        const stats = ragService.getCacheStats();

        return {
            success: true,
            stats,
        };
    } catch (error) {
        logger.error('[rag-get-cache-stats] Execution failed', {error: String(error)});
        return {
            success: false,
        };
    }
}
