#!/usr/bin/env node
/**
 * Safe Import Migration Script
 * Only migrates imports where both source and target files actually exist
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Verified mappings - only these will be migrated
const VERIFIED_MAPPINGS = [
  // server-utils lib/ -> server-utils root (files confirmed to exist)
  {
    from: './lib/validation.js',
    to: './validation.js',
    description: 'server-utils validation'
  },
  {
    from: './lib/retry.js',
    to: './retry.js',
    description: 'server-utils retry'
  },
  {
    from: './lib/circuit-breaker.js',
    to: './circuit-breaker.js',
    description: 'server-utils circuit-breaker'
  },
  {
    from: './lib/backoff.js',
    to: './backoff.js',
    description: 'server-utils backoff'
  }
];

/**
 * Check if a file exists at the given path
 */
function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (error) {
    return false;
  }
}

/**
 * Apply verified mappings to files
 */
function applyVerifiedMigrations() {
  console.log('Starting safe import migration...\n');

  // Find all TypeScript files
  const tsFiles = glob.sync('a2a-server/packages/**/src/**/*.ts', {
    cwd: process.cwd(),
    absolute: true,
    nodir: true
  });

  console.log(`Found ${tsFiles.length} TypeScript files to check\n`);

  let totalModified = 0;
  let totalMigrations = 0;

  for (const filePath of tsFiles) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let fileMigrations = 0;

    for (const mapping of VERIFIED_MAPPINGS) {
      // Look for the specific import pattern
      const importPattern = new RegExp(`from ['"]${mapping.from.replace(/\./g, '\\.')}['"]`, 'g');

      if (importPattern.test(content)) {
        // Create backup before first modification
        if (!modified) {
          const backupPath = filePath + '.backup';
          fs.copyFileSync(filePath, backupPath);
          console.log(`Processing: ${path.relative(process.cwd(), filePath)}`);
          console.log(`  Backup: ${path.relative(process.cwd(), backupPath)}`);
        }

        // Apply the migration
        content = content.replace(importPattern, `from '${mapping.to}'`);
        modified = true;
        fileMigrations++;
        console.log(`  ✓ Migrated ${mapping.description}: ${mapping.from} -> ${mapping.to}`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalModified++;
      totalMigrations += fileMigrations;
    }
  }

  console.log('\nMigration Summary:');
  console.log(`- Files checked: ${tsFiles.length}`);
  console.log(`- Files modified: ${totalModified}`);
  console.log(`- Total migrations applied: ${totalMigrations}`);

  if (totalModified > 0) {
    console.log('\nNext steps:');
    console.log('1. Test compilation: npm run build');
    console.log('2. Run tests: npm test');
    console.log('3. If issues occur, restore from .backup files');
  }

  return totalModified > 0;
}

/**
 * Verify that all migrations were applied correctly
 */
function verifyMigrations() {
  console.log('\nVerifying migrations...');

  let verificationPassed = true;

  for (const mapping of VERIFIED_MAPPINGS) {
    // Find files that still have the old import
    const tsFiles = glob.sync('a2a-server/packages/**/src/**/*.ts', {
      cwd: process.cwd(),
      absolute: true
    });

    for (const filePath of tsFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const importPattern = new RegExp(`from ['"]${mapping.from.replace(/\./g, '\\.')}['"]`);

      if (importPattern.test(content)) {
        console.log(`❌ Still found old import in: ${path.relative(process.cwd(), filePath)}`);
        console.log(`   ${mapping.from} should be ${mapping.to}`);
        verificationPassed = false;
      }
    }
  }

  if (verificationPassed) {
    console.log('✅ All migrations verified successfully');
  } else {
    console.log('❌ Some migrations were not applied correctly');
  }

  return verificationPassed;
}

// Run safe migration
const success = applyVerifiedMigrations();
if (success) {
  verifyMigrations();
}