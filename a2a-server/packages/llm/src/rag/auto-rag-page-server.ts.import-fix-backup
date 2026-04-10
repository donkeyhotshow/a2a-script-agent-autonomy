/**
 * Optional server-side RAG for gray-room `interrupt.reason === 'auto_rag_page'`.
 * Disabled - RAG functionality removed from server.
 */

import { logger } from "../../utils/logger.js";
import type { ServerInterruptTraceEvent } from "../../transform/types.js";

/** Compact RAG hit lines for `context.history` (system role) after server-side `auto_rag_page`. */
export function formatRagHitsForHistory(
  entries: Array<Record<string, unknown>>,
  query: string,
  maxLines = 16,
): string {
  if (!entries.length) {
    return `RAG: query="${query}" — no hits`;
  }
  const lines = entries.slice(0, maxLines).map((e, i) => {
    const p =
      (typeof e.path === "string" && e.path) ||
      (typeof e.file === "string" && e.file) ||
      "?";
    const sc =
      typeof e.score === "number" && Number.isFinite(e.score)
        ? ` score=${e.score.toFixed(3)}`
        : "";
    return `${i + 1}. ${p}${sc}`;
  });
  const more =
    entries.length > maxLines ? `\n… +${entries.length - maxLines} more` : "";
  return `RAG (${query}):\n${lines.join("\n")}${more}`;
}

// RAG functionality disabled - server does not manage project paths

/**
 * RAG functionality disabled - server does not perform RAG searches.
 */
export async function mergeServerRagPageIntoContext(
  nextCtx: Record<string, unknown>,
  data: Record<string, unknown> | undefined,
): Promise<{
  nextCtx: Record<string, unknown>;
  trace: ServerInterruptTraceEvent | null;
}> {
  // RAG disabled - return unchanged context
  return { nextCtx, trace: null };
}
