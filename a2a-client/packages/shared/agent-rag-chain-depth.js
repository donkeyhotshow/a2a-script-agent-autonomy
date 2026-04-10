/** Default `maxResults` when the server omits `rag-search.limit` (Vite + SDK). */
export const DEFAULT_RAG_SEARCH_MAX_RESULTS = 20;

/** Max client-side agent tool / RAG re-invoke iterations (Vite + SDK). */
export function getMaxRagChainDepth() {
    const v = process.env.A2A_AGENT_RAG_CHAIN_MAX ?? process.env.A2A_AGENT_TOOL_CHAIN_MAX;
    if (v === '0' || v === 'false') return 0;
    const n = parseInt(v ?? '8', 10);
    return Number.isFinite(n) && n >= 0 ? n : 8;
}
