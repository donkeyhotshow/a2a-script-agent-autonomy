#!/usr/bin/env node
/**
 * Import Fixer Script
 * Fixes broken imports after duplicate file removal
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Import fixes - maps broken import paths to correct ones
const IMPORT_FIXES = [
  // Transform package - utils imports
  {
    pattern: /from ['"`]\.\.\/utils\/deep-clone-json\.js['"]/g,
    replacement: "from '@a2a/server-utils/deep-clone-json.js'"
  },
  {
    pattern: /from ['"`]\.\.\/utils\/logger\.js['"]/g,
    replacement: "from '@a2a/server-utils/logger.js'"
  },
  {
    pattern: /from ['"`]\.\.\/\.\.\/utils\/logger\.js['"]/g,
    replacement: "from '@a2a/server-utils/logger.js'"
  },
  {
    pattern: /from ['"`]\.\.\/\.\.\/utils\/strip-markdown-json-fence\.js['"]/g,
    replacement: "from '@a2a/server-utils/strip-markdown-json-fence.js'"
  },

  // Transform package - services imports
  {
    pattern: /from ['"`]\.\.\/services\/core\/request-processor\/normalization\.js['"]/g,
    replacement: "from '@a2a/server/normalization.js'"
  },

  // Features package - gray-room imports
  {
    pattern: /from ['"`]\.\.\/\.\.\/\.\.\/gray-room\/src\//g,
    replacement: "from '@a2a/gray-room/"
  },

  // Features package - actions imports
  {
    pattern: /from ['"`]\.\.\/\.\.\/\.\.\/actions\/src\//g,
    replacement: "from '@a2a/actions/"
  },

  // Server package - utils imports
  {
    pattern: /from ['"`]\.\.\/\.\.\/server-utils\/src\//g,
    replacement: "from '@a2a/server-utils/"
  },

  // Request package - service imports
  {
    pattern: /from ['"`]\.\.\/\.\.\/\.\.\/request\/src\//g,
    replacement: "from '@a2a/request/"
  }
];

/**
 * Apply import fixes to a file
 */
function applyImportFixesToFile(filePath) {
  console.log(`Processing: ${path.relative(process.cwd(), filePath)}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let fixesApplied = 0;

  for (const fix of IMPORT_FIXES) {
    const newContent = content.replace(fix.pattern, fix.replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
      fixesApplied++;
      console.log(`  ✓ Fixed: ${fix.pattern} -> ${fix.replacement}`);
    }
  }

  if (modified) {
    // Create backup before modifying
    const backupPath = filePath + '.import-fix-backup';
    fs.copyFileSync(filePath, backupPath);
    console.log(`  📦 Backup created: ${path.relative(process.cwd(), backupPath)}`);

    // Write fixed content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Applied ${fixesApplied} import fixes`);
  } else {
    console.log(`  ℹ️  No fixes needed`);
  }

  return modified;
}

/**
 * Find files that need import fixes
 */
function findFilesNeedingFixes() {
  const tsFiles = glob.sync('a2a-server/packages/**/src/**/*.ts', {
    cwd: process.cwd(),
    absolute: true,
    nodir: true
  });

  console.log(`Checking ${tsFiles.length} files for broken imports...`);

  const filesNeedingFixes = [];

  for (const filePath of tsFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check if file contains any patterns that need fixing
      const needsFix = IMPORT_FIXES.some(fix => fix.pattern.test(content));

      if (needsFix) {
        filesNeedingFixes.push(filePath);
      }
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }

  return filesNeedingFixes;
}

// Run import fixes
console.log('Starting import fixes...\n');

const filesToFix = findFilesNeedingFixes();
console.log(`Found ${filesToFix.length} files that need import fixes\n`);

let totalModified = 0;
let totalFixes = 0;

for (const filePath of filesToFix) {
  const modified = applyImportFixesToFile(filePath);
  if (modified) {
    totalModified++;
  }
  console.log();
}

console.log('📊 Import Fix Summary:');
console.log(`- Files checked: ${filesToFix.length}`);
console.log(`- Files modified: ${totalModified}`);
console.log(`- Files unchanged: ${filesToFix.length - totalModified}`);

if (totalModified > 0) {
  console.log('\nNext steps:');
  console.log('1. Test compilation: npm run build');
  console.log('2. Run tests: npm test');
  console.log('3. If issues persist, check .import-fix-backup files');
} else {
  console.log('\n✅ No import fixes were needed');
}