#!/usr/bin/env node
/**
 * Duplicate File Detection Script
 * Finds 100% identical files by content hash
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { glob } = require('glob');

// Configuration
const CONFIG = {
  // Directories to scan
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
    './**/*.d.ts'
  ],
  // Output files
  outputDir: './.kilo/scripts/duplicates/reports',
  outputFormats: ['json', 'csv', 'html']
};

/**
 * Calculate SHA256 hash of file content
 */
function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
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
 * Main function to find duplicate files
 */
async function findDuplicateFiles() {
  console.log('Starting duplicate file detection...');
  
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
  
  // Group files by hash
  const hashGroups = new Map();
  
  for (const filePath of filteredFiles) {
    try {
      const hash = getFileHash(filePath);
      const size = getFileSize(filePath);
      
      if (!hashGroups.has(hash)) {
        hashGroups.set(hash, {
          hash,
          size,
          files: []
        });
      }
      
      hashGroups.get(hash).files.push({
        path: filePath,
        relativePath: path.relative(process.cwd(), filePath)
      });
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  }
  
  // Filter groups with duplicates (more than 1 file)
  const duplicateGroups = Array.from(hashGroups.values())
    .filter(group => group.files.length > 1)
    .sort((a, b) => b.size - a.size); // Sort by size descending
  
  console.log(`Found ${duplicateGroups.length} groups of duplicate files`);
  
  // Generate reports
  await generateReports(duplicateGroups);
  
  return duplicateGroups;
}

/**
 * Generate reports in multiple formats
 */
async function generateReports(duplicateGroups) {
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
        totalDuplicateGroups: duplicateGroups.length,
        totalDuplicateFiles: duplicateGroups.reduce((sum, group) => sum + group.files.length, 0),
        totalWastedBytes: duplicateGroups.reduce((sum, group) => sum + (group.size * (group.files.length - 1)), 0)
      },
      duplicates: duplicateGroups.map((group, index) => ({
        groupId: index + 1,
        hash: group.hash,
        sizeBytes: group.size,
        fileCount: group.files.length,
        wastedBytes: group.size * (group.files.length - 1),
        files: group.files.map(f => ({
          path: f.relativePath,
          fullPath: f.path
        }))
      }))
    };
    
    const jsonPath = path.join(CONFIG.outputDir, `duplicates-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    console.log(`JSON report written to: ${jsonPath}`);
  }
  
  // CSV Report
  if (CONFIG.outputFormats.includes('csv')) {
    let csvContent = 'GroupID,Hash,SizeBytes,FileCount,WastedBytes,FilePath\n';
    
    duplicateGroups.forEach((group, groupIndex) => {
      group.files.forEach((file, fileIndex) => {
        csvContent += `${groupIndex + 1},${group.hash},${group.size},${group.files.length},`;
        csvContent += `${fileIndex === 0 ? group.size * (group.files.length - 1) : 0},`;
        csvContent += `"${file.relativePath}"\n`;
      });
    });
    
    const csvPath = path.join(CONFIG.outputDir, `duplicates-report-${timestamp}.csv`);
    fs.writeFileSync(csvPath, csvContent);
    console.log(`CSV report written to: ${csvPath}`);
  }
  
  // HTML Report
  if (CONFIG.outputFormats.includes('html')) {
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Duplicate Files Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .group-header { background-color: #e6f3ff; font-weight: bold; }
        .file-path { font-family: monospace; font-size: 0.9em; color: #666; }
        .stats { background-color: #fff8dc; padding: 10px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>Duplicate Files Report</h1>
    <div class="stats">
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Total Duplicate Groups:</strong> ${duplicateGroups.length}</p>
        <p><strong>Total Duplicate Files:</strong> ${duplicateGroups.reduce((sum, g) => sum + g.files.length, 0)}</p>
        <p><strong>Total Wasted Space:</strong> ${duplicateGroups.reduce((sum, g) => sum + (g.size * (g.files.length - 1)), 0)} bytes</p>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Group</th>
                <th>Size (bytes)</th>
                <th>File Count</th>
                <th>Wasted Space (bytes)</th>
                <th>File Paths</th>
            </tr>
        </thead>
        <tbody>`;
    
    duplicateGroups.forEach((group, index) => {
      htmlContent += `
            <tr class="group-header">
                <td colspan="5">Group ${index + 1} (Hash: ${group.hash.substring(0, 12)}...)</td>
            </tr>`;
      
      group.files.forEach((file, fileIndex) => {
        const isPrimary = fileIndex === 0;
        htmlContent += `
            <tr>
                <td>${isPrimary ? '<strong>Primary</strong>' : ''}</td>
                <td>${group.size}</td>
                <td>${group.files.length}</td>
                <td>${isPrimary ? group.size * (group.files.length - 1) : 0}</td>
                <td class="file-path">${file.relativePath}</td>
            </tr>`;
      });
    });
    
    htmlContent += `
        </tbody>
    </table>
</body>
</html>`;
    
    const htmlPath = path.join(CONFIG.outputDir, `duplicates-report-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`HTML report written to: ${htmlPath}`);
  }
}

// Run the script
findDuplicateFiles()
  .then(groups => {
    console.log('\n=== SUMMARY ===');
    console.log(`Duplicate groups found: ${groups.length}`);
    console.log(`Total duplicate files: ${groups.reduce((sum, g) => sum + g.files.length, 0)}`);
    const wastedBytes = groups.reduce((sum, g) => sum + (g.size * (g.files.length - 1)), 0);
    console.log(`Wasted space: ${wastedBytes} bytes (${(wastedBytes / 1024).toFixed(2)} KB)`);
    
    if (groups.length > 0) {
      console.log('\nTop 5 largest duplicate groups:');
      groups.slice(0, 5).forEach((group, index) => {
        const wasted = group.size * (group.files.length - 1);
        console.log(`${index + 1}. ${group.files.length}× ${group.size}B files (wasted: ${wasted}B)`);
        group.files.slice(0, 3).forEach(f => {
          console.log(`   - ${f.relativePath}`);
        });
        if (group.files.length > 3) {
          console.log(`   ... and ${group.files.length - 3} more`);
        }
      });
    }
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });