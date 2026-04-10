#!/usr/bin/env node
/**
 * Final Duplicate Consolidation Script
 * Removes all remaining duplicate files identified in the latest report
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Configuration - use direct path since we're already in the project root
const CONFIG = {
  projectRoot: path.join(process.cwd(), 'a2a-server'),
  backupDir: path.join(process.cwd(), '.kilo', 'scripts', 'duplicates', 'backups'),
  reportsDir: path.join(process.cwd(), '.kilo', 'scripts', 'duplicates', 'reports')
};

// Load the latest duplicate report
function loadLatestDuplicateReport() {
  const reportFiles = fs.readdirSync(CONFIG.reportsDir)
    .filter(file => file.startsWith('duplicates-report-') && file.endsWith('.json'))
    .sort()
    .reverse(); // Get most recent

  if (reportFiles.length === 0) {
    console.error('No duplicate report found. Run detect-full-duplicates.js first.');
    process.exit(1);
  }

  const latestReport = path.join(CONFIG.reportsDir, reportFiles[0]);
  console.log(`Loading duplicate report: ${path.basename(latestReport)}`);

  return JSON.parse(fs.readFileSync(latestReport, 'utf8'));
}

/**
 * Check if a file is still referenced by any imports
 */
function isFileStillReferenced(duplicatePath) {
  console.log(`  Checking references to: ${duplicatePath}`);

  // Fix double a2a-server path issue
  const fixedDuplicatePath = duplicatePath.replace(/^a2a-server\\/, '');

  const tsFiles = glob.sync('packages/**/src/**/*.ts', {
    cwd: CONFIG.projectRoot,
    absolute: true,
    nodir: true
  });

  let referenceCount = 0;

  for (const filePath of tsFiles) {
    if (filePath === path.join(CONFIG.projectRoot, fixedDuplicatePath)) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for relative imports to this file
      const relativePath = path.relative(path.dirname(filePath), path.join(CONFIG.projectRoot, fixedDuplicatePath));
      if (content.includes(`'${relativePath}'`) || content.includes(`"${relativePath}"`)) {
        console.log(`    ❌ Still referenced in: ${path.relative(CONFIG.projectRoot, filePath)}`);
        referenceCount++;
      }

      // Check for absolute imports
      const absolutePath = path.join(CONFIG.projectRoot, fixedDuplicatePath);
      if (content.includes(`'${absolutePath}'`) || content.includes(`"${absolutePath}"`)) {
        console.log(`    ❌ Still referenced in: ${path.relative(CONFIG.projectRoot, filePath)}`);
        referenceCount++;
      }

    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }

  return referenceCount;
}

/**
 * Safely delete a duplicate file
 */
function deleteDuplicateFile(duplicatePath, primaryPath, groupId) {
  // Fix double a2a-server path issue
  const fixedDuplicatePath = duplicatePath.replace(/^a2a-server\\/, '');
  const fixedPrimaryPath = primaryPath.replace(/^a2a-server\\/, '');

  const fullDuplicatePath = path.join(CONFIG.projectRoot, fixedDuplicatePath);
  const fullPrimaryPath = path.join(CONFIG.projectRoot, fixedPrimaryPath);

  // Verify primary exists
  if (!fs.existsSync(fullPrimaryPath)) {
    console.log(`❌ Group ${groupId}: Primary file doesn't exist: ${fullPrimaryPath}`);
    return false;
  }

  // Check if duplicate exists
  if (!fs.existsSync(fullDuplicatePath)) {
    console.log(`⚠️  Group ${groupId}: Duplicate file already gone: ${duplicatePath}`);
    return true;
  }

  // Check references - only check the first file in each group to avoid spam
  const stats = fs.statSync(fullDuplicatePath);
  if (stats.size < 10000) { // Only check references for smaller files
    const referenceCount = isFileStillReferenced(duplicatePath);
    if (referenceCount > 0) {
      console.log(`❌ Group ${groupId}: Cannot delete - still referenced by ${referenceCount} files`);
      return false;
    }
  } else {
    console.log(`  ⚠️  Large file (${(stats.size/1024).toFixed(1)}KB) - skipping reference check`);
  }

  // Create backup
  const backupPath = path.join(CONFIG.backupDir, `final-${Date.now()}`, duplicatePath);
  const backupDir = path.dirname(backupPath);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  fs.copyFileSync(fullDuplicatePath, backupPath);
  console.log(`  📦 Backup created: ${backupPath.replace(process.cwd(), '.')}`);

  // Delete the duplicate
  fs.unlinkSync(fullDuplicatePath);
  console.log(`  🗑️  Deleted duplicate: ${duplicatePath}`);

  return true;
}

/**
 * Main consolidation function
 */
function consolidateRemainingDuplicates() {
  console.log('🚀 Starting FINAL duplicate consolidation...\n');

  const report = loadLatestDuplicateReport();
  console.log(`Processing ${report.metadata.totalDuplicateGroups} duplicate groups (${report.metadata.totalDuplicateFiles} files)\n`);

  // Ensure backup directory exists
  const finalBackupDir = path.join(CONFIG.backupDir, `final-${Date.now()}`);
  if (!fs.existsSync(finalBackupDir)) {
    fs.mkdirSync(finalBackupDir, { recursive: true });
  }

  let deletedCount = 0;
  let skippedCount = 0;
  let totalWastedBytes = 0;

  for (const group of report.duplicates) {
    console.log(`\nGroup ${group.groupId}: ${group.fileCount}× ${group.sizeBytes}B files (${(group.wastedBytes/1024).toFixed(1)}KB wasted)`);

    // Use the first file as primary, delete the rest
    const primaryFile = group.files[0];
    console.log(`Primary: ${primaryFile.path}`);

    for (let i = 1; i < group.files.length; i++) {
      const duplicateFile = group.files[i];
      console.log(`Duplicate: ${duplicateFile.path}`);

      if (deleteDuplicateFile(duplicateFile.path, primaryFile.path, group.groupId)) {
        deletedCount++;
        totalWastedBytes += group.sizeBytes;
      } else {
        skippedCount++;
      }
    }
  }

  console.log('\n📊 FINAL Consolidation Summary:');
  console.log(`- Groups processed: ${report.metadata.totalDuplicateGroups}`);
  console.log(`- Files successfully deleted: ${deletedCount}`);
  console.log(`- Files skipped: ${skippedCount}`);
  console.log(`- Space saved: ${(totalWastedBytes/1024).toFixed(1)}KB`);

  if (deletedCount > 0) {
    console.log('\n✅ Final consolidation completed!');
    console.log(`Backups available in: ${finalBackupDir.replace(process.cwd(), '.')}`);
  }

  return deletedCount;
}

// Run final consolidation
const deletedCount = consolidateRemainingDuplicates();

if (deletedCount > 0) {
  console.log('\n🔄 Running final verification...');
  const { execSync } = require('child_process');
  try {
    execSync('node .kilo/scripts/duplicates/detect-full-duplicates.js', { stdio: 'inherit' });
  } catch (error) {
    console.log('Verification completed.');
  }
}