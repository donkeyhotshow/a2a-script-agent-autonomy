/**
 * RAG Batch Testing Script
 * Runs multiple queries and saves results
 * 
 * Usage: node rag-batch-test.js
 */

import fs from 'fs/promises';
import path from 'path';
import { createRAG } from '../dist/index.js';

const PROJECT_PATH = 'C:\\workspace\\domain-platform\\websitestore.com.ua';
const OUTPUT_DIR = './rag-test-results';

// Test queries - add your own here
const QUERIES = [
    'backend architecture API services',
    'authentication JWT login',
    'Vue components export',
    'database migrations',
    'middleware authentication',
    'controller API endpoints',
    'React store usage',
    'service layer business logic',
    'Шукаю документи по архітектурі бекенду.',
    'система авторизації JWT токени login register',
    'логінування API автентифікація тести',
    'Пошук файлу, який експортує "helper" з помилки'
];

async function main() {
    console.log('=== RAG Batch Testing ===\n');
    
    // Create RAG instance
    console.log('Loading RAG indexer...');
    const rag = createRAG({ projectPath: PROJECT_PATH });
    
    // Check index status and reindex if needed (incremental)
    const status = await rag.indexer.getIndexStatus();
    if (status.hasIndex) {
        console.log(`Index exists: ${status.fileCount} files (${status.timestamp})`);
        console.log('Running incremental reindex...');
    } else {
        console.log('No index found, creating new...');
    }
    
    const reindexStart = Date.now();
    await rag.indexer.indexProject();
    console.log(`Reindex done in ${Date.now() - reindexStart}ms\n`);
    
    // Load index
    await rag.searcher.loadIndex();
    console.log('Index loaded!\n');
    
    // Run all queries
    const results = [];
    
    for (const query of QUERIES) {
        console.log(`Searching: "${query}"`);
        
        try {
            const searchResults = await rag.searcher.search(query, { limit: 10, useBM25: true });
            
            const result = {
                query,
                count: searchResults.length,
                results: searchResults.map(r => ({
                    file: r.chunk.filePath,
                    score: r.score,
                    snippet: r.chunk.content.substring(0, 200)
                }))
            };
            
            results.push(result);
            console.log(`  Found ${searchResults.length} results`);
            
        } catch (err) {
            console.error(`  Error: ${err.message}`);
            results.push({
                query,
                error: err.message,
                results: []
            });
        }
    }
    
    // Save results
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(OUTPUT_DIR, `results-${timestamp}.json`);
    
    await fs.writeFile(outputFile, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${outputFile}`);
    
    // Also save summary
    const summary = {
        timestamp: new Date().toISOString(),
        totalQueries: QUERIES.length,
        queriesWithResults: results.filter(r => r.results && r.results.length > 0).length,
        queriesWithErrors: results.filter(r => r.error).length,
        queries: QUERIES
    };
    
    const summaryFile = path.join(OUTPUT_DIR, 'summary.json');
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`Summary saved to: ${summaryFile}`);
    
    // Print summary to console
    console.log('\n=== Summary ===');
    console.log(`Total queries: ${summary.totalQueries}`);
    console.log(`With results: ${summary.queriesWithResults}`);
    console.log(`With errors: ${summary.queriesWithErrors}`);
    
    // Print top results for each query
    console.log('\n=== Top Results ===');
    for (const r of results) {
        if (r.error) {
            console.log(`\n"${r.query}" -> ERROR: ${r.error}`);
        } else if (r.results.length > 0) {
            console.log(`\n"${r.query}":`);
            r.results.slice(0, 3).forEach((res, i) => {
                console.log(`  ${i+1}. ${res.file} (${res.score.toFixed(2)})`);
            });
        } else {
            console.log(`\n"${r.query}" -> No results`);
        }
    }
}

main().catch(console.error);
