#!/usr/bin/env node
/**
 * File Consolidation Script
 * Safely deletes duplicate files that are no longer referenced
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Configuration
const CONFIG = {
  projectRoot: path.join(process.cwd(), 'a2a-server'),
  backupDir: path.join(process.cwd(), '.kilo/scripts/duplicates/backups')
};

// Known duplicate file mappings (duplicate -> primary)
const DUPLICATE_MAPPINGS = {
  // Actions triple nesting - Core files
  'packages/features/src/actions/action-executor.ts': 'packages/actions/src/action-executor.ts',
  'packages/features/src/actions/src/actions/action-executor.ts': 'packages/actions/src/action-executor.ts',

  'packages/features/src/actions/action-handler-registry.ts': 'packages/actions/src/action-handler-registry.ts',
  'packages/features/src/actions/src/actions/action-handler-registry.ts': 'packages/actions/src/action-handler-registry.ts',

  'packages/features/src/actions/action-parser.ts': 'packages/actions/src/action-parser.ts',
  'packages/features/src/actions/src/actions/action-parser.ts': 'packages/actions/src/action-parser.ts',

  'packages/features/src/actions/action-processor.ts': 'packages/actions/src/action-processor.ts',
  'packages/features/src/actions/src/actions/action-processor.ts': 'packages/actions/src/action-processor.ts',

  'packages/features/src/actions/action-registry.ts': 'packages/actions/src/action-registry.ts',
  'packages/features/src/actions/src/actions/action-registry.ts': 'packages/actions/src/action-registry.ts',

  'packages/features/src/actions/action-service.ts': 'packages/actions/src/action-service.ts',
  'packages/features/src/actions/src/actions/action-service.ts': 'packages/actions/src/action-service.ts',

  'packages/features/src/actions/action-validator.ts': 'packages/actions/src/action-validator.ts',
  'packages/features/src/actions/src/actions/action-validator.ts': 'packages/actions/src/action-validator.ts',

  // Actions - Handler files
  'packages/features/src/actions/handlers/command-execution.ts': 'packages/actions/src/handlers/command-execution.ts',
  'packages/features/src/actions/src/actions/handlers/command-execution.ts': 'packages/actions/src/handlers/command-execution.ts',

  'packages/features/src/actions/handlers/edit-patch.ts': 'packages/actions/src/handlers/edit-patch.ts',
  'packages/features/src/actions/src/actions/handlers/edit-patch.ts': 'packages/actions/src/handlers/edit-patch.ts',

  'packages/features/src/actions/handlers/grep-search.ts': 'packages/actions/src/handlers/grep-search.ts',
  'packages/features/src/actions/src/actions/handlers/grep-search.ts': 'packages/actions/src/handlers/grep-search.ts',

  'packages/features/src/actions/handlers/mcp-call.ts': 'packages/actions/src/handlers/mcp-call.ts',
  'packages/features/src/actions/src/actions/handlers/mcp-call.ts': 'packages/actions/src/handlers/mcp-call.ts',

  'packages/features/src/actions/handlers/run-script.ts': 'packages/actions/src/handlers/run-script.ts',
  'packages/features/src/actions/src/actions/handlers/run-script.ts': 'packages/actions/src/handlers/run-script.ts',

  // Actions - File operations
  'packages/features/src/actions/handlers/file-operations.ts': 'packages/actions/src/handlers/file-operations.ts',
  'packages/features/src/actions/src/actions/handlers/file-operations.ts': 'packages/actions/src/handlers/file-operations.ts',

  'packages/features/src/actions/handlers/file-operations/file-exists.ts': 'packages/actions/src/handlers/file-operations/file-exists.ts',
  'packages/features/src/actions/src/actions/handlers/file-operations/file-exists.ts': 'packages/actions/src/handlers/file-operations/file-exists.ts',

  'packages/features/src/actions/handlers/file-operations/list-directory.ts': 'packages/actions/src/handlers/file-operations/list-directory.ts',
  'packages/features/src/actions/src/actions/handlers/file-operations/list-directory.ts': 'packages/actions/src/handlers/file-operations/list-directory.ts',

  'packages/features/src/actions/handlers/file-operations/read-file.ts': 'packages/actions/src/handlers/read-file.ts',
  'packages/features/src/actions/src/actions/handlers/file-operations/read-file.ts': 'packages/actions/src/handlers/file-operations/read-file.ts',

  'packages/features/src/actions/handlers/file-operations/write-file.ts': 'packages/actions/src/handlers/write-file.ts',
  'packages/features/src/actions/src/actions/handlers/file-operations/write-file.ts': 'packages/actions/src/handlers/file-operations/write-file.ts',

  'packages/features/src/actions/handlers/file-operations/security.ts': 'packages/actions/src/handlers/file-operations/security.ts',
  'packages/features/src/actions/src/actions/handlers/file-operations/security.ts': 'packages/actions/src/handlers/file-operations/security.ts',

  // Actions - Types and utilities
  'packages/features/src/actions/types.ts': 'packages/actions/src/types.ts',
  'packages/features/src/actions/src/actions/types.ts': 'packages/actions/src/types.ts',

  'packages/features/src/actions/utils.ts': 'packages/actions/src/utils.ts',
  'packages/features/src/actions/src/actions/utils.ts': 'packages/actions/src/utils.ts',

  // Actions - Definitions
  'packages/features/src/actions/definitions/auto-ai-index.ts': 'packages/actions/src/definitions/auto-ai-index.ts',
  'packages/features/src/actions/src/actions/definitions/auto-ai-index.ts': 'packages/actions/src/definitions/auto-ai-index.ts',

  // Actions - Indexes
  'packages/features/src/actions/index.ts': 'packages/actions/src/index.ts',
  'packages/features/src/actions/src/actions/index.ts': 'packages/actions/src/index.ts',

  'packages/features/src/actions/handlers/index.ts': 'packages/actions/src/handlers/index.ts',
  'packages/features/src/actions/src/actions/handlers/index.ts': 'packages/actions/src/handlers/index.ts',

  'packages/features/src/actions/handlers/file-operations/types.ts': 'packages/actions/src/handlers/file-operations/types.ts',
  'packages/features/src/actions/src/actions/handlers/file-operations/types.ts': 'packages/actions/src/handlers/file-operations/types.ts',

  // Gray-room duplicates
  'packages/features/src/gray-room/manager.ts': 'packages/gray-room/src/manager.ts',
  'packages/features/src/gray-room/orchestrator.ts': 'packages/gray-room/src/orchestrator.ts',
  'packages/features/src/gray-room/config.ts': 'packages/gray-room/src/config.ts',
  'packages/features/src/gray-room/index.ts': 'packages/gray-room/src/index.ts',
  'packages/features/src/gray-room/types.ts': 'packages/gray-room/src/types.ts',
  'packages/features/src/gray-room/logger.ts': 'packages/gray-room/src/logger.ts',

  // Server utils lib/ duplicates
  'packages/server-utils/src/lib/validation.ts': 'packages/server-utils/src/validation.ts',
  'packages/server-utils/src/lib/retry.ts': 'packages/server-utils/src/retry.ts',
  'packages/server-utils/src/lib/circuit-breaker.ts': 'packages/server-utils/src/circuit-breaker.ts',
  'packages/server-utils/src/lib/backoff.ts': 'packages/server-utils/src/lib/backoff.ts',
  'packages/server-utils/src/lib/errors.ts': 'packages/server-utils/src/errors.ts',
  'packages/server-utils/src/lib/crypto.ts': 'packages/server-utils/src/crypto.ts',
  'packages/server-utils/src/lib/fs-access.ts': 'packages/server-utils/src/fs-access.ts',
  'packages/server-utils/src/lib/metrics.ts': 'packages/server-utils/src/metrics.ts',
  'packages/server-utils/src/lib/mkdtemp-os-tmp.ts': 'packages/server-utils/src/mkdtemp-os-tmp.ts',
  'packages/server-utils/src/lib/strip-markdown-json-fence.ts': 'packages/server-utils/src/strip-markdown-json-fence.ts',
  'packages/server-utils/src/lib/task-detail-analyzer.ts': 'packages/server-utils/src/task-detail-analyzer.ts',
  'packages/server-utils/src/lib/adaptive-polling.ts': 'packages/server-utils/src/adaptive-polling.ts',
  'packages/server-utils/src/lib/deep-clone-json.ts': 'packages/server-utils/src/deep-clone-json.ts'
};

/**
 * Check if a file is still referenced by any imports
 */
function isFileStillReferenced(duplicatePath) {
  console.log(`Checking references to: ${duplicatePath}`);

  const tsFiles = glob.sync('packages/**/src/**/*.ts', {
    cwd: CONFIG.projectRoot,
    absolute: true,
    nodir: true
  });

  let referenceCount = 0;

  for (const filePath of tsFiles) {
    if (filePath === path.join(CONFIG.projectRoot, duplicatePath)) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for relative imports to this file
      const relativePath = path.relative(path.dirname(filePath), path.join(CONFIG.projectRoot, duplicatePath));
      if (content.includes(`'${relativePath}'`) || content.includes(`"${relativePath}"`)) {
        console.log(`  Still referenced in: ${path.relative(CONFIG.projectRoot, filePath)}`);
        referenceCount++;
      }

      // Check for absolute imports
      const absolutePath = path.join(CONFIG.projectRoot, duplicatePath);
      if (content.includes(`'${absolutePath}'`) || content.includes(`"${absolutePath}"`)) {
        console.log(`  Still referenced in: ${path.relative(CONFIG.projectRoot, filePath)}`);
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
function deleteDuplicateFile(duplicatePath, primaryPath) {
  const fullDuplicatePath = path.join(CONFIG.projectRoot, duplicatePath);
  const fullPrimaryPath = path.join(CONFIG.projectRoot, primaryPath);

  // Verify primary exists
  if (!fs.existsSync(fullPrimaryPath)) {
    console.log(`❌ Primary file doesn't exist: ${primaryPath}`);
    return false;
  }

  // Check if duplicate exists
  if (!fs.existsSync(fullDuplicatePath)) {
    console.log(`⚠️  Duplicate file already gone: ${duplicatePath}`);
    return true;
  }

  // Check references
  const referenceCount = isFileStillReferenced(duplicatePath);
  if (referenceCount > 0) {
    console.log(`❌ Cannot delete - still referenced by ${referenceCount} files`);
    return false;
  }

  // Create backup
  const backupPath = path.join(CONFIG.backupDir, duplicatePath);
  const backupDir = path.dirname(backupPath);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  fs.copyFileSync(fullDuplicatePath, backupPath);
  console.log(`📦 Backup created: ${backupPath}`);

  // Delete the duplicate
  fs.unlinkSync(fullDuplicatePath);
  console.log(`🗑️  Deleted duplicate: ${duplicatePath}`);

  return true;
}

/**
 * Main consolidation function
 */
function consolidateFiles() {
  console.log('Starting file consolidation...\n');

  // Ensure backup directory exists
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }

  const duplicateEntries = Object.entries(DUPLICATE_MAPPINGS);
  console.log(`Processing ${duplicateEntries.length} duplicate mappings\n`);

  let deletedCount = 0;
  let skippedCount = 0;

  for (const [duplicatePath, primaryPath] of duplicateEntries) {
    console.log(`\nProcessing: ${duplicatePath}`);
    console.log(`Primary: ${primaryPath}`);

    if (deleteDuplicateFile(duplicatePath, primaryPath)) {
      deletedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log('\n📊 Consolidation Summary:');
  console.log(`- Total mappings processed: ${duplicateEntries.length}`);
  console.log(`- Files successfully deleted: ${deletedCount}`);
  console.log(`- Files skipped: ${skippedCount}`);

  if (deletedCount > 0) {
    console.log('\n✅ File consolidation completed!');
    console.log('Backups are available in: .kilo/scripts/duplicates/backups/');
  }

  return deletedCount;
}

// Run consolidation
consolidateFiles();