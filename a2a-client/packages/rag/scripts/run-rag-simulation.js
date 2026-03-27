#!/usr/bin/env node

/**
 * RAG Simulation Search Script
 * 
 * This script:
 * 1. Reads simulation data from a source directory
 * 2. Indexes the code files using RAG
 * 3. Performs search queries
 * 4. Saves the search results to an output directory
 * 
 * Usage:
 *   node scripts/run-rag-simulation.js <source-dir> <output-dir> [--queries=<queries-file>]
 * 
 * Example:
 *   node scripts/run-rag-simulation.js ../../simulations/fix-vue-imports ./rag-results
 */

const fs = require('fs');
const path = require('path');

// Try to import RAG modules
let RAGIndexer, RAGSearcher, ChunkManager, createRAG;

try {
  // Try to load from source
  const srcPath = path.join(__dirname, '..', 'src');
  if (fs.existsSync(srcPath)) {
    const rag = require(path.join(srcPath, 'index.js'));
    createRAG = rag.createRAG || rag.default?.createRAG;
  }
} catch (e) {
  console.warn('Could not load RAG from source, using fallback...');
}

// Fallback: Simple in-memory implementation for demonstration
class SimpleRAG {
  constructor() {
    this.chunks = [];
    this.index = new Map();
  }

  async indexDirectory(dirPath) {
    const files = this._findFiles(dirPath);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(dirPath, file);
      const chunks = this._chunkContent(content, relativePath);
      this.chunks.push(...chunks);
      
      // Build simple inverted index
      for (const chunk of chunks) {
        const words = this._extractWords(chunk.content);
        for (const word of words) {
          if (!this.index.has(word)) {
            this.index.set(word, []);
          }
          this.index.get(word).push(chunk);
        }
      }
    }
    console.log(`Indexed ${files.length} files, ${this.chunks.length} chunks`);
  }

  _findFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules, .git, etc.
        if (!['node_modules', '.git', 'dist', 'coverage', '.idea'].includes(entry.name)) {
          files.push(...this._findFiles(fullPath));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.js', '.ts', '.jsx', '.tsx', '.vue', '.php', '.md', '.json'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
    return files;
  }

  _chunkContent(content, filePath) {
    const lines = content.split('\n');
    const chunks = [];
    
    // Simple line-based chunking
    const chunkSize = 50;
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunkContent = lines.slice(i, i + chunkSize).join('\n');
      const startLine = i + 1;
      const endLine = Math.min(i + chunkSize, lines.length);
      
      chunks.push({
        id: `${filePath}:${startLine}-${endLine}`,
        filePath,
        content: chunkContent,
        startLine,
        endLine,
        type: path.extname(filePath).slice(1) || 'unknown'
      });
    }
    
    return chunks;
  }

  _extractWords(content) {
    return content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  async search(query, options = {}) {
    const limit = options.limit || 10;
    const queryWords = this._extractWords(query);
    
    // Score chunks by query word frequency
    const scores = new Map();
    for (const word of queryWords) {
      const chunks = this.index.get(word) || [];
      for (const chunk of chunks) {
        const currentScore = scores.get(chunk.id) || 0;
        scores.set(chunk.id, currentScore + 1);
      }
    }
    
    // Sort by score
    const results = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, score]) => {
        const chunk = this.chunks.find(c => c.id === id);
        return {
          id,
          docId: id,
          score,
          filePath: chunk?.filePath,
          content: chunk?.content?.substring(0, 200),
          startLine: chunk?.startLine,
          endLine: chunk?.endLine
        };
      });
    
    return results;
  }

  getStats() {
    return {
      totalFiles: new Set(this.chunks.map(c => c.filePath)).size,
      totalChunks: this.chunks.length,
      indexSize: this.index.size
    };
  }
}

/**
 * Find all simulation directories
 */
function findSimulationDirs(basePath) {
  const simulations = [];
  
  if (!fs.existsSync(basePath)) {
    console.error(`Source directory not found: ${basePath}`);
    return simulations;
  }
  
  const entries = fs.readdirSync(basePath, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const simPath = path.join(basePath, entry.name);
      
      // Check if it looks like a simulation (has request.json or similar)
      const hasRequest = fs.existsSync(path.join(simPath, 'request.json'));
      const hasSubDirs = fs.readdirSync(simPath, { withFileTypes: true })
        .some(e => e.isDirectory() && /^\d+$/.test(e.name));
      
      if (hasRequest || hasSubDirs) {
        simulations.push({
          name: entry.name,
          path: simPath,
          type: hasSubDirs ? 'multi-step' : 'single'
        });
      }
    }
  }
  
  return simulations;
}

/**
 * Extract queries from simulation request files
 */
function extractQueriesFromSimulation(simPath) {
  const queries = [];
  
  // Handle multi-step simulations
  const stepDirs = fs.readdirSync(simPath, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^\d+$/.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  for (const stepDir of stepDirs) {
    const requestPath = path.join(simPath, stepDir.name, 'request.json');
    if (fs.existsSync(requestPath)) {
      try {
        const request = JSON.parse(fs.readFileSync(requestPath, 'utf-8'));
        
        // Extract query from different possible formats
        let queryText = null;
        
        if (typeof request === 'string') {
          queryText = request;
        } else if (request.task) {
          queryText = request.task;
        } else if (request.message) {
          queryText = typeof request.message === 'string' 
            ? request.message 
            : request.message.content;
        } else if (request.messages) {
          const lastMsg = request.messages[request.messages.length - 1];
          if (lastMsg) {
            queryText = typeof lastMsg.content === 'string' 
              ? lastMsg.content 
              : lastMsg.content?.text;
          }
        }
        
        if (queryText) {
          queries.push({
            step: stepDir.name,
            query: queryText.substring(0, 500) // Limit query length
          });
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
  
  // Handle single-step simulations
  if (queries.length === 0) {
    const requestPath = path.join(simPath, 'request.json');
    if (fs.existsSync(requestPath)) {
      try {
        const request = JSON.parse(fs.readFileSync(requestPath, 'utf-8'));
        
        // Try to extract query text
        let queryText = null;
        
        if (typeof request === 'string') {
          queryText = request;
        } else if (request.tasks?.[0]?.data?.text) {
          queryText = request.tasks[0].data.text;
        } else if (request.tasks?.[0]?.input?.text) {
          queryText = request.tasks[0].input.text;
        }
        
        if (queryText) {
          queries.push({
            step: '1',
            query: queryText.substring(0, 500)
          });
        }
      } catch (e) {
        // Skip
      }
    }
  }
  
  return queries;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  const defaultSimulationsDir = process.env.SIMULATIONS_PATH || path.join(__dirname, '..', '..', 'simulations');
  let sourceDir = args[0] || defaultSimulationsDir;
  let outputDir = args[1] || path.join(__dirname, '..', 'rag-results');
  let queriesFile = null;
  
  // Parse additional options
  for (const arg of args) {
    if (arg.startsWith('--queries=')) {
      queriesFile = arg.split('=')[1];
    }
  }
  
  console.log('='.repeat(60));
  console.log('RAG Simulation Search');
  console.log('='.repeat(60));
  console.log(`Source: ${sourceDir}`);
  console.log(`Output: ${outputDir}`);
  console.log('');
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Initialize RAG
  console.log('Initializing RAG...');
  const rag = new SimpleRAG();
  
  // Find and index simulations
  console.log('Finding simulation directories...');
  const simulations = findSimulationDirs(sourceDir);
  
  console.log(`Found ${simulations.length} simulation(s)`);
  
  // Index each simulation
  const indexResults = [];
  
  for (const sim of simulations) {
    console.log(`\nProcessing: ${sim.name} (${sim.type})`);
    
    // Index the simulation directory
    await rag.indexDirectory(sim.path);
    
    const stats = rag.getStats();
    indexResults.push({
      name: sim.name,
      ...stats
    });
    
    // Extract queries
    const queries = queriesFile 
      ? JSON.parse(fs.readFileSync(queriesFile, 'utf-8'))
      : extractQueriesFromSimulation(sim.path);
    
    console.log(`Found ${queries.length} query(ies)`);
    
    // Run queries
    const searchResults = [];
    
    for (const q of queries) {
      const results = await rag.search(q.query, { limit: 10 });
      searchResults.push({
        query: q,
        results: results.map(r => ({
          id: r.id,
          score: r.score,
          filePath: r.filePath,
          startLine: r.startLine,
          preview: r.content?.substring(0, 100)
        }))
      });
    }
    
    // Save results for this simulation
    const simOutputDir = path.join(outputDir, sim.name);
    if (!fs.existsSync(simOutputDir)) {
      fs.mkdirSync(simOutputDir, { recursive: true });
    }
    
    // Save search results
    const resultsFile = path.join(simOutputDir, 'search-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(searchResults, null, 2));
    console.log(`Saved search results to: ${resultsFile}`);
    
    // Save index stats
    const statsFile = path.join(simOutputDir, 'index-stats.json');
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
  }
  
  // Save overall summary
  const summary = {
    timestamp: new Date().toISOString(),
    sourceDir,
    simulations: indexResults,
    totalSimulations: simulations.length
  };
  
  const summaryFile = path.join(outputDir, 'summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('Complete!');
  console.log('='.repeat(60));
  console.log(`Total simulations processed: ${simulations.length}`);
  console.log(`Results saved to: ${outputDir}`);
  console.log(`Summary: ${summaryFile}`);
}

main().catch(console.error);
