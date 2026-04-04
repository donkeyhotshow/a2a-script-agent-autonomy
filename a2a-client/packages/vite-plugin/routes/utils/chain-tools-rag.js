import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export async function runClientRagSearchForExecute(cwd, projectPath, ragPayload) {
    const query = ragPayload && typeof ragPayload.query === 'string' ? ragPayload.query : '';
    if (!query.trim()) {
        return { query: '', results: [], files: [], error: 'missing query' };
    }

    const distPath = path.join(cwd, 'packages', 'rag', 'dist', 'searcher', 'rag-searcher.js');
    if (!fs.existsSync(distPath)) {
        console.warn('[VitePlugin] RAG dist missing at', distPath, '— run: npm run build --prefix packages/rag');
        return { query, results: [], files: [], error: 'rag module not built' };
    }

    try {
        const mod = await import(pathToFileURL(distPath).href);
        const RAGSearcher = mod.RAGSearcher;
        if (!RAGSearcher) {
            return { query, results: [], files: [], error: 'RAGSearcher export missing' };
        }
        const searcher = new RAGSearcher({ projectPath });
        const protocol = await searcher.searchWithProtocol(query, {
            maxResults: ragPayload.limit ?? 20,
            page: ragPayload.page,
            pageSize: ragPayload.pageSize,
        });
        return { query: protocol.query ?? query, ...protocol };
    } catch (e) {
        console.error('[VitePlugin] RAG search failed:', e?.message || e);
        return { query, results: [], files: [], error: e?.message || String(e) };
    }
}
