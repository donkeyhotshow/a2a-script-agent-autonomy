#!/usr/bin/env node
/**
 * Handle remaining a2a-client duplicates
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Handle the remaining a2a-client duplicates
async function handleClientDuplicates() {
  console.log('🔍 Handling final a2a-client duplicates...\n');

  const projectRoot = process.cwd();
  const backupDir = path.join(projectRoot, '.kilo', 'scripts', 'duplicates', 'backups', `client-${Date.now()}`);

  // The remaining duplicate group
  const primaryPath = 'a2a-client/packages/rag/src/meilisearch-client.ts';
  const duplicatePath = 'a2a-client/packages/sdk/src/server/services/meilisearch-client.ts';

  console.log(`Primary: ${primaryPath}`);
  console.log(`Duplicate: ${duplicatePath}\n`);

  // Check if primary exists
  const fullPrimaryPath = path.join(projectRoot, primaryPath);
  const fullDuplicatePath = path.join(projectRoot, duplicatePath);

  if (!fs.existsSync(fullPrimaryPath)) {
    console.log(`❌ Primary file doesn't exist: ${primaryPath}`);
    return false;
  }

  if (!fs.existsSync(fullDuplicatePath)) {
    console.log(`⚠️  Duplicate file already gone: ${duplicatePath}`);
    return true;
  }

  // Check references to the duplicate
  console.log(`Checking references to duplicate file...`);
  const tsFiles = glob.sync('a2a-client/packages/**/src/**/*.ts', {
    cwd: projectRoot,
    absolute: true,
    nodir: true
  });

  let referenceCount = 0;
  for (const filePath of tsFiles) {
    if (filePath === fullDuplicatePath) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(path.dirname(filePath), fullDuplicatePath);

      if (content.includes(`'${relativePath}'`) || content.includes(`"${relativePath}"`)) {
        console.log(`  ❌ Still referenced in: ${path.relative(projectRoot, filePath)}`);
        referenceCount++;
      }
    } catch (error) {
      continue;
    }
  }

  if (referenceCount > 0) {
    console.log(`❌ Cannot delete - still referenced by ${referenceCount} files`);
    return false;
  }

  // Create backup and delete
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, duplicatePath);
  const backupDirPath = path.dirname(backupPath);

  if (!fs.existsSync(backupDirPath)) {
    fs.mkdirSync(backupDirPath, { recursive: true });
  }

  fs.copyFileSync(fullDuplicatePath, backupPath);
  fs.unlinkSync(fullDuplicatePath);

  console.log(`📦 Backup created: ${backupPath.replace(process.cwd(), '.')}`);
  console.log(`🗑️  Deleted duplicate: ${duplicatePath}`);

  return true;
}

// Run client duplicate handling
handleClientDuplicates()
  .then(success => {
    if (success) {
      console.log('\n✅ Client duplicates handled successfully!');
    } else {
      console.log('\n❌ Failed to handle client duplicates');
    }

    // Run final check
    console.log('\n🔍 Running final duplicate check...');
    const { execSync } = require('child_process');
    try {
      execSync('node .kilo/scripts/duplicates/detect-full-duplicates.js', { stdio: 'inherit' });
    } catch (error) {
      console.log('Final check completed');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });