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

console.log('Starting import fixing process...');

for (const dir of directories) {
  console.log(`\nProcessing ${dir.name}...`);
  
  // Check if directory exists
  if (!fs.existsSync(dir.path)) {
    console.log(`  Directory ${dir.path} does not exist, skipping`);
    continue;
  }
  
  // Run TypeScript check to see if there are import issues
  try {
    const buildResult = spawnSync('npx', ['tsc', '--noEmit'], {
      cwd: dir.path,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 // 1MB buffer
    });
    
    if (buildResult.status === 0) {
      console.log(`  ✓ ${dir.name}: No TypeScript compilation errors`);
      } else {
        console.log(`  ⚠ ${dir.name}: TypeScript compilation issues detected`);
        // Show first few lines of error to avoid flooding output
        const stderr = buildResult.stderr || '';
        const errorLines = stderr.split('\n').filter(line => line.trim()).slice(0, 3);
        if (errorLines.length > 0) {
          console.log(`    Sample errors:`);
          errorLines.forEach(line => console.log(`      ${line}`));
        }

        // Here we would normally run the fix-imports-generic action
        // Since we can't access the action directly through bash easily,
        // we'll note that the action should be triggered via the proper system
        console.log(`  → Import fixing would be handled by fix-imports-generic action`);
      }
  } catch (error) {
    console.log(`  ✗ Error processing ${dir.name}: ${error.message}`);
  }
}

console.log('\nImport fixing process completed.');
console.log('Note: For actual import fixing, the fix-imports-generic action needs to be executed');
console.log('through the proper Client API/system. To use the action:');
console.log('1. Ensure the action is registered in the system');
console.log('2. Trigger it via Client API with context.rootDir set to each directory');
console.log('3. Monitor results via DEV_STATE for evidence collection');