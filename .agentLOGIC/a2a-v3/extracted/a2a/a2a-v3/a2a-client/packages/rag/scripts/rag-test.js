/**
 * Simple RAG Search Testing Script
 * Usage: node rag-test.js "your query here"
 *   or: node rag-test.js (interactive mode)
 */

import { createRAG } from '../dist/index.js';

const PROJECT_PATH = 'C:\\workspace\\domain-platform\\websitestore.com.ua';

async function main() {
    const args = process.argv.slice(2);
    const query = args.join(' ');
    
    console.log('=== RAG Search Testing ===\n');
    
    // Create RAG instance
    console.log('Loading RAG indexer...');
    const rag = createRAG({ projectPath: PROJECT_PATH });
    
    // Load index
    await rag.searcher.loadIndex();
    console.log('Index loaded!\n');
    
    if (query) {
        // Single query mode
        console.log(`Searching for: "${query}"\n`);
        
        const results = await rag.searcher.search(query, { limit: 10 });
        
        if (results.length === 0) {
            console.log('No results found.');
        } else {
            console.log(`Found ${results.length} results:\n`);
            results.forEach((r, i) => {
                console.log(`${i + 1}. ${r.chunk.filePath}`);
                console.log(`   Score: ${r.score.toFixed(2)}`);
                console.log(`   ${r.chunk.content.substring(0, 200)}`);
                console.log('');
            });
        }
    } else {
        // Interactive mode
        const readline = await import('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log('Type your queries below. Commands:');
        console.log('  quit, exit - exit the program\n');
        
        const askQuery = () => {
            rl.question('Enter search query: ', async (q) => {
                if (q.toLowerCase() === 'quit' || q.toLowerCase() === 'exit') {
                    rl.close();
                    return;
                }
                
                if (!q.trim()) {
                    askQuery();
                    return;
                }
                
                console.log(`\nSearching for: "${q}"\n`);
                
                try {
                    const results = await rag.searcher.search(q, { limit: 10 });
                    
                    if (results.length === 0) {
                        console.log('No results found.\n');
                    } else {
                        console.log(`Found ${results.length} results:\n`);
                        results.forEach((r, i) => {
                            console.log(`${i + 1}. ${r.chunk.filePath}`);
                            console.log(`   Score: ${r.score.toFixed(2)}`);
                            console.log(`   ${r.chunk.content.substring(0, 150)}...`);
                            console.log('');
                        });
                    }
                } catch (err) {
                    console.error('Error:', err.message);
                }
                
                askQuery();
            });
        };
        
        askQuery();
    }
}

main().catch(console.error);
