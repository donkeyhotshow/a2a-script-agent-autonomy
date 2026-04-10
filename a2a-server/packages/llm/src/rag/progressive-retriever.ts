import { logger } from '@a2a/server-utils/logger.js';
import type { ServerInterruptTraceEvent } from "../../transform/types.js";
import { globalArtifactStore } from "../core/artifact-store.js";

export class ProgressiveRetriever {
  async retrieve(
    nextCtx: Record<string, unknown>,
    data: Record<string, unknown> | undefined,
  ): Promise<{
    nextCtx: Record<string, unknown>;
    trace: ServerInterruptTraceEvent | null;
  }> {
    const query = typeof data?.query === "string" ? data.query.trim() : "";
    const innerCtx = (nextCtx["context"] as Record<string, unknown>) ?? {};

    if (!query) {
      return { nextCtx, trace: null };
    }

    try {
      // Only Layer 1: Summary Layer (query ArtifactStore)
      let hits: any[] = [];
      const summaryHits = await globalArtifactStore.query({ query });
      if (summaryHits.length > 0) {
        hits = summaryHits.map((h) => ({
          source: "summary_layer",
          type: h.artifact_type,
          content: h.summary,
        }));
      }

      // Graph Layer (Mock) - just marking graph relationships
      hits = hits.map((h) => ({ ...h, graph_links: [] }));

      const prev = innerCtx["ragResults"];
      const combined = Array.isArray(prev) ? [...prev, ...hits] : hits;

      const trace: ServerInterruptTraceEvent = {
        kind: "sidecar_llm",
        purpose: "auto_rag_page",
        ok: true,
        meta: `hits=${hits.length}`,
      };

      const nextInner: Record<string, unknown> = {
        ...innerCtx,
        ragResults: combined,
        _progressive_rag: {
          ok: true,
          query,
          hits_found: hits.length,
        },
      };

      return {
        nextCtx: { ...nextCtx, context: nextInner },
        trace,
      };
    } catch (e) {
      const msg = String(e);
      logger.warn("[Interrupt:progressive_rag] failed", { error: msg });
      const trace: ServerInterruptTraceEvent = {
        kind: "sidecar_llm",
        purpose: "auto_rag_page",
        ok: false,
        meta: msg.slice(0, 120),
      };
      return {
        nextCtx: {
          ...nextCtx,
          context: {
            ...innerCtx,
            _progressive_rag: { ok: false, query, error: msg },
          },
        },
        trace,
      };
    }
  }
}
