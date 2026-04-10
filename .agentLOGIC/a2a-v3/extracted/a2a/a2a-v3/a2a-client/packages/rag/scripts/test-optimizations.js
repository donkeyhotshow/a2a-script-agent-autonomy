/**
 * Test all optimization combinations
 */
import { createRAG } from '../dist/index.js';

const PROJECT_PATH = 'C:\\workspace\\domain-platform\\websitestore.com.ua';

async function test(name, options = {}) {
    const rag = createRAG({ projectPath: PROJECT_PATH });
    await rag.searcher.loadIndex();
    
    const query = 'Vue components export';
    const start = Date.now();
    const results = await rag.searcher.search(query, { limit: 3, ...options });
    const time = Date.now() - start;
    
    console.log(`\n=== ${name} (${time}ms) ===`);
    results.forEach((x, i) => console.log(i+1 + '.', x.chunk.filePath.split('/').pop(), x.score.toFixed(2)));
    
    return time;
}

async function main() {
    console.log('=== Testing Different Configurations (limit=3) ===');
    
    // Test 1: Pure keyword (no extra engines)
    await test('1. Keyword only', {});
    
    // Test 2: With BM25
    await test('2. Keyword + BM25', { useBM25: true });
    
    // Test 3: With similarity
    await test('3. Keyword + Similarity', { useCodeSimilarity: true });
    
    // Test 4: With both BM25 and similarity
    await test('4. Keyword + BM25 + Similarity', { useBM25: true, useCodeSimilarity: true });
    
    // Test 5: No intent boosting
    await test('5. Keyword + BM25 (no intent)', { useBM25: true });
    
    console.log('\n=== Done ===');
}

main().catch(console.error);
