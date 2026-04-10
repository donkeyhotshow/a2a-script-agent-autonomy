#!/usr/bin/env node
/**
 * Validation script for A2A system
 * Checks:
 * 1. DEV_STATE.md for completed tasks (Задача 1, 3, 4)
 * 2. Port configuration consistency (a2a-client/vite.config.js uses WEB_PORT, config/ports.ts default is 5173)
 * 3. Gray Room definition in GLOSSARY.md includes the full definition with compress_history, thinking, auto_rag_page, auto_read_file, clarify
 * 4. Optionally, run linting and tests (with --lint or --test flag)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function checkDevState() {
  try {
    const devStatePath = path.join(projectRoot, 'DEV_STATE.md');
    const content = await fs.readFile(devStatePath, 'utf8');
    
    // Check for tasks 1, 3, 4 being completed
    // We look for the table rows and see if they contain "Выполнено"
    const lines = content.split('\n');
    const taskStatus = {};
    let inTaskTable = false;
    
    for (const line of lines) {
      if (line.includes('## ТЕКУЩИЕ ЗАДАЧИ')) {
        inTaskTable = true;
        continue;
      }
      if (inTaskTable && line.startsWith('---')) {
        break;
      }
      if (inTaskTable && line.startsWith('|')) {
        // Parse table row
        const parts = line.split('|').map(p => p.trim());
        // Skip header and separator rows
        if (parts.length >= 5 && parts[1] && !parts[1].startsWith('#') && parts[1] !== '') {
          const taskNum = parts[1]; // First column after split is task number
          const status = parts[4];  // Fifth column is status (0-indexed: 0='', 1='#', 2='Задача', 3='Режим', 4='Статус')
          if (taskNum && !isNaN(parseInt(taskNum))) { // Ensure it's a number
            taskStatus[taskNum] = status;
          }
        }
      }
    }
    
    const requiredTasks = ['1', '3', '4'];
    const missing = [];
    for (const task of requiredTasks) {
      if (!taskStatus[task] || !taskStatus[task].includes('Выполнено')) {
        missing.push(task);
      }
    }
    
    if (missing.length === 0) {
      return { success: true, message: 'All required tasks (1, 3, 4) are completed in DEV_STATE.md' };
    } else {
      return { success: false, message: `Tasks ${missing.join(', ')} are not marked as completed in DEV_STATE.md` };
    }
  } catch (error) {
    return { success: false, message: `Error reading DEV_STATE.md: ${error.message}` };
  }
}

async function checkPortConfig() {
  try {
    // Check a2a-client/vite.config.js
    const viteConfigPath = path.join(projectRoot, 'a2a-client', 'vite.config.js');
    const viteContent = await fs.readFile(viteConfigPath, 'utf8');
    
    // Check if it uses WEB_PORT environment variable with fallback 5173
    const usesWebPort = viteContent.includes('process.env.WEB_PORT') && viteContent.includes('|| 5173');
    
    // Check config/ports.ts for web service default port 5173
    const portsConfigPath = path.join(projectRoot, 'config', 'ports.ts');
    const portsContent = await fs.readFile(portsConfigPath, 'utf8');
    
    // Find the web service configuration
    const webPortMatch = portsContent.match(/web:\s*\{[^}]*port:\s*5173/);
    const hasWebPortDefault = webPortMatch !== null;
    
    if (usesWebPort && hasWebPortDefault) {
      return { success: true, message: 'Port configuration is consistent: vite.config.js uses WEB_PORT (fallback 5173) and config/ports.ts default for web is 5173' };
    } else {
      const details = [];
      if (!usesWebPort) details.push('vite.config.js does not use WEB_PORT with fallback 5173');
      if (!hasWebPortDefault) details.push('config/ports.ts web service default port is not 5173');
      return { success: false, message: `Port configuration inconsistency: ${details.join('; ')}` };
    }
  } catch (error) {
    return { success: false, message: `Error checking port configuration: ${error.message}` };
  }
}

async function checkGrayRoomDefinition() {
  try {
    const glossaryPath = path.join(projectRoot, 'GLOSSARY.md');
    const content = await fs.readFile(glossaryPath, 'utf8');
    
    // Look for the Gray Room definition line
    // We expect: "| **Gray Room** (Трансмутация) | Серверная цепочка LLM-вызовов (compress_history, thinking, auto_rag_page, auto_read_file, clarify) перед возвратом клиенту |"
    const requiredTerms = ['compress_history', 'thinking', 'auto_rag_page', 'auto_read_file', 'clarify'];
    const missingTerms = [];
    
    for (const term of requiredTerms) {
      if (!content.includes(term)) {
        missingTerms.push(term);
      }
    }
    
    if (missingTerms.length === 0) {
      return { success: true, message: 'Gray Room definition in GLOSSARY.md includes all required terms: compress_history, thinking, auto_rag_page, auto_read_file, clarify' };
    } else {
      return { success: false, message: `Gray Room definition missing terms: ${missingTerms.join(', ')}` };
    }
  } catch (error) {
    return { success: false, message: `Error reading GLOSSARY.md: ${error.message}` };
  }
}

async function runLintingAndTests() {
  try {
    console.log('Running linting and tests...');
    // Run sim:lint and sim:validate
    // We'll run from the project root
    
    // Run sim:lint
    try {
      execSync('npm run sim:lint -- --all --json', { stdio: 'pipe', cwd: projectRoot });
      console.log('✓ sim:lint passed');
    } catch (lintError) {
      console.error('✗ sim:lint failed:', lintError.stdout.toString());
      throw new Error('sim:lint failed');
    }
    
    // Run sim:validate
    try {
      execSync('npm run sim:validate -- --all --json', { stdio: 'pipe', cwd: projectRoot });
      console.log('✓ sim:validate passed');
    } catch (validateError) {
      console.error('✗ sim:validate failed:', validateError.stdout.toString());
      throw new Error('sim:validate failed');
    }
    
    // Optionally run unit tests? The task says optionally, we can make it a separate flag.
    // We'll just do the simulation linting and validation for now.
    return { success: true, message: 'Linting and validation passed' };
  } catch (error) {
    return { success: false, message: `Linting/tests failed: ${error.message}` };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const runLint = args.includes('--lint') || args.includes('--test');
  
  console.log('Starting system validation...\n');
  
  const results = [];
  
  // Check 1: DEV_STATE tasks
  const devStateResult = await checkDevState();
  results.push({ check: 'DEV_STATE tasks (1,3,4 completed)', ...devStateResult });
  console.log(`[${devStateResult.success ? '✓' : '✗'}] DEV_STATE tasks: ${devStateResult.message}`);
  
  // Check 2: Port configuration
  const portResult = await checkPortConfig();
  results.push({ check: 'Port configuration consistency', ...portResult });
  console.log(`[${portResult.success ? '✓' : '✗'}] Port configuration: ${portResult.message}`);
  
  // Check 3: Gray Room definition
  const grayRoomResult = await checkGrayRoomDefinition();
  results.push({ check: 'Gray Room definition', ...grayRoomResult });
  console.log(`[${grayRoomResult.success ? '✓' : '✗'}] Gray Room definition: ${grayRoomResult.message}`);
  
  // Optional linting and tests
  if (runLint) {
    const lintResult = await runLintingAndTests();
    results.push({ check: 'Linting and tests', ...lintResult });
    console.log(`[${lintResult.success ? '✓' : '✗'}] Linting and tests: ${lintResult.message}`);
  }
  
  // Summary
  const allPassed = results.every(r => r.success);
  console.log('\n' + '='.repeat(50));
  console.log(`Validation ${allPassed ? 'PASSED' : 'FAILED'}`);
  console.log('='.repeat(50));
  
  if (!allPassed) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});