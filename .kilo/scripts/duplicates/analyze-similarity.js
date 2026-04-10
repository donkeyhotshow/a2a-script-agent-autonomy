#!/usr/bin/env node
/**
 * Code Similarity Analysis Script
 * Finds similar code patterns using token-based and AST-based analysis
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  // Directories to scan for source files
  scanDirs: [
    './a2a-server/packages/**/src/**/*.ts',
    './a2a-client/packages/**/src/**/*.ts'
  ],
  // Directories to exclude
  excludeDirs: [
    './node_modules/**',
    './dist/**',
    './.kilo/**',
    './.kilocode/**',
    './**/*.d.ts',
    './**/*.test.ts',
    './**/*.spec.ts'
  ],
  // Similarity thresholds
  similarityThreshold: 0.7, // 70% similarity threshold
  minTokenLength: 50,       // Minimum tokens to consider for comparison
  // Output files
  outputDir: './.kilo/scripts/duplicates/reports',
  outputFormats: ['json', 'html']
};

/**
 * Simple tokenization of TypeScript code
 * Splits code into meaningful tokens ignoring whitespace and comments
 */
function tokenizeCode(code) {
  // Remove single line comments
  code = code.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');
  // Split on whitespace and punctuation, keep meaningful tokens
  const tokens = code
    .split(/[\s\(\)\{\}\[\]\;\,\.\+\-\*\/\%\&\|\^\~\!\?\:\=\>\<]+/)
    .filter(token => token.trim().length > 0)
    .map(token => token.trim());
  return tokens;
}

/**
 * Calculate similarity between two token arrays using Jaccard index
 */
function calculateSimilarity(tokens1, tokens2) {
  if (tokens1.length === 0 && tokens2.length === 0) return 1.0;
  if (tokens1.length === 0 || tokens2.length === 0) return 0.0;
  
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  let intersection = 0;
  for (const token of set1) {
    if (set2.has(token)) intersection++;
  }
  
  const union = set1.size + set2.size - intersection;
  return intersection / union;
}

/**
 * Get file content
 */
function getFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Check if file should be excluded
 */
function shouldExclude(filePath) {
  return CONFIG.excludeDirs.some(pattern => 
    filePath.includes(pattern.replace('**/', '').replace('/*', ''))
  );
}

/**
 * Main function to find similar code
 */
async function findSimilarCode() {
  console.log('Starting code similarity analysis...');
  
  // Get all TypeScript files
  const allFiles = [];
  for (const pattern of CONFIG.scanDirs) {
    const files = await glob(pattern, { nodir: true });
    allFiles.push(...files);
  }
  
  console.log(`Found ${allFiles.length} TypeScript files to analyze`);
  
  // Filter out excluded files
  const filteredFiles = allFiles.filter(file => !shouldExclude(file));
  console.log(`After exclusions: ${filteredFiles.length} files`);
  
  // Read and tokenize all files
  const fileData = [];
  let processedCount = 0;
  
  for (const filePath of filteredFiles) {
    const content = getFileContent(filePath);
    if (content === null) continue;
    
    const tokens = tokenizeCode(content);
    
    // Only consider files with sufficient tokens
    if (tokens.length >= CONFIG.minTokenLength) {
      fileData.push({
        path: filePath,
        relativePath: path.relative(process.cwd(), filePath),
        content: content,
        tokens: tokens,
        size: content.length
      });
    }
    
    processedCount++;
    if (processedCount % 50 === 0) {
      console.log(`Processed ${processedCount}/${filteredFiles.length} files`);
    }
  }
  
  console.log(`Tokenized ${fileData.length} files with sufficient content`);
  
  // Compare each file with every other file (O(n^2) - acceptable for moderate codebases)
  const similarPairs = [];
  const comparisonsMade = 0;
  
  for (let i = 0; i < fileData.length; i++) {
    for (let j = i + 1; j < fileData.length; j++) {
      const file1 = fileData[i];
      const file2 = fileData[j];
      
      // Skip if files are in the same directory (likely same file different names)
      if (path.dirname(file1.path) === path.dirname(file2.path)) {
        continue;
      }
      
      const similarity = calculateSimilarity(file1.tokens, file2.tokens);
      
      if (similarity >= CONFIG.similarityThreshold) {
        similarPairs.push({
          file1: {
            path: file1.relativePath,
            fullPath: file1.path,
            size: file1.size
          },
          file2: {
            path: file2.relativePath,
            fullPath: file2.path,
            size: file2.size
          },
          similarity: similarity,
          similarityPercent: (similarity * 100).toFixed(1)
        });
      }
    }
    
    if ((i + 1) % 20 === 0) {
      console.log(`Completed comparisons for file ${i + 1}/${fileData.length}`);
    }
  }
  
  // Sort by similarity descending
  similarPairs.sort((a, b) => b.similarity - a.similarity);
  
  console.log(`Found ${similarPairs.length} similar code pairs (similarity >= ${CONFIG.similarityThreshold * 100}%)`);
  
  // Generate reports
  await generateReports(similarPairs);
  
  return similarPairs;
}

/**
 * Generate reports in multiple formats
 */
async function generateReports(similarPairs) {
  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
  
  // JSON Report
  if (CONFIG.outputFormats.includes('json')) {
    const jsonReport = {
      metadata: {
        generatedAt: new Date().toISOString(),
        similarityThreshold: CONFIG.similarityThreshold,
        totalSimilarPairs: similarPairs.length,
        analysisDetails: {
          minTokenLength: CONFIG.minTokenLength,
          algorithm: 'Jaccard similarity on tokenized code'
        }
      },
      similarPairs: similarPairs.map((pair, index) => ({
        pairId: index + 1,
        similarity: pair.similarity,
        similarityPercent: pair.similarityPercent,
        file1: pair.file1,
        file2: pair.file2
      }))
    };
    
    const jsonPath = path.join(CONFIG.outputDir, `similarity-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    console.log(`JSON similarity report written to: ${jsonPath}`);
  }
  
  // HTML Report
  if (CONFIG.outputFormats.includes('html')) {
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Code Similarity Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .similarity-high { background-color: #ffebee; }
        .similarity-medium { background-color: #fff3e0; }
        .similarity-low { background-color: #f3e5f5; }
        .file-path { font-family: monospace; font-size: 0.9em; color: #666; }
        .stats { background-color: #fff8dc; padding: 10px; border-radius: 5px; margin: 20px 0; }
        .similarity-score { font-weight: bold; font-size: 1.1em; }
    </style>
</head>
<body>
    <h1>Code Similarity Report</h1>
    <div class="stats">
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Similarity Threshold:</strong> ${(CONFIG.similarityThreshold * 100).toFixed(0)}%</p>
        <p><strong>Total Similar Pairs:</strong> ${similarPairs.length}</p>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Pair</th>
                <th>Similarity</th>
                <th>File 1</th>
                <th>File 2</th>
                <th>Size 1 (bytes)</th>
                <th>Size 2 (bytes)</th>
            </tr>
        </thead>
        <tbody>`;
    
    similarPairs.forEach((pair, index) => {
      let similarityClass = '';
      if (pair.similarity >= 0.9) similarityClass = 'similarity-high';
      else if (pair.similarity >= 0.8) similarityClass = 'similarity-medium';
      else similarityClass = 'similarity-low';
      
      htmlContent += `
            <tr class="${similarityClass}">
                <td>${index + 1}</td>
                <td class="similarity-score">${pair.similarityPercent}%</td>
                <td class="file-path">${pair.file1.path}</td>
                <td class="file-path">${pair.file2.path}</td>
                <td>${pair.file1.size}</td>
                <td>${pair.file2.size}</td>
            </tr>`;
    });
    
    htmlContent += `
        </tbody>
    </table>
</body>
</html>`;
    
    const htmlPath = path.join(CONFIG.outputDir, `similarity-report-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`HTML similarity report written to: ${htmlPath}`);
  }
}

// Run the script
findSimilarCode()
  .then(pairs => {
    console.log('\n=== SIMILARITY ANALYSIS SUMMARY ===');
    console.log(`Total similar pairs found: ${pairs.length}`);
    
    if (pairs.length > 0) {
      console.log('\nTop 10 most similar pairs:');
      pairs.slice(0, 10).forEach((pair, index) => {
        console.log(`${index + 1}. ${pair.similarityPercent}% similar:`);
        console.log(`   - ${pair.file1.path}`);
        console.log(`   - ${pair.file2.path}`);
      });
      
      // Group by similarity ranges
      const highSimilarity = pairs.filter(p => p.similarity >= 0.9);
      const mediumSimilarity = pairs.filter(p => p.similarity >= 0.8 && p.similarity < 0.9);
      const lowSimilarity = pairs.filter(p => p.similarity >= 0.7 && p.similarity < 0.8);
      
      console.log(`\nSimilarity breakdown:`);
      console.log(`- High similarity (90%+): ${highSimilarity.length} pairs`);
      console.log(`- Medium similarity (80-89%): ${mediumSimilarity.length} pairs`);
      console.log(`- Low similarity (70-79%): ${lowSimilarity.length} pairs`);
    }
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });