/**
 * Test different scoring methods
 */
import { createRAG } from '../dist/index.js';

const PROJECT_PATH = 'C:\\workspace\\domain-platform\\websitestore.com.ua';

async function main() {
    const rag = createRAG({ projectPath: PROJECT_PATH });
    await rag.searcher.loadIndex();
    
    const query = 'Vue components export';
    
    console.log('=== WITHOUT extra engines (keyword only) ===');
    const r1 = await rag.searcher.search(query, { limit: 5 });
    r1.forEach((x, i) => console.log(i+1 + '.', x.chunk.filePath, x.score.toFixed(2)));

    console.log('\n=== WITH BM25 ===');
    const r2 = await rag.searcher.search(query, { limit: 5, useBM25: true });
    r2.forEach((x, i) => console.log(i+1 + '.', x.chunk.filePath, x.score.toFixed(2)));

    console.log('\n=== WITH similarity ===');
    const r3 = await rag.searcher.search(query, { limit: 5, useCodeSimilarity: true });
    r3.forEach((x, i) => console.log(i+1 + '.', x.chunk.filePath, x.score.toFixed(2)));

    console.log('\n=== WITH both ===');
    const r4 = await rag.searcher.search(query, { limit: 5, useBM25: true, useCodeSimilarity: true });
    r4.forEach((x, i) => console.log(i+1 + '.', x.chunk.filePath, x.score.toFixed(2)));
}

main().catch(console.error);
