/**
 * Agent RAG Chain Limits Configuration
 * 
 * Provides safe defaults for RAG-related environment variables with verified fallback behavior.
 * - A2A_AGENT_RAG_CHAIN_MAX: Maximum number of RAG search operations in a chain (default: 5)
 * - A2A_RAG_PROJECT_PATH: Project path for RAG indexing (used by auto-rag-page-server.ts)
 */

import {logger} from '../../utils/logger.js';

/**
 * Default chain limit for RAG operations in agent flows.
 * Prevents excessive RAG search chains that could impact performance.
 */
export const DEFAULT_RAG_CHAIN_MAX = 5;

/**
 * Maximum allowed value for RAG chain limit (safety cap).
 */
export const MAX_RAG_CHAIN_LIMIT = 20;

/**
 * Minimum allowed value for RAG chain limit.
 */
export const MIN_RAG_CHAIN_LIMIT = 1;

/**
 * Get the configured RAG chain maximum limit.
 * Falls back to DEFAULT_RAG_CHAIN_MAX (5) if not set or invalid.
 */
export function getRagChainMax(): number {
    const envValue = process.env.A2A_AGENT_RAG_CHAIN_MAX?.trim();
    
    if (!envValue) {
        logger.debug('[RAG Chain] Using default limit', { default: DEFAULT_RAG_CHAIN_MAX });
        return DEFAULT_RAG_CHAIN_MAX;
    }
    
    const parsed = parseInt(envValue, 10);
    
    if (isNaN(parsed)) {
        logger.warn('[RAG Chain] Invalid A2A_AGENT_RAG_CHAIN_MAX value, using default', { 
            provided: envValue, 
            default: DEFAULT_RAG_CHAIN_MAX 
        });
        return DEFAULT_RAG_CHAIN_MAX;
    }
    
    // Clamp to safe bounds
    const clamped = Math.min(Math.max(parsed, MIN_RAG_CHAIN_LIMIT), MAX_RAG_CHAIN_LIMIT);
    
    if (clamped !== parsed) {
        logger.warn('[RAG Chain] A2A_AGENT_RAG_CHAIN_MAX outside bounds, clamping', { 
            provided: parsed, 
            clamped 
        });
    }
    
    logger.debug('[RAG Chain] Configured limit', { limit: clamped });
    return clamped;
}

/**
 * Get the RAG project path from environment.
 * Returns null if not configured (triggers fallback in auto-rag-page-server.ts).
 */
export function getRagProjectPath(): string | null {
    const envValue = process.env.A2A_RAG_PROJECT_PATH?.trim();
    
    if (!envValue) {
        logger.debug('[RAG] A2A_RAG_PROJECT_PATH not set');
        return null;
    }
    
    return envValue;
}

/**
 * Check if RAG chain limits are properly configured.
 * Useful for diagnostics and validation.
 */
export function getRagConfigDiagnostics(): {
    chainMax: number;
    projectPath: string | null;
    chainMaxSource: 'env' | 'default';
    projectPathSource: 'env' | 'none';
} {
    const chainMaxEnv = process.env.A2A_AGENT_RAG_CHAIN_MAX?.trim();
    const chainMax = getRagChainMax();
    const projectPath = getRagProjectPath();
    
    return {
        chainMax,
        projectPath,
        chainMaxSource: chainMaxEnv ? 'env' : 'default',
        projectPathSource: projectPath ? 'env' : 'none',
    };
}