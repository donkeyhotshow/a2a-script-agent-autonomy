import path from 'node:path';
import { logger } from '../../utils/logger.js';
import type { ServerInterruptTraceEvent } from '../../transform/types.js';
import { globalArtifactStore } from '../core/artifact-store.js';

let singleton: { projectPath: string; service: any; initDone: Promise<void> } | null = null;

function resolveProjectPath(data?: Record<string, unknown>): string | null {
    const d = typeof data?.projectPath === 'string' ? data.projectPath.trim() : '';
    if (d) return path.resolve(d);
    const env = process.env.A2A_RAG_PROJECT_PATH?.trim();
    return env ? path.resolve(env) : null;
}

export class ProgressiveRetriever {
    async retrieve(
        nextCtx: Record<string, unknown>,
        data: Record<string, unknown> | undefined
    ): Promise<{ nextCtx: Record<string, unknown>; trace: ServerInterruptTraceEvent | null }> {
        const query = typeof data?.query === 'string' ? data.query.trim() : '';
        const projectPath = resolveProjectPath(data);
        const innerCtx = (nextCtx['context'] as Record<string, unknown>) ?? {};

        if (!query || !projectPath) {
            return { nextCtx, trace: null };
        }

        try {
            // Layer 1: Summary Layer (query ArtifactStore)
            let hits: any[] = [];
            const summaryHits = await globalArtifactStore.query({});
            if (summaryHits.length > 0) {
                hits = summaryHits.map(h => ({ source: 'summary_layer', type: h.artifact_type, content: h.summary }));
            }

            // Layer 2: Deep Layer (RAG search) if confidence is low (for mock, always run if < 3 summary hits)
            if (hits.length < 3) {
                const mod = await import('@a2a/rag');
                if (!singleton || singleton.projectPath !== projectPath) {
                    const service = mod.createRAGClientService({ projectPath });
                    singleton = { projectPath, service, initDone: service.initialize().then(() => {}) };
                }
                await singleton.initDone;

                const limitRaw = data?.limit;
                const limit = typeof limitRaw === 'number' && Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.floor(limitRaw))) : 10;
                
                const out = await singleton.service.search({ query, limit });
                const entries = out.success && out.results?.results ? out.results.results : [];
                
                if (entries.length > 0) {
                    hits = [...hits, ...entries.map((e: any) => ({ ...e, source: 'deep_layer' }))];
                }
            }

            // 3. Graph Layer (Mock)
            // Just marking graph relationships
            hits = hits.map(h => ({ ...h, graph_links: [] }));

            const prev = innerCtx['ragResults'];
            const combined = Array.isArray(prev) ? [...prev, ...hits] : hits;

            const trace: ServerInterruptTraceEvent = {
                kind: 'sidecar_llm',
                purpose: 'auto_rag_page',
                ok: true,
                meta: `hits=${hits.length}`,
            };

            const nextInner: Record<string, unknown> = {
                ...innerCtx,
                ragResults: combined,
                _progressive_rag: {
                    ok: true,
                    query,
                    projectPath,
                    hits_found: hits.length
                },
            };

            return {
                nextCtx: { ...nextCtx, context: nextInner },
                trace,
            };
        } catch (e) {
            const msg = String(e);
            logger.warn('[Interrupt:progressive_rag] failed', { error: msg });
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
                        _progressive_rag: { ok: false, query, projectPath, error: msg },
                    },
                },
                trace,
            };
        }
    }
}
