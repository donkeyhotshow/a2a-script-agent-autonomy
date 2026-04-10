#!/usr/bin/env node
/**
 * Comprehensive Import Fixer Script
 * Fixes all remaining broken imports after duplicate consolidation
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Comprehensive import fixes
const COMPREHENSIVE_FIXES = [
  // Server package - broken imports to server-utils
  {
    pattern: /from ['"`]\.\.\/\.\.\/utils\/deep-clone-json\.js['"]/g,
    replacement: "from '@a2a/server-utils/deep-clone-json.js'"
  },
  {
    pattern: /from ['"`]\.\.\/\.\.\/utils\/fs-access\.js['"]/g,
    replacement: "from '@a2a/server-utils/fs-access.js'"
  },
  {
    pattern: /from ['"`]\.\.\/\.\.\/utils\/logger\.js['"]/g,
    replacement: "from '@a2a/server-utils/logger.js'"
  },
  {
    pattern: /from ['"`]\.\.\/\.\.\/utils\/strip-markdown-json-fence\.js['"]/g,
    replacement: "from '@a2a/server-utils/strip-markdown-json-fence.js'"
  },
  {
    pattern: /from ['"`]\.\.\/\.\.\/utils\/task-detail-analyzer\.js['"]/g,
    replacement: "from '@a2a/server-utils/task-detail-analyzer.js'"
  },

  // Transform package - utils imports
  {
    pattern: /from ['"`]\.\.\/utils\/deep-clone-json\.js['"]/g,
    replacement: "from '@a2a/server-utils/deep-clone-json.js'"
  },
  {
    pattern: /from ['"`]\.\.\/utils\/fs-access\.js['"]/g,
    replacement: "from '@a2a/server-utils/fs-access.js'"
  },
  {
    pattern: /from ['"`]\.\.\/utils\/logger\.js['"]/g,
    replacement: "from '@a2a/server-utils/logger.js'"
  },
  {
    pattern: /from ['"`]\.\.\/utils\/strip-markdown-json-fence\.js['"]/g,
    replacement: "from '@a2a/server-utils/strip-markdown-json-fence.js'"
  },

  // Transform package - broken relative imports
  {
    pattern: /from ['"`]\.\/transform\/index\.js['"]/g,
    replacement: "from './index.js'"
  },

  // Transform package - prompts imports
  {
    pattern: /from ['"`]\.\.\/prompts\/flow-control-hints\.js['"]/g,
    replacement: "from './prompts/flow-control-hints.js'"
  },

  // Services package - utils imports
  {
    pattern: /from ['"`]\.\.\/\.\.\/utils\/logger\.js['"]/g,
    replacement: "from '@a2a/server-utils/logger.js'"
  },

  // Server-utils package - self imports
  {
    pattern: /from ['"`]\.\.\/\.\.\/utils\/logger\.js['"]/g,
    replacement: "from './logger.js'"
  },

  // Request package - utils imports
  {
    pattern: /from ['"`]\.\.\/\.\.\/utils\/logger\.js['"]/g,
    replacement: "from '@a2a/server-utils/logger.js'"
  },

  // LLM package - utils imports
  {
    pattern: /from ['"`]\.\.\/\.\.\/utils\/logger\.js['"]/g,
    replacement: "from '@a2a/server-utils/logger.js'"
  },

  // Gray-room package - utils imports
  {
    pattern: /from ['"`]\.\.\/\.\.\/utils\/logger\.js['"]/g,
    replacement: "from '@a2a/server-utils/logger.js'"
  },

  // Features package - utils imports
  {
    pattern: /from ['"`]\.\.\/\.\.\/utils\/logger\.js['"]/g,
    replacement: "from '@a2a/server-utils/logger.js'"
  },

  // Daemon package - utils imports
  {
    pattern: /from ['"`]\.\.\/\.\.\/utils\/logger\.js['"]/g,
    replacement: "from '@a2a/server-utils/logger.js'"
  },

  // Server package - broken service imports (these may need manual fixing)
  {
    pattern: /from ['"`]\.\.\/\.\.\/server\/normalization\.js['"]/g,
    replacement: "from './request-processor/normalization.js'"
  }
];

/**
 * Apply comprehensive import fixes to a file
 */
function applyComprehensiveFixesToFile(filePath) {
  console.log(`Processing: ${path.relative(process.cwd(), filePath)}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let fixesApplied = 0;

  for (const fix of COMPREHENSIVE_FIXES) {
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
    const backupPath = filePath + '.comprehensive-fix-backup';
    fs.copyFileSync(filePath, backupPath);
    console.log(`  📦 Backup created: ${path.relative(process.cwd(), backupPath)}`);

    // Write fixed content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Applied ${fixesApplied} comprehensive import fixes`);
  } else {
    console.log(`  ℹ️  No fixes needed`);
  }

  return modified;
}

/**
 * Find files that need comprehensive import fixes
 */
function findFilesNeedingComprehensiveFixes() {
  const tsFiles = glob.sync('a2a-server/packages/**/src/**/*.ts', {
    cwd: process.cwd(),
    absolute: true,
    nodir: true
  });

  console.log(`Checking ${tsFiles.length} files for remaining broken imports...`);

  const filesNeedingFixes = [];

  for (const filePath of tsFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check if file contains any patterns that need fixing
      const needsFix = COMPREHENSIVE_FIXES.some(fix => fix.pattern.test(content));

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

// Run comprehensive import fixes
console.log('Starting comprehensive import fixes...\n');

const filesToFix = findFilesNeedingComprehensiveFixes();
console.log(`Found ${filesToFix.length} files that need comprehensive import fixes\n`);

let totalModified = 0;
let totalFixes = 0;

for (const filePath of filesToFix) {
  const modified = applyComprehensiveFixesToFile(filePath);
  if (modified) {
    totalModified++;
  }
  console.log();
}

console.log('📊 Comprehensive Import Fix Summary:');
console.log(`- Files checked: ${filesToFix.length}`);
console.log(`- Files modified: ${totalModified}`);
console.log(`- Files unchanged: ${filesToFix.length - totalModified}`);

if (totalModified > 0) {
  console.log('\nNext steps:');
  console.log('1. Test compilation: npm run build');
  console.log('2. Run tests: npm test');
  console.log('3. If issues persist, check .comprehensive-fix-backup files');
  console.log('4. Run verification again');
} else {
  console.log('\n✅ No comprehensive import fixes were needed');
}