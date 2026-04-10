/**
 * Test optimization combinations with timeout
 */
import { createRAG } from '../dist/index.js';

const PROJECT_PATH = 'C:\\workspace\\domain-platform\\websitestore.com.ua';
const TIMEOUT_MS = 10000; // 10 second timeout

async function testWithTimeout(name, options = {}) {
    return new Promise(async (resolve) => {
        const timeout = setTimeout(() => {
            console.log(`\n[TIMEOUT] ${name} - превышен таймаут 10s`);
            resolve(null);
        }, TIMEOUT_MS);
        
        try {
            const rag = createRAG({ projectPath: PROJECT_PATH });
            await rag.searcher.loadIndex();
            
            const query = 'Vue components export';
            const start = Date.now();
            const results = await rag.searcher.search(query, { limit: 3, ...options });
            const time = Date.now() - start;
            
            clearTimeout(timeout);
            
            console.log(`\n=== ${name} (${time}ms) ===`);
            results.forEach((x, i) => console.log(i+1 + '.', x.chunk.filePath.split('/').pop(), x.score.toFixed(2)));
            
            resolve(time);
        } catch (e) {
            clearTimeout(timeout);
            console.log(`\n[ERROR] ${name}:`, e.message);
            resolve(null);
        }
    });
}

async function main() {
    console.log('=== Performance Test (limit=3, timeout=10s) ===');
    
    const results = [];
    
    // Test 1: Pure keyword
    results.push({ name: '1. Keyword only', time: await testWithTimeout('Keyword only', {}) });
    
    // Test 2: With BM25 (cached)
    results.push({ name: '2. +BM25', time: await testWithTimeout('+BM25', { useBM25: true }) });
    
    // Test 3: Skip similarity - it's too slow without cache
    
    console.log('\n=== Summary ===');
    results.forEach(r => {
        if (r.time) console.log(`${r.name}: ${r.time}ms`);
    });
}

main().catch(console.error);
