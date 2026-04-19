#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { resolve } from 'path';
import fs from 'fs';

// Define directories to process based on actual structure
const directories = [
  { name: 'a2a-server', path: resolve('a2a-server') },
  { name: 'a2a-server/utils', path: resolve('a2a-server/packages/utils') },
  { name: 'a2a-server/features', path: resolve('a2a-server/packages/features') },
  { name: 'a2a-client', path: resolve('a2a-client') },
  { name: 'execution', path: resolve('a2a-client/packages/execution') },
  { name: 'rag', path: resolve('a2a-client/packages/rag') },
  { name: 'sdk', path: resolve('a2a-client/packages/sdk') },
  { name: 'web', path: resolve('a2a-client/packages/web') }
];

console.log('Starting manual import fixing process...');

// Function to find and fix common import issues
async function fixImportsInDirectory(dir) {
  console.log(`\nProcessing ${dir.name}...`);

  if (!fs.existsSync(dir.path)) {
    console.log(`  Directory ${dir.path} does not exist, skipping`);
    return;
  }

  // Find all TypeScript/JavaScript files
  const findResult = spawnSync('find', [dir.path, '-name', '*.ts', '-o', '-name', '*.tsx', '-o', '-name', '*.js', '-o', '-name', '*.jsx'], {
    encoding: 'utf8'
  });

  if (findResult.status !== 0) {
    console.log(`  Error finding files: ${findResult.stderr}`);
    return;
  }

  const files = findResult.stdout.trim().split('\n').filter(f => f.trim());
  console.log(`  Found ${files.length} source files`);

  let fixedCount = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      let newContent = content;
      let fileChanged = false;

      // Fix 1: Add .js extension to relative imports without extensions
      // Look for imports like: import { something } from './module'
      // Change to: import { something } from './module.js'
      const relativeImportRegex = /(import\s+.*?from\s+['"`])(\.\/[^'"`]*?)(['"`])/g;
      newContent = newContent.replace(relativeImportRegex, (match, start, path, end) => {
        // Only add .js if it doesn't already have an extension
        if (!path.match(/\.(ts|tsx|js|jsx|vue|mjs|cjs)$/)) {
          // Check if the file with .js extension exists
          const jsPath = path + '.js';
          const tsPath = path + '.ts';
          const fullJsPath = resolve(file, '..', jsPath);
          const fullTsPath = resolve(file, '..', tsPath);

          if (fs.existsSync(fullJsPath) || fs.existsSync(fullTsPath)) {
            fileChanged = true;
            return start + jsPath + end;
          }
        }
        return match;
      });

      // Fix 2: Change .ts extensions to .js in imports (for NodeNext compatibility)
      const tsImportRegex = /(import\s+.*?from\s+['"`])([^'"`]*?\.ts)(['"`])/g;
      newContent = newContent.replace(tsImportRegex, (match, start, path, end) => {
        fileChanged = true;
        return start + path.replace(/\.ts$/, '.js') + end;
      });

      // Fix 3: Change .tsx extensions to .js in imports
      const tsxImportRegex = /(import\s+.*?from\s+['"`])([^'"`]*?\.tsx)(['"`])/g;
      newContent = newContent.replace(tsxImportRegex, (match, start, path, end) => {
        fileChanged = true;
        return start + path.replace(/\.tsx$/, '.js') + end;
      });

      if (fileChanged) {
        fs.writeFileSync(file, newContent);
        fixedCount++;
        console.log(`    Fixed imports in ${file.replace(dir.path + '/', '')}`);
      }

    } catch (error) {
      console.log(`    Error processing ${file}: ${error.message}`);
    }
  }

  console.log(`  ✓ Fixed imports in ${fixedCount} files`);
}

// Process each directory sequentially
async function processAll() {
  for (const dir of directories) {
    await fixImportsInDirectory(dir);
  }

  console.log('\nManual import fixing process completed.');
  console.log('Note: This implements basic import fixes. For more complex issues,');
  console.log('the full fix-imports-generic action may be needed.');
}

processAll().catch(console.error);