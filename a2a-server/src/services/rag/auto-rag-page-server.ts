/**
 * Optional server-side RAG for gray-room `interrupt.reason === 'auto_rag_page'`.
 * Enabled when `data.query` is non-empty and `data.projectPath` or env `A2A_RAG_PROJECT_PATH` points at a workspace to index.
 */

import path from 'node:path';
import {logger} from '../../utils/logger.js';
import type {ServerInterruptTraceEvent} from '../../transform/types.js';
import type {RAGClientService} from '@a2a/rag';

let singleton: {projectPath: string; service: RAGClientService; initDone: Promise<void>} | null = null;

/** Compact RAG hit lines for `context.history` (system role) after server-side `auto_rag_page`. */
export function formatRagHitsForHistory(
    entries: Array<Record<string, unknown>>,
    query: string,
    maxLines = 16
): string {
    if (!entries.length) {
        return `RAG: query="${query}" — no hits`;
    }
    const lines = entries.slice(0, maxLines).map((e, i) => {
        const p = (typeof e.path === 'string' && e.path) || (typeof e.file === 'string' && e.file) || '?';
        const sc = typeof e.score === 'number' && Number.isFinite(e.score) ? ` score=${e.score.toFixed(3)}` : '';
        return `${i + 1}. ${p}${sc}`;
    });
    const more = entries.length > maxLines ? `\n… +${entries.length - maxLines} more` : '';
    return `RAG (${query}):\n${lines.join('\n')}${more}`;
}

function resolveProjectPath(data?: Record<string, unknown>): string | null {
    const d = typeof data?.projectPath === 'string' ? data.projectPath.trim() : '';
    if (d) return path.resolve(d);
    const env = process.env.A2A_RAG_PROJECT_PATH?.trim();
    return env ? path.resolve(env) : null;
}

/**
 * Runs `@a2a/rag` search and merges hits into `context.ragResults` (append). No-op when query or project path missing.
 */
export async function mergeServerRagPageIntoContext(
    nextCtx: Record<string, unknown>,
    data: Record<string, unknown> | undefined
): Promise<{nextCtx: Record<string, unknown>; trace: ServerInterruptTraceEvent | null}> {
    const query = typeof data?.query === 'string' ? data.query.trim() : '';
    const projectPath = resolveProjectPath(data);
    const innerCtx = (nextCtx['context'] as Record<string, unknown>) ?? {};

    if (!query || !projectPath) {
        return {nextCtx, trace: null};
    }

    try {
        const mod = await import('@a2a/rag');
        if (!singleton || singleton.projectPath !== projectPath) {
            const service = mod.createRAGClientService({projectPath});
            singleton = {
                projectPath,
                service,
                initDone: service.initialize().then(() => {}),
            };
        }
        await singleton.initDone;

        const limitRaw = data?.limit;
        const limit =
            typeof limitRaw === 'number' && Number.isFinite(limitRaw)
                ? Math.min(50, Math.max(1, Math.floor(limitRaw)))
                : 10;

        const out = await singleton.service.search({
            query,
            limit,
        });

        const entries = out.success && out.results?.results ? out.results.results : [];
        const prev = innerCtx['ragResults'];
        const combined = Array.isArray(prev) ? [...prev, ...entries] : entries;

        const trace: ServerInterruptTraceEvent = {
            kind: 'sidecar_llm',
            purpose: 'auto_rag_page',
            ok: out.success,
            meta: out.success ? `hits=${entries.length}` : (out.error ?? 'search_failed').slice(0, 120),
        };

        const nextInner: Record<string, unknown> = {
            ...innerCtx,
            ragResults: combined,
            _server_rag_page: {
                ok: out.success,
                query,
                projectPath,
                ...(out.error ? {error: out.error} : {}),
            },
        };
        if (entries.length > 0) {
            nextInner['history'] = history;
        }

        return {
            nextCtx: {
                ...nextCtx,
                context: nextInner,
            },
            trace,
        };
    } catch (e) {
        const msg = String(e);
        logger.warn('[Interrupt:auto_rag_page] server RAG failed', {error: msg});
        const trace: ServerInterruptTraceEvent = {
            kind: 'sidecar_llm',
            purpose: 'auto_rag_page',
            ok: false,
            meta: msg.slice(0, 120),
        };
        return {
            nextCtx: {
                ...nextCtx,
                context: {
                    ...innerCtx,
                    _server_rag_page: {ok: false, query, projectPath, error: msg},
                },
            },
            trace,
        };
    }
}
