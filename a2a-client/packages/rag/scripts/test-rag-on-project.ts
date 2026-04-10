/**
 * Test RAG on real project (websitestore) using queries from simulations
 * 
 * Usage:
 *   node scripts/test-rag-on-project.js
 * 
 * This script:
 * 1. Indexes the websitestore project
 * 2. Runs RAG searches using queries from simulations
 * 3. Saves results for comparison
 */

import fs from 'fs/promises';
import path from 'path';
import { createRAG, RAGIndexer, RAGSearcher } from '../dist/index.js';
import { checkPathAccess } from '../../../execution/src/fs-access.js';

const PROJECT_PATH = 'C:\\workspace\\domain-platform\\websitestore.com.ua';
const RAG_RESPONSES_DIR = './rag-responses';
const OUTPUT_DIR = './rag-results';

async function main() {
    console.log('=== RAG Testing on Real Project ===\n');
    
    // Load queries from simulations
    console.log('Loading queries from simulations...');
    const queries = await loadQueriesFromSimulations();
    console.log(`Found ${queries.length} queries\n`);
    
     // Check if project exists
     try {
         const hasAccess = await checkPathAccess(PROJECT_PATH);
         if (!hasAccess) {
             console.error(`Project not found: ${PROJECT_PATH}`);
             console.log('Please check the project path in the script');
             process.exit(1);
         }
     } catch {
         console.error(`Project not found: ${PROJECT_PATH}`);
         console.log('Please check the project path in the script');
         process.exit(1);
     }
    
    // Create RAG instance
    console.log('Creating RAG indexer for project...');
    const rag = createRAG({ projectPath: PROJECT_PATH });
    
     // Check if index exists
      const indexPath = path.join(PROJECT_PATH, '.a2a', 'index', 'rag-files.json');
      let indexExists = false;
      try {
          const hasAccess = await checkPathAccess(indexPath);
          if (hasAccess) {
              indexExists = true;
          }
      } catch (err) {
          // Silently ignore file access errors - index doesn't exist
      }
    
    if (!indexExists) {
        console.log('Index not found. Indexing project (this may take a while)...');
        await rag.indexer.indexProject();
        console.log('Indexing complete!\n');
    } else {
        console.log('Loading existing index...');
        await rag.searcher.loadIndex();
        console.log('Index loaded!\n');
    }
    
    // Run searches
    console.log('Running RAG searches...\n');
    const results = [];
    
    for (const query of queries) {
        if (!query.query) {
            console.log(`Skipping query with null value: ${query.simulation}/step-${query.step}`);
            continue;
        }
        
        console.log(`Query: "${query.query}"`)
        const searchResults = await rag.searcher.search(query.query, { limit: 5 });
        
        const result = {
            simulation: query.simulation,
            step: query.step,
            query: query.query,
            results: searchResults.map(r => ({
                file: r.chunk.filePath,
                score: r.score,
                snippet: r.chunk.content.substring(0, 200)
            }))
        };
        
        results.push(result);
        
        console.log(`  Found ${searchResults.length} results`);
        for (const r of searchResults.slice(0, 3)) {
            console.log(`    - ${r.chunk.filePath} (score: ${r.score.toFixed(2)})`);
        }
        console.log('');
    }
    
    // Save results
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const outputFile = path.join(OUTPUT_DIR, 'project-search-results.json');
    await fs.writeFile(outputFile, JSON.stringify(results, null, 2));
    console.log(`Results saved to: ${outputFile}`);
    
    // Also create comparison with simulation results
    await createComparison(queries, results);
    
    console.log('\n=== Done ===');
}

async function loadQueriesFromSimulations() {
    const queries = [];
    
    try {
        const files = await fs.readdir(RAG_RESPONSES_DIR, { withFileTypes: true });
        
        for (const dir of files) {
            if (!dir.isDirectory()) continue;
            
            const simDir = path.join(RAG_RESPONSES_DIR, dir.name);
            const simFiles = await fs.readdir(simDir);
            
            for (const file of simFiles) {
                if (!file.endsWith('.json')) continue;
                
                const filePath = path.join(simDir, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const data = JSON.parse(content);
                
                queries.push({
                    simulation: dir.name,
                    step: data.step,
                    query: data.query
                });
            }
        }
     } catch (err) {
         // Handle error loading queries but continue with empty queries array
         console.error('Error loading queries:', err.message);
     }
    
    return queries;
}

async function createComparison(queries, projectResults) {
    const comparison = [];
    
    for (const result of projectResults) {
        const simResultFile = path.join(
            RAG_RESPONSES_DIR, 
            result.simulation, 
            `step-${result.step}.json`
        );
        
        let simResults = null;
         try {
             const content = await fs.readFile(simResultFile, 'utf-8');
             simResults = JSON.parse(content);
         } catch (err) {
             // Silently ignore file read errors - simulation results may not exist
         }
        
        comparison.push({
            query: result.query,
            simulationResult: simResults?.results || [],
            projectResult: result.results.map(r => ({
                file: r.file,
                score: r.score
            })),
            matchScore: calculateMatchScore(simResults?.results, result.results)
        });
    }
    
    const comparisonFile = path.join(OUTPUT_DIR, 'comparison.json');
    await fs.writeFile(comparisonFile, JSON.stringify(comparison, null, 2));
    console.log(`Comparison saved to: ${comparisonFile}`);
}

function calculateMatchScore(simResults, projectResults) {
    if (!simResults || !projectResults || simResults.length === 0) return 0;
    
    const simFiles = new Set(simResults.map(r => r.file));
    const projectFiles = new Set(projectResults.map(r => r.file));
    
    let matches = 0;
    for (const file of projectFiles) {
        if (simFiles.has(file)) matches++;
    }
    
    return matches / Math.max(simFiles.size, projectFiles.size);
}

main().catch(console.error);
