/** Max client-side agent tool / RAG re-invoke iterations (Vite + SDK). */
export function getMaxRagChainDepth() {
    const v = process.env.A2A_AGENT_RAG_CHAIN_MAX ?? process.env.A2A_AGENT_TOOL_CHAIN_MAX;
    if (v === '0' || v === 'false') return 0;
    const n = parseInt(v ?? '8', 10);
    return Number.isFinite(n) && n >= 0 ? n : 8;
}
