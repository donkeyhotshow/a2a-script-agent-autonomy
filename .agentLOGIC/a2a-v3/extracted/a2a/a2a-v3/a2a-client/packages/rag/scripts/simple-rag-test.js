#!/usr/bin/env node

import { createRAG } from '../dist/index.js';

async function simpleRAGTest() {
    console.log('=== Simple RAG Test ===\n');
    
    try {
        // Initialize RAG
        console.log('Initializing RAG...');
        const rag = createRAG({ 
            projectPath: 'C:\\workspace\\domain-platform\\websitestore.com.ua',
            verbose: true
        });
        
        console.log('✅ RAG initialized successfully!');
        console.log('Loading index...');
        
        // Load index
        await rag.searcher.loadIndex();
        console.log('✅ Index loaded successfully!\n');
        
        // Test a simple query
        console.log('Testing simple query...');
        const query = 'backend architecture';
        const results = await rag.searcher.search(query, { limit: 5 });
        
        console.log(`\nQuery: "${query}"`);
        console.log(`Results: ${results.length}`);
        
        if (results.length > 0) {
            console.log('\nTop results:');
            results.slice(0, 3).forEach((result, i) => {
                console.log(`${i + 1}. ${result.chunk.filePath} (score: ${result.score.toFixed(4)})`);
                console.log(`   Snippet: ${result.chunk.content.substring(0, 100)}...`);
            });
        }
        
        console.log('\n✅ Simple RAG test completed successfully!');
        
    } catch (error) {
        console.error('❌ RAG test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

simpleRAGTest();