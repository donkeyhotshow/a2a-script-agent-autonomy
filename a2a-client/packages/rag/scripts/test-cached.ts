/**
 * Test cached BM25 scoring
 */
import { createRAG } from '../dist/index.js';

const PROJECT_PATH = 'C:\\workspace\\domain-platform\\websitestore.com.ua';

async function main() {
    const rag = createRAG({ projectPath: PROJECT_PATH });
    await rag.searcher.loadIndex();
    
    const query = 'Vue components export';
    
    console.log('=== WITHOUT extra engines (keyword only) ===');
    const start1 = Date.now();
    const r1 = await rag.searcher.search(query, { limit: 5 });
    console.log('Time:', Date.now() - start1, 'ms');
    r1.forEach((x, i) => console.log(i+1 + '.', x.chunk.filePath, x.score.toFixed(2)));

    console.log('\n=== WITH BM25 (cached) ===');
    const start2 = Date.now();
    const r2 = await rag.searcher.search(query, { limit: 5, useBM25: true });
    console.log('Time:', Date.now() - start2, 'ms');
    r2.forEach((x, i) => console.log(i+1 + '.', x.chunk.filePath, x.score.toFixed(2)));
}

main().catch(console.error);
