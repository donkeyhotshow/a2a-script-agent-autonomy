#!/usr/bin/env node
/**
 * Verification Script
 * Validates consolidation results and ensures no breaking changes
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  reportsDir: './.kilo/scripts/duplicates/reports',
  projectRoot: './a2a-server'
};

/**
 * Run TypeScript compilation check
 */
function verifyTypeScriptCompilation() {
  console.log('Verifying TypeScript compilation...');
  try {
    execSync('npm run typecheck', { cwd: CONFIG.projectRoot, stdio: 'pipe' });
    console.log('✓ TypeScript compilation successful');
    return { success: true };
  } catch (error) {
    console.log('✗ TypeScript compilation failed');
    return {
      success: false,
      error: error.stdout.toString() || error.stderr.toString()
    };
  }
}

/**
 * Run build process
 */
function verifyBuildProcess() {
  console.log('Verifying build process...');
  try {
    execSync('npm run build', { cwd: CONFIG.projectRoot, stdio: 'pipe' });
    console.log('✓ Build process successful');
    return { success: true };
  } catch (error) {
    console.log('✗ Build process failed');
    return {
      success: false,
      error: error.stdout.toString() || error.stderr.toString()
    };
  }
}

/**
 * Check for broken imports
 */
function verifyImportResolution() {
  console.log('Verifying import resolution...');

  const tsFiles = glob.sync('packages/**/src/**/*.ts', {
    cwd: CONFIG.projectRoot,
    absolute: true,
    nodir: true  // Only return files, not directories
  });

  const brokenImports = [];
  const importRegex = /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;

  for (const filePath of tsFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];

      // Skip external imports
      if (!importPath.startsWith('.') && !importPath.startsWith('@')) {
        continue;
      }

      // Resolve the import path
      let resolvedPath;
      try {
        if (importPath.startsWith('@')) {
          // Handle aliases
          const aliasMappings = {
            '@a2a/actions': 'packages/actions/src',
            '@a2a/gray-room': 'packages/gray-room/src',
            '@a2a/server-utils': 'packages/server-utils/src',
            '@a2a/request': 'packages/request/src',
            '@a2a/server': 'packages/server/src',
            '@a2a/features': 'packages/features/src'
          };

          let resolvedImport = importPath;
          for (const [alias, replacement] of Object.entries(aliasMappings)) {
            if (resolvedImport.startsWith(alias)) {
              resolvedImport = resolvedImport.replace(alias, replacement);
              break;
            }
          }

          if (resolvedImport === importPath) {
            // Alias not found, might be external
            continue;
          }

          resolvedPath = path.resolve(CONFIG.projectRoot, resolvedImport);
        } else {
          // Relative import
          resolvedPath = path.resolve(path.dirname(filePath), importPath);
        }

        // Check if the resolved path exists (try with and without .js extension)
        let targetExists = fs.existsSync(resolvedPath);
        if (!targetExists && !resolvedPath.endsWith('.js')) {
          targetExists = fs.existsSync(resolvedPath + '.js');
        }
        if (!targetExists && resolvedPath.endsWith('.js')) {
          targetExists = fs.existsSync(resolvedPath.replace('.js', '.ts'));
        }

        if (!targetExists) {
          brokenImports.push({
            file: path.relative(CONFIG.projectRoot, filePath),
            importPath: importPath,
            resolvedPath: path.relative(CONFIG.projectRoot, resolvedPath),
            line: getLineNumber(content, match.index)
          });
        }
      } catch (error) {
        brokenImports.push({
          file: path.relative(CONFIG.projectRoot, filePath),
          importPath: importPath,
          error: error.message,
          line: getLineNumber(content, match.index)
        });
      }
    }
  }

  if (brokenImports.length === 0) {
    console.log('✓ All imports resolve correctly');
    return { success: true };
  } else {
    console.log(`✗ Found ${brokenImports.length} broken imports`);
    return {
      success: false,
      brokenImports: brokenImports
    };
  }
}

/**
 * Get line number from content and character position
 */
function getLineNumber(content, charPosition) {
  const lines = content.substring(0, charPosition).split('\n');
  return lines.length;
}

/**
 * Check for remaining duplicate files
 */
function verifyDuplicateRemoval() {
  console.log('Verifying duplicate file removal...');

  const knownDuplicates = [
    'packages/features/src/actions/',
    'packages/features/src/actions/src/actions/',
    'packages/features/src/gray-room/',
    'packages/server-utils/src/lib/',
    'packages/server/src/request/',
    'packages/server/src/services/',
    'packages/server/src/api/registry/',
    'packages/memory/src/src/',
    'packages/server/src/controllers/controllers/'
  ];

  const remainingDuplicates = [];

  for (const duplicatePath of knownDuplicates) {
    const fullPath = path.join(CONFIG.projectRoot, duplicatePath);
    if (fs.existsSync(fullPath)) {
      const tsFiles = glob.sync('**/*.ts', {
        cwd: fullPath,
        absolute: false
      });

      if (tsFiles.length > 0) {
        remainingDuplicates.push({
          path: duplicatePath,
          remainingFiles: tsFiles.length
        });
      }
    }
  }

  if (remainingDuplicates.length === 0) {
    console.log('✓ All duplicate locations cleaned up');
    return { success: true };
  } else {
    console.log(`✗ Found ${remainingDuplicates.length} duplicate locations with remaining files`);
    return {
      success: false,
      remainingDuplicates: remainingDuplicates
    };
  }
}

/**
 * Run tests (if available)
 */
function verifyTests() {
  console.log('Verifying test execution...');
  try {
    execSync('npm test', { cwd: CONFIG.projectRoot, stdio: 'pipe', timeout: 300000 }); // 5 minute timeout
    console.log('✓ Tests passed');
    return { success: true };
  } catch (error) {
    console.log('✗ Tests failed');
    return {
      success: false,
      error: error.stdout.toString() || error.stderr.toString()
    };
  }
}

/**
 * Generate verification report
 */
function generateVerificationReport(results) {
  const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
  const reportPath = path.join(CONFIG.reportsDir, `verification-report-${timestamp}.json`);

  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      overallSuccess: Object.values(results).every(r => r.success)
    },
    results: results
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Verification report written to: ${reportPath}`);

  return report;
}

/**
 * Main verification function
 */
async function verifyConsolidation() {
  console.log('Starting consolidation verification...\n');

  const results = {};

  // Run all verification checks
  results.typeScript = verifyTypeScriptCompilation();
  console.log();

  results.build = verifyBuildProcess();
  console.log();

  results.imports = verifyImportResolution();
  console.log();

  results.duplicates = verifyDuplicateRemoval();
  console.log();

  // Optional: run tests (commented out by default as they might be slow)
  // results.tests = verifyTests();
  // console.log();

  // Generate report
  const report = generateVerificationReport(results);

  // Summary
  console.log('\n=== VERIFICATION SUMMARY ===');
  const passed = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;

  console.log(`Passed: ${passed}/${total} checks`);

  if (report.metadata.overallSuccess) {
    console.log('🎉 All verification checks passed!');
    console.log('Duplicate consolidation appears successful.');
  } else {
    console.log('❌ Some verification checks failed.');
    console.log('Review the verification report for details.');

    // Show failures
    console.log('\nFailed checks:');
    for (const [check, result] of Object.entries(results)) {
      if (!result.success) {
        console.log(`- ${check}: ${result.error ? 'Error' : 'Issues found'}`);
      }
    }
  }

  return report;
}

// Run verification
verifyConsolidation()
  .then(report => {
    process.exit(report.metadata.overallSuccess ? 0 : 1);
  })
  .catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });