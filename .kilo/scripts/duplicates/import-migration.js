#!/usr/bin/env node
/**
 * Import Migration Analysis Script
 * Analyzes import statements referencing duplicate files and generates migration suggestions
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

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
    './**/*.d.ts'
  ],
  // Output files
  outputDir: './.kilo/scripts/duplicates/reports',
  outputFormats: ['json', 'html', 'md'],
  // Known duplicate mappings (duplicate -> primary)
  duplicateMappings: {
    // Actions triple nesting
    'packages/features/src/actions/': 'packages/actions/src/',
    'packages/features/src/actions/src/actions/': 'packages/actions/src/',

    // Gray-room parallel duplication
    'packages/features/src/gray-room/': 'packages/gray-room/src/',

    // Utilities lib/ duplication
    'packages/server-utils/src/lib/': 'packages/server-utils/src/',

    // Request service triplication
    'packages/server/src/request/': 'packages/request/src/',
    'packages/server/src/services/': 'packages/request/src/',

    // API registry duplication
    'packages/server/src/api/registry/': 'packages/server/src/registry/',

    // Memory package structure
    'packages/memory/src/src/': 'packages/memory/src/',

    // Controllers double nesting
    'packages/server/src/controllers/controllers/': 'packages/server/src/controllers/'
  },

  // Package aliases for import generation
  packageAliases: {
    'packages/actions/src/': '@a2a/actions',
    'packages/gray-room/src/': '@a2a/gray-room',
    'packages/server-utils/src/': '@a2a/server-utils',
    'packages/request/src/': '@a2a/request',
    'packages/server/src/': '@a2a/server',
    'packages/features/src/': '@a2a/features'
  }
};

/**
 * Parse import statements from TypeScript file content
 */
function parseImports(content, filePath) {
  const imports = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Match import statements
    const importMatch = line.match(/^(?:import|export)\s+(?:\{\s*)?(.*)(?:\s*\})?\s+from\s+['"]([^'"]+)['"]/);
    if (!importMatch) continue;
    
    const importedItems = importMatch[1].trim();
    const importPath = importMatch[2];
    
    // Skip external imports (node_modules, absolute paths)
    if (importPath.startsWith('.') === false && !importPath.startsWith('@')) {
      continue;
    }
    
    imports.push({
      lineNumber: i + 1,
      importedItems: importedItems.split(',').map(item => item.trim()).filter(item => item),
      importPath: importPath,
      fullLine: line
    });
  }
  
  return imports;
}

/**
 * Resolve relative import paths to absolute paths
 */
function resolveImportPath(importPath, filePath) {
  if (importPath.startsWith('@')) {
    // Handle package aliases - convert to relative paths based on known mappings
    const aliasMappings = {
      '@a2a/actions': 'packages/actions/src',
      '@a2a/gray-room': 'packages/gray-room/src',
      '@a2a/server-utils': 'packages/server-utils/src',
      '@a2a/request': 'packages/request/src',
      '@a2a/server': 'packages/server/src',
      '@a2a/features': 'packages/features/src'
    };

    for (const [alias, resolvedPath] of Object.entries(aliasMappings)) {
      if (importPath.startsWith(alias)) {
        const remaining = importPath.substring(alias.length);
        return path.join(process.cwd(), 'a2a-server', resolvedPath + remaining);
      }
    }

    return importPath; // Can't resolve alias
  }

  if (importPath.startsWith('.')) {
    // Relative path - resolve it
    const dir = path.dirname(filePath);
    const resolved = path.resolve(dir, importPath);
    return resolved;
  }

  return importPath; // External import
}

/**
 * Check if import path references a duplicate location
 */
function checkDuplicateImport(importPath, filePath) {
  const resolvedPath = resolveImportPath(importPath, filePath);

  // Check if this resolved path is in a known duplicate location
  for (const [duplicatePath, primaryPath] of Object.entries(CONFIG.duplicateMappings)) {
    const fullDuplicatePath = path.join(process.cwd(), 'a2a-server', duplicatePath);

    if (resolvedPath.startsWith(fullDuplicatePath)) {
      // Try to use package alias first
      let suggestedPath = importPath;
      for (const [primaryPkgPath, alias] of Object.entries(CONFIG.packageAliases)) {
        if (primaryPath === primaryPkgPath) {
          // Replace the duplicate path portion with the alias
          const remainingPath = resolvedPath.substring(fullDuplicatePath.length);
          const cleanPath = remainingPath.replace(/^[\/\\]/, '').replace(/\.js$/, '');
          suggestedPath = cleanPath ? `${alias}/${cleanPath}` : alias;
          break;
        }
      }

      // If no alias found, calculate relative path
      if (suggestedPath === importPath) {
        const primaryFullPath = path.join(process.cwd(), 'a2a-server', primaryPath);
        const relativeToPrimary = path.relative(path.dirname(filePath), primaryFullPath);
        suggestedPath = relativeToPrimary.startsWith('.') ? relativeToPrimary : './' + relativeToPrimary;
      }

      return {
        isDuplicate: true,
        duplicateType: duplicatePath,
        currentPath: importPath,
        suggestedPath: suggestedPath + (importPath.endsWith('.js') ? '' : '.js'),
        resolvedCurrent: resolvedPath,
        resolvedSuggested: path.join(process.cwd(), 'a2a-server', primaryPath)
      };
    }
  }

  return { isDuplicate: false };
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
 * Main function to analyze import migrations
 */
async function analyzeImportMigrations() {
  console.log('Starting import migration analysis...');
  
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
  
  // Analyze imports in each file
  const importIssues = [];
  const importStats = {
    totalFiles: filteredFiles.length,
    filesWithImports: 0,
    totalImports: 0,
    importsNeedingMigration: 0,
    migrationByType: {}
  };
  
  for (const filePath of filteredFiles) {
    const content = getFileContent(filePath);
    if (content === null) continue;
    
    const imports = parseImports(content, filePath);
    if (imports.length === 0) continue;
    
    importStats.filesWithImports++;
    importStats.totalImports += imports.length;
    
    const fileIssues = [];
    
    for (const importData of imports) {
      const duplicateCheck = checkDuplicateImport(importData.importPath, filePath);
      
      if (duplicateCheck.isDuplicate) {
        importStats.importsNeedingMigration++;
        
        // Track by type
        const type = duplicateCheck.duplicateType;
        importStats.migrationByType[type] = (importStats.migrationByType[type] || 0) + 1;
        
        fileIssues.push({
          lineNumber: importData.lineNumber,
          importedItems: importData.importedItems,
          currentImport: importData.importPath,
          suggestedImport: duplicateCheck.suggestedPath,
          duplicateType: duplicateCheck.duplicateType,
          fullLine: importData.fullLine
        });
      }
    }
    
    if (fileIssues.length > 0) {
      importIssues.push({
        filePath: path.relative(process.cwd(), filePath),
        fullPath: filePath,
        issues: fileIssues
      });
    }
  }
  
  console.log(`Found ${importIssues.length} files with import migration issues`);
  console.log(`Total imports needing migration: ${importStats.importsNeedingMigration}`);
  
  // Generate reports
  await generateReports(importIssues, importStats);
  
  return { importIssues, importStats };
}

/**
 * Generate reports in multiple formats
 */
async function generateReports(importIssues, importStats) {
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
        totalFilesAnalyzed: importStats.totalFiles,
        filesWithImports: importStats.filesWithImports,
        totalImports: importStats.totalImports,
        importsNeedingMigration: importStats.importsNeedingMigration,
        migrationByType: importStats.migrationByType
      },
      importIssues: importIssues.map((fileIssue, index) => ({
        fileId: index + 1,
        filePath: fileIssue.filePath,
        fullPath: fileIssue.fullPath,
        issueCount: fileIssue.issues.length,
        issues: fileIssue.issues
      }))
    };
    
    const jsonPath = path.join(CONFIG.outputDir, `import-migration-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    console.log(`JSON migration report written to: ${jsonPath}`);
  }
  
  // Markdown Report
  if (CONFIG.outputFormats.includes('md')) {
    let mdContent = `# Import Migration Report

Generated: ${new Date().toLocaleString()}

## Summary

- **Total files analyzed:** ${importStats.totalFiles}
- **Files with imports:** ${importStats.filesWithImports}
- **Total imports:** ${importStats.totalImports}
- **Imports needing migration:** ${importStats.importsNeedingMigration}

## Migration by Duplicate Type

| Duplicate Type | Count |
|---------------|-------|
`;

    // Sort migration types by count
    const sortedTypes = Object.entries(importStats.migrationByType)
      .sort(([,a], [,b]) => b - a);
    
    for (const [type, count] of sortedTypes) {
      mdContent += `| ${type} | ${count} |\n`;
    }
    
    mdContent += '\n## Files Requiring Changes\n\n';
    
    importIssues.forEach((fileIssue, index) => {
      mdContent += `### ${index + 1}. ${fileIssue.filePath}\n\n`;
      mdContent += `**Issues:** ${fileIssue.issues.length}\n\n`;
      
      fileIssue.issues.forEach((issue, issueIndex) => {
        mdContent += `**${issueIndex + 1}. Line ${issue.lineNumber}:**\n`;
        mdContent += '```typescript\n';
        mdContent += `${issue.fullLine}\n`;
        mdContent += '```\n';
        mdContent += `**Suggested:** \`${issue.suggestedImport}\`\n\n`;
      });
    });
    
    mdContent += '## Migration Commands\n\n';
    mdContent += 'After reviewing the changes, you can run automated migration:\n\n';
    mdContent += '```bash\n';
    mdContent += 'node .kilo/scripts/duplicates/import-migration.js --apply\n';
    mdContent += '```\n\n';
    
    mdContent += '## Manual Verification\n\n';
    mdContent += 'After migration, verify:\n\n';
    mdContent += '- [ ] `npm run build` succeeds\n';
    mdContent += '- [ ] `npm run typecheck` passes\n';
    mdContent += '- [ ] Tests pass\n';
    mdContent += '- [ ] Application functionality works\n';
    
    const mdPath = path.join(CONFIG.outputDir, `import-migration-report-${timestamp}.md`);
    fs.writeFileSync(mdPath, mdContent);
    console.log(`Markdown migration report written to: ${mdPath}`);
  }
  
  // HTML Report
  if (CONFIG.outputFormats.includes('html')) {
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Import Migration Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .file-header { background-color: #e6f3ff; font-weight: bold; }
        .stats { background-color: #fff8dc; padding: 10px; border-radius: 5px; margin: 20px 0; }
        .code { font-family: monospace; background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
        .migration-needed { background-color: #ffebee; }
        .migration-suggestion { background-color: #e8f5e8; }
    </style>
</head>
<body>
    <h1>Import Migration Report</h1>
    <div class="stats">
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Total files analyzed:</strong> ${importStats.totalFiles}</p>
        <p><strong>Files with imports:</strong> ${importStats.filesWithImports}</p>
        <p><strong>Total imports:</strong> ${importStats.totalImports}</p>
        <p><strong>Imports needing migration:</strong> ${importStats.importsNeedingMigration}</p>
    </div>
    
    <h2>Migration by Type</h2>
    <table>
        <thead>
            <tr>
                <th>Duplicate Type</th>
                <th>Count</th>
            </tr>
        </thead>
        <tbody>`;
    
    const sortedTypes = Object.entries(importStats.migrationByType)
      .sort(([,a], [,b]) => b - a);
    
    for (const [type, count] of sortedTypes) {
      htmlContent += `
            <tr>
                <td class="code">${type}</td>
                <td>${count}</td>
            </tr>`;
    }
    
    htmlContent += `
        </tbody>
    </table>
    
    <h2>Files Requiring Changes</h2>`;
    
    importIssues.forEach((fileIssue, index) => {
      htmlContent += `
        <h3>${index + 1}. ${fileIssue.filePath}</h3>
        <p><strong>Issues:</strong> ${fileIssue.issues.length}</p>
        <table>
            <thead>
                <tr>
                    <th>Line</th>
                    <th>Current Import</th>
                    <th>Suggested Import</th>
                    <th>Items</th>
                </tr>
            </thead>
            <tbody>`;
      
      fileIssue.issues.forEach((issue) => {
        const itemsStr = issue.importedItems.join(', ');
        htmlContent += `
                <tr class="migration-needed">
                    <td>${issue.lineNumber}</td>
                    <td class="code">${issue.currentImport}</td>
                    <td class="code migration-suggestion">${issue.suggestedImport}</td>
                    <td>${itemsStr}</td>
                </tr>`;
      });
      
      htmlContent += `
            </tbody>
        </table>`;
    });
    
    htmlContent += `
</body>
</html>`;
    
    const htmlPath = path.join(CONFIG.outputDir, `import-migration-report-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`HTML migration report written to: ${htmlPath}`);
  }
}

// Run the script
analyzeImportMigrations()
  .then(({ importIssues, importStats }) => {
    console.log('\n=== IMPORT MIGRATION SUMMARY ===');
    console.log(`Files requiring changes: ${importIssues.length}`);
    console.log(`Total imports to migrate: ${importStats.importsNeedingMigration}`);
    
    if (importStats.importsNeedingMigration > 0) {
      console.log('\nMigration breakdown by type:');
      const sortedTypes = Object.entries(importStats.migrationByType)
        .sort(([,a], [,b]) => b - a);
      
      for (const [type, count] of sortedTypes) {
        console.log(`- ${type}: ${count} imports`);
      }
    }
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });