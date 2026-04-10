#!/usr/bin/env node
/**
 * Consolidation Helper Script
 * Applies import migrations and consolidates duplicate files safely
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Configuration
const CONFIG = {
  // Backup directory
  backupDir: './.kilo/scripts/duplicates/backups',
  // Reports directory
  reportsDir: './.kilo/scripts/duplicates/reports',
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
  }
};

/**
 * Create backup of file before modification
 */
function createBackup(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const backupPath = path.join(CONFIG.backupDir, relativePath);

  // Create backup directory structure
  const backupDir = path.dirname(backupPath);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Copy file to backup location
  fs.copyFileSync(filePath, backupPath);
  console.log(`Backed up: ${relativePath} -> ${backupPath}`);

  return backupPath;
}

/**
 * Restore file from backup
 */
function restoreBackup(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const backupPath = path.join(CONFIG.backupDir, relativePath);

  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, filePath);
    console.log(`Restored: ${backupPath} -> ${relativePath}`);
    return true;
  }

  return false;
}

/**
 * Apply import migration to a single file
 */
function applyImportMigrationsToFile(filePath, migrations) {
  console.log(`Processing file: ${path.relative(process.cwd(), filePath)}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const migration of migrations) {
    // Replace the import line
    const oldLine = migration.fullLine;
    const newLine = oldLine.replace(migration.currentImport, migration.suggestedImport);

    if (oldLine !== newLine) {
      content = content.replace(oldLine, newLine);
      modified = true;
      console.log(`  Migrated: ${migration.currentImport} -> ${migration.suggestedImport}`);
    }
  }

  if (modified) {
    createBackup(filePath);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Updated file with ${migrations.length} migrations`);
  } else {
    console.log(`  No changes needed`);
  }

  return modified;
}

/**
 * Delete duplicate file after confirming no imports remain
 */
function deleteDuplicateFile(duplicatePath, primaryPath) {
  console.log(`Checking if duplicate file can be safely deleted: ${duplicatePath}`);

  // Find all files that might import from this location
  const searchPattern = `**/*.ts`;
  const files = glob.sync(searchPattern, {
    cwd: path.join(process.cwd(), 'a2a-server'),
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**']
  });

  let remainingImports = 0;

  for (const filePath of files) {
    if (filePath === duplicatePath || filePath === primaryPath) continue;

    try {
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) continue; // Skip directories

      const content = fs.readFileSync(filePath, 'utf8');
      const relativeToDuplicate = path.relative(path.dirname(filePath), duplicatePath);

    // Check if file imports from the duplicate location
    if (content.includes(`'${relativeToDuplicate}'`) ||
        content.includes(`"${relativeToDuplicate}"`)) {
      remainingImports++;
      console.log(`  Still referenced in: ${path.relative(process.cwd(), filePath)}`);
    }
  }

  if (remainingImports === 0) {
    createBackup(duplicatePath);
    fs.unlinkSync(duplicatePath);
    console.log(`  Deleted duplicate file: ${duplicatePath}`);
    return true;
  } else {
    console.log(`  Cannot delete - still referenced by ${remainingImports} files`);
    return false;
  }
}

/**
 * Load migration report
 */
function loadMigrationReport() {
  const reportFiles = fs.readdirSync(CONFIG.reportsDir)
    .filter(file => file.startsWith('import-migration-report-') && file.endsWith('.json'))
    .sort()
    .reverse(); // Get most recent

  if (reportFiles.length === 0) {
    console.error('No import migration report found. Run import-migration.js first.');
    process.exit(1);
  }

  const latestReport = path.join(CONFIG.reportsDir, reportFiles[0]);
  console.log(`Loading migration report: ${latestReport}`);

  const report = JSON.parse(fs.readFileSync(latestReport, 'utf8'));
  return report;
}

/**
 * Main consolidation function
 */
async function consolidateDuplicates(dryRun = true) {
  console.log(`Starting consolidation (dry-run: ${dryRun})`);

  // Ensure backup directory exists
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }

  const report = loadMigrationReport();
  const consolidationResults = {
    filesProcessed: 0,
    importsMigrated: 0,
    filesDeleted: 0,
    errors: []
  };

  console.log(`\nProcessing ${report.importIssues.length} files with migration issues...`);

  // Phase 1: Apply import migrations
  for (const fileIssue of report.importIssues) {
    try {
      const filePath = fileIssue.fullPath;

      if (!dryRun) {
        applyImportMigrationsToFile(filePath, fileIssue.issues);
      } else {
        console.log(`Would process: ${fileIssue.filePath} (${fileIssue.issues.length} migrations)`);
      }

      consolidationResults.filesProcessed++;
      consolidationResults.importsMigrated += fileIssue.issues.length;

    } catch (error) {
      console.error(`Error processing ${fileIssue.filePath}:`, error.message);
      consolidationResults.errors.push({
        file: fileIssue.filePath,
        error: error.message
      });
    }
  }

  // Phase 2: Delete duplicate files (only if not dry run and all imports migrated)
  if (!dryRun && consolidationResults.errors.length === 0) {
    console.log('\nAttempting to delete duplicate files...');

    // Get list of duplicate files from the duplicate mappings
    for (const [duplicatePath, primaryPath] of Object.entries(CONFIG.duplicateMappings)) {
      const fullDuplicateBase = path.join(process.cwd(), 'a2a-server', duplicatePath);
      const fullPrimaryBase = path.join(process.cwd(), 'a2a-server', primaryPath);

      // Find all .ts files in the duplicate directory
      if (fs.existsSync(fullDuplicateBase)) {
        const duplicateFiles = glob.sync('**/*.ts', {
          cwd: fullDuplicateBase,
          absolute: true
        });

        for (const duplicateFile of duplicateFiles) {
          const relativeToDuplicate = path.relative(fullDuplicateBase, duplicateFile);
          const primaryFile = path.join(fullPrimaryBase, relativeToDuplicate);

          // Only delete if primary exists
          if (fs.existsSync(primaryFile)) {
            if (deleteDuplicateFile(duplicateFile, primaryFile)) {
              consolidationResults.filesDeleted++;
            }
          }
        }
      }
    }
  }

  // Generate consolidation report
  await generateConsolidationReport(consolidationResults, dryRun);

  console.log('\n=== CONSOLIDATION SUMMARY ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Files processed: ${consolidationResults.filesProcessed}`);
  console.log(`Imports migrated: ${consolidationResults.importsMigrated}`);
  console.log(`Files deleted: ${consolidationResults.filesDeleted}`);
  console.log(`Errors: ${consolidationResults.errors.length}`);

  if (consolidationResults.errors.length > 0) {
    console.log('\nErrors encountered:');
    consolidationResults.errors.forEach(err => {
      console.log(`- ${err.file}: ${err.error}`);
    });
  }

  if (dryRun) {
    console.log('\nTo apply changes, run: node consolidation-helper.js --apply');
  } else {
    console.log('\nConsolidation completed. Verify with: npm run build && npm test');
  }

  return consolidationResults;
}

/**
 * Generate consolidation report
 */
async function generateConsolidationReport(results, dryRun) {
  const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
  const reportPath = path.join(CONFIG.reportsDir, `consolidation-report-${dryRun ? 'dry-run-' : ''}${timestamp}.json`);

  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      mode: dryRun ? 'dry-run' : 'live',
      ...results
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Consolidation report written to: ${reportPath}`);
}

// Command line interface
const args = process.argv.slice(2);
const applyMode = args.includes('--apply') || args.includes('-a');
const dryRun = !applyMode;

consolidateDuplicates(dryRun)
  .catch(error => {
    console.error('Consolidation failed:', error);
    process.exit(1);
  });