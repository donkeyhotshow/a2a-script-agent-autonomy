/**
 * Pre-build and cache RAG indexes
 * Run this after indexing or once to build caches
 */
import { createRAG } from '../dist/index.js';

const PROJECT_PATH = 'C:\\workspace\\domain-platform\\websitestore.com.ua';

async function main() {
    console.log('=== RAG Pre-build Indexes ===\n');
    
    const rag = createRAG({ projectPath: PROJECT_PATH });
    
    console.log('Loading index...');
    await rag.searcher.loadIndex();
    
    console.log('\nPre-building all indexes (this may take a while)...');
    await rag.searcher.prebuildIndexes();
    
    console.log('\n=== Done! Cached indexes saved. ===');
    console.log('Future searches will be much faster.');
}

main().catch(console.error);
