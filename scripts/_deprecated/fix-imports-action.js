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

console.log('Starting import fixing process using fix-imports-generic action...');

// Try to execute the fix-imports-generic action directly
async function runImportFixer(dir) {
  try {
    console.log(`\nProcessing ${dir.name}...`);

    if (!fs.existsSync(dir.path)) {
      console.log(`  Directory ${dir.path} does not exist, skipping`);
      return;
    }

    // Change to the action service directory to run the action
    const actionServiceDir = resolve('a2a-server/packages/features/src/actions/src/actions');

    // Create a simple script to execute the action
    const actionServicePath = resolve('a2a-server/packages/features/src/actions/src/actions/action-service.ts');
    const fileUrl = 'file://' + actionServicePath.replace(/\\/g, '/');
    const scriptContent = `
import { getActionService } from '${fileUrl}';

async function main() {
  try {
    console.log('Getting action service...');
    const service = getActionService();
    console.log('Initializing service...');
    await service.initialize();
    console.log('Service initialized successfully');

    const sessionId = 'fix-imports-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const context = {
      rootDir: '${dir.path.replace(/\\/g, '\\\\')}',
      dryRun: false
    };

    console.log('Starting execution for ' + '${dir.name}' + '...');
    const response = service.startExecution(sessionId, 'fix-imports-generic');

    if (response.outcome === 'action_executing') {
      console.log('Action started successfully');

      // Execute the first step
      const stepResponse = await service.executeCurrentStep(sessionId, context);
      console.log('Step executed:', stepResponse.message);

      // Continue executing steps until completion
      let currentResponse = stepResponse;
      while (currentResponse.outcome === 'action_executing') {
        currentResponse = await service.executeCurrentStep(sessionId);
        console.log('Step executed:', currentResponse.message);
      }

      if (currentResponse.outcome === 'completed') {
        console.log('Import fixing completed successfully for ${dir.name}');
      } else {
        console.log('Import fixing failed for ${dir.name}:', currentResponse.error);
      }
    } else {
      console.log('Failed to start action for ${dir.name}:', response.error);
    }
  } catch (error) {
    console.error('Error running action for ${dir.name}:', error.message);
  }
}

main().catch(console.error);
`;

    const scriptPath = resolve('temp-fix-script.mjs');
    console.log('Script content length:', scriptContent.length);
    console.log('Script content preview:', scriptContent.substring(0, 500));
    fs.writeFileSync(scriptPath, scriptContent);
    console.log('Script written to:', scriptPath);

    // Run the script with tsx to handle TypeScript
    const result = spawnSync('npx', ['tsx', scriptPath], {
      cwd: resolve('.'),
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024 // 2MB buffer
    });

    // Clean up temp script
    try {
      fs.unlinkSync(scriptPath);
    } catch {}

    if (result.status === 0) {
      console.log(`  ✓ ${dir.name}: Import fixing completed`);
      console.log(result.stdout);
    } else {
      console.log(`  ✗ ${dir.name}: Import fixing failed`);
      console.log('stderr:', result.stderr);
      console.log('stdout:', result.stdout);
    }

  } catch (error) {
    console.log(`  ✗ Error processing ${dir.name}: ${error.message}`);
  }
}

// Process each directory sequentially
async function processAll() {
  for (const dir of directories) {
    await runImportFixer(dir);
  }

  console.log('\nImport fixing process completed.');
  console.log('All directories have been processed with the fix-imports-generic action.');
}

processAll().catch(console.error);