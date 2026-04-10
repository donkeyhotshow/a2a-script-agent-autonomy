/**
 * RAG action handler for API Client
 */

import type { HandleActionOptions, HandleActionResult } from '../action-handler.js';

/**
 * Handle rag-search action
 */
export async function handleRagSearchAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const ragPayload = payload as { query?: string; limit?: number; filters?: Record<string, unknown> };
    
    if (!ragPayload?.query) {
        return { handled: false, error: 'No query in rag-search action' };
    }
    
    if (!options.ragSearch) {
        return { handled: false, error: 'ragSearch handler not provided' };
    }
    
    try {
        const result = await options.ragSearch(ragPayload.query, {
            limit: ragPayload.limit,
            filters: ragPayload.filters
        });
        
        return {
            handled: true,
            actionType: 'rag-search',
            result: {
                'rag-search': {
                    query: ragPayload.query,
                    results: result.success ? result.results : [],
                    error: result.error
                }
            }
        };
    } catch (err) {
        return {
            handled: true,
            actionType: 'rag-search',
            result: {
                'rag-search': {
                    query: ragPayload.query,
                    results: [],
                    error: err instanceof Error ? err.message : String(err)
                }
            }
        };
    }
}