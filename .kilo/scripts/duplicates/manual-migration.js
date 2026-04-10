#!/usr/bin/env node
/**
 * Manual Import Migration Script
 * Carefully migrates specific known duplicate imports to correct locations
 */

const fs = require('fs');
const path = require('path');

// Configuration - specific import mappings that we know are correct
const IMPORT_MAPPINGS = [
  // Server utils lib/ imports -> server-utils package
  {
    pattern: /from ['"`]\.\.\/\.\.\/server-utils\/src\/lib\//g,
    replacement: "from '@a2a/server-utils/"
  },
  {
    pattern: /from ['"`]\.\.\/\.\.\/server-utils\/src\/lib\//g,
    replacement: "from '@a2a/server-utils/"
  },

  // Actions from features -> actions package
  {
    pattern: /from ['"`]\.\.\/\.\.\/\.\.\/actions\/src\//g,
    replacement: "from '@a2a/actions/"
  },

  // Gray-room from features -> gray-room package
  {
    pattern: /from ['"`]\.\.\/\.\.\/\.\.\/gray-room\/src\//g,
    replacement: "from '@a2a/gray-room/"
  },

  // Request services -> request package
  {
    pattern: /from ['"`]\.\.\/\.\.\/\.\.\/request\/src\//g,
    replacement: "from '@a2a/request/"
  }
];

/**
 * Apply import mappings to a file
 */
function applyMappingsToFile(filePath) {
  console.log(`Processing: ${path.relative(process.cwd(), filePath)}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const mapping of IMPORT_MAPPINGS) {
    const newContent = content.replace(mapping.pattern, mapping.replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
      console.log(`  Applied: ${mapping.pattern} -> ${mapping.replacement}`);
    }
  }

  if (modified) {
    // Create backup
    const backupPath = filePath + '.backup';
    fs.copyFileSync(filePath, backupPath);
    console.log(`  Backup created: ${path.relative(process.cwd(), backupPath)}`);

    // Write modified content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Updated file`);
  } else {
    console.log(`  No changes needed`);
  }

  return modified;
}

/**
 * Find files that contain the patterns we want to migrate
 */
function findFilesToMigrate() {
  const { glob } = require('glob');
  const patterns = [
    './a2a-server/packages/**/src/**/*.ts'
  ];

  const files = [];
  for (const pattern of patterns) {
    const found = glob.sync(pattern, { absolute: true });
    files.push(...found);
  }

  return files.filter(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      return IMPORT_MAPPINGS.some(mapping => mapping.pattern.test(content));
    } catch (error) {
      return false;
    }
  });
}

/**
 * Main migration function
 */
function migrateImports() {
  console.log('Starting manual import migration...\n');

  const filesToMigrate = findFilesToMigrate();
  console.log(`Found ${filesToMigrate.length} files to process\n`);

  let totalModified = 0;
  for (const filePath of filesToMigrate) {
    if (applyMappingsToFile(filePath)) {
      totalModified++;
    }
    console.log();
  }

  console.log('Migration Summary:');
  console.log(`- Files processed: ${filesToMigrate.length}`);
  console.log(`- Files modified: ${totalModified}`);
  console.log(`- Files unchanged: ${filesToMigrate.length - totalModified}`);

  if (totalModified > 0) {
    console.log('\nNext steps:');
    console.log('1. Test compilation: npm run build');
    console.log('2. Run tests: npm test');
    console.log('3. If issues occur, restore from .backup files');
  }
}

// Run migration
migrateImports();