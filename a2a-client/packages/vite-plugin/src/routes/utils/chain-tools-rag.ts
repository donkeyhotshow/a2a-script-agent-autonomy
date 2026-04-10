import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { DEFAULT_RAG_SEARCH_MAX_RESULTS } from '@a2a-client/shared/agent-rag-chain-depth.js';

export async function runClientRagSearchForExecute(cwd, projectPath, ragPayload) {
    const query = ragPayload && typeof ragPayload.query === 'string' ? ragPayload.query : '';
    if (!query.trim()) {
        return { query: '', results: [], files: [], error: 'missing query' };
    }

    const viteRoot = typeof cwd === 'string' && cwd.trim() ? cwd : process.cwd();
    const distPath = path.join(viteRoot, 'packages', 'rag', 'dist', 'searcher', 'rag-searcher.ts');
    if (!fs.existsSync(distPath)) {
        console.error('[VitePlugin] RAG dist missing at', distPath, '— run: npm run build --prefix packages/rag');
        return { query, results: [], files: [], error: 'rag module not built' };
    }

    try {
        const mod = await import(pathToFileURL(distPath).href);
        const RAGSearcher = mod.RAGSearcher;
        if (!RAGSearcher) {
            return { query, results: [], files: [], error: 'RAGSearcher export missing' };
        }
        const ragRoot =
            typeof projectPath === 'string' && projectPath.trim() ? projectPath : viteRoot;
        const searcher = new RAGSearcher({ projectPath: ragRoot });
        const protocol = await searcher.searchWithProtocol(query, {
            maxResults:
                typeof ragPayload.limit === 'number' ? ragPayload.limit : DEFAULT_RAG_SEARCH_MAX_RESULTS,
            page: ragPayload.page,
            pageSize: ragPayload.pageSize,
        });
        return { query: protocol.query ?? query, ...protocol };
    } catch (e) {
        console.error('[VitePlugin] RAG search failed:', e?.message || e);
        return { query, results: [], files: [], error: e?.message || String(e) };
    }
}
