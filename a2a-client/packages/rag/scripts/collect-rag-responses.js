#!/usr/bin/env node

/**
 * Collect RAG Search Responses
 * 
 * This script:
 * 1. Finds all response.json files with "execute.rag-search" 
 * 2. Finds corresponding request.json with "result.rag-search"
 * 3. Combines them and saves to an output directory
 * 
 * Usage:
 *   node scripts/collect-rag-responses.js <source-dir> <output-dir>
 * 
 * Example:
 *   node scripts/collect-rag-responses.js ../../simulations ./rag-responses
 */

const fs = require('fs');
const path = require('path');

/**
 * Find all RAG search steps (response -> request pairs)
 * 
 * Algorithm:
 * 1. Find all steps with execute.rag-search in response.json → remember query and step number
 * 2. Find all steps with result.rag-search in request.json → remember results and step number
 * 3. Combine: for each result[i] take query from step i-1
 */
function findRAGSearchSteps(basePath) {
  const queriesByStep = new Map(); // step -> { simulation, step, query }
  const resultsByStep = new Map(); // step -> { simulation, step, results, files }
  
  if (!fs.existsSync(basePath)) {
    console.error(`Source directory not found: ${basePath}`);
    return [];
  }
  
  // Recursively find all step directories
  function findInDir(dir, simName = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    // Check if this is a simulation root
    const isSimRoot = fs.existsSync(path.join(dir, 'description.md'));
    if (isSimRoot) {
      simName = path.basename(dir);
    }
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Step directories (1, 2, 3, etc.)
        if (/^\d+$/.test(entry.name)) {
          const stepNum = entry.name;
          const responsePath = path.join(fullPath, 'response.json');
          const requestPath = path.join(fullPath, 'request.json');
          
          // Read response.json - extract query from execute.rag-search
          try {
            if (fs.existsSync(responsePath)) {
              const response = JSON.parse(fs.readFileSync(responsePath, 'utf-8'));
              if (response.execute && response.execute['rag-search']) {
                queriesByStep.set(`${simName}/${stepNum}`, {
                  simulation: simName,
                  step: stepNum,
                  query: response.execute['rag-search'].query
                });
              }
            }
          } catch (e) {
            console.warn(`[RAG] Failed to parse response.json at ${simName}/${stepNum}:`, e.message);
          }
          
          // Read request.json - extract results from result.rag-search
          try {
            if (fs.existsSync(requestPath)) {
              const request = JSON.parse(fs.readFileSync(requestPath, 'utf-8'));
              if (request.result && request.result['rag-search']) {
                const ragResult = request.result['rag-search'];
                resultsByStep.set(`${simName}/${stepNum}`, {
                  simulation: simName,
                  step: stepNum,
                  results: ragResult.results || [],
                  files: ragResult.files || []
                });
              }
            }
          } catch (e) {
            console.warn(`[RAG] Failed to parse request.json at ${simName}/${stepNum}:`, e.message);
          }
        } else if (!['node_modules', '.git', 'dist'].includes(entry.name)) {
          findInDir(fullPath, simName);
        }
      }
    }
  }
  
  findInDir(basePath);
  
  // Now combine: for each result, find query from previous step
  // Sort by simulation and step number
  const sortedSims = [...new Set([...queriesByStep.keys(), ...resultsByStep.keys()])].sort();
  
  const results = [];
  let prevQuery = null;
  let prevSim = '';
  
  for (const key of sortedSims) {
    const [sim, step] = key.split('/');
    
    // Check if we have results for this step
    const resultData = resultsByStep.get(key);
    if (resultData) {
      // Try to find query from previous step in same simulation
      let queryData = null;
      const prevStepKey = `${sim}/${String(Number(step) - 1)}`;
      queryData = queriesByStep.get(prevStepKey);
      
      // Fallback: use query from current step if available
      if (!queryData) {
        queryData = queriesByStep.get(key);
      }
      
      // Also try to find any query in this simulation (last one)
      if (!queryData) {
        for (let i = Number(step); i > 0; i--) {
          const testKey = `${sim}/${i}`;
          if (queriesByStep.has(testKey)) {
            queryData = queriesByStep.get(testKey);
            break;
          }
        }
      }
      
      results.push({
        simulation: sim,
        step: step,
        query: queryData?.query || null,
        results: resultData.results,
        files: resultData.files
      });
    }
  }
  
  return results;
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  let sourceDir = args[0] || path.join(__dirname, '..', '..', 'simulations');
  let outputDir = args[1] || path.join(__dirname, '..', 'rag-responses');
  
  console.log('='.repeat(60));
  console.log('Collect RAG Search Responses');
  console.log('='.repeat(60));
  console.log(`Source: ${sourceDir}`);
  console.log(`Output: ${outputDir}`);
  console.log('');
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Find all RAG search steps
  console.log('Searching for RAG search steps...');
  const ragSteps = findRAGSearchSteps(sourceDir);
  
  console.log(`Found ${ragSteps.length} RAG search step(s)`);
  console.log('');
  
  // Group by simulation
  const bySimulation = {};
  for (const step of ragSteps) {
    if (!bySimulation[step.simulation]) {
      bySimulation[step.simulation] = [];
    }
    bySimulation[step.simulation].push(step);
  }
  
  // Save each step
  let totalSaved = 0;
  
  for (const [simName, steps] of Object.entries(bySimulation)) {
    console.log(`${simName}: ${steps.length} step(s)`);
    
    const simOutputDir = path.join(outputDir, simName);
    if (!fs.existsSync(simOutputDir)) {
      fs.mkdirSync(simOutputDir, { recursive: true });
    }
    
    for (const step of steps) {
      const outputFile = path.join(simOutputDir, `step-${step.step}.json`);
      
      const outputData = {
        simulation: simName,
        step: step.step,
        query: step.query,
        results: step.results,
        files: step.files
      };
      
      fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
      totalSaved++;
    }
  }
  
  // Save summary
  const summary = {
    timestamp: new Date().toISOString(),
    sourceDir,
    totalSteps: ragSteps.length,
    bySimulation: Object.fromEntries(
      Object.entries(bySimulation).map(([k, v]) => [k, v.length])
    )
  };
  
  const summaryFile = path.join(outputDir, 'summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  console.log('');
  console.log('='.repeat(60));
  console.log('Complete!');
  console.log('='.repeat(60));
  console.log(`Total RAG search steps: ${totalSaved}`);
  console.log(`Results saved to: ${outputDir}`);
}

main();
